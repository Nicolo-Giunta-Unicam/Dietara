import { ZERO, add, perServing, round } from '../nutrition.js';
import { MacroBar, MacroChips, Ring, Cover } from './Macros.jsx';

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const MEALS = ['Colazione', 'Pranzo', 'Cena', 'Spuntino'];

const POOL = { Colazione: ['Colazione'], Pranzo: ['Primo', 'Secondo', 'Contorno'], Cena: ['Secondo', 'Primo', 'Contorno'], Spuntino: ['Spuntino', 'Dolce', 'Colazione'] };

export default function Planner({ data, patch }) {
  const { recipes, plan, targets } = data;
  const byId = Object.fromEntries(recipes.map((r) => [r.id, r]));
  const pick = (d, m, id) => patch((x) => ({ plan: { ...x.plan, [d]: { ...x.plan[d], [m]: id } } }));
  const dayTotal = (d) => MEALS.reduce((s, m) => (byId[plan[d]?.[m]] ? add(s, perServing(byId[plan[d][m]])) : s), ZERO);
  const week = DAYS.reduce((s, d) => add(s, dayTotal(d)), ZERO);

  const today = (new Date().getDay() + 6) % 7;
  const fill = () => patch((d) => {
    const np = { ...d.plan };
    DAYS.forEach((day) => { np[day] = { ...np[day] }; MEALS.forEach((m) => {
      if (np[day][m]) return;
      const pool = d.recipes.filter((r) => POOL[m].includes(r.category));
      if (pool.length) np[day][m] = pool[Math.floor(Math.random() * pool.length)].id;
    }); });
    return { plan: np };
  });
  const clear = () => confirm('Svuotare tutta la settimana?') && patch({ plan: {} });

  return (
    <section>
      <div className="head"><h2>Settimana</h2>
        <div className="row"><button onClick={fill} disabled={!recipes.length} title="Sceglie ricette in base alla categoria">Riempi gli spazi vuoti</button><button onClick={clear}>Svuota settimana</button></div></div>
      <div className="panel summary">
        <div><h3>Media giornaliera</h3><MacroChips m={{ kcal: week.kcal / 7, protein: week.protein / 7, carbs: week.carbs / 7, fat: week.fat / 7 }} /></div>
        <div className="targets"><h3>Obiettivo al giorno</h3>
          <div className="row">{[['kcal', 'kcal'], ['protein', 'Proteine g'], ['carbs', 'Carboidrati g'], ['fat', 'Grassi g']].map(([k, l]) => (
            <label key={k}>{l}<input type="number" value={targets[k]} onChange={(e) => patch({ targets: { ...targets, [k]: +e.target.value } })} /></label>
          ))}</div></div>
      </div>
      {!recipes.length && <p className="empty">Aggiungi qualche ricetta per iniziare a pianificare.</p>}
      <div className="days">
        {DAYS.map((d, di) => {
          const t = dayTotal(d), diff = t.kcal - targets.kcal;
          return (
            <article key={d} className={`card day${di === today ? ' today' : ''}`}>
              <div className="dh"><h3>{d}{di === today && <span className="pill cat">Oggi</span>}</h3><Ring value={t.kcal} max={targets.kcal} /></div>
              {MEALS.map((m) => {
                const r = byId[plan[d]?.[m]];
                return (
                  <div key={m} className={`slot${r ? ' full' : ''}`}>
                    {r && <div className="mini"><Cover r={r} /></div>}
                    <label>{m}
                      <select value={r ? r.id : ''} onChange={(e) => pick(d, m, e.target.value)}>
                        <option value="">Scegli una ricetta</option>
                        {recipes.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                      </select>
                    </label>
                  </div>
                );
              })}
              {[['P', 'protein', '--p'], ['C', 'carbs', '--c'], ['G', 'fat', '--f']].map(([l, k, c]) => (
                <div className="prog" key={k}><span>{l}</span><div className="bar"><i style={{ width: `${Math.min(100, (t[k] / (targets[k] || 1)) * 100)}%`, background: `var(${c})` }} /></div><small>{round(t[k])}/{targets[k]} g</small></div>
              ))}
              {t.kcal === 0 && <small>Nessun pasto pianificato</small>}
              {t.kcal > 0 && <small className={Math.abs(diff) > targets.kcal * 0.1 ? 'warn' : ''}>{diff > 0 ? '+' : ''}{round(diff)} kcal rispetto all’obiettivo</small>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
