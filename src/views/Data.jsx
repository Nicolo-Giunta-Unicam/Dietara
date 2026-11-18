import { useState } from 'react';
import { getSync, setSync, pingRemote, pullRemote, pushRemote } from '../storage.js';

const THEMES = [['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']];

export default function Data({ data, patch }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const json = () => JSON.stringify(data, null, 2);

  const prepare = () => { setText(json()); flash('Backup pronto qui sotto'); };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json()], { type: 'application/json' }));
    a.download = `dietara-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text || json()); flash('Copiato'); } catch { flash('Copia non riuscita: seleziona il testo a mano'); } };
  const load = (e) => { const f = e.target.files[0]; if (f) f.text().then(setText); };
  const restore = () => {
    try {
      const d = JSON.parse(text);
      if (!Array.isArray(d.recipes)) throw new Error();
      if (confirm('Sostituire i dati attuali con quelli del backup?')) { patch(d); flash('Dati ripristinati'); }
    } catch { flash('Il testo non è un backup valido'); }
  };
  const wipe = () => confirm('Cancellare ricette, ingredienti, piano e spesa? Non si può annullare.')
    && patch({ recipes: [], ingredients: [], plan: {}, shop: { checked: {}, extra: [], people: 1 } });

  return (
    <section>
      <div className="head"><h2>Dati e aspetto</h2></div>
      <div className="panel">
        <h3>Aspetto</h3>
        <div className="chipbar">{THEMES.map(([k, l]) => (
          <button key={k} className={`chipbtn${(data.settings?.theme || 'auto') === k ? ' on' : ''}`} onClick={() => patch({ settings: { ...data.settings, theme: k } })}>{l}</button>
        ))}</div>
      </div>
      <div className="panel">
        <h3>Backup</h3>
        <small>I dati sono salvati solo in questo browser. Fai un backup prima di cambiare dispositivo o cancellare la cronologia.</small>
        <div className="row">
          <button onClick={prepare}>Prepara backup</button><button onClick={download}>Scarica file</button><button onClick={copy}>Copia</button>
          <label className="btn">Carica file<input type="file" accept=".json,application/json" hidden onChange={load} /></label>
          {msg && <small>{msg}</small>}
        </div>
        <textarea className="mono" rows="8" placeholder="Il backup (JSON) compare qui. Per ripristinare, incolla o carica un backup e premi «Ripristina»." value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row"><button className="primary" disabled={!text.trim()} onClick={restore}>Ripristina dal testo</button></div>
      </div>
      <Sync data={data} patch={patch} />
      <div className="panel">
        <h3>Zona delicata</h3>
        <div><button className="danger" onClick={wipe}>Cancella tutti i dati</button></div>
      </div>
    </section>
  );
}

function Sync({ data, patch }) {
  const [s, setS] = useState(getSync());
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const upd = (p) => { setSync(p); setS(getSync()); };
  const run = async (label, fn) => {
    setBusy(true); setMsg(`${label}…`);
    try { setMsg(await fn()); } catch (e) { setMsg(`Errore: ${e.message}`); }
    setBusy(false);
  };
  const ok = s.url.trim().startsWith('https://script.google.com/') && s.token;
  const stamp = () => upd({ last: new Date().toISOString() });

  const test = () => run('Test in corso', async () => `Connesso al foglio «${(await pingRemote()).name}»`);
  const push = () => run('Invio in corso', async () => {
    if (!data.recipes.length && !data.ingredients.length && !confirm('Qui non ci sono dati: il foglio verrebbe svuotato. Continuare?')) return 'Annullato';
    await pushRemote(data); stamp(); return 'Dati inviati al foglio';
  });
  const pull = () => run('Download in corso', async () => {
    const d = await pullRemote();
    if (!confirm(`Sostituire i dati di questo dispositivo con quelli del foglio (${d.recipes.length} ricette)?`)) return 'Annullato';
    patch(d); stamp(); return 'Dati scaricati dal foglio';
  });

  return (
    <div className="panel">
      <h3>Sincronizzazione con Google Sheets</h3>
      <small>Incolla l’indirizzo della tua distribuzione Apps Script e la password scelta nello script. Restano solo su questo dispositivo.</small>
      <label>Indirizzo (finisce con /exec)<input type="url" placeholder="https://script.google.com/macros/s/…/exec" value={s.url} onChange={(e) => upd({ url: e.target.value.trim() })} /></label>
      <label>Password<input type="password" autoComplete="off" value={s.token} onChange={(e) => upd({ token: e.target.value })} /></label>
      <div className="row">
        <button disabled={!ok || busy} onClick={test}>Test connessione</button>
        <button disabled={!ok || busy} onClick={push}>Invia al foglio</button>
        <button disabled={!ok || busy} onClick={pull}>Scarica dal foglio</button>
      </div>
      <label className="inline"><input type="checkbox" checked={s.auto} disabled={!ok} onChange={(e) => upd({ auto: e.target.checked })} /> Invia automaticamente dopo ogni modifica</label>
      {msg && <p>{msg}</p>}
      {s.last && <small>Ultima sincronizzazione: {new Date(s.last).toLocaleString('it-IT')}</small>}
      <small>Su un nuovo dispositivo usa prima «Scarica dal foglio», poi attiva l’invio automatico.</small>
    </div>
  );
}
