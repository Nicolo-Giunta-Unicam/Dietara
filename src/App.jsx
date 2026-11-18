import { useEffect, useRef, useState } from 'react';
import { adapter, emptyData, getSync, setSync, pushRemote } from './storage.js';
import Recipes from './views/Recipes.jsx';
import Planner from './views/Planner.jsx';
import Ingredients from './views/Ingredients.jsx';
import Shop from './views/Shop.jsx';
import Data from './views/Data.jsx';
import Discover from './views/Discover.jsx';

export default function App() {
  const [data, setData] = useState(emptyData());
  const [tab, setTab] = useState('plan');
  const ready = useRef(false);

  useEffect(() => { adapter.load().then((d) => { setData(d); ready.current = true; }); }, []);
  useEffect(() => { if (ready.current) adapter.save(data); }, [data]);

  const timer = useRef();
  useEffect(() => { // invio automatico al foglio (se attivo), 2,5 s dopo l'ultima modifica
    if (!ready.current) return;
    const s = getSync();
    if (!s.auto || !s.url || (!data.recipes.length && !data.ingredients.length)) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => pushRemote(data).then(() => setSync({ last: new Date().toISOString() })).catch(() => {}), 2500);
  }, [data]);

  useEffect(() => { document.documentElement.dataset.theme = data.settings?.theme || 'auto'; }, [data.settings]);

  const patch = (p) => setData((d) => ({ ...d, ...(typeof p === 'function' ? p(d) : p) }));
  const TABS = [['plan', 'Settimana'], ['shop', 'Spesa'], ['recipes', 'Ricette', data.recipes.length], ['ingredients', 'Ingredienti', data.ingredients.length], ['discover', 'Cerca online'], ['data', 'Dati']];
  const props = { data, patch, goto: setTab };

  return (
    <div className="shell">
      <aside>
        <h1>Dietara</h1>
        <nav>{TABS.map(([k, l, n]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <span>{l}</span>{n > 0 && <em>{n}</em>}
          </button>
        ))}</nav>
      </aside>
      <main>
        {tab === 'plan' && <Planner {...props} />}
        {tab === 'shop' && <Shop {...props} />}
        {tab === 'recipes' && <Recipes {...props} />}
        {tab === 'ingredients' && <Ingredients {...props} />}
        {tab === 'data' && <Data {...props} />}
        {tab === 'discover' && <Discover {...props} />}
      </main>
    </div>
  );
}
