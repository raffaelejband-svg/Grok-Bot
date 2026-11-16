# Armadio Outfit

Armadio Outfit è un’app per il telefono e per il computer. Tiene il guardaroba dei vestiti che hai già e ti propone un outfit in base all’occasione, alla stagione e ai colori che stanno bene insieme. Gli outfit che ti piacciono li salvi nei Preferiti. Con un account li ritrovi su tutti i dispositivi.

L’indirizzo pubblico, in https, è [https://raffaelejband-svg.github.io/Grok-Bot/](https://raffaelejband-svg.github.io/Grok-Bot/). Si aggiorna quando il ramo `main` viene pubblicato da GitHub Actions.

## Cosa fa

- Nel **Guardaroba** aggiungi i tuoi capi, ognuno con una foto.
- In **Outfit** scegli occasione e stagione: l’app compone un look solo con i vestiti che hai.
- Nei **Preferiti** ritrovi gli outfit che hai salvato.

Per un outfit servono almeno un top, un paio di pantaloni e un paio di scarpe. Se hai anche giacche o accessori, possono entrare nel look. L’app evita colori che stonano e disegni che litigano, per esempio righe con quadri. Se può, non mette scarpe sport con una giacca elegante. Preferisce un tessuto adatto alla stagione: la lana esce dall’estate se hai un’alternativa, il denim in mezza stagione va bene.

## Dove restano i dati

Senza account, capi e outfit restano nel browser di questo dispositivo, in un archivio locale chiamato IndexedDB. L’app si usa lo stesso.

Con un account, gli stessi capi, le foto e i preferiti si ritrovano su telefono e computer. Stanno nel progetto Firebase che crei tu. La chiave Gemini, se la salvi in **Impostazioni**, resta solo su quel dispositivo: non viene copiata sull’account.

Senza una chiave, la foto non viene inviata a Gemini. Se in **Impostazioni** incolli una chiave di Google Gemini, la foto di un capo nuovo viene mandata a Google solo per leggerla. La chiave resta in questo browser, non nel codice e non su GitHub.

Se cancelli i dati del sito, i vestiti su quel dispositivo e la chiave non ci sono più. Con l’account puoi scaricarli di nuovo da un altro dispositivo. La chiave va incollata di nuovo, su ogni dispositivo dove la vuoi.

## Lo stesso guardaroba su più dispositivi

Finché non fai questi passi, in **Account** leggi «Sincronizzazione da attivare». Non è un errore: l’app resta sul dispositivo.

Firebase è il servizio gratuito di Google che tiene l’account e le foto. Il piano si chiama Spark: non chiede una carta. Se un giorno superi i tetti, quel servizio si ferma fino al mese dopo, oppure si passa al piano a pagamento. I numeri stanno su [Firebase pricing](https://firebase.google.com/pricing) e possono cambiare. A novembre 2026, per Cloud Firestore il piano gratuito indica 1 GiB di dati, 50.000 letture al giorno, 20.000 scritture al giorno e 20.000 eliminazioni al giorno. Le foto usano Cloud Storage: il tetto di spazio e di scaricamento è sulla stessa pagina.

Le foto e i dati del guardaroba stanno nel progetto che crei tu. Li legge solo il tuo account, grazie alle regole nel repository. La chiave Gemini non viene caricata. L’accesso con email o con Google è gestito da Google: [privacy di Firebase](https://firebase.google.com/support/privacy) e [privacy di Google](https://policies.google.com/privacy).

Non scaricare una chiave privata e non incollare un file JSON di account di servizio. Servono solo sei valori pubblici dell’app web.

1. Apri [la console Firebase](https://console.firebase.google.com/) e crea un progetto. Lascia spenta la fatturazione. Se chiede Analytics, puoi lasciarlo spento.
2. Nel menu **Build**, apri **Authentication**, poi **Inizia**. Attiva **Email/Password**. Poi attiva **Google** e, se chiede un nome da mostrare, scrivi Armadio Outfit. La guida è [Email e password](https://firebase.google.com/docs/auth/web/password-auth) e [Accesso con Google](https://firebase.google.com/docs/auth/web/google-signin).
3. Apri **Firestore Database** e crea il database in **modalità produzione** (quella che non lo lascia aperto a tutti). Scegli una zona in Europa. Poi apri **Storage** e fai lo stesso, con la stessa zona. Guide: [Firestore](https://firebase.google.com/docs/firestore/quickstart) e [Storage](https://firebase.google.com/docs/storage/web/start).
4. In Firestore apri **Regole**, cancella il testo che c’è, incolla tutto il file `firestore.rules` di questo progetto e pubblica. In Storage apri **Regole**, incolla tutto il file `storage.rules` e pubblica. Sono le regole che lasciano vedere i vestiti solo a te. Guide: [regole Firestore](https://firebase.google.com/docs/firestore/security/get-started) e [regole Storage](https://firebase.google.com/docs/storage/security).
5. In Authentication apri **Impostazioni**, poi **Domini autorizzati**, e aggiungi `raffaelejband-svg.github.io`. Se provi l’app sul computer con `npm run dev`, aggiungi anche `localhost`.
6. Apri l’ingranaggio **Impostazioni progetto**, poi **Le tue app**, aggiungi un’app **Web** e copia i sei valori di `firebaseConfig`.
7. Su GitHub apri il repository, poi **Settings**, **Secrets and variables**, **Actions**, scheda **Variables**. Crea una variabile per ogni nome, con il valore copiato. Non sono segreti: sono la configurazione pubblica. I nomi sono questi:
   - `VITE_FIREBASE_API_KEY` è `apiKey`
   - `VITE_FIREBASE_AUTH_DOMAIN` è `authDomain`
   - `VITE_FIREBASE_PROJECT_ID` è `projectId`
   - `VITE_FIREBASE_STORAGE_BUCKET` è `storageBucket`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` è `messagingSenderId`
   - `VITE_FIREBASE_APP_ID` è `appId`
8. Apri **Actions**, scegli **Pubblica su GitHub Pages** e lancia **Run workflow**. Il sito si ricostruisce con quei valori. La guida di GitHub è [variables](https://docs.github.com/actions/learn-github-actions/variables).

Dopo, sul telefono e sul computer apri **Account**, tocca **Crea un account** oppure **Accedi**, o **Continua con Google**. Se su questo dispositivo ci sono già dei capi e l’account è vuoto, l’app chiede se caricarli. Se dici no, restano solo lì.

Dal computer, in **Aggiungi un capo**, **Scegli dalla galleria** puoi selezionare tante foto insieme. L’app le riconosce una per una e tu confermi.

Per provare sul computer prima di pubblicare, copia `.env.example` in un file `.env`, incolla gli stessi sei valori e avvia `npm run dev`. Il file `.env` non va su GitHub.

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

Senza account i vestiti restano nel browser di quel telefono. Con l’account li ritrovi anche sugli altri dispositivi.

## Come si usa

1. In **Guardaroba**, tocca **Aggiungi un capo**. Prima di scattare vedi una cornice e quattro regole: un capo per foto, sfondo chiaro e semplice, il capo tutto dentro la cornice, luce buona e uniforme. Scatta con la fotocamera dietro, oppure scegli una foto dalla galleria. Dal computer puoi selezionare tante foto insieme: l’app le riconosce e mostra a che punto è, poi tu confermi. Puoi anche aggiungere più foto di seguito, una alla volta. Controlla i dati (tipo, colori, disegno, materiale, stagione, stile), cambiali se serve, e tocca **Conferma**. La stagione parte da «tutte» e lo stile da «casual».
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

Privacy: senza chiave la foto resta sul telefono. Con la chiave, quella foto viene inviata a Google per essere letta. È una cosa diversa dal guardaroba sull’account: la chiave non viene mai caricata lì. Sul piano gratuito Google può usare i dati per migliorare i propri prodotti; sul piano a pagamento, la stessa pagina dice di no. La chiave sta solo in questo browser.

Per accendere il percorso forte:

1. Apri [Google AI Studio](https://aistudio.google.com/apikey) e entra con un account Google.
2. Crea una chiave API. Se chiede un progetto, va bene quello proposto.
3. Copiala.
4. Nell’app, tocca **Impostazioni** (sotto il nome Armadio Outfit), incolla la chiave e tocca **Salva la chiave**.

Da lì, le foto nuove usano Gemini. Puoi cancellare la chiave dalla stessa schermata: si torna al riconoscimento sul telefono.
