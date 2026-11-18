import { useState } from 'react';
import { searchFoods } from '../api.js';

const blank = { name: '', kcal: '', protein: '', carbs: '', fat: '' };

export default function Ingredients({ data, patch }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [state, setState] = useState('');
  const [m, setM] = useState(blank);
  const [flt, setFlt] = useState('');

  const find = async () => {
    setState('Ricerca in corso…');
    try { const r = await searchFoods(q); setRes(r); setState(r.length ? '' : 'Nessun risultato'); }
    catch (e) { setState(e.message); }
  };
  const save = (f) => patch((d) => ({ ingredients: [...d.ingredients.filter((i) => i.name !== f.name), f] }));
  const remove = (name) => patch((d) => ({ ingredients: d.ingredients.filter((i) => i.name !== name) }));

  return (
    <section>
      <div className="head"><h2>Ingredienti</h2></div>
      <div className="row">
        <input placeholder="Cerca su Open Food Facts (es. farro)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && q && find()} />
        <button className="primary" disabled={!q} onClick={find}>Cerca</button>
      </div>
      {state && <p className="empty">{state}</p>}
      <ul className="list">{res.map((f, i) => (
        <li key={i}><span>{f.name}<small> {f.kcal} kcal · P {f.protein} · C {f.carbs} · G {f.fat} (per 100 g)</small></span><button onClick={() => save(f)}>Salva</button></li>
      ))}</ul>

      <h3>Aggiungi a mano</h3>
      <div className="ing five">
        {Object.keys(blank).map((k) => (
          <input key={k} type={k === 'name' ? 'text' : 'number'} placeholder={{ name: 'Nome', kcal: 'kcal', protein: 'P', carbs: 'C', fat: 'G' }[k]}
            value={m[k]} onChange={(e) => setM({ ...m, [k]: k === 'name' ? e.target.value : e.target.value === '' ? '' : +e.target.value })} />
        ))}
        <button disabled={!m.name} onClick={() => { save(m); setM(blank); }}>Aggiungi</button>
      </div>

      <h3>Salvati ({data.ingredients.length})</h3>
      {data.ingredients.length > 5 && <input type="search" placeholder="Filtra i salvati" value={flt} onChange={(e) => setFlt(e.target.value)} />}
      {!data.ingredients.length && <p className="empty">Gli ingredienti salvati compaiono come suggerimenti quando scrivi una ricetta.</p>}
      <ul className="list">{data.ingredients.filter((f) => f.name.toLowerCase().includes(flt.toLowerCase())).map((f) => (
        <li key={f.name}><span>{f.name}<small> {f.kcal} kcal · P {f.protein} · C {f.carbs} · G {f.fat}</small></span><button onClick={() => remove(f.name)}>Elimina</button></li>
      ))}</ul>
    </section>
  );
}
