import Anthropic from '@anthropic-ai/sdk';

export interface Env {
  ANTHROPIC_API_KEY: string;
  APP_SECRET: string;
}

const RAYONS = ['Légumes & fruits', 'Féculents & épicerie', 'Produits laitiers & œufs', 'Viande & poisson', 'Autres'] as const;

const MAX_MEALS_PER_REQUEST = 20;
const MAX_SUGGESTIONS = 8;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-app-secret',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Runs one structured-output call and returns the parsed JSON, or an error
// Response ready to hand straight back to the client.
async function runStructured(
  client: Anthropic,
  { system, schema, content }: { system: string; schema: Record<string, unknown>; content: string }
): Promise<{ data: unknown } | { error: Response }> {
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 8000,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema },
      },
      system,
      messages: [{ role: 'user', content }],
    });
  } catch (err) {
    return { error: json({ error: 'Anthropic API error', detail: String(err) }, 502) };
  }

  if (response.stop_reason === 'refusal') {
    return { error: json({ error: 'Request refused by safety filters' }, 502) };
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) {
    return { error: json({ error: 'No structured output returned' }, 502) };
  }

  try {
    return { data: JSON.parse(textBlock.text) };
  } catch {
    return { error: json({ error: 'Failed to parse model output' }, 502) };
  }
}

// ---------------------------------------------------------------------------
// action: shopping_list — deduce ingredients (grouped by aisle) for a set of
// meals, using a hand-typed description and/or a recipe URL when available.
// ---------------------------------------------------------------------------

type MealInput = { id: string; name: string; desc?: unknown; link?: unknown };

const FETCH_TIMEOUT_MS = 6000;
const MAX_PAGE_TEXT_CHARS = 4000;
const MAX_DESC_CHARS = 500;

// Best-effort: grabs whatever a plain (non-JS) fetch of the recipe URL
// exposes — title/description meta tags plus a stripped-tag fallback of the
// body — so Claude can read an actual recipe instead of only guessing from
// the dish name. Pages that need JS to render (many Instagram/Pinterest
// pages) will yield little or nothing; that's fine, the model falls back to
// the name in that case.
async function fetchPageContext(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RepasSemaineBot/1.0)' },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    const html = await res.text();
    return extractReadableText(html) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractReadableText(html: string): string {
  const pick = (re: RegExp) => html.match(re)?.[1]?.trim() ?? '';
  const title = pick(/<title[^>]*>([^<]*)<\/title>/i);
  const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogDesc =
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ||
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return [ogTitle || title, ogDesc, bodyText]
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_PAGE_TEXT_CHARS);
}

const SHOPPING_LIST_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                rayon: { type: 'string', enum: RAYONS as unknown as string[] },
              },
              required: ['name', 'rayon'],
              additionalProperties: false,
            },
          },
        },
        required: ['id', 'ingredients'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
} as const;

async function handleShoppingList(body: Record<string, unknown>, client: Anthropic): Promise<Response> {
  const meals = body.meals as MealInput[] | undefined;
  if (!Array.isArray(meals) || meals.length === 0) {
    return json({ error: 'meals must be a non-empty array' }, 400);
  }
  if (meals.length > MAX_MEALS_PER_REQUEST) {
    return json({ error: `Too many meals (max ${MAX_MEALS_PER_REQUEST})` }, 400);
  }
  if (meals.some((m) => typeof m.id !== 'string' || typeof m.name !== 'string' || !m.name.trim())) {
    return json({ error: 'Each meal needs a string id and a non-empty name' }, 400);
  }

  // Enrich each meal with whatever the client sent (a hand-typed
  // description) and whatever a plain fetch of its recipe URL exposes, so
  // the model can read the actual recipe instead of only guessing from the
  // dish name.
  const mealsContext = await Promise.all(
    meals.map(async (m) => {
      const context: { id: string; name: string; description?: string; page_excerpt?: string } = { id: m.id, name: m.name };
      if (typeof m.desc === 'string' && m.desc.trim()) {
        context.description = m.desc.trim().slice(0, MAX_DESC_CHARS);
      }
      if (typeof m.link === 'string' && m.link.trim()) {
        const pageText = await fetchPageContext(m.link.trim());
        if (pageText) context.page_excerpt = pageText;
      }
      return context;
    })
  );

  const result = await runStructured(client, {
    schema: SHOPPING_LIST_SCHEMA,
    system:
      "Tu aides à préparer une liste de courses pour un foyer français. Pour chaque repas donné, déduis une liste réaliste d'ingrédients à acheter pour le préparer. " +
      "Si `description` et/ou `page_excerpt` contient une liste d'ingrédients explicite (par exemple une liste tapée par l'utilisateur, ou une recette trouvée sur la page), utilise EXACTEMENT cette liste : n'ajoute aucun ingrédient qui n'y figure pas, n'en oublie aucun, contente-toi de normaliser chaque nom (court, en français) et de lui assigner un rayon. " +
      "Si `description`/`page_excerpt` est un texte libre sans liste explicite (ex: \"vu sur Instagram\"), déduis les ingrédients de ce texte et du nom du plat. S'il n'y a ni description ni extrait exploitable, déduis les ingrédients à partir du seul nom du plat. " +
      'Le rayon de chaque ingrédient doit être choisi strictement parmi : ' +
      RAYONS.join(', ') +
      '. Ne liste pas les ingrédients de base déjà présents dans la plupart des foyers (sel, poivre, eau, huile), sauf si l\'utilisateur les a lui-même explicitement listés. Réponds pour exactement les repas fournis, dans le même ordre, en conservant leur id exact.',
    content: JSON.stringify(mealsContext),
  });

  if ('error' in result) return result.error;
  return json(result.data);
}

// ---------------------------------------------------------------------------
// action: balance_score — rate the nutritional balance of the planned week.
// ---------------------------------------------------------------------------

type MealSummary = { name: string; tag: string };

// Anthropic's structured-output JSON schema support doesn't reliably accept
// numeric range keywords (minimum/maximum) — a schema using them was
// rejected outright, surfacing as a generic "Anthropic API error" client
// side. The 0-10 range is enforced by the prompt instead, and the result is
// clamped defensively below.
const BALANCE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer' },
    comment: { type: 'string' },
  },
  required: ['score', 'comment'],
  additionalProperties: false,
} as const;

function readMealSummaries(value: unknown): MealSummary[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const meals = value.filter(
    (m): m is MealSummary => typeof m === 'object' && m !== null && typeof (m as MealSummary).name === 'string' && (m as MealSummary).name.trim().length > 0
  );
  if (meals.length !== value.length) return null;
  return meals.map((m) => ({ name: m.name, tag: typeof m.tag === 'string' ? m.tag : '' }));
}

async function handleBalanceScore(body: Record<string, unknown>, client: Anthropic): Promise<Response> {
  const meals = readMealSummaries(body.meals);
  if (!meals) {
    return json({ error: 'meals must be a non-empty array of { name, tag }' }, 400);
  }
  if (meals.length > MAX_MEALS_PER_REQUEST) {
    return json({ error: `Too many meals (max ${MAX_MEALS_PER_REQUEST})` }, 400);
  }

  const result = await runStructured(client, {
    schema: BALANCE_SCHEMA,
    system:
      "Tu évalues l'équilibre nutritionnel d'un menu hebdomadaire pour un foyer français, à partir de la liste des repas prévus (nom et étiquette). " +
      "`score` doit être un entier STRICTEMENT compris entre 0 et 10 inclus (0 = très déséquilibré, 10 = bien équilibré : bonne variété de sources de protéines - viande, poisson, œufs, légumineuses -, présence régulière de légumes, pas trop de plats gras/riches d'affilée, bonne diversité globale des plats). N'utilise jamais une valeur en dehors de 0-10. " +
      'Donne aussi un commentaire court (1 à 2 phrases, en français, bienveillant et concret) qui explique la note et suggère si besoin une piste d\'amélioration simple.',
    content: JSON.stringify({ meals }),
  });

  if ('error' in result) return result.error;
  const data = result.data as { score?: unknown; comment?: unknown };
  const score = Math.max(0, Math.min(10, Math.round(Number(data.score) || 0)));
  return json({ score, comment: typeof data.comment === 'string' ? data.comment : '' });
}

// ---------------------------------------------------------------------------
// action: suggestions — propose dish ideas to round out the week, either to
// improve balance or to keep costs down.
// ---------------------------------------------------------------------------

const SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tag: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['name', 'tag', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
} as const;

async function handleSuggestions(body: Record<string, unknown>, client: Anthropic): Promise<Response> {
  const mode = body.mode;
  if (mode !== 'balance' && mode !== 'cheap') {
    return json({ error: 'mode must be "balance" or "cheap"' }, 400);
  }
  const currentMeals = readMealSummaries(body.currentMeals) ?? [];
  const excludeNames = Array.isArray(body.excludeNames) ? body.excludeNames.filter((n): n is string => typeof n === 'string') : [];

  const goal =
    mode === 'balance'
      ? "afin de le rendre mieux équilibré nutritionnellement : varier les sources de protéines (viande, poisson, œufs, légumineuses), ajouter des légumes, éviter de répéter un type de plat déjà présent."
      : 'en privilégiant des plats économiques : ingrédients simples et bon marché (légumineuses, œufs, pâtes, riz, légumes de saison, conserves), peu de viande ou de poisson coûteux.';

  const result = await runStructured(client, {
    schema: SUGGESTIONS_SCHEMA,
    system:
      "Tu proposes des idées de repas concrets et réalistes (cuisine du quotidien, française ou internationale courante) pour compléter un menu hebdomadaire français, " +
      goal +
      ` Propose entre 4 et ${MAX_SUGGESTIONS} idées. Pour chacune, donne un nom court, une étiquette courte (1 à 2 mots, ex: "Léger", "Protéiné", "Végé", "Économique"), et une raison brève (moins de 15 mots) expliquant en quoi ce plat sert l'objectif demandé. ` +
      "Ne propose aucun plat déjà présent dans `current_meals` ni dans `exclude_names`.",
    content: JSON.stringify({ current_meals: currentMeals, exclude_names: excludeNames }),
  });

  if ('error' in result) return result.error;
  return json(result.data);
}

// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }
    if (!env.APP_SECRET || request.headers.get('x-app-secret') !== env.APP_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const action = typeof body.action === 'string' ? body.action : 'shopping_list';

    switch (action) {
      case 'shopping_list':
        return handleShoppingList(body, client);
      case 'balance_score':
        return handleBalanceScore(body, client);
      case 'suggestions':
        return handleSuggestions(body, client);
      default:
        return json({ error: `Unknown action "${action}"` }, 400);
    }
  },
} satisfies ExportedHandler<Env>;
