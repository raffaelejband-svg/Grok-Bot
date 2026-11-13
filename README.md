# Armadio Outfit

Armadio Outfit è un’app per il telefono. Tiene il guardaroba dei vestiti che hai già e ti propone un outfit in base all’occasione, alla stagione e ai colori che stanno bene insieme. Gli outfit che ti piacciono li salvi nei Preferiti, sempre su quel telefono.

## Cosa fa

- Nel **Guardaroba** aggiungi i tuoi capi, ognuno con una foto.
- In **Outfit** scegli occasione e stagione: l’app compone un look solo con i vestiti che hai.
- Nei **Preferiti** ritrovi gli outfit che hai salvato.

Per un outfit servono almeno un top, un paio di pantaloni e un paio di scarpe. Se hai anche giacche o accessori, possono entrare nel look.

## Dove restano i dati

Capi e outfit restano solo nel browser di questo dispositivo, in un archivio locale chiamato IndexedDB. Non c’è un account e non c’è un server: niente viene inviato online.

Se cancelli i dati del sito, o cambi telefono o browser, i vestiti salvati non ci sono più.

## Cosa ti serve

- [Node.js](https://nodejs.org/) versione 20 o successiva. npm è già incluso.
- Un browser aggiornato (Chrome, Safari, Firefox o Edge).

Per controllare Node, apri il terminale e scrivi:

```bash
node -v
```

## Avviare l’app

Apri il terminale nella cartella del progetto.

La prima volta, e dopo ogni aggiornamento, installa le librerie:

```bash
npm install
```

Poi avvia l’app sul computer:

```bash
npm run dev
```

Apri nel browser l’indirizzo che compare nel terminale. Di solito è `http://localhost:5173`.

## Controllare che funzioni

Nella stessa cartella:

```bash
npm test
```

Se i test passano, il terminale finisce senza errori.

## Preparare la versione da pubblicare

```bash
npm run build
```

Il sito pronto finisce nella cartella `dist/`.

Per vederla in locale, dopo la build:

```bash
npm run preview
```

## Metterla online

`dist/` è un sito statico: file già pronti, senza un server tuo. Puoi copiarli su un hosting statico qualsiasi, per esempio Netlify, Cloudflare Pages, Vercel o GitHub Pages.

Se l’hosting costruisce il sito dal codice, imposta:

- comando di build: `npm run build`
- cartella da pubblicare: `dist`

Se carichi i file a mano, carica **il contenuto** di `dist/`.

L’app ha più pagine (Guardaroba, Outfit, Preferiti). Perché funzionino anche quando aggiorni la pagina, l’hosting deve restituire `index.html` per quegli indirizzi. Nel progetto c’è già:

- `404.html`, utile su GitHub Pages
- `_redirects`, utile su Netlify

### Sul telefono, come un’app

Con il sito aperto in https, dal browser del telefono puoi installare **Armadio Outfit** sulla schermata Home. È una PWA: si apre a tutto schermo, come un’app.

- Su iPhone: Condividi, poi «Aggiungi a Home».
- Su Android: menu del browser, poi «Installa app» o «Aggiungi a schermata Home».

I vestiti restano nel browser di quel telefono, non in un account.

## Come si usa

1. In **Guardaroba**, tocca **Aggiungi un capo**. Scegli una foto (scattala o prendila dalla galleria), poi categoria, colore, stagione e stile. Tocca **Salva il capo**.
2. Per cercare tra i vestiti, tocca **Filtra i capi** e scegli categoria, colore, stagione o stile. **Azzera i filtri** li mostra di nuovo tutti.
3. Vai su **Outfit**, scegli occasione e stagione, poi tocca **Genera**.
4. **Rigenera** propone un’altra combinazione.
5. Su un capo del look, **Cambia** lo sostituisce con un altro dello stesso tipo, se nel guardaroba ce n’è uno che sta bene con il resto.
6. Tocca **Salva**. L’outfit compare in **Preferiti**.
