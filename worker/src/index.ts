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

type MealInput = { id: string; name: string };

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
          "Tu aides à préparer une liste de courses pour un foyer français. Pour chaque repas donné (nom uniquement), déduis une liste réaliste d'ingrédients à acheter pour le préparer, avec pour chacun un nom court en français (ex: \"Pâtes\", \"Oignon\") et le rayon de supermarché correspondant, choisi strictement parmi : " +
          RAYONS.join(', ') +
          '. Ne liste pas les ingrédients de base déjà présents dans la plupart des foyers (sel, poivre, eau, huile). Réponds pour exactement les repas fournis, dans le même ordre, en conservant leur id exact.',
        messages: [
          {
            role: 'user',
            content: JSON.stringify(meals.map((m) => ({ id: m.id, name: m.name }))),
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
