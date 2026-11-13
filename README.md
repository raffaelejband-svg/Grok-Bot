# Armadio Outfit

Armadio Outfit è un’app per il telefono: ti aiuta a creare outfit con i vestiti che hai già nell’armadio.

In questa versione **capi e outfit restano solo nel browser** di questo dispositivo. Non c’è un account e non c’è un server. Se cancelli i dati del sito, o cambi telefono o browser, i vestiti salvati non ci sono più.

Per ora vedi tre schermate — Guardaroba, Outfit e Preferiti — ancora vuote. Il salvataggio dei capi (foto comprese) è già pronto nel browser. Il modulo per aggiungere un capo e i suggerimenti di outfit arrivano dopo.

## Cosa ti serve

- [Node.js](https://nodejs.org/) versione 20 o successiva. npm è già incluso.
- Un browser aggiornato (Chrome, Safari, Firefox o Edge).

Per controllare Node:

```bash
node -v
```

## Comandi

Apri il terminale nella cartella del progetto.

Installare le librerie:

```bash
npm install
```

Avviare l’app sul computer:

```bash
npm run dev
```

Apri nel browser l’indirizzo che compare nel terminale, di solito `http://localhost:5173`.

Eseguire i test:

```bash
npm test
```

Creare la cartella da pubblicare:

```bash
npm run build
```

Il sito pronto è nella cartella `dist/`.

Per guardare in locale proprio quella versione, dopo la build:

```bash
npm run preview
```

## Pubblicare

`dist/` è un sito statico: file pronti, senza un server tuo. Puoi copiarli su un hosting statico qualsiasi, per esempio Netlify, Cloudflare Pages, Vercel o GitHub Pages.

Se l’hosting costruisce il sito dal codice, imposta:

- comando di build: `npm run build`
- cartella da pubblicare: `dist`

Se carichi i file a mano, carica **il contenuto** di `dist/`.

L’app ha più pagine (Guardaroba, Outfit, Preferiti). Perché funzionino anche quando aggiorni la pagina, l’hosting deve restituire `index.html` per quegli indirizzi. Nel progetto c’è già:

- `404.html`, utile su GitHub Pages
- `_redirects`, utile su Netlify

Su un telefono, con il sito aperto in https, puoi aggiungere **Armadio Outfit** alla schermata Home: si apre a tutto schermo, come un’app. I vestiti restano comunque nel browser di quel telefono, non in un account.
