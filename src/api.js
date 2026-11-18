// API pubbliche (gratuite, senza chiave, CORS abilitato)
// - TheMealDB: ricette  https://www.themealdb.com/api.php
// - Open Food Facts: valori nutrizionali  https://world.openfoodfacts.org/data

import { toSteps } from './utils.js';

export async function searchMeals(q) {
  const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('TheMealDB non raggiungibile');
  const { meals } = await r.json();
  return (meals || []).map(mealToRecipe);
}

const CAT = { Dessert: 'Dolce', Breakfast: 'Colazione', Pasta: 'Primo', Side: 'Contorno', Starter: 'Spuntino' };

function mealToRecipe(m) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = (m[`strIngredient${i}`] || '').trim();
    if (name) ingredients.push({ name, note: (m[`strMeasure${i}`] || '').trim(), grams: 0 });
  }
  return {
    id: `mdb-${m.idMeal}`, title: m.strMeal, image: m.strMealThumb, servings: 2,
    steps: toSteps(m.strInstructions),
    category: CAT[m.strCategory] || 'Secondo',
    tags: [...new Set([m.strArea, m.strCategory, ...(m.strTags || '').split(',')].map((t) => (t || '').trim()).filter((t) => t && t !== 'Unknown'))], source: 'TheMealDB', ingredients,
  };
}

export async function searchFoods(q) {
  const u = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=10'
    + `&fields=product_name,brands,nutriments&search_terms=${encodeURIComponent(q)}`;
  const r = await fetch(u);
  if (!r.ok) throw new Error('Open Food Facts non raggiungibile');
  const { products } = await r.json();
  return (products || [])
    .filter((p) => p.product_name && p.nutriments && p.nutriments['energy-kcal_100g'] != null)
    .map((p) => ({
      name: p.product_name + (p.brands ? ` (${p.brands.split(',')[0]})` : ''),
      kcal: +p.nutriments['energy-kcal_100g'] || 0,
      protein: +p.nutriments.proteins_100g || 0,
      carbs: +p.nutriments.carbohydrates_100g || 0,
      fat: +p.nutriments.fat_100g || 0,
    }));
}
