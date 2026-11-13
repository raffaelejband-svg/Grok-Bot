# Armadio Outfit

Armadio Outfit è un’app per il telefono. Tiene il guardaroba dei vestiti che hai già e ti propone un outfit in base all’occasione, alla stagione e ai colori che stanno bene insieme. Gli outfit che ti piacciono li salvi nei Preferiti, sempre su quel telefono.

L’indirizzo pubblico, in https, è [https://raffaelejband-svg.github.io/Grok-Bot/](https://raffaelejband-svg.github.io/Grok-Bot/). Si aggiorna quando il ramo `main` viene pubblicato da GitHub Actions.

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

## Metterla online

Ogni push su `main` lancia GitHub Actions: esegue i test, costruisce il sito e lo pubblica su GitHub Pages.

[https://raffaelejband-svg.github.io/Grok-Bot/](https://raffaelejband-svg.github.io/Grok-Bot/)

La pubblicazione usa la cartella `dist/`. In Impostazioni → Pages la sorgente deve essere **GitHub Actions**.

Per vederla in locale, dopo la build:

```bash
npm run preview
```

L’anteprima è su `http://localhost:4173/Grok-Bot/`, perché il sito pubblico sta in una sottocartella.

L’app ha più pagine (Guardaroba, Outfit, Preferiti). Perché funzionino anche quando aggiorni la pagina, l’hosting deve restituire `index.html` per quegli indirizzi. Nel progetto c’è già:

- `404.html`, utile su GitHub Pages
- `_redirects`, utile su Netlify

### Sul telefono, come un’app

Apri l’indirizzo https dal browser del telefono e installa **Armadio Outfit** sulla schermata Home. È una PWA: manifest, service worker e https. Si apre a tutto schermo, come un’app.

- Su iPhone: Condividi, poi «Aggiungi a Home».
- Su Android: menu del browser, poi «Installa app» o «Aggiungi a schermata Home».

I vestiti restano nel browser di quel telefono, non in un account.

## Come si usa

1. In **Guardaroba**, tocca **Aggiungi un capo**. Scatta una foto (fotocamera dietro) o sceglila dalla galleria. Categoria e colore si compilano da soli: controlla, cambiali se serve, e tocca **Conferma**. La stagione parte da «tutte» e lo stile da «casual». Puoi aggiungere un’altra foto subito, senza tornare all’elenco.
2. Per cercare tra i vestiti, tocca **Filtra i capi** e scegli categoria, colore, stagione o stile. **Azzera i filtri** li mostra di nuovo tutti.
3. Vai su **Outfit**, scegli occasione e stagione, poi tocca **Genera**.
4. **Rigenera** propone un’altra combinazione.
5. Su un capo del look, **Cambia** lo sostituisce con un altro dello stesso tipo, se nel guardaroba ce n’è uno che sta bene con il resto.
6. Tocca **Salva**. L’outfit compare in **Preferiti**.

Categoria e colore sono una proposta fatta sul telefono. Il colore si ricava dai pixel al centro della foto, scartando uno sfondo uniforme: un rosso o un azzurro pieni si leggono bene, un bianco può uscire argento e un marrone scuro può uscire nero. La categoria usa MobileNet v1 (circa 5 MB), un modello generico non addestrato sui vestiti. Jeans, magliette e scarpe che riempiono la foto spesso ci azzeccano; una borsa con un disegno, gli occhiali in un paesaggio o una persona intera spesso no. La foto non viene inviata a un server. La prima volta la categoria può impiegare qualche secondo, perché il telefono scarica il modello.
