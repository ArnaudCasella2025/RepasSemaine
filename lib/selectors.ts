import { RAYONS, Rayon, USUAL_ORDER } from './meals';
import { ExtraItem, HistoryEntry, MealRef, NextMenuSlot, mealRefFromCatalog } from './store';

export type ShoppingRow = { name: string; extraId: number | null };
export type ShoppingGroup = { rayon: Rayon; items: ShoppingRow[] };

export function buildShoppingGroups(nextMenu: NextMenuSlot[], extraItems: ExtraItem[]): ShoppingGroup[] {
  const byRayon: Partial<Record<Rayon, Map<string, number | null>>> = {};

  nextMenu.forEach((slot) => {
    if (!slot.meal) return;
    slot.meal.ingredients.forEach(({ name, rayon }) => {
      if (!byRayon[rayon]) byRayon[rayon] = new Map();
      if (!byRayon[rayon]!.has(name)) byRayon[rayon]!.set(name, null);
    });
  });

  extraItems.forEach((item) => {
    if (!byRayon[item.rayon]) byRayon[item.rayon] = new Map();
    byRayon[item.rayon]!.set(item.name, item.id);
  });

  return RAYONS.filter((r) => byRayon[r] && byRayon[r]!.size > 0).map((r) => ({
    rayon: r,
    items: [...byRayon[r]!.entries()].map(([name, extraId]) => ({ name, extraId })),
  }));
}

// A meal shouldn't be suggested again as a "habit" until this much time has
// passed since it was last eaten, so "Vos habitudes" doesn't repeat itself.
const NO_REPEAT_MS = 21 * 24 * 60 * 60 * 1000; // 3 semaines

export function buildHabitSuggestions(history: HistoryEntry[], nextMenu: NextMenuSlot[]): MealRef[] {
  const now = Date.now();

  // Meals already placed in the menu being composed right now shouldn't be
  // suggested again for another day of the same menu.
  const activeNames = new Set<string>();
  nextMenu.forEach((s) => s.meal && activeNames.add(s.meal.name));

  type Stat = { meal: MealRef; count: number; lastEatenAt: number };
  const byName = new Map<string, Stat>();
  history.forEach((h) => {
    const existing = byName.get(h.name);
    if (existing) {
      existing.count += 1;
      existing.lastEatenAt = Math.max(existing.lastEatenAt, h.weekStartedAt);
    } else {
      byName.set(h.name, {
        meal: { id: h.mealId, name: h.name, tag: h.tag, ingredients: h.ingredients },
        count: 1,
        lastEatenAt: h.weekStartedAt,
      });
    }
  });

  // Anything eaten within the no-repeat window is off the table entirely —
  // for both real history suggestions and the catalog fallback below —
  // otherwise a meal just archived into history would be suggested again
  // for next week immediately.
  const recentlyEatenNames = new Set(
    [...byName.values()].filter((s) => now - s.lastEatenAt < NO_REPEAT_MS).map((s) => s.meal.name)
  );
  const excludedNames = new Set([...activeNames, ...recentlyEatenNames]);

  const eligible = [...byName.values()]
    .filter((s) => !excludedNames.has(s.meal.name))
    .sort((a, b) => b.count - a.count || a.lastEatenAt - b.lastEatenAt);

  const result: MealRef[] = eligible.slice(0, 7).map((s) => s.meal);
  const usedNames = new Set(result.map((m) => m.name));

  if (result.length < 7) {
    for (const id of USUAL_ORDER) {
      if (result.length >= 7) break;
      const meal = mealRefFromCatalog(id);
      if (!usedNames.has(meal.name) && !excludedNames.has(meal.name)) {
        result.push(meal);
        usedNames.add(meal.name);
      }
    }
  }

  return result;
}
