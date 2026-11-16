# Armadio Outfit

Armadio Outfit è un’app per il telefono. Tiene il guardaroba dei vestiti che hai già e ti propone un outfit in base all’occasione, alla stagione e ai colori che stanno bene insieme. Gli outfit che ti piacciono li salvi nei Preferiti, sempre su quel telefono.

L’indirizzo pubblico, in https, è [https://raffaelejband-svg.github.io/Grok-Bot/](https://raffaelejband-svg.github.io/Grok-Bot/). Si aggiorna quando il ramo `main` viene pubblicato da GitHub Actions.

## Cosa fa

- Nel **Guardaroba** aggiungi i tuoi capi, ognuno con una foto.
- In **Outfit** scegli occasione e stagione: l’app compone un look solo con i vestiti che hai.
- Nei **Preferiti** ritrovi gli outfit che hai salvato.

Per un outfit servono almeno un top, un paio di pantaloni e un paio di scarpe. Se hai anche giacche o accessori, possono entrare nel look. L’app evita colori che stonano e disegni che litigano, per esempio righe con quadri. Se può, non mette scarpe sport con una giacca elegante. Preferisce un tessuto adatto alla stagione: la lana esce dall’estate se hai un’alternativa, il denim in mezza stagione va bene.

## Dove restano i dati

Capi e outfit restano solo nel browser di questo dispositivo, in un archivio locale chiamato IndexedDB. Non c’è un account dell’app.

Senza una chiave, la foto non viene inviata a nessuno. Se in **Impostazioni** incolli una chiave di Google Gemini, la foto di un capo nuovo viene mandata a Google solo per leggerla. La chiave resta in questo browser, non nel codice e non su GitHub.

Se cancelli i dati del sito, o cambi telefono o browser, i vestiti salvati e la chiave non ci sono più.

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

1. In **Guardaroba**, tocca **Aggiungi un capo**. Prima di scattare vedi una cornice e quattro regole: un capo per foto, sfondo chiaro e semplice, il capo tutto dentro la cornice, luce buona e uniforme. Scatta con la fotocamera dietro, oppure scegli una foto dalla galleria. Puoi aggiungere più foto di seguito. Controlla i dati (tipo, colori, disegno, materiale, stagione, stile), cambiali se serve, e tocca **Conferma**. La stagione parte da «tutte» e lo stile da «casual».
2. Per cercare tra i vestiti, tocca **Filtra i capi** e scegli categoria, colore, stagione o stile. **Azzera i filtri** li mostra di nuovo tutti.
3. Vai su **Outfit**, scegli occasione e stagione, poi tocca **Genera**.
4. **Rigenera** propone un’altra combinazione.
5. Su un capo del look, **Cambia** lo sostituisce con un altro dello stesso tipo, se nel guardaroba ce n’è uno che sta bene con il resto.
6. Tocca **Salva**. L’outfit compare in **Preferiti**.

## Riconoscere la foto

Ci sono due modi. Quello senza chiave è già attivo. Quello forte si accende solo se incolli una chiave tua.

### Sul telefono, senza chiave

La foto non esce dal telefono. Il colore principale si legge dai pixel al centro, scartando uno sfondo uniforme. Un secondo colore compare solo se è davvero un’altra tinta, altrimenti resta vuoto. Il disegno diventa «righe» o «quadri» solo se il motivo è evidente; se no, «tinta unita». La fantasia da qui non si indovina.

La categoria usa MobileNet v1 (circa 5 MB), un modello generico non addestrato sui vestiti. La prima volta il telefono lo scarica e può metterci qualche secondo. Jeans, magliette e scarpe che riempiono la foto spesso ci azzeccano. Una borsa con un disegno, gli occhiali in un paesaggio o una persona intera spesso no.

Sotto-tipo e materiale restano «altro» e «non lo so», tranne qualche etichetta chiara: jeans → denim e pantaloni, sneaker → sneakers, mocassino, sandalo, stivale, t-shirt, felpa, cardigan, cappotto, borsa, cappello. Un completo viene segnato elegante. Stagione e stile, nel resto dei casi, non si compilano da soli: restano «tutte» e «casual». Controlla sempre prima di confermare.

### Con Google Gemini, se incolli la chiave

Il modello è **Gemini 3.5 Flash-Lite** (`gemini-3.5-flash-lite`). Vede la foto e compila gli elenchi fissi dell’app: categoria, tipo, colori, disegno, materiale, stile e stagione. È molto più utile del percorso sul telefono per il tessuto, lo stile e il tipo preciso (camicia, maglione, cintura). Può comunque sbagliare: controlla e cambia quello che non torna. Se la chiamata non riesce, l’app torna al riconoscimento sul telefono e lo dice.

Prezzi pubblici, pagina [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) (controllata il 16 novembre 2026): input 0,30 dollari per un milione di token (testo e immagine), output 2,50 dollari per un milione di token. Il piano gratuito indica input e output senza costo. La richiesta chiede poca «riflessione» del modello e una risoluzione media della foto. Le pagine di Google non concordano sul numero esatto di token di un’immagine (la guida API parla di circa 256 token a risoluzione media; un’altra guida, per i modelli Gemini 3, parla di circa 560). Anche contando duemila token in ingresso e mille in uscita, una foto a pagamento sta sotto un centesimo di euro. Qualche foto al giorno resta una spesa piccola. Non ho un cambio ufficiale dollaro/euro da citare, quindi non do una cifra al centesimo.

Privacy: senza chiave la foto resta sul telefono. Con la chiave, quella foto viene inviata a Google. Sul piano gratuito Google può usare i dati per migliorare i propri prodotti; sul piano a pagamento, la stessa pagina dice di no. La chiave sta solo in questo browser.

Per accendere il percorso forte:

1. Apri [Google AI Studio](https://aistudio.google.com/apikey) e entra con un account Google.
2. Crea una chiave API. Se chiede un progetto, va bene quello proposto.
3. Copiala.
4. Nell’app, tocca **Impostazioni** (sotto il nome Armadio Outfit), incolla la chiave e tocca **Salva la chiave**.

Da lì, le foto nuove usano Gemini. Puoi cancellare la chiave dalla stessa schermata: si torna al riconoscimento sul telefono.
