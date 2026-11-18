import { useState } from 'react';
import { round } from '../nutrition.js';

const fmt = (g) => (g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` : `${round(g)} g`);

export default function Shop({ data, patch, goto }) {
  const { recipes, plan, shop } = data;
  const people = Math.max(1, shop.people || 1);
  const [x, setX] = useState('');
  const [msg, setMsg] = useState('');
  const byId = Object.fromEntries(recipes.map((r) => [r.id, r]));

  // Quante volte ogni ricetta compare nel piano (una porzione per pasto)
  const times = {};
  Object.values(plan).forEach((day) => Object.values(day || {}).forEach((id) => { if (byId[id]) times[id] = (times[id] || 0) + 1; }));
  const meals = Object.values(times).reduce((a, b) => a + b, 0);

  const items = {};
  Object.entries(times).forEach(([id, n]) => {
    const r = byId[id];
    r.ingredients.forEach((i) => {
      const name = i.name.trim(); if (!name) return;
      const it = (items[name.toLowerCase()] ||= { key: name.toLowerCase(), name, grams: 0, notes: [], from: new Set() });
      if (i.grams > 0) it.grams += (i.grams / (r.servings || 1)) * n * people;
      else if (i.note) it.notes.push(i.note);
      it.from.add(r.title);
    });
  });
  const lines = [
    ...Object.values(items).map((it) => ({ key: it.key, name: it.name, qty: it.grams > 0 ? fmt(it.grams) : '', note: it.notes.length ? `da ricetta: ${[...new Set(it.notes)].join(' + ')}` : '', from: [...it.from].join(', ') })),
    ...shop.extra.map((t) => ({ key: `extra:${t}`, name: t, qty: '', note: '', from: 'aggiunto a mano', extra: true })),
  ].sort((a, b) => (!!shop.checked[a.key] - !!shop.checked[b.key]) || a.name.localeCompare(b.name));
  const left = lines.filter((l) => !shop.checked[l.key]);

  const up = (p) => patch((d) => ({ shop: { ...d.shop, ...(typeof p === 'function' ? p(d.shop) : p) } }));
  const toggle = (k) => up((s) => ({ checked: { ...s.checked, [k]: !s.checked[k] } }));
  const copy = async () => {
    const text = left.map((l) => `- ${[l.qty, l.name].filter(Boolean).join(' ')}${l.note ? ` (${l.note})` : ''}`).join('\n');
    try { await navigator.clipboard.writeText(text); setMsg('Lista copiata'); } catch { setMsg('Copia non riuscita: selezionala a mano'); }
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <section>
      <div className="head"><h2>Spesa</h2></div>
      {!meals && !shop.extra.length ? (
        <div className="panel"><p className="empty">Nessun pasto pianificato. Scegli le ricette nella schermata «Settimana» e qui compariranno gli ingredienti da comprare.</p>
          <div><button className="primary" onClick={() => goto('plan')}>Vai alla settimana</button></div></div>
      ) : (
        <>
          <div className="panel summary">
            <div><h3>{left.length} da comprare</h3><small>{meals} pasti pianificati · {lines.length - left.length} già presi</small></div>
            <label className="ppl">Persone<input type="number" min="1" value={people} onChange={(e) => up({ people: Math.max(1, +e.target.value || 1) })} /></label>
            <div className="row"><button onClick={copy} disabled={!left.length}>Copia lista</button>
              <button onClick={() => up({ checked: {} })} disabled={left.length === lines.length}>Azzera spunte</button>{msg && <small>{msg}</small>}</div>
          </div>
          <div className="panel">
            <ul className="shoplist">
              {lines.map((l) => (
                <li key={l.key} className={shop.checked[l.key] ? 'done' : ''}>
                  <label className="chk"><input type="checkbox" checked={!!shop.checked[l.key]} onChange={() => toggle(l.key)} />
                    <span><b>{l.name}</b>{l.note && <small> · {l.note}</small>}<small className="from">{l.from}</small></span></label>
                  <span className="qty">{l.qty}</span>
                  {l.extra && <button aria-label="Rimuovi" onClick={() => up((s) => ({ extra: s.extra.filter((t) => t !== l.name) }))}>✕</button>}
                </li>
              ))}
            </ul>
            <div className="row"><input placeholder="Aggiungi altro (es. carta da cucina)" value={x} onChange={(e) => setX(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && x.trim()) { up((s) => ({ extra: [...s.extra, x.trim()] })); setX(''); } }} />
              <button disabled={!x.trim()} onClick={() => { up((s) => ({ extra: [...s.extra, x.trim()] })); setX(''); }}>Aggiungi</button></div>
          </div>
        </>
      )}
    </section>
  );
}
