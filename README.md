# structural

Web app ad uso personale (desktop e mobile) per il **predimensionamento strutturale** e le
verifiche di base secondo **NTC2018 (DM 17/01/2018)**, con esportazione in JSON e blocchi di
testo pronti per la relazione di calcolo.

App single-page, nessun backend: lo stato vive nel browser (`localStorage`) e si sposta tra
dispositivi con Esporta / Importa JSON. È **installabile** su cellulare e su PC, con icona
propria, e funziona anche senza rete.

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
| `node scripts/genera-icone.mjs` | Rigenera le icone PNG dell'app installabile |

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

## App installabile (PWA)

Il sito si installa come app — «Aggiungi a schermata Home» su cellulare, «Installa» dalla
barra degli indirizzi su PC — e resta con **icona propria** nel launcher: triangolo ocra su
fondo scuro, la stessa geometria della favicon.

- `public/manifest.webmanifest` — nome, colori, `display: standalone` e le scorciatoie
  «Calcolatrice» e «Normativa» (aprono l'app direttamente su quella scheda, via
  `?scheda=…`);
- `public/icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (zona sicura
  all'80% per i launcher Android che ritagliano) e `apple-touch-icon.png` per iOS. I PNG si
  rigenerano con `node scripts/genera-icone.mjs`, senza dipendenze esterne;
- `public/sw.js` — service worker minimo: rete-prima per `index.html` (un deploy nuovo si
  vede subito), cache-prima per gli asset con hash nel nome. Serve anche a rendere l'app
  installabile su Chrome e a farla **partire senza rete**, che in cantiere capita. È
  registrato solo nella build di produzione.

---

## Struttura dell'app

Sei schede, navigazione laterale su desktop e bottom-bar su mobile (breakpoint unico a
900 px).

### 1. Azioni — NTC2018 cap. 3
Accordion per Azione sismica, Neve, Vento, Carichi variabili (Tab. 3.1.II) e Spinta delle
terre. Ogni campo è compatto (etichetta, valore, unità); l'**(i)** in testa alla scheda apre
in un colpo solo tutti i dettagli, con **formula a numeri sostituiti**, coefficienti
intermedi e riferimento normativo — un bottone per campo occupava troppo spazio. Il
ricalcolo è immediato a ogni modifica: non c'è nessun pulsante "Calcola".

**Neve**: il carico è riferito alla proiezione orizzontale, quindi il disegno lo mostra come
fascia di spessore costante misurato in verticale — uniforme su ogni falda, non trapezoidale.
L'inclinazione α è un campo, e accanto a μ1 compare il valore che le corrisponde in
Tab. 3.4.II, da riprendere con un clic.

**Vento**: il disegno mostra l'andamento della pressione lungo l'altezza — p(z) = qb·ce(z)·cp·cd
con il tratto costante sotto zmin — e la depressione sottovento. Il cp resta un dato da
scrivere, ma il pulsante *Valori di cp di uso corrente* elenca i casi ordinari della
Circolare 2019 §C3.3.8 (parete sopravento e sottovento, pareti laterali, falde in funzione
di α) da applicare con un clic; per i casi non ordinari il riferimento è la CNR-DT 207.

**Spinta delle terre**: oltre alla spinta statica di Rankine si può attivare la **spinta
sismica** secondo **Mononobe-Okabe** (§7.11.6): kh = βm · S · ag/g (o imposto a mano),
kv = ±0.5·kh, θ = atan[kh/(1∓kv)], Kae con attrito terra-muro δ, inclinazione del terrapieno
β e del paramento ψ. Fra kv verso l'alto e verso il basso si tiene la combinazione che dà la
spinta maggiore; l'incremento ΔEd = Ed − Sa si applica a metà altezza (§7.11.6.3.1) e il
momento totale somma Sa·H/3 e ΔEd·H/2. Con θ tale che φ′ − θ − β < 0 il calcolo non ha
soluzione e la scheda lo dice invece di mostrare un numero.

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
stati limite con TR, ag, F0 e TC\*. Per il sito di partenza — **Fagagna (UD)**, VN 50 e
classe II:

| SL | PVR | TR | ag/g | F0 | TC\* |
|---|---|---|---|---|---|
| SLO | 81% | 30 | 0.059 | 2.473 | 0.241 |
| SLD | 63% | 50 | 0.078 | 2.477 | 0.262 |
| SLV | 10% | 475 | 0.217 | 2.451 | 0.333 |
| SLC | 5% | 975 | 0.289 | 2.476 | 0.348 |

I tre campi `ag/g`, `F0` e `TC*` restano scrivibili: **lasciati vuoti** prendono il valore
del reticolo, **compilati** vincono sul reticolo (utile per una risposta sismica locale).
La scheda dichiara sempre da dove arriva ogni valore.

SS e CC **non** sono coefficienti fissi per categoria di sottosuolo: si calcolano con le
formule di Tab. 3.2.IV, che dipendono da ag, F0 e TC*. Da lì escono S = SS·ST e i periodi
TB, TC, TD dello spettro.

### 2. Sollecitazioni
Su desktop la scheda **sta tutta in una schermata**, senza scroll — né di pagina né interno.
Sopra i 1400 px i diagrammi occupano la fascia larga in alto a sinistra, i risultati e la
tabella dei contributi stanno a destra, e i comandi passano in una **fascia a tre colonne
sotto i diagrammi**, così non resta mezza larghezza vuota. Sotto i 1400 px i comandi tornano
in una colonna laterale; su cellulare tutto è in colonna unica, con i **grafici in alto e i
comandi in fondo**.

- **Selettore dei carichi da applicare**: PP (G1), G2 e le azioni calcolate nella scheda
  Azioni (Qk da tabella NTC, Neve, Vento). I valori marcati `↩` arrivano dalla scheda
  precedente. **All'avvio è attivo il solo Qk variabile da tabella NTC.**
- **Orizzontale / Verticale**: in elemento orizzontale tutti i carichi selezionati agiscono
  trasversalmente sull'interasse; in elemento verticale i carichi gravitazionali diventano
  sforzo normale sull'area di influenza e solo le azioni orizzontali (vento) flettono
  l'elemento. **In verticale ruota anche il disegno**: l'asta va verso l'alto con il vincolo
  in basso, la quota H sull'asse verticale, il vento come frecce orizzontali e N come freccia
  in sommità; M, V e deformata seguono la stessa rotazione e i quattro riquadri si dispongono
  in griglia. I testi restano orizzontali.
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
- **Diagrammi**: carichi con schema statico, momento flettente, taglio e deformata. Il
  riquadro si misura e il disegno è costruito in **coordinate reali** — nessuno stiramento
  dei vincoli, delle frecce o dei testi al variare della larghezza. Ogni diagramma è quotato:
  valore e ascissa del punto notevole, valori agli estremi, RA e RB scritte ai vincoli.

### 3. Verifiche
Tab per materiale, e sotto una **barra di schede** con una verifica visibile per volta —
esito e barra di sfruttamento fissi in testa. La barra si costruisce da un elenco per
materiale: flessione e pressoflessione si aggiungono con una voce, non riscrivendo la scheda.
Il **calcestruzzo** è implementato con le due verifiche a taglio trascritte dai fogli di
calcolo in repository:

| Verifica | Foglio di origine | Riferimento |
|---|---|---|
| Taglio, elementi senza armature trasversali | `01 - Verifica a taglio elementi non armati.xlsx` | §4.1.2.3.5.1, eq. 4.1.23 |
| Taglio, elementi con armature trasversali | `02 - Verifica a taglio elementi armati.xlsx` (foglio `VERIFICA_STAFFE`) | §4.1.2.3.5.2, eq. 4.1.18 / 4.1.19 |

Il VEd può essere agganciato al taglio massimo calcolato nella scheda Sollecitazioni: con il
collegamento attivo è un **valore derivato**, calcolato in render e non salvato nello stato,
che conserva solo il numero scritto a mano. Il campo porta il badge `↩ da Sollecitazioni`,
che premuto scollega il valore.

Ogni verifica riporta esito, margine percentuale e barra di sfruttamento; sono verificati
anche i minimi di normativa (Asw,min = 1.5·bw e passo massimo min(330; 0.8·d), §4.1.6.1.1).
I dati in ingresso sono **controllati**: passo delle staffe o luce nulli, d maggiore di h,
α fuori da 45°÷90°, γc < 1 marcano il campo e **bloccano l'esito** invece di dichiararne uno
falso. Accanto ai campi c'è la **sezione quotata** con bw, h, d, staffe e armatura.

Acciaio, legno e muratura sono segnaposto — vedi "Prossimi passi".

### 4. Stime costi
Tabella editabile (categoria, descrizione, u.m., quantità, prezzo unitario), totale generale
e torta di incidenza per macrocategoria.

### 5. Calcolatrice
Calcoli in sequenza con nome, come si fa a mano in un predimensionamento: mi calcolo
un'area, poi un'incidenza, poi le moltiplico.

- **Da PC si scrive da tastiera** nel campo dell'espressione (Invio salva, Esc pulisce), **da
  cellulare** c'è il tastierino a video; su desktop lo si richiama con il pulsante
  *Tastierino*.
- **Salva operazione con nota**: l'operazione resta salvata *estesa* — la pastiglia mostra il
  valore, un clic sul nome la apre e fa vedere `operazione = risultato` con i campi (nome,
  operazione, unità, nota) modificabili.
- **Nomi richiamabili**: dando un nome a un'operazione (`area`, `incidenza`) la si riusa
  nelle successive scrivendone il nome; `ans` è l'ultimo risultato. Ogni voce vede solo
  quelle che la precedono, quindi **correggere un valore a monte aggiorna tutto quello che
  ne discende**; l'ordine si cambia con le frecce.
- Sintassi: `+ − × ÷ ^`, parentesi, `%` come «per cento», virgola o punto decimale,
  argomenti separati da `;`, funzioni (`sqrt`, `min`, `max`, `round`, `ln`, `log`, `exp`,
  trigonometria **in gradi**), costanti `pi` ed `e`.
- **Grandezze in pastiglie**: `b`, `l`, `h`, `q` e i pesi di volume `γCLS`, `γACC`, `γTERRA`
  stanno in riquadri piccoli — almeno tre per riga su cellulare — con il valore scrivibile
  dentro la pastiglia. Le lunghezze partono vuote, i **pesi di volume arrivano già compilati**
  con la densità del materiale (25, 78,5 e 18 kN/mc), modificabile come tutto il resto.
- **L'elenco lo compone chi calcola**: sotto le pastiglie ci sono quelle da aggiungere — le
  altre di serie che sono state tolte, il catalogo (`s`, `i`, `A`, `F`, `E`, `J`, `γMUR`,
  `γLEGNO`, `γACQUA`) e una *nuova* vuota con nome e unità da scrivere. Il tastierino ha il
  tasto `γ`, che su cellulare non si scriverebbe altrimenti.
- **Operazioni preimpostate**: formule scritte una volta sui nomi delle grandezze —
  `q*l^2/8`, `q*l/2`, `b*h^2/6`, `b*h*γCLS`, `5*q*l^4/(384*E*J)` — che si accendono quando
  tutte le grandezze che servono sono compilate. Al tocco fanno il calcolo e finiscono nel
  display con nome e unità, pronte da salvare (o si salvano direttamente con il segnalibro).
  Se ne aggiungono di proprie e si modificano tutte: sono **dati di commessa**.
- **Unità di misura da elenco**: il campo si scrive a mano ma suggerisce mentre si digita, e
  quello che in elenco non c'è viene segnato come errore e non si salva. L'elenco (kg, kg/mc,
  kg/mq, kg/ml, kN/cmq, MPa, m, mq, mc…) si cambia dal pulsante *Unità*.
- **Unità ricavata da sola**: il prodotto e il rapporto fra operazioni con nome compongono
  l'unità del risultato — `b*h` in m dà `mq`, `b*h*γCLS` con γCLS in kN/mc dà `kN/m`,
  `sqrt(A)` con A in mq dà `m`. L'unità scritta a mano vince su quella calcolata; una somma
  fra unità diverse non ne propone nessuna.
- Le operazioni salvate sono **dati di commessa**: viaggiano nell'Esporta/Importa JSON e
  finiscono in *Copia*.

Il motore (`src/calc/calcolatrice.ts`) è un interprete a discesa ricorsiva scritto in casa —
nessuna dipendenza, nessun `eval`: costruisce l'albero dell'espressione e ci passa due volte,
una per il valore e una per l'unità, così i due non possono divergere. L'algebra delle unità
sta in `src/calc/unita.ts`; i test in `calcolatrice.test.ts` e `unita.test.ts`.

### 6. Normativa
Indice dei riferimenti: NTC2018 (DM 17/01/2018) e Circolare n. 7 del 2019.

- **Due livelli apribili**: di default si vedono solo i titoli delle norme; aprendo una norma
  compare l'elenco dei capitoli, aprendo un capitolo i suoi paragrafi, **rientrati secondo la
  profondità del numero** (`4.1` → `4.1.2.3` → `4.1.2.3.5.2`). Lo stato di apertura si ricorda.
- **Ricerca** su numero, titolo e parole chiave (`taglio`, `neve`, `VRd`, `C8.5`…): i capitoli
  che contengono un risultato si aprono da soli.
- **I link vanno sul capitolo**, non sul decreto intero: puntano a
  [studiopetrillo.com](https://www.studiopetrillo.com/ntc2018.html), che pubblica NTC e
  Circolare divise per capitolo. Il capitolo apre la sua pagina web dove c'è (Cap. 2, 3, 4, 6,
  7, 8) e il PDF del capitolo altrove; i paragrafi aprono il PDF del capitolo, sulla pagina
  indicata se il campo `pagina` è valorizzato (`#page=N`).

- **Aggiunte a mano**: il pulsante *Aggiungi* mette in fondo alla scheda norme e link tuoi —
  CNR, Eurocodici, circolari regionali, capitolati — con sigla, titolo e indirizzo. A
  differenza dell'indice di serie queste sono **dati di commessa**: viaggiano nell'Esporta JSON.

L'indice di NTC e Circolare **è parte del sito, non del progetto**: sta in
`src/data/normative.ts`, è uguale per tutte le commesse e non entra nel JSON esportato. Nuove
norme, capitoli e paragrafi si aggiungono a mano in quel file, un po' alla volta — le
istruzioni sono nel commento in testa.

### Comune a tutte le schede
- **(i)**: apre in un colpo tutti i pannelli di dettaglio della scheda — formule con i numeri
  sostituiti, coefficienti e riferimenti. Sta nella **testata**, insieme a *Copia*: sono
  comandi che valgono per tutte le schede e lassù non rubano altezza al contenuto.
- **Copia**: copia negli appunti un blocco di testo con valori, formule e riferimenti
  normativi, pronto da incollare in Word.
- **Esporta / Importa JSON**: l'intero stato del progetto, con numero di versione dello
  schema e migrazione dei file salvati da versioni precedenti. Lo stato si salva in
  `localStorage` con un ritardo di 300 ms, così scrivere in un campo non costa una
  serializzazione per carattere.
- **Intestazione di scheda sticky**: resta in vista mentre si scorre e ospita i comandi
  della scheda attiva (materiale, verifica visibile, combinazione, orientamento); dove la
  scheda non ha comandi propri sparisce del tutto.
- **Zone di sicurezza del cellulare**: la testata scende sotto l'orologio e la tacca
  (`env(safe-area-inset-top)`), la barra in fondo lascia posto al gesto di casa e le due
  fasce prendono il colore della cornice invece di restare nere.
- **Impaginazione**: il contenuto non supera i 1600 px e il testo corrente le ~78 battute;
  i campi vanno su più colonne dove c'è spazio, con breakpoint a 900, 1200, 1400 e 1600 px e
  container query dove lo stesso pannello è riusato largo e stretto. Sotto i 1200 px la
  navigazione laterale si riduce a una rail di sole icone. Su cellulare input e pulsanti
  salgono a 40÷42 px, sopra la soglia del tocco.

---

## Struttura del codice

```
dati/
  spettri2008.csv    reticolo di riferimento NTC, All. B (10751 nodi)
public/            file serviti così come sono: manifest, icone, service worker
scripts/
  genera-comuni.mjs  rigenera i due file di dati dei comuni
  genera-icone.mjs   rigenera le icone PNG dell'app installabile
src/
  calc/            motore di calcolo — funzioni pure, testabili, senza React
    trave.ts       solutore di trave a campata unica (FEM Eulero–Bernoulli)
    azioni.ts      azioni NTC2018 cap. 3
    sismica.ts     pericolosità sismica di base: TR, ag/F0/TC*, SS, CC (§3.2)
    sollecitazioni.ts  combinazioni di carico e collegamento con il solutore
    verifiche.ts   verifiche a taglio (dai fogli Excel)
    calcolatrice.ts  interprete delle espressioni e sequenza dei calcoli salvati
    relazione.ts   generazione del testo per la relazione
  data/            tabelle normative e di materiali (ntc2018.ts, materiali.ts)
    normative.ts   indice dei documenti e dei capitoli della scheda Normativa
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
- I coefficienti di forma (μ1 neve, cp vento) restano **input**: la scheda propone il valore
  di tabella accanto al campo (μ1 da α, elenco dei cp ordinari) ma non lo impone, perché la
  geometria reale della copertura l'app non la conosce.
- L'algebra delle unità della calcolatrice è **simbolica, non dimensionale**: `cm*cm` fa
  `cmq`, non `0.0001 mq`. I fattori di conversione restano a chi scrive i numeri — una
  conversione silenziosa dei valori sarebbe peggio di nessuna conversione.

## Prossimi passi

1. Verifiche in acciaio dal foglio `Verifica_aste_acciaio_rev01.xlsm` (aste, schiacciamento
   anima, sagomario dei profili): è il foglio più corposo dei tre e conviene affrontarlo
   come step a sé.
2. Verifiche a flessione e pressoflessione per il calcestruzzo.
3. Legno e muratura.
4. Spettro di risposta disegnato (Se(T) e Sd(T)) a partire dai parametri già calcolati.
