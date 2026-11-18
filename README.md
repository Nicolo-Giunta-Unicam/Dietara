# Dietara — ricette, dieta settimanale e macro

Sviluppo: `npm install && npm run dev`  ·  Build: `npm run build`

## Pubblicazione su GitHub Pages
Repo su GitHub → Settings → Pages → Source: **GitHub Actions**. Ogni push su `main` rilascia il sito.

## Sincronizzazione con Google Sheets
1. Crea un Google Sheet, apri Estensioni → Apps Script e incolla `apps-script/Code.gs`.
2. Cambia `TOKEN` con una tua password, esegui `setup` e autorizza.
3. Distribuisci → Nuova distribuzione → App web (esegui come: tu; accesso: chiunque) e copia l'URL `/exec`.
4. Nell'app: Dati → Sincronizzazione → incolla URL e password.

Dati salvati anche nel browser (localStorage). API usate: TheMealDB (ricette), Open Food Facts (valori nutrizionali).
