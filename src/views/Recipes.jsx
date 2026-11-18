import { useState } from 'react';
import { perServing, recipeTotals } from '../nutrition.js';
import { searchFoods } from '../api.js';
import { resizeImage, CATS } from '../utils.js';
import { MacroBar, MacroChips, Cover } from './Macros.jsx';

const blank = () => ({ id: `r-${Date.now()}`, title: '', servings: 2, time: '', fav: false, category: '', tags: [], image: '', steps: [''], ingredients: [{ name: '', grams: 100 }] });
const NOFILTER = { fav: false, time: '', q: '', cat: '', tag: '', kcal: '', prot: '', sort: 'name' };
const num = (v) => (v === '' ? '' : Number(v));

export default function Recipes({ data, patch }) {
  const [mode, setMode] = useState({ view: 'list' });
  const [f, setF] = useState(NOFILTER);
  const open = (id) => setMode({ view: 'detail', id });
  const toggleFav = (id) => patch((d) => ({ recipes: d.recipes.map((r) => (r.id === id ? { ...r, fav: !r.fav } : r)) }));
  const dup = (r) => { const c = { ...structuredClone(r), id: `r-${Date.now()}`, title: `${r.title} (copia)` }; patch((d) => ({ recipes: [...d.recipes, c] })); open(c.id); };
  const save = (r) => {
    const clean = { ...r, steps: r.steps.map((s) => s.trim()).filter(Boolean), ingredients: r.ingredients.filter((i) => i.name.trim()) };
    patch((d) => ({ recipes: d.recipes.some((x) => x.id === clean.id) ? d.recipes.map((x) => (x.id === clean.id ? clean : x)) : [...d.recipes, clean] }));
    open(clean.id);
  };
  const remove = (id) => {
    if (!confirm('Eliminare la ricetta?')) return;
    patch((d) => ({ recipes: d.recipes.filter((r) => r.id !== id) }));
    setMode({ view: 'list' });
  };

  if (mode.view === 'edit') return <Editor r={mode.r} ingredients={data.ingredients} onSave={save} onCancel={() => setMode(mode.r.title ? { view: 'detail', id: mode.r.id } : { view: 'list' })} />;
  const cur = data.recipes.find((r) => r.id === mode.id);
  if (mode.view === 'detail' && cur) return <Detail r={cur} onBack={() => setMode({ view: 'list' })} onEdit={() => setMode({ view: 'edit', r: structuredClone(cur) })} onDelete={() => remove(cur.id)} onFav={() => toggleFav(cur.id)} onDup={() => dup(cur)} />;

  const set = (p) => setF({ ...f, ...p });
  const q = f.q.trim().toLowerCase();
  const allTags = [...new Set(data.recipes.flatMap((r) => r.tags || []))].sort();
  const count = (c) => data.recipes.filter((r) => (c === '_none' ? !r.category : r.category === c)).length;
  const cats = [...CATS, '_none'].filter((c) => count(c) > 0);
  const list = data.recipes.filter((r) => {
    const ps = perServing(r);
    return (!q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)))
      && (!f.cat || (f.cat === '_none' ? !r.category : r.category === f.cat))
      && (!f.fav || r.fav) && (f.time === '' || (r.time > 0 && r.time <= +f.time))
      && (!f.tag || (r.tags || []).includes(f.tag))
      && (f.kcal === '' || ps.kcal <= +f.kcal) && (f.prot === '' || ps.protein >= +f.prot);
  }).sort((a, b) => f.sort === 'kcal' ? perServing(a).kcal - perServing(b).kcal
    : f.sort === 'prot' ? perServing(b).protein - perServing(a).protein : a.title.localeCompare(b.title));
  const active = f.fav || f.time !== '' || f.q || f.cat || f.tag || f.kcal !== '' || f.prot !== '';

  return (
    <section>
      <div className="head"><h2>Ricette</h2><button className="primary" onClick={() => setMode({ view: 'edit', r: blank() })}>Nuova ricetta</button></div>
      {data.recipes.length > 0 && (
        <div className="panel filters">
          <input type="search" placeholder="Cerca per nome o ingrediente" value={f.q} onChange={(e) => set({ q: e.target.value })} />
          <div className="chipbar">
            <button className={`chipbtn${!f.cat ? ' on' : ''}`} onClick={() => set({ cat: '' })}>Tutte {data.recipes.length}</button>
            <button className={`chipbtn${f.fav ? ' on' : ''}`} onClick={() => set({ fav: !f.fav })}>★ Preferite</button>
            {cats.map((c) => <button key={c} className={`chipbtn${f.cat === c ? ' on' : ''}`} onClick={() => set({ cat: f.cat === c ? '' : c })}>{c === '_none' ? 'Senza categoria' : c} {count(c)}</button>)}
          </div>
          <div className="fgrid">
            <label>Etichetta<select value={f.tag} onChange={(e) => set({ tag: e.target.value })}><option value="">Tutte</option>{allTags.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label>Max kcal a porzione<input type="number" min="0" placeholder="nessun limite" value={f.kcal} onChange={(e) => set({ kcal: e.target.value })} /></label>
            <label>Min proteine g a porzione<input type="number" min="0" placeholder="nessun minimo" value={f.prot} onChange={(e) => set({ prot: e.target.value })} /></label>
            <label>Max minuti<input type="number" min="0" placeholder="nessun limite" value={f.time} onChange={(e) => set({ time: e.target.value })} /></label>
            <label>Ordina per<select value={f.sort} onChange={(e) => set({ sort: e.target.value })}><option value="name">Nome</option><option value="kcal">Meno calorie</option><option value="prot">Più proteine</option></select></label>
          </div>
          <div className="row"><small>{list.length} di {data.recipes.length} ricette</small>{active && <button className="link" onClick={() => setF(NOFILTER)}>Azzera filtri</button>}</div>
        </div>
      )}
      {!data.recipes.length && <p className="empty">Ancora nessuna ricetta. Creane una tua oppure importala da «Cerca online».</p>}
      {data.recipes.length > 0 && !list.length && <p className="empty">Nessuna ricetta corrisponde ai filtri.</p>}
      <div className="grid">
        {list.map((r) => (
          <article key={r.id} className="card rcard" tabIndex={0} onClick={() => open(r.id)} onKeyDown={(e) => e.key === 'Enter' && open(r.id)}>
            <div className="cwrap"><Cover r={r} />
              <button className="star" aria-label={r.fav ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'} onClick={(e) => { e.stopPropagation(); toggleFav(r.id); }}>{r.fav ? '★' : '☆'}</button></div>
            <div className="body">
              <h3>{r.title}</h3>
              <Tags r={r} />
              <MacroChips m={perServing(r)} />
              <small>a porzione · {r.servings} porzioni · {r.steps.length} passaggi{r.time > 0 && ` · ${r.time} min`}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Tags({ r }) {
  if (!r.category && !(r.tags || []).length) return null;
  return <div className="tags">{r.category && <span className="pill cat">{r.category}</span>}{(r.tags || []).map((t) => <span key={t} className="pill">{t}</span>)}</div>;
}

function Detail({ r, onBack, onEdit, onDelete, onFav, onDup }) {
  const ps = perServing(r), tot = recipeTotals(r);
  const [sv, setSv] = useState(r.servings || 1);
  const [done, setDone] = useState({});
  const factor = sv / (r.servings || 1);
  return (
    <section className="detail">
      <button className="link" onClick={onBack}>‹ Tutte le ricette</button>
      <Cover r={r} big />
      <div className="head"><div><h2>{r.title}</h2><Tags r={r} />{r.time > 0 && <small>Tempo: {r.time} min</small>}</div><div className="row"><button onClick={onFav}>{r.fav ? '★ Preferita' : '☆ Preferita'}</button><button onClick={onDup}>Duplica</button><button onClick={onEdit}>Modifica</button><button className="danger" onClick={onDelete}>Elimina</button></div></div>
      <div className="cols">
        <div className="panel">
          <h3>Per porzione</h3><MacroChips m={ps} /><MacroBar m={ps} />
          <small>Totale ricetta: {Math.round(tot.kcal)} kcal · {r.servings} porzioni</small>
          <h3>Ingredienti</h3>
          <div className="row stepper"><small>Porzioni</small><button aria-label="Meno porzioni" onClick={() => setSv(Math.max(1, sv - 1))}>−</button><b>{sv}</b><button aria-label="Più porzioni" onClick={() => setSv(sv + 1)}>+</button></div>
          <ul className="ings">{r.ingredients.map((i, k) => (
            <li key={k}><span>{i.name}{i.note && <small> · {i.note}</small>}</span><b>{i.grams ? `${Math.round(i.grams * factor)} g` : '—'}</b></li>
          ))}</ul>
        </div>
        <div className="panel">
          <h3>Preparazione</h3>
          {r.steps.length ? <><small>Tocca un passaggio per segnarlo come fatto.</small><ol className="steps">{r.steps.map((s, k) => <li key={k} className={done[k] ? 'done' : ''} onClick={() => setDone({ ...done, [k]: !done[k] })}><p>{s}</p></li>)}</ol></> : <p className="empty">Nessun passaggio scritto. Aggiungili da «Modifica».</p>}
          {r.source && <small>Fonte: {r.source}</small>}
        </div>
      </div>
    </section>
  );
}

function Editor({ r, ingredients, onSave, onCancel }) {
  const [v, setV] = useState(r);
  const [busy, setBusy] = useState(-1);
  const [tagText, setTagText] = useState((r.tags || []).join(', '));
  const set = (p) => setV((x) => ({ ...x, ...p }));
  const setIng = (i, p) => set({ ingredients: v.ingredients.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const setStep = (i, t) => set({ steps: v.steps.map((x, k) => (k === i ? t : x)) });
  const move = (i, d) => { const s = [...v.steps], j = i + d; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; set({ steps: s }); };

  const onName = (i, name) => {
    const hit = ingredients.find((g) => g.name.toLowerCase() === name.toLowerCase());
    setIng(i, hit ? { ...hit } : { name });
  };
  const lookup = async (i) => {
    setBusy(i);
    try { const [f] = await searchFoods(v.ingredients[i].name); f ? setIng(i, { ...f, name: v.ingredients[i].name }) : alert('Nessun risultato'); }
    catch (e) { alert(e.message); }
    setBusy(-1);
  };
  const pickPhoto = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { set({ image: await resizeImage(f) }); } catch (err) { alert(err.message); }
  };

  return (
    <section className="form">
      <h2>{r.title ? 'Modifica ricetta' : 'Nuova ricetta'}</h2>

      <div className="panel photo">
        <Cover r={v} big />
        <div>
          <h3>Foto</h3>
          <div className="row">
            <label className="btn">Carica foto<input type="file" accept="image/*" hidden onChange={pickPhoto} /></label>
            {v.image && <button onClick={() => set({ image: '' })}>Rimuovi</button>}
          </div>
          <label>Oppure incolla un link<input type="url" placeholder="https://…" value={v.image.startsWith('data:') ? '' : v.image} onChange={(e) => set({ image: e.target.value })} /></label>
        </div>
      </div>

      <div className="panel">
        <div className="two">
          <label>Nome<input value={v.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <label>Porzioni<input type="number" min="1" value={v.servings} onChange={(e) => set({ servings: num(e.target.value) })} /></label>
        </div>
      </div>

      <div className="panel">
        <div className="two eq">
          <label>Tempo (minuti)<input type="number" min="0" value={v.time} onChange={(e) => set({ time: num(e.target.value) })} /></label>
          <label>Categoria<select value={v.category} onChange={(e) => set({ category: e.target.value })}><option value="">Senza categoria</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Etichette, separate da virgola<input placeholder="es. vegetariano, veloce" value={tagText} onChange={(e) => setTagText(e.target.value)} /></label>
        </div>
      </div>

      <div className="panel">
        <h3>Ingredienti <small>valori nutrizionali per 100 g</small></h3>
        <datalist id="ing">{ingredients.map((g) => <option key={g.name} value={g.name} />)}</datalist>
        <div className="ing head"><span>Ingrediente</span><span>g</span><span>kcal</span><span>P</span><span>C</span><span>G</span><span /><span /></div>
        {v.ingredients.map((i, k) => (
          <div className="ing" key={k}>
            <input list="ing" placeholder="es. Petto di pollo" value={i.name} onChange={(e) => onName(k, e.target.value)} />
            <input type="number" title="Grammi" value={i.grams ?? ''} onChange={(e) => setIng(k, { grams: num(e.target.value) })} />
            {['kcal', 'protein', 'carbs', 'fat'].map((f) => (
              <input key={f} type="number" title={f} value={i[f] ?? ''} onChange={(e) => setIng(k, { [f]: num(e.target.value) })} />
            ))}
            <button title="Compila i valori da Open Food Facts" disabled={!i.name || busy === k} onClick={() => lookup(k)}>{busy === k ? '…' : 'Auto'}</button>
            <button title="Rimuovi ingrediente" aria-label="Rimuovi ingrediente" onClick={() => set({ ingredients: v.ingredients.filter((_, j) => j !== k) })}>✕</button>
            {i.note && <small className="note">Nella ricetta originale: {i.note}</small>}
          </div>
        ))}
        <button onClick={() => set({ ingredients: [...v.ingredients, { name: '', grams: 100 }] })}>Aggiungi ingrediente</button>
      </div>

      <div className="panel">
        <h3>Preparazione <small>un passaggio per riquadro</small></h3>
        {v.steps.map((s, k) => (
          <div className="step" key={k}>
            <span className="n">{k + 1}</span>
            <textarea rows="3" placeholder="Descrivi questo passaggio" value={s} onChange={(e) => setStep(k, e.target.value)} />
            <div className="col">
              <button title="Sposta su" aria-label="Sposta su" disabled={k === 0} onClick={() => move(k, -1)}>↑</button>
              <button title="Sposta giù" aria-label="Sposta giù" disabled={k === v.steps.length - 1} onClick={() => move(k, 1)}>↓</button>
              <button title="Rimuovi passaggio" aria-label="Rimuovi passaggio" onClick={() => set({ steps: v.steps.filter((_, j) => j !== k) })}>✕</button>
            </div>
          </div>
        ))}
        <button onClick={() => set({ steps: [...v.steps, ''] })}>Aggiungi passaggio</button>
      </div>

      <div className="panel"><h3>Per porzione</h3><MacroChips m={perServing(v)} /><MacroBar m={perServing(v)} /></div>
      <div className="savebar"><button className="primary" disabled={!v.title.trim()} onClick={() => onSave({ ...v, tags: tagText.split(',').map((t) => t.trim()).filter(Boolean) })}>Salva ricetta</button><button onClick={onCancel}>Annulla</button></div>
    </section>
  );
}
