import { Ingredient } from './meals';

export type AiIngredientResult = { id: string; ingredients: Ingredient[] };

export const isAiShoppingConfigured = !!(process.env.EXPO_PUBLIC_AI_WORKER_URL && process.env.EXPO_PUBLIC_APP_SECRET);

export async function fetchAiIngredients(meals: { id: string; name: string }[]): Promise<AiIngredientResult[]> {
  const url = process.env.EXPO_PUBLIC_AI_WORKER_URL;
  const secret = process.env.EXPO_PUBLIC_APP_SECRET;
  if (!url || !secret) {
    throw new Error("La génération par IA n'est pas configurée.");
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-secret': secret },
    body: JSON.stringify({ meals }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Erreur du serveur (${res.status})`);
  }

  const data = await res.json();
  if (!Array.isArray(data?.results)) {
    throw new Error('Réponse inattendue du serveur.');
  }
  return data.results as AiIngredientResult[];
}
