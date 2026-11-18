// "Preparazione" come elenco di passaggi. Accetta anche il vecchio testo unico (diviso per righe).
export function toSteps(text) {
  return String(text || '').split(/\r?\n+/).map((s) => s.trim())
    .filter((s) => s && !/^(step\s*)?\d+[.)]?$/i.test(s));
}
export const CATS = ['Colazione', 'Primo', 'Secondo', 'Contorno', 'Dolce', 'Spuntino'];
export const normalize = (r) => ({ ...r, steps: Array.isArray(r.steps) ? r.steps : toSteps(r.instructions), category: r.category || '', tags: r.tags || [], fav: !!r.fav, time: r.time ?? '' });

// Ridimensiona una foto scelta dall'utente e la comprime in JPEG (data URL), per non riempire il localStorage.
export function resizeImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error('Immagine non valida'));
    img.src = URL.createObjectURL(file);
  });
}
