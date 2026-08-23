import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ensureSignedIn, HOUSEHOLD_DOC_PATH, db } from './firebase';
import { DAYS, Ingredient, MEALS_CATALOG, Rayon } from './meals';

export type MealRef = {
  id: string;
  name: string;
  tag: string;
  ingredients: Ingredient[];
  // Carried through from an idea or a hand-typed custom meal so the AI
  // shopping list can read the recipe instead of guessing from the name alone.
  desc?: string;
  link?: string;
};

export type WeekDay = { day: string; meal: MealRef | null; done: boolean };
export type NextMenuSlot = { day: string; meal: MealRef | null };
export type Idea = { id: number; name: string; desc: string; link: string };
export type ExtraItem = { id: number; name: string; rayon: Rayon };
export type HistoryEntry = { mealId: string; name: string; tag: string; ingredients: Ingredient[]; weekStartedAt: number };

const toMealRef = (id: string): MealRef => {
  const m = MEALS_CATALOG[id];
  return { id: m.id, name: m.name, tag: m.tag, ingredients: m.ingredients };
};

const ideaToMealRef = (idea: Idea): MealRef => ({
  id: `idea_${idea.id}`,
  name: idea.name,
  tag: 'Envie',
  ingredients: [],
  desc: idea.desc.trim() || undefined,
  link: idea.link.trim() || undefined,
});

type State = {
  week: WeekDay[];
  nextMenu: NextMenuSlot[];
  ideas: Idea[];
  shoppingChecked: Record<string, boolean>;
  extraItems: ExtraItem[];
  history: HistoryEntry[];
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
  history: [],
};

type StoreValue = State & {
  loading: boolean;
  toggleDone: (index: number) => void;
  startNewWeek: () => void;
  assignToFirstEmpty: (meal: MealRef) => void;
  clearSlot: (index: number) => void;
  assignToSlot: (index: number, meal: MealRef) => void;
  toggleShoppingItem: (name: string) => void;
  addExtraItem: (name: string, rayon: Rayon) => void;
  removeExtraItem: (id: number) => void;
  renameExtraItem: (id: number, name: string) => void;
  addMealIngredient: (mealId: string, name: string, rayon: Rayon) => void;
  renameMealIngredient: (mealId: string, oldName: string, newName: string) => void;
  removeMealIngredient: (mealId: string, name: string) => void;
  addIdea: (name: string, desc: string, link: string) => void;
  removeIdea: (id: number) => void;
  mealFromIdea: (idea: Idea) => MealRef;
  applyAiIngredients: (results: { id: string; ingredients: Ingredient[] }[]) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const householdDocRef = () => (db ? doc(db, ...HOUSEHOLD_DOC_PATH) : null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<State>(initialState);
  const [loading, setLoading] = useState<boolean>(!!db);
  const stateRef = useRef(state);

  useEffect(() => {
    const ref = householdDocRef();
    if (!ref) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;

    ensureSignedIn()
      .then(() => {
        if (cancelled) return;
        unsub = onSnapshot(ref, (snap) => {
          if (snap.exists()) {
            // Merge over defaults so a household document saved before a field
            // existed (e.g. `history`, added later) doesn't come back as
            // `undefined` and crash code that expects an array/object there.
            const data = { ...initialState, ...(snap.data() as Partial<State>) };
            stateRef.current = data;
            setStateRaw(data);
            setLoading(false);
          } else {
            setDoc(ref, initialState).catch(() => {});
          }
        });
      })
      .catch(() => setLoading(false));

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  // Applies a local state update and, when Firebase is configured, persists it
  // to the shared household document so other devices pick it up in real time.
  const commit = useCallback((updater: (s: State) => State) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setStateRaw(next);
    const ref = householdDocRef();
    if (ref) setDoc(ref, next).catch(() => {});
  }, []);

  const toggleDone = useCallback(
    (index: number) => {
      commit((s) => ({
        ...s,
        week: s.week.map((d, i) => (i === index ? { ...d, done: !d.done } : d)),
      }));
    },
    [commit]
  );

  const startNewWeek = useCallback(() => {
    commit((s) => {
      const now = Date.now();
      const newHistory = [...s.history];
      s.nextMenu.forEach((slot) => {
        if (slot.meal) {
          newHistory.push({ mealId: slot.meal.id, name: slot.meal.name, tag: slot.meal.tag, ingredients: slot.meal.ingredients, weekStartedAt: now });
        }
      });
      return {
        ...s,
        week: s.nextMenu.map((slot) => ({ day: slot.day, meal: slot.meal, done: false })),
        nextMenu: DAYS.map((day) => ({ day, meal: null })),
        history: newHistory,
        shoppingChecked: {},
        extraItems: [],
      };
    });
  }, [commit]);

  const assignToFirstEmpty = useCallback(
    (meal: MealRef) => {
      commit((s) => {
        const idx = s.nextMenu.findIndex((sl) => !sl.meal);
        if (idx === -1) return s;
        return { ...s, nextMenu: s.nextMenu.map((sl, i) => (i === idx ? { ...sl, meal } : sl)) };
      });
    },
    [commit]
  );

  const clearSlot = useCallback(
    (index: number) => {
      commit((s) => ({
        ...s,
        nextMenu: s.nextMenu.map((sl, i) => (i === index ? { ...sl, meal: null } : sl)),
      }));
    },
    [commit]
  );

  const assignToSlot = useCallback(
    (index: number, meal: MealRef) => {
      commit((s) => ({
        ...s,
        nextMenu: s.nextMenu.map((sl, i) => (i === index ? { ...sl, meal } : sl)),
      }));
    },
    [commit]
  );

  const toggleShoppingItem = useCallback(
    (name: string) => {
      commit((s) => ({ ...s, shoppingChecked: { ...s.shoppingChecked, [name]: !s.shoppingChecked[name] } }));
    },
    [commit]
  );

  const addExtraItem = useCallback(
    (name: string, rayon: Rayon) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      commit((s) => ({
        ...s,
        extraItems: [...s.extraItems, { id: Date.now(), name: trimmed, rayon }],
      }));
    },
    [commit]
  );

  const removeExtraItem = useCallback(
    (id: number) => {
      commit((s) => ({ ...s, extraItems: s.extraItems.filter((i) => i.id !== id) }));
    },
    [commit]
  );

  const renameExtraItem = useCallback(
    (id: number, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      commit((s) => ({ ...s, extraItems: s.extraItems.map((i) => (i.id === id ? { ...i, name: trimmed } : i)) }));
    },
    [commit]
  );

  // Ingredients baked into a meal only apply to the meal's occurrences in
  // *this* week's menu (nextMenu), not the shared catalog recipe, so a
  // household can tweak "what to buy for this week's lasagna" without
  // changing the lasagna recipe for everyone forever.
  const updateMealIngredients = useCallback(
    (mealId: string, updater: (ingredients: Ingredient[]) => Ingredient[]) => {
      commit((s) => ({
        ...s,
        nextMenu: s.nextMenu.map((slot) =>
          slot.meal && slot.meal.id === mealId ? { ...slot, meal: { ...slot.meal, ingredients: updater(slot.meal.ingredients) } } : slot
        ),
      }));
    },
    [commit]
  );

  const addMealIngredient = useCallback(
    (mealId: string, name: string, rayon: Rayon) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      updateMealIngredients(mealId, (ingredients) =>
        ingredients.some((i) => i.name === trimmed) ? ingredients : [...ingredients, { name: trimmed, rayon }]
      );
    },
    [updateMealIngredients]
  );

  const renameMealIngredient = useCallback(
    (mealId: string, oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      updateMealIngredients(mealId, (ingredients) => ingredients.map((i) => (i.name === oldName ? { ...i, name: trimmed } : i)));
    },
    [updateMealIngredients]
  );

  const removeMealIngredient = useCallback(
    (mealId: string, name: string) => {
      updateMealIngredients(mealId, (ingredients) => ingredients.filter((i) => i.name !== name));
    },
    [updateMealIngredients]
  );

  const addIdea = useCallback(
    (name: string, desc: string, link: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      commit((s) => ({
        ...s,
        ideas: [...s.ideas, { id: Date.now(), name: trimmed, desc: desc.trim(), link: link.trim() }],
      }));
    },
    [commit]
  );

  const removeIdea = useCallback(
    (id: number) => {
      commit((s) => ({ ...s, ideas: s.ideas.filter((i) => i.id !== id) }));
    },
    [commit]
  );

  const mealFromIdea = useCallback((idea: Idea) => ideaToMealRef(idea), []);

  const applyAiIngredients = useCallback(
    (results: { id: string; ingredients: Ingredient[] }[]) => {
      const byId = new Map(results.map((r) => [r.id, r.ingredients]));
      commit((s) => ({
        ...s,
        nextMenu: s.nextMenu.map((sl) => {
          const ingredients = sl.meal ? byId.get(sl.meal.id) : undefined;
          return ingredients && sl.meal ? { ...sl, meal: { ...sl.meal, ingredients } } : sl;
        }),
      }));
    },
    [commit]
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      loading,
      toggleDone,
      startNewWeek,
      assignToFirstEmpty,
      clearSlot,
      assignToSlot,
      toggleShoppingItem,
      addExtraItem,
      removeExtraItem,
      renameExtraItem,
      addMealIngredient,
      renameMealIngredient,
      removeMealIngredient,
      addIdea,
      removeIdea,
      mealFromIdea,
      applyAiIngredients,
    }),
    [
      state,
      loading,
      toggleDone,
      startNewWeek,
      assignToFirstEmpty,
      clearSlot,
      assignToSlot,
      toggleShoppingItem,
      addExtraItem,
      removeExtraItem,
      renameExtraItem,
      addMealIngredient,
      renameMealIngredient,
      removeMealIngredient,
      addIdea,
      removeIdea,
      mealFromIdea,
      applyAiIngredients,
    ]
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

export function makeCustomMealRef(name: string, desc?: string, link?: string): MealRef {
  return {
    id: `custom_${Date.now()}`,
    name,
    tag: 'Personnalisé',
    ingredients: [],
    desc: desc?.trim() || undefined,
    link: link?.trim() || undefined,
  };
}
