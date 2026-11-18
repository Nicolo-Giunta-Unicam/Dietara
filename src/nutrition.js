// Un ingrediente di ricetta: { name, grams, kcal, protein, carbs, fat }  (valori nutrizionali per 100 g)
export const ZERO = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function ingredientTotals(i) {
  const f = (Number(i.grams) || 0) / 100;
  return {
    kcal: (Number(i.kcal) || 0) * f,
    protein: (Number(i.protein) || 0) * f,
    carbs: (Number(i.carbs) || 0) * f,
    fat: (Number(i.fat) || 0) * f,
  };
}

export const add = (a, b) => ({
  kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat,
});

export const recipeTotals = (r) => (r?.ingredients || []).reduce((s, i) => add(s, ingredientTotals(i)), ZERO);

export function perServing(r) {
  const n = Math.max(1, Number(r?.servings) || 1);
  const t = recipeTotals(r);
  return { kcal: t.kcal / n, protein: t.protein / n, carbs: t.carbs / n, fat: t.fat / n };
}

export const round = (n) => Math.round(n);
