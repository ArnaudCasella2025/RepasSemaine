import { Ingredient } from './meals';

export type AiIngredientResult = { id: string; ingredients: Ingredient[] };
export type MenuBalanceResult = { score: number; comment: string };
export type AiSuggestion = { name: string; tag: string; reason: string };

export const isAiShoppingConfigured = !!(process.env.EXPO_PUBLIC_AI_WORKER_URL && process.env.EXPO_PUBLIC_APP_SECRET);

async function callWorker<T>(body: Record<string, unknown>): Promise<T> {
  const url = process.env.EXPO_PUBLIC_AI_WORKER_URL;
  const secret = process.env.EXPO_PUBLIC_APP_SECRET;
  if (!url || !secret) {
    throw new Error("La génération par IA n'est pas configurée.");
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-secret': secret },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const message = errBody?.error || `Erreur du serveur (${res.status})`;
    throw new Error(errBody?.detail ? `${message} : ${errBody.detail}` : message);
  }

  return res.json();
}

export async function fetchAiIngredients(
  meals: { id: string; name: string; desc?: string; link?: string }[]
): Promise<AiIngredientResult[]> {
  const data = await callWorker<{ results?: AiIngredientResult[] }>({ action: 'shopping_list', meals });
  if (!Array.isArray(data.results)) {
    throw new Error('Réponse inattendue du serveur.');
  }
  return data.results;
}

export async function fetchMenuBalance(meals: { name: string; tag: string }[]): Promise<MenuBalanceResult> {
  const data = await callWorker<{ score?: unknown; comment?: unknown }>({ action: 'balance_score', meals });
  if (typeof data.score !== 'number' || typeof data.comment !== 'string') {
    throw new Error('Réponse inattendue du serveur.');
  }
  return { score: data.score, comment: data.comment };
}

export async function fetchAiSuggestions(mode: 'balance' | 'cheap', currentMeals: { name: string; tag: string }[]): Promise<AiSuggestion[]> {
  const data = await callWorker<{ suggestions?: AiSuggestion[] }>({
    action: 'suggestions',
    mode,
    currentMeals,
    excludeNames: currentMeals.map((m) => m.name),
  });
  if (!Array.isArray(data.suggestions)) {
    throw new Error('Réponse inattendue du serveur.');
  }
  return data.suggestions;
}
