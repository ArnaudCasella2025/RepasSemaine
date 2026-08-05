import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DAYS, Ingredient, MEALS_CATALOG, Rayon } from './meals';

export type MealRef = {
  id: string;
  name: string;
  tag: string;
  ingredients: Ingredient[];
};

export type WeekDay = { day: string; meal: MealRef; done: boolean };
export type NextMenuSlot = { day: string; meal: MealRef | null };
export type Idea = { id: number; name: string; desc: string; link: string };
export type ExtraItem = { id: number; name: string; rayon: Rayon };

const toMealRef = (id: string): MealRef => {
  const m = MEALS_CATALOG[id];
  return { id: m.id, name: m.name, tag: m.tag, ingredients: m.ingredients };
};

const ideaToMealRef = (idea: Idea): MealRef => ({
  id: `idea_${idea.id}`,
  name: idea.name,
  tag: 'Envie',
  ingredients: [],
});

type State = {
  week: WeekDay[];
  nextMenu: NextMenuSlot[];
  ideas: Idea[];
  shoppingChecked: Record<string, boolean>;
  extraItems: ExtraItem[];
};

const initialWeekMeals = ['bolo', 'poulet', 'curry', 'saumon', 'chili', 'quiche', 'risotto'];

const initialState: State = {
  week: DAYS.map((day, i) => ({ day, meal: toMealRef(initialWeekMeals[i]), done: i < 3 })),
  nextMenu: DAYS.map((day) => ({ day, meal: null })),
  ideas: [
    { id: 1, name: 'Tacos maison', desc: 'à tester le week-end', link: '' },
    { id: 2, name: 'Bowl poké saumon', desc: 'vu sur Instagram', link: 'https://instagram.com' },
    { id: 3, name: 'Gratin dauphinois', desc: 'la recette de mamie', link: '' },
  ],
  shoppingChecked: {},
  extraItems: [],
};

type StoreValue = State & {
  toggleDone: (index: number) => void;
  assignToFirstEmpty: (meal: MealRef) => void;
  clearSlot: (index: number) => void;
  assignToSlot: (index: number, meal: MealRef) => void;
  toggleShoppingItem: (name: string) => void;
  addExtraItem: (name: string, rayon: Rayon) => void;
  removeExtraItem: (id: number) => void;
  addIdea: (name: string, desc: string, link: string) => void;
  removeIdea: (id: number) => void;
  mealFromIdea: (idea: Idea) => MealRef;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);

  const toggleDone = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      week: s.week.map((d, i) => (i === index ? { ...d, done: !d.done } : d)),
    }));
  }, []);

  const assignToFirstEmpty = useCallback((meal: MealRef) => {
    setState((s) => {
      const idx = s.nextMenu.findIndex((sl) => !sl.meal);
      if (idx === -1) return s;
      return { ...s, nextMenu: s.nextMenu.map((sl, i) => (i === idx ? { ...sl, meal } : sl)) };
    });
  }, []);

  const clearSlot = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      nextMenu: s.nextMenu.map((sl, i) => (i === index ? { ...sl, meal: null } : sl)),
    }));
  }, []);

  const assignToSlot = useCallback((index: number, meal: MealRef) => {
    setState((s) => ({
      ...s,
      nextMenu: s.nextMenu.map((sl, i) => (i === index ? { ...sl, meal } : sl)),
    }));
  }, []);

  const toggleShoppingItem = useCallback((name: string) => {
    setState((s) => ({ ...s, shoppingChecked: { ...s.shoppingChecked, [name]: !s.shoppingChecked[name] } }));
  }, []);

  const addExtraItem = useCallback((name: string, rayon: Rayon) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      extraItems: [...s.extraItems, { id: Date.now(), name: trimmed, rayon }],
    }));
  }, []);

  const removeExtraItem = useCallback((id: number) => {
    setState((s) => ({ ...s, extraItems: s.extraItems.filter((i) => i.id !== id) }));
  }, []);

  const addIdea = useCallback((name: string, desc: string, link: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      ideas: [...s.ideas, { id: Date.now(), name: trimmed, desc: desc.trim(), link: link.trim() }],
    }));
  }, []);

  const removeIdea = useCallback((id: number) => {
    setState((s) => ({ ...s, ideas: s.ideas.filter((i) => i.id !== id) }));
  }, []);

  const mealFromIdea = useCallback((idea: Idea) => ideaToMealRef(idea), []);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      toggleDone,
      assignToFirstEmpty,
      clearSlot,
      assignToSlot,
      toggleShoppingItem,
      addExtraItem,
      removeExtraItem,
      addIdea,
      removeIdea,
      mealFromIdea,
    }),
    [state, toggleDone, assignToFirstEmpty, clearSlot, assignToSlot, toggleShoppingItem, addExtraItem, removeExtraItem, addIdea, removeIdea, mealFromIdea]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}

export function mealRefFromCatalog(id: string): MealRef {
  return toMealRef(id);
}

export function makeCustomMealRef(name: string): MealRef {
  return { id: `custom_${Date.now()}`, name, tag: 'Personnalisé', ingredients: [] };
}
