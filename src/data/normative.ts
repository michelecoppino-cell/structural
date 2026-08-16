/**
 * Indice della normativa: documenti di riferimento e capitoli richiamabili
 * dalla scheda "Normativa".
 *
 * È un file di dati, non di calcolo: **si aggiorna a mano**, un capitolo alla
 * volta, e quello che si scrive qui resta nel sito per tutti i progetti (non è
 * dato di commessa, non finisce nel JSON esportato).
 *
 * Per aggiungere una voce:
 *
 *  1. se la norma non c'è ancora, aggiungi un `Documento` a `DOCUMENTI` con la
 *     sua sigla, gli estremi e l'URL del PDF;
 *  2. aggiungi le voci a `INDICE` con `doc` uguale all'id del documento,
 *     `codice` (§ o capitolo), `titolo` e — se ti serve — `tag` per la ricerca;
 *  3. `pagina` è facoltativa: se la valorizzi, il link apre il PDF direttamente
 *     su quella pagina (fragment `#page=N`, gestito dai visualizzatori PDF di
 *     Chrome, Edge, Firefox e Safari). Senza `pagina` il link apre il documento
 *     e il codice del capitolo resta comunque scritto accanto al titolo.
 *     Le pagine si contano sul PDF, non sulla numerazione stampata: aprilo una
 *     volta, segna il numero e scrivilo qui.
 *  4. `url` sulla singola voce sovrascrive quello del documento, per quando un
 *     capitolo ha una sua pagina web dedicata.
 */

export interface Documento {
  id: string;
  /** Sigla breve, usata come intestazione del gruppo (es. "NTC 2018"). */
  sigla: string;
  titolo: string;
  /** Estremi di pubblicazione, per riconoscere l'edizione giusta. */
  estremi: string;
  url: string;
  nota?: string;
}

export interface VoceNorma {
  /** id del documento di appartenenza. */
  doc: string;
  /** Numero di capitolo o paragrafo, come scritto nella norma. */
  codice: string;
  titolo: string;
  /** Pagina del PDF (facoltativa): abilita il link diretto al capitolo. */
  pagina?: number;
  /** URL alternativo, se la voce non sta nel PDF del documento. */
  url?: string;
  /** Parole chiave aggiuntive per la ricerca. */
  tag?: string;
}

export const DOCUMENTI: Documento[] = [
  {
    id: 'ntc2018',
    sigla: 'NTC 2018',
    titolo: 'Norme Tecniche per le Costruzioni',
    estremi: 'DM 17/01/2018 — GU n. 42 del 20/02/2018, Suppl. Ordinario n. 8',
    url: 'https://www.gazzettaufficiale.it/eli/gu/2018/02/20/42/so/8/sg/pdf',
  },
  {
    id: 'circolare2019',
    sigla: 'Circolare 2019',
    titolo: 'Istruzioni per l’applicazione dell’«Aggiornamento delle NTC» (Circolare n. 7 C.S.LL.PP.)',
    estremi: 'Circolare 21/01/2019 n. 7 — GU n. 35 dell’11/02/2019, Suppl. Ordinario n. 5',
    url: 'https://www.gazzettaufficiale.it/eli/gu/2019/02/11/35/so/5/sg/pdf',
    nota: 'I capitoli della Circolare seguono la numerazione delle NTC con la lettera C davanti.',
  },
];

export const INDICE: VoceNorma[] = [
  /* ── NTC 2018 ────────────────────────────────────────────────────────── */
  { doc: 'ntc2018', codice: 'Cap. 2', titolo: 'Sicurezza e prestazioni attese', tag: 'stati limite SLU SLE vita nominale classe d’uso combinazioni' },
  { doc: 'ntc2018', codice: 'Cap. 3', titolo: 'Azioni sulle costruzioni' },
  { doc: 'ntc2018', codice: '§ 3.1', titolo: 'Opere civili e industriali — carichi permanenti e variabili', tag: 'pesi propri sovraccarichi' },
  { doc: 'ntc2018', codice: '§ 3.1.4', titolo: 'Carichi variabili — Tab. 3.1.II', tag: 'categoria qk Qk Hk psi coefficienti di combinazione' },
  { doc: 'ntc2018', codice: '§ 3.2', titolo: 'Azione sismica', tag: 'ag F0 TC* spettro suolo topografia q VR TR' },
  { doc: 'ntc2018', codice: '§ 3.2.3.2', titolo: 'Spettro di risposta elastico in accelerazione', tag: 'Se S SS ST CC TB TC TD' },
  { doc: 'ntc2018', codice: '§ 3.3', titolo: 'Azioni del vento', tag: 'vb qb ce cp cd zona esposizione' },
  { doc: 'ntc2018', codice: '§ 3.4', titolo: 'Azioni della neve', tag: 'qsk qs mu1 CE Ct zona altitudine' },
  { doc: 'ntc2018', codice: '§ 3.5', titolo: 'Azioni della temperatura' },
  { doc: 'ntc2018', codice: '§ 3.6', titolo: 'Azioni eccezionali', tag: 'incendio urto esplosione' },
  { doc: 'ntc2018', codice: 'Cap. 4', titolo: 'Costruzioni civili e industriali' },
  { doc: 'ntc2018', codice: '§ 4.1', titolo: 'Costruzioni di calcestruzzo' },
  { doc: 'ntc2018', codice: '§ 4.1.2.3.4', titolo: 'Resistenza a flessione e pressoflessione', tag: 'MRd cls armatura' },
  { doc: 'ntc2018', codice: '§ 4.1.2.3.5.1', titolo: 'Taglio — elementi senza armature trasversali', tag: 'VRd vmin rho1 k sigma cp' },
  { doc: 'ntc2018', codice: '§ 4.1.2.3.5.2', titolo: 'Taglio — elementi con armature trasversali', tag: 'VRsd VRcd cot theta staffe traliccio' },
  { doc: 'ntc2018', codice: '§ 4.1.2.3.6', titolo: 'Resistenza a torsione' },
  { doc: 'ntc2018', codice: '§ 4.1.2.2', titolo: 'Verifiche agli stati limite di esercizio', tag: 'fessurazione tensioni deformazioni frecce' },
  { doc: 'ntc2018', codice: '§ 4.1.6.1.1', titolo: 'Armature delle travi — minimi e passo delle staffe', tag: 'Asw min passo massimo dettagli costruttivi' },
  { doc: 'ntc2018', codice: '§ 4.2', titolo: 'Costruzioni di acciaio', tag: 'profili classi sezione instabilità' },
  { doc: 'ntc2018', codice: '§ 4.2.4.1.2', titolo: 'Acciaio — resistenza delle sezioni', tag: 'Npl Mpl Vpl classe' },
  { doc: 'ntc2018', codice: '§ 4.2.4.1.3', titolo: 'Acciaio — stabilità delle membrature', tag: 'aste compresse svergolamento chi' },
  { doc: 'ntc2018', codice: '§ 4.4', titolo: 'Costruzioni di legno', tag: 'kmod gamma M classe di servizio' },
  { doc: 'ntc2018', codice: '§ 4.5', titolo: 'Costruzioni di muratura', tag: 'fk fvk snellezza pressoflessione' },
  { doc: 'ntc2018', codice: 'Cap. 6', titolo: 'Progettazione geotecnica' },
  { doc: 'ntc2018', codice: '§ 6.4', titolo: 'Opere di fondazione', tag: 'superficiali plinti pali capacità portante' },
  { doc: 'ntc2018', codice: '§ 6.5', titolo: 'Opere di sostegno', tag: 'muri spinta delle terre Ka ribaltamento scorrimento' },
  { doc: 'ntc2018', codice: 'Cap. 7', titolo: 'Progettazione in presenza di azioni sismiche' },
  { doc: 'ntc2018', codice: '§ 7.3', titolo: 'Metodi di analisi e criteri di verifica', tag: 'analisi statica lineare modale pushover' },
  { doc: 'ntc2018', codice: '§ 7.4', titolo: 'Costruzioni di calcestruzzo in zona sismica', tag: 'gerarchia delle resistenze CD A CD B' },
  { doc: 'ntc2018', codice: '§ 7.5', titolo: 'Costruzioni di acciaio in zona sismica' },
  { doc: 'ntc2018', codice: '§ 7.8', titolo: 'Costruzioni di muratura in zona sismica', tag: 'ordinaria armata semplice' },
  { doc: 'ntc2018', codice: 'Cap. 8', titolo: 'Costruzioni esistenti' },
  { doc: 'ntc2018', codice: '§ 8.4', titolo: 'Classificazione degli interventi', tag: 'adeguamento miglioramento riparazione locale' },
  { doc: 'ntc2018', codice: '§ 8.5', titolo: 'Procedure per la valutazione della sicurezza', tag: 'livelli di conoscenza fattore di confidenza FC' },
  { doc: 'ntc2018', codice: 'Cap. 11', titolo: 'Materiali e prodotti per uso strutturale' },
  { doc: 'ntc2018', codice: '§ 11.2', titolo: 'Calcestruzzo', tag: 'Rck fck classi di resistenza controlli' },
  { doc: 'ntc2018', codice: '§ 11.3', titolo: 'Acciaio', tag: 'B450C B450A profili qualificazione' },

  /* ── Circolare n. 7 del 2019 ─────────────────────────────────────────── */
  { doc: 'circolare2019', codice: 'C2', titolo: 'Sicurezza e prestazioni attese' },
  { doc: 'circolare2019', codice: 'C3', titolo: 'Azioni sulle costruzioni' },
  { doc: 'circolare2019', codice: 'C3.2', titolo: 'Azione sismica — commento', tag: 'spettri smorzamento fattore di comportamento' },
  { doc: 'circolare2019', codice: 'C3.3', titolo: 'Azioni del vento — commento', tag: 'coefficienti di forma pressione' },
  { doc: 'circolare2019', codice: 'C4.1', titolo: 'Costruzioni di calcestruzzo — commento' },
  { doc: 'circolare2019', codice: 'C4.2', titolo: 'Costruzioni di acciaio — commento' },
  { doc: 'circolare2019', codice: 'C4.5', titolo: 'Costruzioni di muratura — commento' },
  { doc: 'circolare2019', codice: 'C6', titolo: 'Progettazione geotecnica — commento' },
  { doc: 'circolare2019', codice: 'C7', titolo: 'Progettazione in presenza di azioni sismiche — commento' },
  { doc: 'circolare2019', codice: 'C8', titolo: 'Costruzioni esistenti — commento', tag: 'valutazione della sicurezza interventi' },
  { doc: 'circolare2019', codice: 'C8.5', titolo: 'Conoscenza della costruzione', tag: 'livelli di conoscenza LC1 LC2 LC3 fattori di confidenza' },
  { doc: 'circolare2019', codice: 'C8.7', titolo: 'Valutazione della sicurezza e progetto degli interventi', tag: 'meccanismi locali cinematismi muratura' },
];

/** Link effettivo di una voce: URL proprio, altrimenti il PDF del documento (con la pagina, se nota). */
export function linkVoce(voce: VoceNorma, doc: Documento): string {
  if (voce.url) return voce.url;
  return voce.pagina ? `${doc.url}#page=${voce.pagina}` : doc.url;
}
