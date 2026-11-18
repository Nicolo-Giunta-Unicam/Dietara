import { round } from '../nutrition.js';

// Barra proporzionale dei macronutrienti (kcal da proteine 4, carboidrati 4, grassi 9)
export function MacroBar({ m }) {
  const p = m.protein * 4, c = m.carbs * 4, f = m.fat * 9, t = p + c + f || 1;
  return (
    <div className="bar" aria-hidden>
      <i style={{ width: `${(p / t) * 100}%`, background: 'var(--p)' }} />
      <i style={{ width: `${(c / t) * 100}%`, background: 'var(--c)' }} />
      <i style={{ width: `${(f / t) * 100}%`, background: 'var(--f)' }} />
    </div>
  );
}

export function MacroChips({ m }) {
  return (
    <div className="chips">
      <b>{round(m.kcal)} <small>kcal</small></b>
      <span><i style={{ background: 'var(--p)' }} />P {round(m.protein)}</span>
      <span><i style={{ background: 'var(--c)' }} />C {round(m.carbs)}</span>
      <span><i style={{ background: 'var(--f)' }} />G {round(m.fat)}</span>
    </div>
  );
}

export function Ring({ value, max }) {
  const c = 2 * Math.PI * 18, pct = Math.min(1, value / (max || 1)), over = value > max * 1.1;
  return (
    <svg className="ring" width="46" height="46" viewBox="0 0 44 44" role="img" aria-label={`${round(value)} kcal su ${round(max)}`}>
      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" strokeWidth="5" />
      <circle cx="22" cy="22" r="18" fill="none" stroke={over ? 'var(--f)' : 'var(--p)'} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="11" fill="currentColor">{round(pct * 100)}%</text>
    </svg>
  );
}

// Foto della ricetta, oppure un segnaposto colorato con l'iniziale
export function Cover({ r, big }) {
  const h = [...(r.title || '?')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
  return r.image
    ? <img className={`cover${big ? ' big' : ''}`} src={r.image} alt={r.title} loading="lazy" />
    : <div className={`cover ph${big ? ' big' : ''}`} style={{ '--h': h }} aria-hidden>{(r.title || '?')[0].toUpperCase()}</div>;
}
