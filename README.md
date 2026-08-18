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
  «Quaderno» e «Libreria» (aprono l'app direttamente su quella scheda, via
  `?scheda=…`; i vecchi indirizzi `?scheda=calcolatrice` e `?scheda=esporta` portano al
  Quaderno);
- `public/icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (zona sicura
  all'80% per i launcher Android che ritagliano) e `apple-touch-icon.png` per iOS. I PNG si
  rigenerano con `node scripts/genera-icone.mjs`, senza dipendenze esterne;
- `public/sw.js` — service worker minimo: rete-prima per `index.html` (un deploy nuovo si
  vede subito), cache-prima per gli asset con hash nel nome. Serve anche a rendere l'app
  installabile su Chrome e a farla **partire senza rete**, che in cantiere capita. È
  registrato solo nella build di produzione.

---

## Struttura dell'app

Sette schede, navigazione laterale su desktop e bottom-bar su mobile (breakpoint unico a
900 px).

### 1. Azioni — NTC2018 cap. 3
Accordion per Azione sismica, Neve, Vento, Carichi variabili (Tab. 3.1.II), Spinta delle
terre e Urti. Ogni campo è compatto (etichetta, valore, unità); l'**(i)** in testa alla scheda apre
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

**Urti — azioni eccezionali** (§3.6.3.3): si sceglie lo scenario e la scheda dà le forze
statiche equivalenti di Tab. 3.6.II — `Fdx` nella direzione di marcia, `Fdy` in quella
ortogonale, che **non si sommano** — con la quota di applicazione sopra il piano viabile e il
momento alla base `Fd·h`. Accanto c'è il **confronto energetico** di EN 1991-1-7 App. C sui
dati del caso in esame (massa, velocità, rigidezza del veicolo): `Ec = ½·m·v²`,
`F = v·√(k·m)`, `δ = v·√(m/k)`. La forza dall'energia è normalmente **più alta** di quella
tabellare, e non è un errore: l'urto duro immagina un ostacolo perfettamente rigido, mentre
la tabella dà forze statiche equivalenti che tengono già conto della deformazione del veicolo
e della risposta dinamica della struttura. Adottare quella calcolata è una scelta esplicita —
un pulsante — non un automatismo.

| Scenario | Fdx | Fdy | h |
|---|---|---|---|
| Autostrade e strade extraurbane principali | 1000 kN | 500 kN | 1.25 m |
| Strade extraurbane secondarie e urbane di scorrimento | 750 kN | 375 kN | 1.25 m |
| Strade urbane di quartiere e locali | 500 kN | 250 kN | 1.25 m |
| Cortili e autorimesse — autovetture ≤ 30 kN | 50 kN | 25 kN | 0.50 m |
| Cortili e autorimesse — automezzi > 30 kN | 150 kN | 75 kN | 1.25 m |
| Carrelli elevatori e mezzi di servizio | 5 kN | 5 kN | 0.75 m |

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
- **Sezione resistente**: E e J a mano, rettangolo in c.a. `b×h` (con Ecm della classe) o
  **profilo in acciaio** dal sagomario. Il profilo si può **posare ruotato**: *asse forte* /
  *asse debole*, con il J dei due assi scritto sul selettore — ruotare un IPE 200 porta J da
  1943 a 142 cm⁴ e la freccia da 6 a 82 mm. Per i doppi T l'asse debole è calcolato dalla
  geometria di ali e anima (a mezzo per cento dalle tabelle EN 10365), per gli UPN — che
  hanno le ali rastremate — è quello di tabella DIN 1026-1.
- **Geometria e carichi**: L (o H), interasse, G1, G2, P e la sua ascissa stanno **sempre in
  vista** nella fascia dei comandi, sotto il titolo: aprire e chiudere la tendina costava una
  riga e non faceva guadagnare spazio.
- **Diagrammi**: carichi con schema statico, momento flettente, taglio e deformata. Su
  desktop il riquadro dei diagrammi si ferma al **70% dello spazio disponibile**, in altezza
  e in larghezza: i comandi risalgono sotto ai grafici invece di restare incollati in fondo
  alla finestra, e la fascia dei comandi resta invece larga quanto la sua colonna. Le
  etichette non rimpiccioliscono, perché il viewBox è costruito sui pixel reali del riquadro.
  L'accorciamento in altezza vale solo sopra gli 880 px di finestra: più in basso i quattro
  riquadri non ci starebbero, e si riprendono tutta la colonna.
  Il riquadro si misura e il disegno è costruito in **coordinate reali** — nessuno stiramento
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
| Flessione semplice SLU, sezione rettangolare | stress-block rettangolare | §4.1.2.1.2 |

La **flessione** ha accanto ai campi il disegno della **sezione armata**: i ferri tesi dove
sono (fino a due letti), quelli compressi in alto, la staffa che li racchiude, la zona di
calcestruzzo compresso alta 0.8·x e l'asse neutro quotato, così si vede subito se x sta
scendendo troppo.

Il VEd può essere agganciato al taglio massimo calcolato nella scheda Sollecitazioni: con il
collegamento attivo è un **valore derivato**, calcolato in render e non salvato nello stato,
che conserva solo il numero scritto a mano. Il campo porta il badge `↩ da Sollecitazioni`,
che premuto scollega il valore.

Nel **taglio armato** il disegno segue il numero di bracci: due sono i lati verticali della
staffa perimetrale, dal terzo in poi si aggiungono **bracci interni** — il tratto verticale
con i suoi ganci, non un ferro longitudinale in più — con un ferro longitudinale per ciascuno.
Le pastiglie della scheda (materiale, verifica visibile, VEd da Sollecitazioni) stanno tutte
in fila a sinistra della barra.

Ogni verifica riporta esito, margine percentuale e barra di sfruttamento; sono verificati
anche i minimi di normativa (Asw,min = 1.5·bw e passo massimo min(330; 0.8·d), §4.1.6.1.1).
I dati in ingresso sono **controllati**: passo delle staffe o luce nulli, d maggiore di h,
α fuori da 45°÷90°, γc < 1 marcano il campo e **bloccano l'esito** invece di dichiararne uno
falso. Accanto ai campi c'è la **sezione quotata** con bw, h, d, staffe e armatura.

Acciaio, legno e muratura sono segnaposto — vedi "Prossimi passi".

### 4. Stime costi
Tabella editabile (categoria, descrizione, u.m., quantità, prezzo unitario), totale generale
e torta di incidenza per macrocategoria.

### 5. Quaderno
Un **foglio bianco a quadretti** su cui il calcolo si scrive nell'ordine in cui lo si pensa, e
che è già il documento da stampare: la scheda tiene insieme quello che prima erano la
*Calcolatrice* e l'*Esporta*. Il riferimento è SMath Studio — foglio libero, non un elenco di
righe rigide.

Due colonne: a sinistra il **foglio**, a destra il **pannello** di quello che ci si può mettere
dentro. Scorrono per conto loro, così si tiene il foglio sotto gli occhi mentre si cerca una
grandezza in fondo al pannello.

**Il foglio.** Porta l'intestazione di commessa (nome, commessa, località, revisione, data),
una **riga di premessa** e una **nota a piè di pagina**, e in mezzo i blocchi, numerati come i
passaggi di un calcolo a mano. Si aggiungono dove servono — in coda o fra due blocchi già
scritti — si **riordinano** (maniglia, frecce o trascinamento) e si eliminano con la ×.

I blocchi stanno su una **griglia a tre colonne**, e ognuno decide quante ne occupa: il
comando con il numero, fra i tasti del blocco, gira fra 1, 2 e 3, così una formula o un testo
si può tenere **la riga per sé**. Note, schemi e capitoli partono a riga intera. Il corpo del
testo è quello di un foglio scritto in Arial Narrow 11: piccolo, perché tre colonne di calcolo
ci stiano senza andare a capo.

Ogni blocco porta due comandi in più: la **(i)** apre la sua **nota** — il perché del
passaggio, che a rileggere il foglio fra sei mesi è l'unica cosa che non si ricostruisce, e
che finisce anche nel testo copiato e nell'HTML esportato — e la **matita** prende in mano una
riga già scritta: una formula preimpostata, una grandezza o un import diventano una formula
scrivibile lì, con lo stesso nome, la stessa espressione e la stessa unità. Si stacca dalla
fonte — è il prezzo per poterla correggere — e da lì in avanti è testo che si edita.

**Il pannello**, sei sezioni ad accordion; tutto quello che sta lì si **trascina** nel foglio o
si aggiunge con il «+», e ci resta **collegato**:

| Sezione | Che cosa dà |
|---|---|
| Grandezze da compilare | `b`, `l`, `h`, `q` e le altre del calcolo di oggi, su due colonne |
| Grandezze fisse | i pesi di volume `γC`, `γS`, `γT` e le costanti, con la γ scritta col pedice |
| Grandezze da libreria | le quattro tendine (CLS, acciaio, ferro ⌀, bullone M) e le resistenze che ne discendono |
| Operazioni preimpostate | una card per formula: in testa il risultato che dà — «A (mq)» — e sotto la formula |
| Import rapido da altre schede | M max, V max, q di progetto, luce, freccia, neve, vento, VRd, MRd, esiti delle verifiche |
| Capitoli da altre schede | un capitolo intero di relazione, come faceva la spunta della vecchia Esporta |

Più il **Tastierino**, che scrive nella formula toccata per ultima: serve su cellulare, dove la
γ e la `^` non ci sono.

**Collegamento live.** Un blocco nato da una grandezza, da una formula o da un import non salva
un valore proprio: salva **da dove viene** e lo ricalcola. Si corregge `b` nel pannello e tutto
quello che ne discende si aggiorna da sé, senza toccare il foglio (icona della catena sul
blocco). Salvano un contenuto proprio solo la **nota** e lo **schema**.

**Blocchi che si scrivono lì.**
- *Formula*: nome, espressione e unità dentro il blocco. Vede le grandezze del pannello **e i
  blocchi che la precedono**, quindi si scrive `A = b·h` e poi `σ = M/W`, come a mano.
- *Nota*: testo libero a larghezza piena.
- *Screenshot*: uno schema disegnato a mano o preso da un altro programma — si trascina, si
  incolla con Ctrl+V (anche direttamente sul foglio) o si sceglie da file. L'immagine viene
  ridotta a 1400 px e tenuta dentro il progetto, quindi finisce anche nell'HTML esportato.

Sintassi delle espressioni: `+ − × ÷ ^`, parentesi, `%` come «per cento», virgola o punto
decimale, argomenti separati da `;`, funzioni (`sqrt`, `min`, `max`, `round`, `ln`, `log`,
`exp`, trigonometria **in gradi**), costanti `pi` ed `e`, `ans` come ultimo risultato. **La γ si
scrive anche con la g**: `gC`, `gammaC` e `γC` sono la stessa cosa.

Le grandezze **da compilare si svuotano a ogni riapertura** — la trave di ieri non è quella di
oggi — mentre le fisse, le formule, i blocchi del foglio, le note e gli schemi sono **dati di
commessa**: viaggiano nell'Esporta/Importa JSON.

#### Unità di misura: le converte lui
È il punto in cui il Quaderno somiglia a SMath. Ogni unità porta due cose, la **forma** (metri e
newton: `kg/cmq` → `N·m⁻²`) e la **scala** (1 kN = 1000 N, 1 kg/cmq = 98066,5 N/mq), e i valori
girano **sempre in unità base**.

- **Le unità si possono mescolare** e i conti tornano: la base in cm, il peso di volume in
  kg/mc, il modulo elastico in MPa e il momento d'inerzia in cm⁴ nella stessa formula. La
  freccia `5*q*l^4/(384*E*J)` viene giusta senza nessun fattore scritto a mano.
- **Cambiare l'unità di un blocco converte il numero.** Il selettore accanto al risultato
  elenca le sole unità con cui *quel* risultato si può leggere: una tensione di 0,8 MPa scritta
  in kg/cmq diventa 8,16, in kN/mq diventa 800. Il valore che gira nelle formule non cambia:
  cambia come lo si legge.
- **L'unità la ricava da sola**: `b*h` in m dà `mq`, `b*h*γC` con γC in kN/mc dà `kN/m`,
  `sqrt(A)` con A in mq dà `m`. Sceglie l'unità con cui quella grandezza si legge di solito (una
  forza in kN, un carico in kN/mq) e la tiene ferma; solo se viene un numero assurdo cerca il
  multiplo comodo — 0,000804 mq diventano 804 mmq.
- **Un'unità di forma sbagliata viene detta, non applicata**: chiedere un momento in metri non
  converte niente e il blocco resta sull'unità calcolata.
- **Un dato scritto a mano è un'altra cosa**: se l'espressione è un numero, l'unità dice in che
  unità è scritto *quel* numero (30 in cm sono 0,30 m) invece di convertirlo.
- **Il kg è un kgf** (1 kg = 9,80665 N): nel predimensionamento kg/mc è un peso di volume e
  kg/cmq una tensione, così 2500 kg/mc fanno 24,5 kN/mc come sui manuali. Per le masse questa
  scheda non serve.
- L'elenco delle unità proposte (`m`, `cm`, `mm`, `mq`, `cmq`, `cm^4`, `kN`, `kg`, `t`, `kN/m`,
  `kN/mq`, `kg/mc`, `kNm`, `MPa`, `kg/cmq`, `kPa`…) si cambia dal pulsante *Unità*, e quello che
  in elenco non c'è viene segnato come errore.

#### Da qui esce il documento
Tre uscite, tutte leggibili **senza questa app**, tutte dallo stesso foglio:

| Comando | Che cosa produce |
|---|---|
| *Stampa / PDF* | la pagina A4 dalla finestra di stampa del browser — da lì «Salva in PDF»; quadretti, pannello e interfaccia non vengono stampati, e i campi rimasti vuoti non lasciano righe di segnaposto |
| *Copia testo* | il foglio come testo semplice, da incollare in OneNote, in una mail o in Word |
| *Scarica HTML* | un file `.html` **autonomo**, stile e schemi compresi e nessuna risorsa esterna: si apre con qualunque browser, offline, e si ristampa in PDF |

L'**Esporta JSON** resta quello che era: serve a *riaprire* il lavoro in questa app, non a
leggerlo. Il foglio a schermo, il *Copia* e l'HTML nascono dalla stessa sorgente
(`src/calc/quaderno.ts` per i blocchi, `src/calc/relazione.ts` per i capitoli,
`src/calc/esportazione.ts` per l'impaginazione), quindi non possono raccontare numeri diversi.

Il motore delle espressioni (`src/calc/calcolatrice.ts`) è un interprete a discesa ricorsiva
scritto in casa — nessuna dipendenza, nessun `eval`: costruisce l'albero dell'espressione e ci
passa due volte, una per il valore e una per l'unità, così i due non possono divergere.
L'algebra e la conversione delle unità stanno in `src/calc/unita.ts`; i test in
`calcolatrice.test.ts`, `unita.test.ts` e `quaderno.test.ts`.

### 6. Libreria
Due fogli, si passa dall'uno all'altro dalle linguette in testa e il foglio aperto si ricorda.

#### Foglio «Norme»
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

#### Foglio «Utili»
Le tabelle che si tengono a bordo tavolo, con una **ricerca sola** che filtra le righe di
tutte (`⌀16`, `IPE 200`, `M12`, `C25/30`, `S355`): le tabelle senza risultati spariscono.
Ogni tabella è una **scheda che si apre e si chiude** — il titolo dice quante righe ci sono
sotto anche da chiusa — e i numeri stanno **centrati nella cella**: sono valori da consultare,
non da sommare.

- **Armature**: diametri commerciali da ⌀4 a ⌀32 con area, peso al metro (7850 kg/m³),
  **diametro minimo del mandrino di piega** — 4⌀ fino a ⌀16, 7⌀ oltre, EC2 §8.3 Tab. 8.1N — e
  raggio interno di curvatura, che ne è la metà.
- **Profilario acciaio**: lo stesso sagomario delle Sollecitazioni — IPE, HEA, HEB, UPN a
  tabella (EN 10365), angolari e tubi (quadri, rettangolari, tondi) ricavati dalla geometria
  esatta della taglia — con h, b, A, **peso al metro** (l'area per 7850 kg/m³: quello che si
  ordina e che pesa sulla struttura), Ix, Wx, Iy, Wy, Avz: asse forte e asse debole
  affiancati, che è quello che serve quando si ruota il profilo.
- **Profilario bulloni**: filettatura metrica grossa da M6 a M36 con passo, area lorda, **area
  resistente** della parte filettata, apertura di chiave e diametro del foro con gioco normale;
  a fianco le classi di resistenza 4.6 → 10.9 con fyb, ftb e i valori divisi per γM2.
- **Calcestruzzo** e **acciai**: le stesse sigle delle tendine del Quaderno, con i
  caratteristici e i valori di progetto già divisi per i γ.

Le tabelle stanno in `src/data/` — `armature.ts`, `bulloni.ts`, `materiali.ts`,
`profili-acciaio.ts` — e sono le stesse che alimentano le verifiche e le tendine del
Quaderno: un valore si corregge in un posto solo.

### Comune a tutte le schede
- **(i)**: apre in un colpo tutti i pannelli di dettaglio della scheda — formule con i numeri
  sostituiti, coefficienti e riferimenti; nel Quaderno apre le **spiegazioni** su come si
  compone il foglio, che altrimenti stanno via. Sta nella **testata**, insieme a
  *Copia*: sono comandi che valgono per tutte le schede e lassù non rubano altezza al
  contenuto.
- **Copia**: copia negli appunti un blocco di testo con valori, formule e riferimenti
  normativi, pronto da incollare in Word.
- **Esporta / Importa JSON**: l'intero stato del progetto, con numero di versione dello
  schema e migrazione dei file salvati da versioni precedenti. Lo stato si salva in
  `localStorage` con un ritardo di 300 ms, così scrivere in un campo non costa una
  serializzazione per carattere.
- **Svuota tutto**: cancella il salvataggio automatico — quello che alla riapertura ripropone
  i campi già compilati — e riporta ogni scheda ai valori iniziali. È l'unico comando che
  perde dati: chiede conferma e ricorda di usare prima *Esporta JSON* per conservare il
  lavoro. **Non** tocca la libreria personale (vedi sotto): le norme aggiunte a mano, le
  unità e le formule preimpostate non sono roba di commessa e restano dove sono.
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

## Libreria personale e sincronizzazione OneDrive

Nell'app convivono due nature di dati, e distinguerle è il senso di tutta questa parte:

| | **Commessa** | **Libreria personale** |
|---|---|---|
| Cosa | azioni, sollecitazioni, verifiche, computo, quaderno | norme e link aggiunti a mano, unità di misura, formule preimpostate |
| Dove | `localStorage` di questo browser | `localStorage` **e** un JSON su OneDrive |
| «Svuota tutto» | azzera | **non tocca** |
| Come si porta via | *Esporta JSON* | si ritrova da sola su ogni dispositivo collegato |

La libreria è la roba che si costruisce una volta e si usa per anni: ributtarla via a ogni
foglio bianco, o riscriverla a mano sul telefono, è esattamente il motivo per cui non la si
costruiva mai davvero.

### Gli host di storage e la CSP

Leggere il file non è una chiamata sola: `graph.microsoft.com` risponde con un redirect
verso l'host dove il contenuto sta davvero, che per un account personale oggi è
`my.microsoftpersonalcontent.com` e ieri era `*.files.1drv.com`. Quegli host vanno elencati
in `connect-src` dentro `public/_headers`, e **la lista è per sua natura incompleta**:
Microsoft può spostare lo storage senza avvisare nessuno, e il giorno che succede la
sincronizzazione si ferma con un `Failed to fetch` che non somiglia affatto a un problema
di CSP.

Per questo l'app, quando uno scarico fallisce, **nomina l'host** nel pannello: l'errore
dice da solo quale riga aggiungere. È l'unica manutenzione prevista di questa parte.

### Il file su OneDrive

Uno solo: `strutturale/strutturale-libreria.json`, nella root del OneDrive personale — una
cartella normale, che si apre, si legge e si copia anche senza l'app. **La commessa non ci
finisce dentro.**

### Come si accende

L'app è registrata su Azure e il suo client id sta in chiaro in `src/cloud/config.ts`:
non serve configurare niente per usarla. **Non è un segreto** — finisce nel bundle come
tutto il resto, ed è giusto così: nel flusso *authorization code con PKCE* il client id da
solo non apre niente, perché Microsoft consegna il token solo agli indirizzi registrati
nell'applicazione.

Quello che invece va tenuto allineato sono proprio i **Redirect URI**: ogni indirizzo da
cui si apre l'app (sito pubblicato, `http://localhost:5173/` per lo sviluppo, eventuale
anteprima di Cloudflare) dev'essere registrato su Azure come piattaforma *Single-page
application*, identico carattere per carattere, barra finale compresa. Un indirizzo non
registrato non dà un login rotto a metà: dà un errore Microsoft secco (`AADSTS50011`).

La registrazione completa — permessi *delegated* `Files.ReadWrite` e `offline_access`,
account `common` — è descritta passo per passo in testa a `src/cloud/config.ts`, per il
giorno in cui servisse rifarla. Per provarne una diversa senza toccare il codice basta
`VITE_MS_CLIENT_ID`, in `.env.local` o fra le variabili d'ambiente di Cloudflare Pages:
se c'è, vince lei.

### Come si fondono due dispositivi

Ogni giro è **leggi → fondi → riscrivi**, mai «scarica e sostituisci». La fusione è a tre
vie: le due copie vengono confrontate con la fotografia dell'ultima sincronizzazione
riuscita. È quella terza copia a distinguere «l'ho appena aggiunta qui» da «l'ho appena
cancellata là» — senza, la voce cancellata sul telefono ricompare al primo accesso dal PC.
Le regole stanno in `src/cloud/libreria.ts` e sono coperte dai test.

La fotografia sta **dentro lo stato** (`AppState.libreriaBase`), non in una chiave di
localStorage per conto suo, e non è un dettaglio implementativo: è la lezione di un guasto
vero. Separati, i due dati potevano sopravvivere l'uno all'altro, e una fotografia rimasta
orfana di una libreria azzerata racconta al giro dopo una storia falsa — «queste voci
c'erano e ora non ci sono più» — facendo cancellare da OneDrive voci che nessuno aveva
toccato, e quindi anche dall'altro dispositivo. Nello stesso contenitore, o si salvano
tutt'e due o non si salva nessuna delle due: e senza fotografia la fusione somma, che è
l'errore che non perde niente.

Se OneDrive non risponde, o l'accesso è scaduto, **non succede niente di visibile**: si
continua in locale e il pannello lo segnala. L'app non porta mai via la pagina verso
Microsoft nel mezzo di un calcolo: quando serve un nuovo accesso compare un bottone.

---

## Sicurezza

L'app è un sito statico senza backend: non esiste un server che tenga i tuoi dati, e non
esiste un database da violare. Quello che resta da difendere sono tre cose.

**Il browser.** Tutto lo stato vive in `localStorage`, che è leggibile da qualunque codice
giri nella pagina. Perciò: nessun `eval` (le espressioni della calcolatrice passano da un
interprete scritto in casa, `src/calc/calcolatrice.ts`), nessun `dangerouslySetInnerHTML`,
e gli indirizzi che entrano da fuori — il campo della scheda Normativa e i JSON importati —
passano tutti da `urlSicuro()`, che scarta ciò che non è `http`/`https`. Senza quel filtro
un file di progetto ricevuto da terzi poteva portarsi dentro un `javascript:` e farlo
eseguire dentro la pagina dell'app.

**Il trasporto.** `public/_headers` porta le intestazioni servite da Cloudflare Pages: una
CSP che consente script solo dall'origine e connessioni solo verso Microsoft Graph,
`frame-ancestors 'none'`, `nosniff`, HSTS e i permessi del dispositivo (camera, microfono,
posizione) spenti in blocco.

**Il repository.** Non c'è e non ci deve essere nessun segreto nel codice: il client id di
Azure è pubblico per costruzione, e il flusso PKCE è nato apposta per le app che non
possono custodire niente. La CI gira con `permissions: contents: read` e un checkout senza
credenziali persistenti, così una dipendenza compromessa durante `npm ci` non trova un
token capace di toccare il repository.

Cosa **non** protegge tutto questo: chiunque conosca l'indirizzo può aprire il sito e fare i
calcoli — è voluto. Ma i dati no: la libreria sta nel *tuo* OneDrive, e senza il tuo account
Microsoft da qui non è raggiungibile. Chi apre il sito e fa l'accesso lavora sul proprio.
Il permesso concesso all'app si revoca quando si vuole da *account.microsoft.com → Privacy
→ App e servizi*.

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
    calcolatrice.ts  interprete delle espressioni e sequenza delle grandezze
    unita.ts       forma e scala delle unità di misura, e la loro conversione
    quaderno.ts    blocchi del foglio e loro ricalcolo dalle fonti collegate
    relazione.ts   capitoli e blocchi delle schede, e il testo per la relazione
    esportazione.ts  foglio A4: documento in testo semplice e in HTML autonomo
  data/            tabelle normative e di materiali (ntc2018.ts, materiali.ts)
    normative.ts   indice dei documenti e dei capitoli del foglio Norme
    armature.ts    diametri, pesi, mandrini di piega e raggi di curvatura
    bulloni.ts     profilario metrico e classi di resistenza delle viti
    profili-acciaio.ts  sagomario IPE/HEA/HEB/UPN, angolari e tubi
    comuni.ts      FILE GENERATO: comuni, zona sismica, coordinate
    parametri-sismici.ts  FILE GENERATO: ag/F0/TC* per comune e per TR
  components/      pattern di UI riusabili e diagrammi SVG
  tabs/            una scheda per file
  cloud/           libreria personale e sincronizzazione OneDrive (facoltativa)
    libreria.ts    forma del file e fusione a tre vie fra dispositivo e OneDrive
    auth.ts        accesso Microsoft (MSAL, authorization code + PKCE)
    onedrive.ts    il pezzetto di Graph che serve: leggi/scrivi un JSON
    useSincronia.ts  quando si sincronizza, e cosa succede quando fallisce
  state/           stato dell'app (useReducer + context, persistenza locale)
  styles/          token del design system e fogli di stile
```

Il calcolo è tenuto **separato dai componenti**: `src/calc/` non importa nulla da React,
così le formule restano verificabili con i test.

### I dati dei comuni

`src/data/comuni.ts` e `src/data/parametri-sismici.ts` sono generati e committati: il
calcolo non fa nessuna chiamata di rete (l'unica rete dell'app è la sincronizzazione
OneDrive, facoltativa e spenta finché non la si collega). Vanno rigenerati **insieme** — il secondo è indicizzato
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
- Le unità del Quaderno sono **dimensionali**: i valori girano in unità base (m, N) e cambiare
  l'unità di lettura converte il numero. Due conseguenze da tenere a mente: il **kg è un kgf**
  (1 kg = 9,80665 N), perché in kg/mc e kg/cmq è una forza — per le masse questa scheda non
  serve; e quando un'unità non è determinabile (una somma fra grandezze diverse) non si
  converte niente, si mostra il numero come è.
- Prima della versione 7 dello schema l'algebra era **simbolica**: `cm*cm` faceva `cmq` e i
  fattori restavano a chi scriveva i numeri. Un progetto salvato allora si riapre, ma le
  formule che portavano dentro un fattore di conversione scritto a mano (`*1000`, `*1e4`) ora
  lo contano due volte: vanno ripulite dal fattore, che adesso lo mette il motore.

## Prossimi passi

1. Verifiche in acciaio dal foglio `Verifica_aste_acciaio_rev01.xlsm` (aste, schiacciamento
   anima, sagomario dei profili): è il foglio più corposo dei tre e conviene affrontarlo
   come step a sé.
2. Verifiche a flessione e pressoflessione per il calcestruzzo.
3. Legno e muratura.
4. Spettro di risposta disegnato (Se(T) e Sd(T)) a partire dai parametri già calcolati.
