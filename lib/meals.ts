export type Rayon =
  | 'Légumes & fruits'
  | 'Féculents & épicerie'
  | 'Produits laitiers & œufs'
  | 'Viande & poisson'
  | 'Autres';

export const RAYONS: Rayon[] = [
  'Légumes & fruits',
  'Féculents & épicerie',
  'Produits laitiers & œufs',
  'Viande & poisson',
  'Autres',
];

export type Ingredient = { name: string; rayon: Rayon };

export type Meal = {
  id: string;
  name: string;
  tag: string;
  ingredients: Ingredient[];
};

// Loose match for meal names: same accents/case/spacing count as "the same
// dish" so a saved recipe gets reused for "Pâtes Bolognaise" as much as
// "pates bolognaise ". This isn't full fuzzy matching — genuinely different
// wordings of the same dish won't match — just normalization of trivial
// typing differences.
export function normalizeMealName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const ing = (name: string, rayonIndex: number): Ingredient => ({ name, rayon: RAYONS[rayonIndex] });

export const MEALS_CATALOG: Record<string, Meal> = {
  bolo: {
    id: 'bolo',
    name: 'Pâtes bolognaise',
    tag: 'Confort',
    ingredients: [ing('Pâtes', 1), ing('Bœuf haché', 3), ing('Tomates concassées', 0), ing('Oignon', 0), ing('Parmesan', 2)],
  },
  poulet: {
    id: 'poulet',
    name: 'Poulet rôti & légumes',
    tag: 'Classique',
    ingredients: [ing('Poulet', 3), ing('Pommes de terre', 0), ing('Carottes', 0), ing('Thym', 4)],
  },
  curry: {
    id: 'curry',
    name: 'Curry de pois chiches',
    tag: 'Végé',
    ingredients: [ing('Pois chiches', 1), ing('Lait de coco', 4), ing('Riz', 1), ing('Épinards', 0), ing('Curry en poudre', 4)],
  },
  saumon: {
    id: 'saumon',
    name: 'Saumon, riz & brocolis',
    tag: 'Léger',
    ingredients: [ing('Saumon', 3), ing('Riz', 1), ing('Brocolis', 0)],
  },
  chili: {
    id: 'chili',
    name: 'Chili sin carne',
    tag: 'Végé',
    ingredients: [ing('Haricots rouges', 1), ing('Maïs', 0), ing('Tomates', 0), ing('Riz', 1)],
  },
  quiche: {
    id: 'quiche',
    name: 'Quiche lorraine & salade',
    tag: 'Rapide',
    ingredients: [ing('Pâte brisée', 1), ing('Lardons', 3), ing('Œufs', 2), ing('Crème fraîche', 2), ing('Salade verte', 0)],
  },
  risotto: {
    id: 'risotto',
    name: 'Risotto aux champignons',
    tag: 'Confort',
    ingredients: [ing('Riz arborio', 1), ing('Champignons', 0), ing('Parmesan', 2), ing('Bouillon de légumes', 4)],
  },
  buddha: {
    id: 'buddha',
    name: 'Buddha bowl quinoa',
    tag: 'Équilibré',
    ingredients: [ing('Quinoa', 1), ing('Patate douce', 0), ing('Pois chiches', 1), ing('Avocat', 0)],
  },
  soupe: {
    id: 'soupe',
    name: 'Soupe de légumes maison',
    tag: 'Léger',
    ingredients: [ing('Poireaux', 0), ing('Carottes', 0), ing('Pommes de terre', 0), ing('Crème', 2)],
  },
  tofu: {
    id: 'tofu',
    name: 'Poêlée de tofu & brocolis',
    tag: 'Végé',
    ingredients: [ing('Tofu', 4), ing('Brocolis', 0), ing('Riz complet', 1), ing('Sauce soja', 4)],
  },
  omelette: {
    id: 'omelette',
    name: 'Omelette & salade',
    tag: 'Rapide',
    ingredients: [ing('Œufs', 2), ing('Salade verte', 0), ing('Jambon', 3)],
  },
  pesto: {
    id: 'pesto',
    name: 'Pâtes au pesto',
    tag: 'Rapide',
    ingredients: [ing('Pâtes', 1), ing('Pesto', 4), ing('Parmesan', 2)],
  },
  wrap: {
    id: 'wrap',
    name: 'Wrap au poulet',
    tag: 'Rapide',
    ingredients: [ing('Tortillas', 1), ing('Poulet', 3), ing('Salade verte', 0), ing('Sauce', 4)],
  },
};

export const USUAL_ORDER = ['bolo', 'poulet', 'curry', 'saumon', 'chili', 'quiche', 'risotto'];
export const BALANCE_ORDER = ['buddha', 'soupe', 'tofu'];
export const QUICK_ORDER = ['quiche', 'omelette', 'pesto', 'wrap'];

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
