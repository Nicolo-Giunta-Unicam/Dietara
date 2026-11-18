/**
 * Dietara · backend su Google Sheets
 *
 * Va incollato in Estensioni → Apps Script di un Google Sheet (script "collegato" al foglio).
 * Fogli gestiti: Recipes, Ingredients, Plan, Targets, Extra, Images (creati automaticamente).
 * Le foto caricate nell'app vengono salvate a pezzi nel foglio "Images", perché una cella
 * di Google Sheets non può contenere più di 50.000 caratteri.
 */

// 1) CAMBIA questa password: la stessa va inserita nell'app (Dati → Sincronizzazione).
const TOKEN = 'CAMBIA-QUESTA-PASSWORD';

const HEADERS = {
  Recipes: ['id', 'title', 'servings', 'time', 'fav', 'category', 'tags', 'source', 'image', 'steps', 'ingredients'],
  Ingredients: ['name', 'kcal', 'protein', 'carbs', 'fat'],
  Plan: ['day', 'meal', 'recipeId'],
  Targets: ['kcal', 'protein', 'carbs', 'fat'],
  Extra: ['key', 'value'],
  Images: ['recipeId', 'part', 'data'],
};
const CHUNK = 45000;

/** Esegui questa funzione una volta: crea i fogli e ti chiede le autorizzazioni. */
function setup() {
  Object.keys(HEADERS).forEach(ensureSheet_);
  SpreadsheetApp.getActive().toast('Dietara: fogli pronti');
}

function doGet(e) {
  try {
    const err = authError_(e.parameter.token);
    if (err) return json_({ error: err });
    if (e.parameter.action === 'ping') return json_({ ok: true, name: SpreadsheetApp.getActive().getName() });
    return json_({ data: readAll_() });
  } catch (ex) { return json_({ error: String(ex) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse(e.postData.contents);
    const err = authError_(body.token);
    if (err) return json_({ error: err });
    writeAll_(body.data || {});
    return json_({ ok: true, savedAt: new Date().toISOString() });
  } catch (ex) {
    return json_({ error: String(ex) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/* ---------- lettura ---------- */

function readAll_() {
  const imgs = {};
  rows_('Images').sort((a, b) => a.part - b.part).forEach((r) => { imgs[r.recipeId] = (imgs[r.recipeId] || '') + r.data; });

  const recipes = rows_('Recipes').map((r) => ({
    id: String(r.id),
    title: String(r.title),
    servings: Number(r.servings) || 1,
    time: r.time === '' ? '' : Number(r.time),
    fav: r.fav === true || String(r.fav).toUpperCase() === 'TRUE',
    category: String(r.category || ''),
    tags: String(r.tags || '').split(',').map((s) => s.trim()).filter(Boolean),
    source: String(r.source || ''),
    image: r.image === '@images' ? (imgs[r.id] || '') : String(r.image || ''),
    steps: parse_(r.steps, []),
    ingredients: parse_(r.ingredients, []),
  }));
  const ingredients = rows_('Ingredients').map((r) => ({ name: String(r.name), kcal: num_(r.kcal), protein: num_(r.protein), carbs: num_(r.carbs), fat: num_(r.fat) }));
  const plan = {};
  rows_('Plan').forEach((r) => { (plan[r.day] = plan[r.day] || {})[r.meal] = String(r.recipeId); });
  const t = rows_('Targets')[0];
  const extra = {};
  rows_('Extra').forEach((r) => { extra[r.key] = parse_(r.value, null); });

  const out = { recipes: recipes, ingredients: ingredients, plan: plan };
  if (t) out.targets = { kcal: num_(t.kcal), protein: num_(t.protein), carbs: num_(t.carbs), fat: num_(t.fat) };
  if (extra.shop) out.shop = extra.shop;
  if (extra.settings) out.settings = extra.settings;
  return out;
}

/* ---------- scrittura ---------- */

function writeAll_(d) {
  const imgRows = [];
  const recipeRows = (d.recipes || []).map((r) => {
    let image = r.image || '';
    if (image.indexOf('data:') === 0) {
      for (let i = 0, p = 0; i < image.length; i += CHUNK, p++) imgRows.push([r.id, p, image.substring(i, i + CHUNK)]);
      image = '@images';
    }
    return [r.id, r.title, r.servings, r.time === undefined ? '' : r.time, !!r.fav, r.category || '', (r.tags || []).join(', '),
      r.source || '', image, JSON.stringify(r.steps || []), JSON.stringify(r.ingredients || [])];
  });
  const planRows = [];
  Object.keys(d.plan || {}).forEach((day) => Object.keys(d.plan[day] || {}).forEach((meal) => {
    if (d.plan[day][meal]) planRows.push([day, meal, d.plan[day][meal]]);
  }));
  const t = d.targets || {};

  write_('Recipes', recipeRows);
  write_('Ingredients', (d.ingredients || []).map((i) => [i.name, i.kcal, i.protein, i.carbs, i.fat]));
  write_('Plan', planRows);
  write_('Targets', d.targets ? [[t.kcal, t.protein, t.carbs, t.fat]] : []);
  write_('Extra', [['shop', JSON.stringify(d.shop || {})], ['settings', JSON.stringify(d.settings || {})]]);
  write_('Images', imgRows);
}

/* ---------- utilità ---------- */

function authError_(token) {
  if (TOKEN === 'CAMBIA-QUESTA-PASSWORD') return 'token-non-impostato';
  return token === TOKEN ? '' : 'unauthorized';
}

function ensureSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  const h = HEADERS[name];
  sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

function rows_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues();
  const head = v.shift();
  return v.map((r) => { const o = {}; head.forEach((k, i) => { o[k] = r[i]; }); return o; });
}

function write_(name, rows) {
  const h = HEADERS[name];
  const sh = ensureSheet_(name);
  if (sh.getMaxRows() > 1) sh.getRange(2, 1, sh.getMaxRows() - 1, h.length).clearContent();
  if (!rows.length) return;
  if (sh.getMaxRows() < rows.length + 1) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 1 - sh.getMaxRows());
  const rg = sh.getRange(2, 1, rows.length, h.length);
  if (name === 'Images') rg.setNumberFormat('@'); // testo semplice: evita che i pezzi di foto vengano interpretati come numeri o formule
  rg.setValues(rows);
}

const num_ = (v) => (v === '' || v === null ? '' : Number(v));
function parse_(v, fallback) { try { return JSON.parse(v); } catch (_) { return fallback; } }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
