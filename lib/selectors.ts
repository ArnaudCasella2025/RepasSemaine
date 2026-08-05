import { ExtraItem, NextMenuSlot } from './store';
import { RAYONS, Rayon } from './meals';

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
