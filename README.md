# structural

Web app ad uso personale (desktop e mobile) per il **predimensionamento strutturale** e le
verifiche di base secondo **NTC2018 (DM 17/01/2018)**, con esportazione in JSON e blocchi di
testo pronti per la relazione di calcolo.

App single-page, nessun backend: lo stato vive nel browser (`localStorage`) e si sposta tra
dispositivi con Esporta / Importa JSON.

---

## ⚠️ Regola di lavoro: sempre PR e merge su `main`

**Ogni sviluppo passa da una pull request e viene portato su `main` con un merge.**
Niente commit diretti su `main`, nemmeno per una virgola.

Il ciclo di ogni modifica:

1. Partire da `main` aggiornato:
   ```bash
   git checkout main && git pull origin main
   ```
2. Creare un ramo dedicato:
   ```bash
   git checkout -b claude/<descrizione-breve>
   ```
3. Sviluppare e committare con messaggi descrittivi (in italiano).
4. Pubblicare il ramo e aprire la PR verso `main`:
   ```bash
   git push -u origin claude/<descrizione-breve>
   ```
5. Attendere che la CI sia verde (typecheck + test + build). Cloudflare pubblica anche
   un'anteprima della PR, comoda per guardare la modifica prima di decidere.
6. **Merge della PR su `main`.** Il merge su `main` fa partire in automatico il deploy
   in produzione.
7. Cancellare il ramo dopo il merge.

Se una PR è già stata mergiata, il lavoro successivo riparte da un ramo nuovo:
una PR chiusa non si riapre e non si impila altro lavoro sopra.

---

## Avvio in locale

```bash
npm install
npm run dev        # http://localhost:5173
```

Altri comandi:

| Comando | Cosa fa |
|---|---|
| `npm test` | Esegue i test del motore di calcolo (Vitest) |
| `npm run typecheck` | Controllo dei tipi TypeScript |
| `npm run build` | Build di produzione in `dist/` |
| `npm run preview` | Serve la build di produzione |

La versione di Node è fissata in `.nvmrc` (Node 22): la leggono sia `nvm` in locale sia
Cloudflare in fase di build, così l'ambiente è lo stesso ovunque.

## Deploy

Il deploy è su **Cloudflare Pages**, collegato a questo repository:

- merge su `main` → deploy in produzione su `https://structural.pages.dev`;
- apertura di una PR → deploy di anteprima su un URL dedicato, utile per controllare una
  modifica prima del merge.

Impostazioni del progetto Cloudflare (già configurate, qui per memoria):

| Campo | Valore |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |
| Versione di Node | da `.nvmrc` |

L'app è servita dalla radice del dominio, quindi `base` di Vite resta `/`: se un giorno si
passasse a un hosting su sottocartella, va impostato lì.

La CI su GitHub (`.github/workflows/ci.yml`) resta e continua a girare su ogni PR:
typecheck, test e build. È il cancello prima del merge; il deploy lo fa Cloudflare.

---

## Struttura dell'app

Quattro schede, navigazione laterale su desktop e bottom-bar su mobile (breakpoint unico a
900 px).

### 1. Azioni — NTC2018 cap. 3
Accordion per Azione sismica, Neve, Vento, Carichi variabili (Tab. 3.1.II) e Spinta delle
terre. Ogni campo è compatto (etichetta, valore, unità) ed espandibile con il bottone info,
che mostra **formula con i numeri sostituiti**, coefficienti intermedi e riferimento
normativo. Il ricalcolo è immediato a ogni modifica: non c'è nessun pulsante "Calcola".

Il **sito sismico** si sceglie con tre menù a tendina in cascata — **regione → provincia →
comune** — su tutti i 7899 comuni italiani (107 province, 20 regioni). Il comune scelto
diventa anche la località riportata in testata e nella relazione, e porta con sé:

- la **zona sismica** della classificazione nazionale del Dipartimento della Protezione
  Civile (aggiornamento 2024, OPCM 3519/2006), sottozone comprese (`2A`, `3S`, …);
- **ag, F0 e TC\*** dal **reticolo di riferimento dell'Allegato B** (10751 nodi): per ogni
  comune i parametri sono la media pesata con 1/d sui 4 nodi più vicini (All. A), tabellati
  ai 9 periodi di ritorno 30 ÷ 2475 anni.

Il periodo di ritorno dell'azione viene da VR = VN · CU e dallo **stato limite** scelto
(SLO, SLD, SLV, SLC — Tab. 3.2.I): `TR = −VR / ln(1 − PVR)`. Fra i periodi tabellati si
interpola in log-log, come prescrive l'Allegato A, e la scheda mostra il quadro dei quattro
stati limite con TR, ag, F0 e TC\*. Per L'Aquila, VN 50 e classe II:

| SL | PVR | TR | ag/g | F0 | TC\* |
|---|---|---|---|---|---|
| SLO | 81% | 30 | 0.079 | 2.393 | 0.273 |
| SLD | 63% | 50 | 0.104 | 2.333 | 0.282 |
| SLV | 10% | 475 | 0.261 | 2.365 | 0.348 |
| SLC | 5% | 975 | 0.334 | 2.401 | 0.365 |

I tre campi `ag/g`, `F0` e `TC*` restano scrivibili: **lasciati vuoti** prendono il valore
del reticolo, **compilati** vincono sul reticolo (utile per una risposta sismica locale).
La scheda dichiara sempre da dove arriva ogni valore.

SS e CC **non** sono coefficienti fissi per categoria di sottosuolo: si calcolano con le
formule di Tab. 3.2.IV, che dipendono da ag, F0 e TC*. Da lì escono S = SS·ST e i periodi
TB, TC, TD dello spettro.

### 2. Sollecitazioni
Su desktop la scheda **sta tutta in una schermata**, senza scroll di pagina: i diagrammi
occupano la colonna di sinistra e si allungano per riempire l'altezza disponibile, con
sotto i risultati e la tabella dei contributi; i comandi (menù a tendina e campi) stanno
nella colonna di destra, che scorre per conto suo. Su cellulare tutto torna in colonna
unica, con i **grafici in alto e i comandi in fondo**.

- **Selettore dei carichi da applicare**: PP (G1), G2 e le azioni calcolate nella scheda
  Azioni (Qk da tabella NTC, Neve, Vento). I valori marcati `↩` arrivano dalla scheda
  precedente. **All'avvio è attivo il solo Qk variabile da tabella NTC.**
- **Orizzontale / Verticale**: in elemento orizzontale tutti i carichi selezionati agiscono
  trasversalmente sull'interasse; in elemento verticale i carichi gravitazionali diventano
  sforzo normale sull'area di influenza e solo le azioni orizzontali (vento) flettono
  l'elemento. L'orientamento cambia anche la disposizione dei diagrammi: carichi in alto e
  sollecitazioni in basso in orizzontale, carichi a sinistra e sollecitazioni a destra in
  verticale.
- **Schema statico**: menù a tendina con anteprima dei vincoli. **Di default: trave
  appoggio–appoggio.**
  1. Appoggio — appoggio
  2. Incastro (mensola)
  3. Doppio incastro — *PDF schemi statici, tav. 1*
  4. Incastro — cerniera — *PDF schemi statici, tav. 1*
  5. Incastro — doppio pendolo — *PDF schemi statici, tav. 2*
- **Combinazione**: SLU fondamentale, SLE rara, frequente, quasi permanente
  (§2.5.3), con γG1 = 1.30, γG2 = 1.50, γQ = 1.50 (Tab. 2.6.I, A1-STR) e i ψ della
  categoria d'uso. La tabella dei contributi mostra γ, ψ e qd di ogni azione.
- **Diagrammi**: carichi con schema statico, momento flettente, taglio e deformata.

### 3. Verifiche
Tab per materiale. Il **calcestruzzo** è implementato con le due verifiche a taglio
trascritte dai fogli di calcolo in repository:

| Verifica | Foglio di origine | Riferimento |
|---|---|---|
| Taglio, elementi senza armature trasversali | `01 - Verifica a taglio elementi non armati.xlsx` | §4.1.2.3.5.1, eq. 4.1.23 |
| Taglio, elementi con armature trasversali | `02 - Verifica a taglio elementi armati.xlsx` (foglio `VERIFICA_STAFFE`) | §4.1.2.3.5.2, eq. 4.1.18 / 4.1.19 |

Il VEd può essere agganciato al taglio massimo calcolato nella scheda Sollecitazioni.
Ogni verifica riporta esito, margine percentuale e barra di sfruttamento; sono verificati
anche i minimi di normativa (Asw,min = 1.5·bw e passo massimo min(330; 0.8·d), §4.1.6.1.1).

Acciaio, legno e muratura sono segnaposto — vedi "Prossimi passi".

### 4. Stime costi
Tabella editabile (categoria, descrizione, u.m., quantità, prezzo unitario), totale generale
e torta di incidenza per macrocategoria.

### Comune a tutte le schede
- **Mostra formule**: apre in un colpo tutti i pannelli di dettaglio della scheda.
- **Copia per relazione**: copia negli appunti un blocco di testo con valori, formule e
  riferimenti normativi, pronto da incollare in Word.
- **Esporta / Importa JSON**: l'intero stato del progetto, con numero di versione dello
  schema e migrazione dei file salvati da versioni precedenti.
- **OneDrive**: segnaposto, non ancora collegato (serve Microsoft Graph + MSAL).

---

## Struttura del codice

```
dati/
  spettri2008.csv    reticolo di riferimento NTC, All. B (10751 nodi)
scripts/
  genera-comuni.mjs  rigenera i due file di dati dei comuni
src/
  calc/            motore di calcolo — funzioni pure, testabili, senza React
    trave.ts       solutore di trave a campata unica (FEM Eulero–Bernoulli)
    azioni.ts      azioni NTC2018 cap. 3
    sismica.ts     pericolosità sismica di base: TR, ag/F0/TC*, SS, CC (§3.2)
    sollecitazioni.ts  combinazioni di carico e collegamento con il solutore
    verifiche.ts   verifiche a taglio (dai fogli Excel)
    relazione.ts   generazione del testo per la relazione
  data/            tabelle normative e di materiali (ntc2018.ts, materiali.ts)
    comuni.ts      FILE GENERATO: comuni, zona sismica, coordinate
    parametri-sismici.ts  FILE GENERATO: ag/F0/TC* per comune e per TR
  components/      pattern di UI riusabili e diagrammi SVG
  tabs/            una scheda per file
  state/           stato dell'app (useReducer + context, persistenza locale)
  styles/          token del design system e fogli di stile
```

Il calcolo è tenuto **separato dai componenti**: `src/calc/` non importa nulla da React,
così le formule restano verificabili con i test.

### I dati dei comuni

`src/data/comuni.ts` e `src/data/parametri-sismici.ts` sono generati e committati: l'app
non fa nessuna chiamata di rete. Vanno rigenerati **insieme** — il secondo è indicizzato
sulla posizione del comune nel primo — dopo una revisione della classificazione,
dell'elenco ISTAT o del reticolo:

```bash
node scripts/genera-comuni.mjs
```

Lo script:

1. scarica la **classificazione sismica DPC** (mirror
   [ferdi2005/zonasismica](https://github.com/ferdi2005/zonasismica)) e le **coordinate dei
   comuni** ([opendatasicilia/comuni-italiani](https://github.com/opendatasicilia/comuni-italiani),
   su base ISTAT) e le incrocia sul codice ISTAT. Le poche coordinate malformate nella
   sorgente (separatore decimale perso) vengono risanate e conteggiate a video; se un
   comune restasse senza coordinate lo script si ferma con errore invece di scrivere dati
   incompleti;
2. legge `dati/spettri2008.csv` (reticolo dell'Allegato B, ag in g/10) e interpola sul
   municipio di ogni comune i parametri ai 9 periodi di ritorno.

I due file sono impacchettati in stringhe compatte (base 36, per differenze successive) e
Vite li tiene in un chunk separato `dati-comuni`: circa 300 kB gzip che il browser rimette
in cache solo quando cambiano i dati, non a ogni deploy dell'app.


### Il solutore di trave

`src/calc/trave.ts` non codifica le formule chiuse schema per schema: risolve la trave con
elementi finiti a 2 nodi, e ogni schema statico è solo una combinazione di vincoli. Aggiungere
uno schema significa aggiungere una riga a `SCHEMI`.

I risultati sono riscontrati nei test contro le soluzioni in forma chiusa della tabella
"Soluzioni di travi elementari variamente caricate" (il PDF in repository), per carico
uniforme e carico concentrato, su tutti e cinque gli schemi:

```bash
npm test
```

---

## Note sulle formule

- I parametri sismici sono riferiti al **municipio** del comune, non al punto esatto del
  cantiere: per un comune esteso la differenza esiste, e si copre inserendo a mano ag, F0 e
  TC\* del sito. I parametri sono arrotondati alla terza cifra decimale, la stessa con cui
  sono pubblicati. Le coordinate dei comuni sono WGS84 e quelle del reticolo ED50: lo
  scarto fra i due datum è di un centinaio di metri, trascurabile rispetto al passo della
  maglia (circa 5 km).
- Il **limite superiore della zona sismica** resta solo come rete di sicurezza per un
  comune che non fosse in elenco; con il reticolo caricato non entra mai in gioco.
- Nel foglio `01 - Verifica a taglio elementi non armati.xlsx` il limite su σcp è scritto
  come `≤ 0.02·fcd` nella cella di controllo, mentre le NTC (§4.1.2.3.5.1) prescrivono
  `σcp ≤ 0.2·fcd`. **L'app applica il limite di normativa, 0.2·fcd.**
- I coefficienti di forma (μ1 neve, cp vento) sono input: non sono ricavati automaticamente
  dalla geometria della copertura.

## Prossimi passi

1. Verifiche in acciaio dal foglio `Verifica_aste_acciaio_rev01.xlsm` (aste, schiacciamento
   anima, sagomario dei profili): è il foglio più corposo dei tre e conviene affrontarlo
   come step a sé.
2. Verifiche a flessione e pressoflessione per il calcestruzzo.
3. Legno e muratura.
4. Spettro di risposta disegnato (Se(T) e Sd(T)) a partire dai parametri già calcolati.
5. Salvataggio su OneDrive con Microsoft Graph.
