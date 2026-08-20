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

Il VEd può essere agganciato al taglio massimo calcolato nella scheda Sollecitazioni — per le
verifiche a taglio del calcestruzzo e per il taglio della sezione in acciaio: con il
collegamento attivo è un **valore derivato**, calcolato in render e non salvato nello stato,
che conserva solo il numero scritto a mano. Il campo porta il badge `↩ da Sollecitazioni`,
che premuto scollega il valore.

Nel **taglio armato** il disegno segue il numero di bracci: due sono i lati verticali della
staffa perimetrale, dal terzo in poi si aggiungono **bracci interni** — il tratto verticale
con i suoi ganci, non un ferro longitudinale in più — con un ferro longitudinale per ciascuno.
Le pastiglie della scheda (materiale, verifica visibile, VEd da Sollecitazioni) stanno tutte
in fila a sinistra della barra.

Nella scheda i numeri sono **allineati a sinistra**, nei campi come nelle colonne delle
tabelle di esito: con i campi numerici a destra e le tendine a sinistra la colonna aveva due
margini di lettura, e l'occhio doveva saltare fra l'uno e l'altro.

Ogni verifica riporta esito, margine percentuale e barra di sfruttamento; sono verificati
anche i minimi di normativa (Asw,min = 1.5·bw e passo massimo min(330; 0.8·d), §4.1.6.1.1).
I dati in ingresso sono **controllati**: passo delle staffe o luce nulli, d maggiore di h,
α fuori da 45°÷90°, γc < 1 marcano il campo e **bloccano l'esito** invece di dichiararne uno
falso. Accanto ai campi c'è la **sezione quotata** con bw, h, d, staffe e armatura.

L'**acciaio** non passa dalla barra di schede: si sceglie la **sezione una volta sola**, in
testa alla scheda — profilo, classe di acciaio, γM0 e γM1, con accanto le proprietà e la
classe — e sotto stanno le verifiche, in due gruppi di tendine che partono tutte chiuse. Ogni
tendina porta sul titolo il suo sfruttamento e il suo esito, così il quadro si legge senza
aprire niente, e si apre solo quella su cui si sta lavorando.

**Verifiche elastiche — predimensionamento**

| Verifica | Formula | Riferimento |
|---|---|---|
| Flessione elastica | MRd = Wel,x · fyd | §4.2.4.1.2 |
| Taglio elastico | VRd = Avz · fyd / √3 | §4.2.4.1.2.4 |
| Compressione elastica | NRd = A · fyd (senza instabilità) | §4.2.4.1.2 |
| Deformazione (SLE) | f ≤ L/limite, freccia in forma chiusa | §4.2.4.2.1, tab. 4.2.X |

**Verifiche di stabilità**

| Verifica | Formula | Riferimento |
|---|---|---|
| Instabilità di punta | Nb,Rd = χ · A · fyk / γM1 | §4.2.4.1.3.1 |
| Instabilità flesso-torsionale | Mb,Rd = χLT · Wy · fyk / γM1 | §4.2.4.1.3.2 |
| Presso-flessione, Metodo A | somma dei tre termini ≤ 1 | Circolare §C4.2.4.1.3.3 |

La **deformazione** è il controllo di predimensionamento che manca sempre quando si sceglie
un profilo: schema statico fra i sei elementari, carico di esercizio, luce, e il limite di
tabella 4.2.X scelto per destinazione (copertura, solaio, solaio che regge colonne). La
freccia esce dalla forma chiusa sull'inerzia dell'asse forte — serve a decidere l'altezza del
profilo, non sostituisce il calcolo della struttura reale, che sta nella scheda
Sollecitazioni con i suoi vincoli veri.

La **classe della sezione** è calcolata dalla scheda (§4.2.3): ogni parete si misura sul
proprio rapporto c/t — larghezze prese *fra i raccordi*, come vuole il prospetto — e la
sezione prende la classe peggiore. La classificazione cambia con l'acciaio, tramite
ε = √(235/fyk), e con il tipo di sollecitazione: un'anima inflessa ha l'asse neutro in
mezzeria e limiti larghi, la stessa anima tutta compressa li ha molto più stretti (un
IPE 600 in S235 è classe 1 in flessione e classe 4 in compressione pura). Dove agiscono
insieme assiale e momento si usa il caso compresso, che è il più severo dei due.

Da qui esce il **modulo resistente** delle verifiche di stabilità: plastico in classe 1 e 2,
elastico in classe 3. Si può ancora imporre a mano, ma di serie lo decide la classe. La
**classe 4** non viene verificata di nascosto: la scheda dice quale parete è snella e di
quanto sfora, e avvisa che il risultato — calcolato sulla sezione lorda, perché le proprietà
efficaci non sono implementate — è ottimistico.

L'**instabilità flesso-torsionale** è trascritta dal foglio `Verifica_aste_acciaio_rev01.xlsm`
(foglio "Verifica aste" e funzione VBA `Mom_critico_Mcr`). Il momento critico elastico segue
il prospetto F.1 della ENV 1993-1-1:

```
Mcr = C1 · π²·E·Iz/(k·L)² · [ √( (k/kw)²·Iw/Iz + (k·L)²·G·It/(π²·E·Iz) + (C2·zg)² ) − C2·zg ]
```

e da lì si scende a λLT = √(Wy·fyk/Mcr), alla curva di instabilità (tab. 4.2.VI: `a` o `b`
per i doppi T laminati secondo h/b, `d` per tutte le altre sezioni) e a χLT. I doppi T
laminati usano il ramo dedicato delle NTC — λLT,0 = 0.4, β = 0.75 e il tetto χLT ≤ 1/λLT² —
le altre sezioni il caso generale (λLT,0 = 0.2, β = 1).

Si sceglie la condizione di carico e vincolo fra le sei del prospetto (momenti d'estremità
con il loro ψ, carico distribuito, forza in mezzeria, due forze a L/3, con estremi appoggiati
o incastrati), il punto di applicazione del carico — l'ala superiore è destabilizzante,
quella inferiore no — e se usare il modulo elastico o quello plastico. Mcr si può anche
imporre a mano, se viene da un'analisi di stabilità fatta a parte.

La verifica **vale per tutti i tipi di profilo**, e non perché sia stata forzata: cambia
quale dei due termini di Mcr comanda. Nei profili aperti pesa l'ingobbamento, nei tubi la
rigidezza torsionale, che è così alta da portare λLT sotto la soglia e χLT a 1. Per tubo
quadro e tubo tondo, che hanno la stessa inerzia in tutte le direzioni, lo sbandamento
laterale non può proprio avvenire: la scheda lo dice e Mb,Rd coincide con il momento
resistente della sezione.

L'**instabilità di punta** guarda i due assi separatamente — lunghezza dell'asta e
coefficiente di libera inflessione β per ciascuno, perché i controventi trattengono l'asse
debole più spesso di quello forte — e tiene il χ più basso dei due: si sbanda dove si è più
deboli.

β non si sceglie a occhio: è il numero da cui dipende tutto il resto (il carico critico va
con 1/(β·L)², fra β = 0.7 e β = 2 si divide per otto) e la scheda lo fa scegliere invece che
scrivere. Per ciascun asse si prende **uno schema di vincolo** fra i sei elementari, e il
disegno accanto mostra la deformata di sbandamento con la sua Lcr — così β si *vede*, come
distanza fra due punti di flesso. In alternativa si passa dalle **formule di Wood** per le
colonne di telaio: si danno i due fattori di distribuzione η ai nodi e β lo calcola la
scheda, distinguendo il telaio controventato da quello che non lo è. Resta la terza strada,
il numero scritto a mano, per quando arriva da un'analisi fatta altrove.

La tendina «**Come si sceglie β**», in coda al gruppo, è la guida vera e propria: i sei
schemi disegnati uno accanto all'altro con β teorico e β consigliato, perché i due numeri
sono diversi (un incastro vero non è quello del disegno: una base di colonna ruota, un nodo
bullonato cede) e in progetto si usa il secondo. Il prospetto è quello classico di
CNR-UNI 10011 — lo stesso della tabella C-A-7.1 del commentario AISC, riportato da Ballio e
Mazzolani in «Strutture in acciaio». Sotto ci sono le formule di Wood per esteso, con la
definizione di η, e il promemoria che si dimentica più spesso: **βy e βz sono due numeri
diversi**, e una colonna di capannone è un telaio in un piano e un'asta controventata
nell'altro. La curva viene dalla tab. 4.2.VIII (h/b e spessore dell'ala per i doppi T, formatura
per i profili cavi, `b` per gli angolari, `c` per gli U), e la tabella dei risultati mostra
per ogni asse Lcr, λ, λ̄, curva, χ e Nb,Rd, con evidenziato quello che governa. Una snellezza
oltre 200 viene segnalata. Per gli angolari la snellezza è quella attorno all'asse principale
minimo, che non è quello dei lati.

La **presso-flessione combinata** è il Metodo A della Circolare: mette insieme quello che le
altre schede guardano separatamente —

```
NEd/(χmin·Npl,Rd) + My,Ed/[χLT·My,Rd·(1 − NEd/Ncr,y)] + Mz,Ed/[Mz,Rd·(1 − NEd/Ncr,z)] ≤ 1
```

— riusando χmin dall'instabilità di punta e χLT dalla flesso-torsionale, senza ricalcolarli.
I due fattori 1/(1 − NEd/Ncr) sono l'effetto del secondo ordine: l'assiale non consuma solo
resistenza propria, amplifica anche i momenti. La tabella mostra i tre termini uno per uno,
con domanda, capacità e amplificazione, così si vede quale dei tre sta mangiando il margine.
Quando NEd raggiunge un carico critico euleriano la formula perde senso e la scheda lo dice
invece di stampare un numero.

Legno e muratura sono segnaposto — vedi "Prossimi passi".

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

**Il foglio.** Porta in testa il **titolo del progetto** e la data — commessa, località e
revisione restano sull'HTML esportato, che è il documento da consegnare; sul foglio di lavoro
erano una riga di dati già scritti altrove — una **riga di premessa** e una **nota a piè di
pagina**, e in mezzo i blocchi, numerati come i passaggi di un calcolo a mano. Si aggiungono dove servono — in coda o fra due blocchi già
scritti — si **riordinano** (maniglia, frecce o trascinamento) e si eliminano con la ×.

I blocchi stanno su una **griglia a tre colonne** con il passo di una riga: sono quelle le
posizioni possibili. Una riga di calcolo occupa **una riga sola** — nome, formula e risultato
non vanno mai a capo — e si prende **le colonne che le servono**: la larghezza non si sceglie,
la decide il contenuto, così una formula lunga si allarga e una corta non tiene una colonna
vuota. Se la riga ha una nota, quella va **sotto, in grigetto piccolo**. Note, schemi e
capitoli restano a riga intera, con il loro comando 1-2-3. Il corpo del testo è quello di un
foglio scritto in Arial Narrow 11.

**Definizione o formula, lo capisce da sé.** Una riga in cui non c'è nessuna operazione — un
numero e basta (`0,30`, `-3`, `1e3`, `50%`) — è la **definizione di una grandezza**, e si legge
`b = 0,30 m`: il secondo uguale ripeterebbe lo stesso numero due volte. Appena compare
un'operazione — un segno, una funzione, il richiamo di un'altra grandezza — la riga diventa una
**formula** e il risultato torna a destra: `A = b*h = 0,09 mq`. Vale sul foglio, nel testo
copiato e nell'HTML esportato, e lo decide `senzaOperazioni()` leggendo davvero l'espressione,
non a occhio con una regex (`src/calc/calcolatrice.ts`).

Una formula nuova si propone nel **primo posto libero** — in coda, o subito dopo il blocco da
cui si è partiti — e nasce con il cursore sul **nome**: una riga si scrive nell'ordine in cui
si legge, prima come si chiama il risultato e poi come lo si calcola, e il Tab porta dall'uno
all'altro. Se il posto non va bene la si **porta più in
basso** con le due frecce del blocco (o `Ctrl+↓` e `Ctrl+↑`): le caselle saltate restano lì,
vuote, e si premono per farla risalire o ci si lascia cadere il passaggio successivo. Da una
cella, **`Ctrl+Tab` infila una formula subito dopo**: si scrive un passaggio e si va al
prossimo senza staccare le mani dalla tastiera.

Ogni blocco porta due comandi in più: la **(i)** apre la sua **nota** — il perché del
passaggio, che a rileggere il foglio fra sei mesi è l'unica cosa che non si ricostruisce, e
che finisce anche nel testo copiato e nell'HTML esportato — e la **matita** prende in mano una
riga già scritta: una formula preimpostata, una grandezza o un import diventano una formula
scrivibile lì, con lo stesso nome, la stessa espressione e la stessa unità. Si stacca dalla
fonte — è il prezzo per poterla correggere — e da lì in avanti è testo che si edita.

**Il pannello**, sei sezioni ad accordion **chiuse di serie** — quello che si guarda è il
foglio, il pannello si apre quando serve prendere qualcosa da lì; tutto quello che sta dentro
si **trascina** nel foglio o si aggiunge con il «+», e ci resta **collegato**:

| Sezione | Che cosa dà |
|---|---|
| Grandezze da compilare | `b`, `l`, `h`, `q` e le altre del calcolo di oggi, su due colonne |
| Grandezze fisse | i pesi di volume `γC`, `γS`, `γT` e le costanti, con la γ scritta col pedice |
| Grandezze da libreria | le quattro tendine (CLS, acciaio, ferro ⌀, bullone M) e le resistenze che ne discendono |
| Operazioni preimpostate | una card per formula: in testa il risultato che dà — «A (mq)» — e sotto la formula; **entra con il suo corredo** (sotto) |
| Import rapido da altre schede | M max, V max, q di progetto, luce, freccia, neve, vento, VRd, MRd, esiti delle verifiche |
| Capitoli da altre schede | un capitolo intero di relazione, come faceva la spunta della vecchia Esporta |

Più il **Tastierino**, che scrive nella formula toccata per ultima: serve su cellulare, dove la
γ e la `^` non ci sono.

**Una formula preimpostata entra con il suo corredo.** `M = q·l²/8` senza `q` e senza `l` non
è un calcolo, è un promemoria: prima lasciava una riga rossa «manca q, l» e toccava andarsi a
cercare le due grandezze nel pannello, aggiungerle, controllare l'unità e tornare indietro.
Ora, tirandola nel foglio, le grandezze che le servono e che non ci sono ancora **arrivano
prima di lei**, nell'ordine in cui la formula le nomina. Dove si va a prenderle, in ordine:

1. **è già fra le grandezze del pannello** → sul foglio va la riga che la richiama, e basta;
2. **sta nel catalogo** delle grandezze proposte (`b`, `l`, `q`, `E`, `J`, i pesi di volume…)
   → si aggiunge a quelle da compilare **con la sua unità di misura**, che è il punto: una `q`
   senza unità, o in kN/mq invece che in kN/m, fa tornare un numero sbagliato senza dire niente;
3. **non si sa cosa sia** → non si inventa. Il nome compare in una riga di suggerimenti sopra
   il foglio, con accanto il campo dell'unità: si scrive «kN/m», si preme «+», e la grandezza
   entra fra quelle da compilare con la riga già posata prima del passaggio che la nomina.

Una grandezza che c'è ma è **senza unità** non blocca niente e viene detta lo stesso: il numero
girerebbe senza scala, e accorgersene dopo costa più che leggerlo adesso.

**Celle editabili e celle da calcolare.** Una riga che porta un numero *scritto da qualcuno* —
una grandezza tirata dal pannello, una definizione scritta a mano come `b = 0,30 m` — ha una
velatura **ocra trasparente**; una riga che il foglio *calcola* resta sulla carta bianca. Lo
stesso vale nel pannello, dove il campo del valore di ogni grandezza ha la stessa velatura. È
la distinzione che a mano si fa cerchiando i dati di partenza: rileggendo un calcolo, sapere
dove si può mettere le mani è la prima cosa che si cerca. Il valore che arriva da un'altra
scheda non è ocra — quello si cambia dove è nato.

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

**Il risultato si legge con una cifra dopo la virgola**: un'area di 0,0855 mq si scrive
0,1 mq, perché le cifre in più non dicono niente di più di quello che il dato di partenza sa.
Restano per esteso solo i numeri che con una cifra sola diventerebbero illeggibili — gli
enormi e i piccolissimi, in notazione scientifica, e quelli che si azzererebbero, che tengono
le loro due cifre significative (`formattaRisultato()` in `src/calc/calcolatrice.ts`).

**Il semaforo degli sfruttamenti.** Un risultato letto in percento — un rapporto di verifica —
si colora da sé: **verde** sotto l'80 %, **giallo** fino al 100, **rosso** oltre. È una
pastiglia piena con il numero in bianco, non un numero colorato: si vede da lontano e di
sbieco, che è come si guarda un foglio di verifiche.

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
| *Salva HTML* | un file `.html` **autonomo**, stile e schemi compresi e nessuna risorsa esterna: si apre con qualunque browser, offline, e si ristampa in PDF |

Il salvataggio è un **«Salva con nome»**: prima si sceglie la cartella e il nome, poi si
scrive. Dove il browser lo consente (Chrome, Edge) si apre la finestra di sistema — e la
seconda volta si riapre dov'era; dove non c'è (Firefox, Safari) si chiede almeno il nome e la
cartella la decide il browser. Chiudere la finestra non salva niente. Sta tutto in
`src/calc/salvataggio.ts`.

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
La **libreria personale** dei documenti che si aprono tutti i giorni: NTC, Circolare, CNR,
Eurocodici, capitolati, qualunque link. Non c'è nessun indice di serie — ci sta quello che ci
si mette, con «Edita».

- **Categorie**: aprendo il foglio si vedono gli **scaffali** — «Norme nazionali»,
  «Eurocodici», «Capitolati», quelli che si vogliono — con quanti documenti hanno dentro e le
  prime sigle; si entra in uno e si vedono i suoi documenti. Lo scaffale aperto si **richiude
  da dove si è aperto** — un secondo tocco sulla cartella in testa all'elenco — o con
  «Categorie», che c'è sempre. Una categoria non è un elenco a parte: nasce scrivendone il nome
  nel campo *Categoria* di un documento e sparisce da sé quando resta vuota. Chi non ne ha una
  sta in «Senza categoria». Con una categoria sola non c'è niente da smistare e il foglio si
  apre già sui documenti — ma anche quella si chiude, e restano le cartelle.
- **Un documento** è categoria, sigla (la riga ocra), titolo e **indirizzo** — di preferenza il
  link OneDrive del PDF. «Testo completo» con un indirizzo di OneDrive prova prima l'app
  desktop e, se non risponde, apre il documento sul web.
- **Indice dei capitoli** scritto a mano: numero, titolo e pagina. Non porta a nessun link —
  serve a ricordare a colpo d'occhio a che pagina sta un capitolo, per trovarla in fretta una
  volta aperto il documento. I punti nel numero danno il **rientro** (`2.1` sotto `2`).
- **Ordine a piacere, anche dopo**: in «Edita» ogni documento ha le frecce **su** e **giù** e
  si porta dove serve **dentro la sua categoria** — quello che si apre tutti i giorni sta in
  cima. (Con una ricerca in corso le frecce si spengono: l'elenco che si vede non è quello
  vero.) Le categorie seguono l'ordine dei documenti che contengono, non l'alfabeto.
- **Ricerca** su sigla, titolo e capitoli (`taglio`, `neve`, `VRd`, `C8.5`…): pesca in **tutta**
  la libreria, categorie comprese — quando si cerca «taglio» non importa su che scaffale sta —
  e resta il documento che corrisponde, o i soli capitoli che corrispondono, con scritto da
  dove viene.

Sono **dati di chi usa l'app, non della commessa**: sopravvivono a «Svuota tutto» e, con
OneDrive collegato, si ritrovano su tutti i dispositivi (vedi `src/cloud/libreria.ts`).

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
  schema e migrazione dei file salvati da versioni precedenti. L'esportazione è un «Salva con
  nome» (cartella e nome si scelgono, proposto `commessa-rev0.json`), non un file che cade
  nei download. Lo stato si salva in
  `localStorage` con un ritardo di 300 ms, così scrivere in un campo non costa una
  serializzazione per carattere.
- **Svuota tutto**: cancella il salvataggio automatico — quello che alla riapertura ripropone
  i campi già compilati — e riporta ogni scheda ai valori iniziali. È l'unico comando che
  perde dati: chiede conferma e ricorda di usare prima *Esporta JSON* per conservare il
  lavoro. **Non** tocca la libreria personale (vedi sotto): le norme aggiunte a mano, le
  unità, le formule preimpostate e le grandezze con cui sono scritte non sono roba di
  commessa e restano dove sono — delle grandezze da compilare torna l'elenco, non i numeri.
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
| Cosa | azioni, sollecitazioni, verifiche, computo, quaderno, **valori** delle grandezze da compilare | norme e link aggiunti a mano, unità di misura, formule preimpostate, **elenco** delle grandezze da compilare e costanti col loro valore |
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

```jsonc
{
  "schemaVersion": 4,
  "aggiornato": "2026-08-20T09:00:00.000Z",
  "normative": [ /* sigla, titolo, url, categoria, indice dei capitoli */ ],
  "unita": [ "m", "cm", "kN", "kNm", "MPa", … ],
  "preimpostate": [ { "id": "pre-m-app", "nome": "M", "espressione": "q*l^2/8", "nota": "…", "um": "kNm" } ],
  "grandezze": [ { "id": "calc-q", "nome": "q", "espressione": "", "nota": "carico distribuito", "um": "kN/m", "tipo": "compilabile" } ]
}
```

Le **grandezze** sono entrate con lo `schemaVersion` 4, e sono l'alfabeto con cui le formule
preimpostate sono scritte: una formula che nomina `q` non serve a niente sul telefono se lì
`q` non esiste, o esiste in kN/mq invece che in kN/m. Di quelle **da compilare** viaggia
l'intestazione — nome, unità, nota — e **non il valore**, che è di questa trave e di questa
commessa; delle **costanti** (`tipo: "fissa"`) viaggia anche il valore, perché un peso di
volume è lo stesso ovunque ed è proprio per non riscriverlo che sta lì. Applicando la
libreria, il valore già scritto su questo dispositivo **resta dov'è**: arriva l'elenco, non
il foglio bianco.

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
Serve anche a sapere **chi ha cambiato che cosa dentro una voce**: quando la stessa norma sta
da tutte e due le parti ma diversa, vince chi l'ha toccata, e questo dispositivo vince solo se
l'ha toccata anche lui. Tenere sempre la copia locale non perdeva *voci* ma perdeva quello che
c'era scritto dentro: la divisione in categorie fatta dal PC spariva al primo giro del
telefono — che quelle norme le aveva, vecchie, e le rimandava su OneDrive così com'erano — per
poi ricomparire al giro dopo del PC, che faceva la stessa cosa al contrario.
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
    verifiche.ts   verifiche a taglio, flessione e sezioni in acciaio (dai fogli Excel)
    instabilita.ts stabilità delle membrature in acciaio: punta, flesso-torsionale, Metodo A
    libera-inflessione.ts  β: schemi di vincolo, valori consigliati, formule di Wood
    classificazione.ts  classe della sezione dai rapporti c/t (§4.2.3)
    calcolatrice.ts  interprete delle espressioni e sequenza delle grandezze
    unita.ts       forma e scala delle unità di misura, e la loro conversione
    quaderno.ts    blocchi del foglio e loro ricalcolo dalle fonti collegate
    relazione.ts   capitoli e blocchi delle schede, e il testo per la relazione
    esportazione.ts  foglio A4: documento in testo semplice e in HTML autonomo
    salvataggio.ts   «Salva con nome»: dove il file va e come si chiama
  data/            tabelle normative e di materiali (ntc2018.ts, materiali.ts)
    normative.ts   documenti, categorie e capitoli del foglio Norme
    armature.ts    diametri, pesi, mandrini di piega e raggi di curvatura
    bulloni.ts     profilario metrico e classi di resistenza delle viti
    profili-acciaio.ts  sagomario IPE/HEA/HEB/UPN, angolari e tubi (con It, Iw, Wpl)
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
- L'inerzia torsionale **It** dei profili a sagomario è di tabella, non calcolata: la
  formula di parete sottile Σ b·t³/3 trascura i raccordi e per un IPE 160 dà 2.8 cm⁴ invece
  di 3.6, cioè il 22% in meno sul termine che regge il momento critico dei profili corti.
  UPN 50 e 65, che il sagomario del foglio non riporta, ricadono sulle formule geometriche:
  sono le sole due taglie calcolate, e stanno a favore di sicurezza.
- Per gli **angolari** il momento critico usa l'inerzia principale minima (Ix − |Ixy|), non
  quella attorno all'asse geometrico: gli assi principali di un L a lati uguali stanno a 45°
  e la rigidezza laterale vera è meno della metà di quella che si legge sui lati. Resta
  comunque una verifica approssimata, perché la flessione attorno a un asse non principale
  è di per sé deviata: per un angolare caricato sul serio serve un calcolo dedicato.
- I coefficienti **C1, C2, C3** del prospetto F.1 sono tabellati per punti: k vale 1, 0.7 o
  0.5 e ψ va di quarto in quarto. Un valore intermedio viene ricondotto al più vicino, e la
  scheda avvisa quando lo fa.
- Il foglio `Verifica_aste_acciaio_rev01.xlsm` scrive il terzo termine del Metodo A con il
  modulo dell'**asse forte** (`Wy_pl` dove la formula vuole `Wz`), e tratta la compressione
  come negativa dentro `(1 − NEd/Ncr)` — con quel segno il fattore *smorza* l'effetto del
  secondo ordine invece di amplificarlo. **L'app usa Wz e amplifica nel verso giusto**; è
  la ragione per cui, con un assiale in gioco, i suoi numeri sono più severi di quelli del
  foglio.
- I β **consigliati** degli schemi elementari (0.65, 0.80, 1.20, 2.10) sono più alti dei
  teorici (0.5, 0.7, 1.0, 2.0) perché il vincolo reale non è mai quello ideale. L'app propone
  i consigliati, che è la scelta di progetto; chi ha un incastro davvero rigido può scendere
  ai teorici scrivendo β a mano.
- Il **limite di deformabilità** della tab. 4.2.X è quello sulla freccia totale δmax. La norma
  distingue anche δ2, la parte dovuta ai carichi variabili, che l'app non separa: il controllo
  qui è di predimensionamento, e usa il carico che gli si dà.
- La curva di instabilità dei **profili cavi** dipende da come sono stati ottenuti: a caldo
  la `a`, a freddo la `c`, che è molto più penalizzante. Il sagomario non lo registra, così
  la scheda lo chiede, e parte da «formato a freddo» — se il tubo è laminato a caldo lo si
  dice e la curva migliora.
- La **classificazione** copre il caso di sola flessione e quello di sola compressione. Con
  assiale e momento insieme non si interpola sulla posizione dell'asse neutro: si usa il
  caso compresso, il più severo. Per tubi e angolari, che nel sagomario non hanno raggi di
  piegatura, le larghezze vengono dalla convenzione c = b − 3·t della UNI EN 1993-1-1, e la
  scheda marca il risultato come approssimato.
- Prima della versione 7 dello schema l'algebra era **simbolica**: `cm*cm` faceva `cmq` e i
  fattori restavano a chi scriveva i numeri. Un progetto salvato allora si riapre, ma le
  formule che portavano dentro un fattore di conversione scritto a mano (`*1000`, `*1e4`) ora
  lo contano due volte: vanno ripulite dal fattore, che adesso lo mette il motore.

## Prossimi passi

1. Quel che resta del foglio `Verifica_aste_acciaio_rev01.xlsm`: presso-flessione biassiale
   plastica di sezione (§4.2.4.1.2.8), verifica a schiacciamento dell'anima, e le proprietà
   efficaci delle sezioni in classe 4, oggi solo segnalate.
2. Verifiche a flessione e pressoflessione per il calcestruzzo.
3. Legno e muratura.
4. Spettro di risposta disegnato (Se(T) e Sd(T)) a partire dai parametri già calcolati.
