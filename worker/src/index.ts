import Anthropic from '@anthropic-ai/sdk';

export interface Env {
  ANTHROPIC_API_KEY: string;
  APP_SECRET: string;
}

const RAYONS = ['Légumes & fruits', 'Féculents & épicerie', 'Produits laitiers & œufs', 'Viande & poisson', 'Autres'] as const;

const MAX_MEALS_PER_REQUEST = 20;

const RESPONSE_SCHEMA = {
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

    let body: { meals?: MealInput[] };
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const meals = body.meals;
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
    // the model can read the actual recipe instead of only guessing from
    // the dish name.
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

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 8000,
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
        },
        system:
          "Tu aides à préparer une liste de courses pour un foyer français. Pour chaque repas donné, déduis une liste réaliste d'ingrédients à acheter pour le préparer. Si une description ou un extrait de page (page_excerpt, souvent une recette) est fourni et pertinent, base-toi dessus en priorité ; sinon, déduis les ingrédients à partir du seul nom du plat. Pour chaque ingrédient, donne un nom court en français (ex: \"Pâtes\", \"Oignon\") et le rayon de supermarché correspondant, choisi strictement parmi : " +
          RAYONS.join(', ') +
          '. Ne liste pas les ingrédients de base déjà présents dans la plupart des foyers (sel, poivre, eau, huile). Réponds pour exactement les repas fournis, dans le même ordre, en conservant leur id exact.',
        messages: [
          {
            role: 'user',
            content: JSON.stringify(mealsContext),
          },
        ],
      });
    } catch (err) {
      return json({ error: 'Anthropic API error', detail: String(err) }, 502);
    }

    if (response.stop_reason === 'refusal') {
      return json({ error: 'Request refused by safety filters' }, 502);
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) {
      return json({ error: 'No structured output returned' }, 502);
    }

    try {
      const parsed = JSON.parse(textBlock.text);
      return json(parsed);
    } catch {
      return json({ error: 'Failed to parse model output' }, 502);
    }
  },
} satisfies ExportedHandler<Env>;
