import { useState } from 'react';
import { searchMeals } from '../api.js';
import { Cover } from './Macros.jsx';

export default function Discover({ data, patch, goto }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [state, setState] = useState('');

  const find = async () => {
    setState('Ricerca in corso…');
    try { const r = await searchMeals(q); setRes(r); setState(r.length ? '' : 'Nessuna ricetta trovata. La ricerca è in inglese, per esempio «chicken».'); }
    catch (e) { setState(`Ricerca non riuscita: ${e.message}`); }
  };
  const has = (r) => data.recipes.some((x) => x.id === r.id);
  const imp = (r) => { patch((d) => ({ recipes: has(r) ? d.recipes : [...d.recipes, r] })); goto('recipes'); };

  return (
    <section>
      <div className="head"><h2>Cerca online</h2></div>
      <div className="row">
        <input type="search" placeholder="es. chicken, pasta, salmon" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && q && find()} />
        <button className="primary" disabled={!q} onClick={find}>Cerca</button>
      </div>
      {state && <p className="empty">{state}</p>}
      <div className="grid">{res.map((r) => (
        <article key={r.id} className="card rcard">
          <Cover r={r} />
          <div className="body">
            <h3>{r.title}</h3>
            <small>{r.ingredients.length} ingredienti · {r.steps.length} passaggi. Dopo l’importazione inserisci le quantità in grammi.</small>
            <button className="primary" disabled={has(r)} onClick={() => imp(r)}>{has(r) ? 'Già importata' : 'Importa'}</button>
          </div>
        </article>
      ))}</div>
    </section>
  );
}
