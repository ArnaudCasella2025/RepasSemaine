import { RAYONS, Rayon, USUAL_ORDER } from './meals';
import { ExtraItem, HistoryEntry, MealRef, NextMenuSlot, mealRefFromCatalog } from './store';

export type ShoppingRow = { name: string; extraId: number | null };
export type ShoppingGroup = { key: string; title: string; items: ShoppingRow[] };

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
    key: r,
    title: r,
    items: [...byRayon[r]!.entries()].map(([name, extraId]) => ({ name, extraId })),
  }));
}

// Same shopping list, grouped by the recipe each ingredient comes from
// instead of by aisle. Extra items typed in by hand have no recipe, so they
// land in a trailing "Autre" group.
export function buildShoppingGroupsByMeal(nextMenu: NextMenuSlot[], extraItems: ExtraItem[]): ShoppingGroup[] {
  const groups: ShoppingGroup[] = [];
  const seenMealIds = new Set<string>();

  nextMenu.forEach((slot) => {
    if (!slot.meal || seenMealIds.has(slot.meal.id) || slot.meal.ingredients.length === 0) return;
    seenMealIds.add(slot.meal.id);
    groups.push({
      key: slot.meal.id,
      title: slot.meal.name,
      items: slot.meal.ingredients.map(({ name }) => ({ name, extraId: null })),
    });
  });

  if (extraItems.length > 0) {
    groups.push({
      key: '__autre__',
      title: 'Autre',
      items: extraItems.map((item) => ({ name: item.name, extraId: item.id })),
    });
  }

  return groups;
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
