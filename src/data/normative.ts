/**
 * Indice della normativa: documenti, capitoli e paragrafi della scheda
 * "Normativa".
 *
 * È un file di dati, non di calcolo: **si aggiorna a mano**, un capitolo alla
 * volta, e quello che si scrive qui resta nel sito per tutti i progetti (non è
 * dato di commessa, non finisce nel JSON esportato).
 *
 * I link puntano a studiopetrillo.com, che pubblica le NTC 2018 e la Circolare
 * **spezzate per capitolo**: così un riferimento apre il capitolo giusto e non
 * l'intero decreto. Per ogni capitolo ci sono due destinazioni:
 *
 *  - `url`  — la pagina web del capitolo, dove esiste: si legge bene anche da
 *             cellulare ed è quella che si apre cliccando il capitolo;
 *  - `pdf`  — il PDF del solo capitolo (`…/files/ntc2018/cap3.pdf`), a cui
 *             puntano i paragrafi; con `pagina` valorizzata il PDF si apre
 *             direttamente su quella pagina (fragment `#page=N`, gestito dai
 *             visualizzatori di Chrome, Edge, Firefox e Safari).
 *
 * Per aggiungere una voce:
 *
 *  1. se la norma non c'è ancora, aggiungi un `Documento` a `DOCUMENTI`;
 *  2. se manca il capitolo, aggiungi un `Capitolo` a `CAPITOLI` — il PDF si
 *     ricava da solo dal numero, basta non passare `pdf`;
 *  3. aggiungi il paragrafo all'elenco `voci` del capitolo: `codice` come lo
 *     scrive la norma (il numero di punti decide il rientro), `titolo` e — se
 *     ti serve — `tag` con le parole chiave per la ricerca;
 *  4. `pagina` è facoltativa: è la pagina **del PDF del capitolo**, non del
 *     decreto intero. Aprilo una volta, segna il numero e scrivilo qui.
 */

export interface Documento {
  id: string;
  /** Sigla breve, usata come intestazione del gruppo (es. "NTC 2018"). */
  sigla: string;
  titolo: string;
  /** Estremi di pubblicazione, per riconoscere l'edizione giusta. */
  estremi: string;
  /** Indice del documento sul sito di consultazione. */
  url: string;
  /** PDF del testo completo. */
  pdf: string;
  /** PDF del capitolo n, sul sito di consultazione. */
  pdfCapitolo: (n: number) => string;
  nota?: string;
}

/**
 * Norma o link aggiunto a mano dall'utente, dalla scheda Normativa: ha la
 * stessa testata dei documenti di serie (sigla ocra, titolo bianco) ma sta
 * nello stato dell'app, non in questo file.
 */
export interface LinkUtente {
  id: string;
  /** Sigla breve — è la riga ocra (es. "CNR-DT 207"). */
  sigla: string;
  /** Titolo esteso — è la riga bianca. */
  titolo: string;
  url: string;
}

export interface VoceNorma {
  /** Numero di paragrafo come lo scrive la norma: i punti danno il rientro. */
  codice: string;
  titolo: string;
  /** Pagina del PDF del capitolo (facoltativa): apre il PDF su quel punto. */
  pagina?: number;
  /** URL alternativo, se il paragrafo ha una sua pagina dedicata. */
  url?: string;
  /** Parole chiave aggiuntive per la ricerca. */
  tag?: string;
}

export interface Capitolo {
  doc: string;
  /** Numero del capitolo: sceglie il PDF sul sito di consultazione. */
  n: number;
  /** Come si chiama nel documento (es. "Cap. 3", "C7"). */
  etichetta: string;
  titolo: string;
  /** Pagina web del capitolo, dove il sito ce l'ha. */
  url?: string;
  /** PDF del capitolo, se non segue lo schema del documento. */
  pdf?: string;
  tag?: string;
  voci: VoceNorma[];
}

const SITO = 'https://www.studiopetrillo.com';

export const DOCUMENTI: Documento[] = [
  {
    id: 'ntc2018',
    sigla: 'NTC 2018',
    titolo: 'Norme Tecniche per le Costruzioni',
    estremi: 'DM 17/01/2018 — GU n. 42 del 20/02/2018, Suppl. Ordinario n. 8',
    url: `${SITO}/ntc2018.html`,
    pdf: `${SITO}/files/ntc2018/ntc2018.pdf`,
    pdfCapitolo: (n) => `${SITO}/files/ntc2018/cap${n}.pdf`,
  },
  {
    id: 'circolare2019',
    sigla: 'Circolare 2019',
    titolo: 'Istruzioni per l’applicazione dell’«Aggiornamento delle NTC» (Circolare n. 7 C.S.LL.PP.)',
    estremi: 'Circolare 21/01/2019 n. 7 — GU n. 35 dell’11/02/2019, Suppl. Ordinario n. 5',
    url: `${SITO}/circolare-ntc-2018.html`,
    pdf: `${SITO}/files/ntc2018/circolare-ntc-2018.pdf`,
    pdfCapitolo: (n) => `${SITO}/files/ntc2018/circolare-ntc2018-cap${n}.pdf`,
    nota: 'I capitoli della Circolare seguono la numerazione delle NTC con la lettera C davanti.',
  },
];

export const CAPITOLI: Capitolo[] = [
  /* ── NTC 2018 ────────────────────────────────────────────────────────── */
  { doc: 'ntc2018', n: 1, etichetta: 'Cap. 1', titolo: 'Oggetto', voci: [] },
  {
    doc: 'ntc2018',
    n: 2,
    etichetta: 'Cap. 2',
    titolo: 'Sicurezza e prestazioni attese',
    url: `${SITO}/sicurezza-prestazioni-attese-ntc2018.html`,
    tag: 'stati limite SLU SLE vita nominale classe d’uso',
    voci: [
      { codice: '2.4', titolo: 'Vita nominale, classi d’uso e periodo di riferimento', tag: 'VN CU VR' },
      { codice: '2.5.3', titolo: 'Combinazioni delle azioni', tag: 'fondamentale caratteristica frequente quasi permanente sismica' },
      { codice: '2.6.1', titolo: 'Coefficienti parziali per le azioni — Tab. 2.6.I', tag: 'gamma G1 G2 Q EQU A1 A2' },
    ],
  },
  {
    doc: 'ntc2018',
    n: 3,
    etichetta: 'Cap. 3',
    titolo: 'Azioni sulle costruzioni',
    url: `${SITO}/azioni-sulle-costruzioni-ntc2018.html`,
    voci: [
      { codice: '3.1', titolo: 'Opere civili e industriali — carichi permanenti e variabili', tag: 'pesi propri sovraccarichi' },
      { codice: '3.1.4', titolo: 'Carichi variabili — Tab. 3.1.II', tag: 'categoria qk Qk Hk psi coefficienti di combinazione' },
      { codice: '3.2', titolo: 'Azione sismica', tag: 'ag F0 TC* spettro suolo topografia q VR TR' },
      { codice: '3.2.3.2', titolo: 'Spettro di risposta elastico in accelerazione', tag: 'Se S SS ST CC TB TC TD' },
      { codice: '3.2.3.5', titolo: 'Spettri di progetto per gli stati limite ultimi', tag: 'fattore di comportamento q Sd' },
      { codice: '3.3', titolo: 'Azioni del vento', tag: 'vb qb ce cp cd zona esposizione' },
      { codice: '3.4', titolo: 'Azioni della neve', tag: 'qsk qs mu1 CE Ct zona altitudine' },
      { codice: '3.5', titolo: 'Azioni della temperatura' },
      { codice: '3.6', titolo: 'Azioni eccezionali', tag: 'incendio urto esplosione' },
    ],
  },
  {
    doc: 'ntc2018',
    n: 4,
    etichetta: 'Cap. 4',
    titolo: 'Costruzioni civili e industriali',
    url: `${SITO}/costruzioni-civili-industriali-ntc2018.html`,
    voci: [
      { codice: '4.1', titolo: 'Costruzioni di calcestruzzo' },
      { codice: '4.1.2.2', titolo: 'Verifiche agli stati limite di esercizio', tag: 'fessurazione tensioni deformazioni frecce' },
      { codice: '4.1.2.3.4', titolo: 'Resistenza a flessione e pressoflessione', tag: 'MRd cls armatura' },
      { codice: '4.1.2.3.5.1', titolo: 'Taglio — elementi senza armature trasversali', tag: 'VRd vmin rho1 k sigma cp' },
      { codice: '4.1.2.3.5.2', titolo: 'Taglio — elementi con armature trasversali', tag: 'VRsd VRcd cot theta staffe traliccio' },
      { codice: '4.1.2.3.6', titolo: 'Resistenza a torsione' },
      { codice: '4.1.6.1.1', titolo: 'Armature delle travi — minimi e passo delle staffe', tag: 'Asw min passo massimo dettagli costruttivi' },
      { codice: '4.2', titolo: 'Costruzioni di acciaio', tag: 'profili classi di sezione instabilità' },
      { codice: '4.2.4.1.2', titolo: 'Acciaio — resistenza delle sezioni', tag: 'Npl Mpl Vpl classe' },
      { codice: '4.2.4.1.3', titolo: 'Acciaio — stabilità delle membrature', tag: 'aste compresse svergolamento chi' },
      { codice: '4.3', titolo: 'Costruzioni composte di acciaio e calcestruzzo' },
      { codice: '4.4', titolo: 'Costruzioni di legno', tag: 'kmod gamma M classe di servizio' },
      { codice: '4.5', titolo: 'Costruzioni di muratura', tag: 'fk fvk snellezza pressoflessione' },
      { codice: '4.6', titolo: 'Costruzioni di altri materiali' },
    ],
  },
  { doc: 'ntc2018', n: 5, etichetta: 'Cap. 5', titolo: 'Ponti', voci: [] },
  {
    doc: 'ntc2018',
    n: 6,
    etichetta: 'Cap. 6',
    titolo: 'Progettazione geotecnica',
    url: `${SITO}/progettazione-geotecnica-ntc2018.html`,
    voci: [
      { codice: '6.2.4', titolo: 'Verifiche della sicurezza e delle prestazioni', tag: 'approccio 1 approccio 2 A1 A2 M1 M2 R' },
      { codice: '6.4', titolo: 'Opere di fondazione', tag: 'superficiali plinti pali capacità portante' },
      { codice: '6.5', titolo: 'Opere di sostegno', tag: 'muri spinta delle terre Ka ribaltamento scorrimento' },
      { codice: '6.5.3', titolo: 'Verifiche delle opere di sostegno', tag: 'spinta attiva EQU GEO stabilità globale' },
      { codice: '6.8', titolo: 'Fronti di scavo e stabilità dei pendii' },
    ],
  },
  {
    doc: 'ntc2018',
    n: 7,
    etichetta: 'Cap. 7',
    titolo: 'Progettazione in presenza di azioni sismiche',
    url: `${SITO}/progettazione-azioni-sismiche-ntc2018.html`,
    voci: [
      { codice: '7.2', titolo: 'Criteri generali di progettazione e modellazione', tag: 'regolarità masse rigidezze' },
      { codice: '7.3', titolo: 'Metodi di analisi e criteri di verifica', tag: 'statica lineare modale pushover' },
      { codice: '7.3.3.1', titolo: 'Analisi lineare statica', tag: 'T1 Fh lambda distribuzione forze' },
      { codice: '7.4', titolo: 'Costruzioni di calcestruzzo', tag: 'gerarchia delle resistenze CD A CD B' },
      { codice: '7.5', titolo: 'Costruzioni di acciaio' },
      { codice: '7.8', titolo: 'Costruzioni di muratura', tag: 'ordinaria armata semplice' },
    ],
  },
  {
    doc: 'ntc2018',
    n: 8,
    etichetta: 'Cap. 8',
    titolo: 'Costruzioni esistenti',
    url: `${SITO}/costruzioni-esistenti-ntc2018.html`,
    voci: [
      { codice: '8.3', titolo: 'Valutazione della sicurezza', tag: 'indice di sicurezza zeta E' },
      { codice: '8.4', titolo: 'Classificazione degli interventi', tag: 'adeguamento miglioramento riparazione locale' },
      { codice: '8.5', titolo: 'Procedure per la valutazione della sicurezza', tag: 'livelli di conoscenza fattore di confidenza FC' },
      { codice: '8.7.1', titolo: 'Costruzioni in muratura — analisi e verifiche', tag: 'meccanismi locali cinematismi' },
    ],
  },
  { doc: 'ntc2018', n: 9, etichetta: 'Cap. 9', titolo: 'Collaudo statico', voci: [] },
  {
    doc: 'ntc2018',
    n: 10,
    etichetta: 'Cap. 10',
    titolo: 'Redazione dei progetti strutturali esecutivi e delle relazioni di calcolo',
    tag: 'relazione di calcolo elaborati validazione',
    voci: [],
  },
  {
    doc: 'ntc2018',
    n: 11,
    etichetta: 'Cap. 11',
    titolo: 'Materiali e prodotti per uso strutturale',
    voci: [
      { codice: '11.2', titolo: 'Calcestruzzo', tag: 'Rck fck classi di resistenza controlli di accettazione' },
      { codice: '11.3', titolo: 'Acciaio', tag: 'B450C B450A profili qualificazione' },
      { codice: '11.7', titolo: 'Materiali e prodotti a base di legno' },
    ],
  },
  { doc: 'ntc2018', n: 12, etichetta: 'Cap. 12', titolo: 'Riferimenti tecnici', voci: [] },

  /* ── Circolare n. 7 del 2019 ─────────────────────────────────────────── */
  { doc: 'circolare2019', n: 1, etichetta: 'C1', titolo: 'Introduzione', voci: [] },
  { doc: 'circolare2019', n: 2, etichetta: 'C2', titolo: 'Sicurezza e prestazioni attese', voci: [] },
  {
    doc: 'circolare2019',
    n: 3,
    etichetta: 'C3',
    titolo: 'Azioni sulle costruzioni',
    voci: [
      { codice: 'C3.2', titolo: 'Azione sismica', tag: 'spettri smorzamento fattore di comportamento' },
      { codice: 'C3.3', titolo: 'Azioni del vento', tag: 'coefficienti di forma pressione' },
      { codice: 'C3.4', titolo: 'Azioni della neve' },
    ],
  },
  {
    doc: 'circolare2019',
    n: 4,
    etichetta: 'C4',
    titolo: 'Costruzioni civili e industriali',
    voci: [
      { codice: 'C4.1', titolo: 'Costruzioni di calcestruzzo' },
      { codice: 'C4.2', titolo: 'Costruzioni di acciaio' },
      { codice: 'C4.4', titolo: 'Costruzioni di legno' },
      { codice: 'C4.5', titolo: 'Costruzioni di muratura' },
    ],
  },
  { doc: 'circolare2019', n: 5, etichetta: 'C5', titolo: 'Ponti', voci: [] },
  { doc: 'circolare2019', n: 6, etichetta: 'C6', titolo: 'Progettazione geotecnica', voci: [] },
  {
    doc: 'circolare2019',
    n: 7,
    etichetta: 'C7',
    titolo: 'Progettazione in presenza di azioni sismiche',
    voci: [
      { codice: 'C7.3', titolo: 'Metodi di analisi e criteri di verifica' },
      { codice: 'C7.4', titolo: 'Costruzioni di calcestruzzo' },
      { codice: 'C7.8', titolo: 'Costruzioni di muratura' },
    ],
  },
  {
    doc: 'circolare2019',
    n: 8,
    etichetta: 'C8',
    titolo: 'Costruzioni esistenti',
    tag: 'valutazione della sicurezza interventi',
    voci: [
      { codice: 'C8.5', titolo: 'Conoscenza della costruzione', tag: 'livelli di conoscenza LC1 LC2 LC3 fattori di confidenza' },
      { codice: 'C8.5.4', titolo: 'Caratterizzazione meccanica dei materiali', tag: 'tabella C8.5.I muratura murature esistenti' },
      { codice: 'C8.7.1', titolo: 'Costruzioni di muratura — analisi e verifiche', tag: 'meccanismi locali cinematismi' },
      { codice: 'C8.7.4', titolo: 'Criteri e tipi d’intervento', tag: 'rinforzi FRP catene cerchiature' },
    ],
  },
  { doc: 'circolare2019', n: 9, etichetta: 'C9', titolo: 'Collaudo statico', voci: [] },
  { doc: 'circolare2019', n: 10, etichetta: 'C10', titolo: 'Redazione dei progetti e delle relazioni di calcolo', voci: [] },
  { doc: 'circolare2019', n: 11, etichetta: 'C11', titolo: 'Materiali e prodotti per uso strutturale', voci: [] },
];

/** PDF del capitolo, da cui pendono i link dei paragrafi. */
export function pdfCapitolo(cap: Capitolo, doc: Documento): string {
  return cap.pdf ?? doc.pdfCapitolo(cap.n);
}

/** Dove porta il capitolo: la sua pagina web se c'è, altrimenti il PDF. */
export function linkCapitolo(cap: Capitolo, doc: Documento): string {
  return cap.url ?? pdfCapitolo(cap, doc);
}

/** Dove porta un paragrafo: il PDF del capitolo, sulla pagina indicata se nota. */
export function linkVoce(voce: VoceNorma, cap: Capitolo, doc: Documento): string {
  if (voce.url) return voce.url;
  const base = pdfCapitolo(cap, doc);
  return voce.pagina ? `${base}#page=${voce.pagina}` : base;
}

/**
 * Rientro del paragrafo: quanti livelli sotto il capitolo sta il codice.
 * `4.1` → 1, `4.1.2.3.5.2` → 5; la «C» della Circolare non conta.
 */
export function livello(codice: string): number {
  return codice.replace(/^C/i, '').split('.').filter(Boolean).length - 1;
}
