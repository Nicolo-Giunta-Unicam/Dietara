// Livello di persistenza: ogni adapter espone load() e save(data).
// Oggi si usa localStorage. Per Google Sheets basta completare sheetsAdapter e cambiare `adapter` in fondo.

import { normalize } from './utils.js';

const KEY = 'dietara-v1';
const OLD_KEY = 'dispensa-v1'; // nome precedente dell'app: i dati già salvati vengono recuperati

const F = (name, kcal, protein, carbs, fat) => ({ name, kcal, protein, carbs, fat });
const DEMO_ING = [
  F('Petto di pollo', 165, 31, 0, 3.6), F('Riso (crudo)', 350, 7, 78, 0.6), F('Olio extravergine', 884, 0, 0, 100),
  F('Pomodori', 18, 0.9, 3.9, 0.2), F('Fiocchi d’avena', 370, 13, 60, 7), F('Yogurt greco', 59, 10, 3.6, 0.4),
  F('Banana', 89, 1.1, 23, 0.3), F('Uova', 143, 12.6, 0.7, 9.5), F('Pasta di semola', 355, 12.5, 72, 1.5), F('Salmone', 208, 20, 0, 13),
];
const withG = (name, grams) => ({ ...DEMO_ING.find((i) => i.name === name), grams });
const DEMO_RECIPES = [
  { id: 'demo-1', title: 'Pollo, riso e pomodori', servings: 2, time: 35, fav: true, category: 'Secondo', tags: ['proteico'], instructions: 'Cuoci il riso in acqua salata.\nRosola il pollo a pezzi con l’olio.\nAggiungi i pomodori e cuoci per 10 minuti.\nUnisci il riso e servi.',
    ingredients: [withG('Petto di pollo', 250), withG('Riso (crudo)', 140), withG('Olio extravergine', 10), withG('Pomodori', 200)] },
  { id: 'demo-2', title: 'Overnight oats alla banana', servings: 1, time: 5, category: 'Colazione', tags: ['veloce', 'vegetariano'], instructions: 'Mescola l’avena con lo yogurt.\nLascia riposare una notte in frigo.\nAl mattino aggiungi la banana a rondelle.',
    ingredients: [withG('Fiocchi d’avena', 80), withG('Yogurt greco', 200), withG('Banana', 120)] },
  { id: 'demo-3', title: 'Pasta al pomodoro', servings: 2, time: 20, category: 'Primo', tags: ['vegetariano', 'veloce'],
    steps: ['Cuoci la pasta in acqua salata.', 'Scalda i pomodori a pezzi con l’olio.', 'Condisci la pasta e servi.'],
    ingredients: [withG('Pasta di semola', 180), withG('Pomodori', 400), withG('Olio extravergine', 15)] },
  { id: 'demo-4', title: 'Frittata di uova', servings: 2, time: 15, category: 'Secondo', tags: ['vegetariano', 'proteico'],
    steps: ['Sbatti le uova.', 'Cuoci in padella con un filo d’olio, girando a metà.'],
    ingredients: [withG('Uova', 240), withG('Olio extravergine', 10)] },
];

// Con la build "demo" (anteprima in chat) si parte con qualche dato di esempio.
const DEMO = typeof __DEMO__ !== 'undefined' && __DEMO__;

export const emptyData = () => ({
  recipes: DEMO ? DEMO_RECIPES.map(normalize) : [],
  ingredients: DEMO ? DEMO_ING : [],
  plan: {}, // plan[giorno][pasto] = id ricetta
  settings: { theme: 'auto' },
  shop: { checked: {}, extra: [], people: 1 }, // elenco della spesa
  targets: { kcal: 2000, protein: 120, carbs: 230, fat: 65 },
});

export const localAdapter = {
  async load() {
    try { const d = { ...emptyData(), ...JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY) || '{}') };
      return { ...d, recipes: d.recipes.map(normalize) }; }
    catch { return emptyData(); }
  },
  async save(data) { localStorage.setItem(KEY, JSON.stringify(data)); },
};

/* SINCRONIZZAZIONE CON GOOGLE SHEETS
   Lo script da incollare nel foglio è in apps-script/Code.gs. URL e password si inseriscono nell'app
   (Dati → Sincronizzazione) e restano solo nel browser: non finiscono nel repository. */
const SYNC_KEY = 'dietara-sync';
const SYNC_DEFAULT = { url: '', token: '', auto: false, last: '' };

export const getSync = () => {
  try { return { ...SYNC_DEFAULT, ...JSON.parse(localStorage.getItem(SYNC_KEY) || '{}') }; } catch { return { ...SYNC_DEFAULT }; }
};
export const setSync = (p) => localStorage.setItem(SYNC_KEY, JSON.stringify({ ...getSync(), ...p }));

const ERRORS = {
  unauthorized: 'Password errata',
  'token-non-impostato': 'Nello script Apps Script devi cambiare TOKEN con una tua password',
};

async function call(url, opts) {
  let j;
  try { j = await (await fetch(url, opts)).json(); }
  catch { throw new Error('Impossibile contattare lo script: controlla l’URL e che la distribuzione sia per «Chiunque»'); }
  if (j.error) throw new Error(ERRORS[j.error] || j.error);
  return j;
}

export const pingRemote = () => {
  const { url, token } = getSync();
  return call(`${url}?action=ping&token=${encodeURIComponent(token)}`);
};

export async function pullRemote() {
  const { url, token } = getSync();
  const { data } = await call(`${url}?token=${encodeURIComponent(token)}`);
  return { ...emptyData(), ...data, recipes: (data.recipes || []).map(normalize) };
}

export const pushRemote = (data) => {
  const { url, token } = getSync();
  // text/plain evita il preflight CORS con Apps Script
  return call(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ token, data }) });
};

export const adapter = localAdapter;
