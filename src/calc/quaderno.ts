/**
 * Il Quaderno: un foglio bianco su cui il calcolo si scrive nell'ordine in cui
 * lo si pensa, e che è già il documento da stampare.
 *
 * Un quaderno è una **sequenza di blocchi**. Ogni blocco è una riga di calcolo,
 * una nota, uno schema incollato o un capitolo ripreso da un'altra scheda. Si
 * aggiungono dove servono — in coda o fra due blocchi già scritti — e si
 * riordinano: l'ordine racconta la sequenza del calcolo, e ripensarci a metà
 * foglio è la regola, non l'eccezione. I nomi si rileggono nell'ordine nuovo,
 * quindi spostare un blocco sopra a chi lo usa fa tornare i conti.
 *
 * I blocchi di calcolo **non salvano il proprio valore**: salvano da dove viene
 * (la grandezza, la formula preimpostata, la scheda) e lo ricalcolano ogni
 * volta. Correggere la base della trave nel pannello a destra aggiorna da solo
 * tutto quello che ne discende, senza toccare il quaderno.
 *
 * Un blocco di calcolo con un nome valido diventa una variabile per i blocchi
 * che vengono dopo: `A = b·h` e poi `σ = N/A`, come si scriverebbe a mano.
 *
 * L'unità con cui leggere il risultato è del blocco, non della formula: la si
 * cambia e il **numero si converte** (0,8 MPa → 8,16 kg/cmq). Le uniche cose
 * che un blocco salva per sé sono il testo di una nota e l'immagine di uno
 * schema.
 */

import {
  formattaIn,
  haOperazioni,
  leggiRisultato,
  nomeAmmesso,
  nomiMancanti,
  valutaConUnita,
  variabili,
  unitaVariabili,
  type Preimpostata,
  type VoceCalcolata,
} from './calcolatrice';
import { UNITA_DEFAULT, dimUnita, inBase, unitaCompatibili, type Dim } from './unita';

/**
 * Che cosa può stare su una pagina:
 *  - `valore`, `operazione`, `import`: una riga di calcolo collegata alla sua
 *    fonte (una grandezza del pannello, una formula preimpostata, un risultato
 *    di un'altra scheda);
 *  - `formula`: una riga scritta qui, con il suo nome e la sua unità;
 *  - `nota` e `immagine`: quello che si aggiunge a mano;
 *  - `capitolo`: un capitolo intero ripreso da un'altra scheda, come faceva la
 *    spunta della vecchia scheda Esporta.
 */
export type TipoBlocco = 'valore' | 'operazione' | 'formula' | 'import' | 'nota' | 'immagine' | 'capitolo';

export interface BloccoQuaderno {
  id: string;
  tipo: TipoBlocco;
  /** Fonte a cui il blocco resta collegato: id della grandezza, della formula, dell'import o del capitolo. */
  fonte: string;
  /** Nome del risultato: si può correggere solo sui blocchi `formula`. */
  nome: string;
  /** Espressione dei blocchi `formula`. */
  espressione: string;
  /** Unità con cui si vuole leggere il risultato; vuota = quella della fonte. */
  um: string;
  /** Testo della nota, o didascalia dell'immagine. */
  testo: string;
  /**
   * Nota scritta a mano su questo passaggio: il «perché» che a rileggere il
   * foglio fra sei mesi è l'unica cosa che non si ricostruisce. Si apre con
   * la (i) del blocco e finisce anche nella stampa, sotto la riga.
   */
  appunto: string;
  /**
   * Quante colonne occupa sulla griglia del foglio (1…3); 0 = come viene.
   * Vale ancora per note, schemi e capitoli — una riga di calcolo, invece,
   * prende da sé le colonne che le servono (vedi `spanBlocco`).
   */
  colonne: number;
  /**
   * Quanti posti liberi lasciare **prima** di questo blocco sulla griglia.
   * Una formula nuova si propone nel primo posto libero — `salto` è il modo
   * di dire «no, questa va più in basso»: uno slot saltato la sposta di una
   * casella, tre la portano alla riga dopo.
   */
  salto: number;
  /** Immagine incollata o trascinata, come data URL. */
  img: string;
  /**
   * Larghezza dell'immagine in percentuale della colonna (20…100). 0 = intera:
   * uno schema piccolo non deve occupare mezza pagina solo perché è arrivato
   * così, e la misura scelta vale anche nel file esportato.
   */
  larghezza: number;
}

/** Un blocco nuovo, con tutti i campi al loro posto. */
export function nuovoBlocco(tipo: TipoBlocco, patch: Partial<BloccoQuaderno> = {}): BloccoQuaderno {
  return {
    id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    fonte: '',
    nome: '',
    espressione: '',
    um: '',
    testo: '',
    appunto: '',
    colonne: 0,
    salto: 0,
    img: '',
    larghezza: 0,
    ...patch,
  };
}

/** Colonne occupate da un blocco sulla griglia a tre del foglio. */
export function colonneBlocco(b: BloccoQuaderno): number {
  const scelte = Math.round(Number(b.colonne));
  if (Number.isFinite(scelte) && scelte >= 1 && scelte <= COLONNE_FOGLIO) return scelte;
  return PIENI.includes(b.tipo) ? COLONNE_FOGLIO : 1;
}

/** Colonne della griglia del foglio: tre, come su un quaderno a quadretti. */
export const COLONNE_FOGLIO = 3;

/**
 * Quanti caratteri stanno comodi in una colonna del foglio: è la misura con
 * cui una riga di calcolo decide da sé quanto è larga. Non è un numero esatto
 * — i caratteri non hanno tutti la stessa larghezza — ma è quello che serve:
 * distinguere `A = b*h = 0,12 mq` da una formula che va a capo.
 */
const CARATTERI_COLONNA = 30;

/**
 * Larghezza di una riga di calcolo, in colonne: **la decide il contenuto**.
 * Una formula corta sta in una colonna, una lunga se ne prende due o tre —
 * così sul foglio non ci sono né righe mozzate né mezze colonne vuote.
 *
 * Note, schemi e capitoli non c'entrano: quelli tengono la loro larghezza
 * scelta (`colonne`), tutta la riga se non se n'è scelta una.
 */
export function spanBlocco(b: BloccoCalcolato): number {
  if (b.pieno) return colonneBlocco(b.blocco);
  const caratteri = lunghezzaRiga(b);
  return Math.min(COLONNE_FOGLIO, Math.max(1, Math.ceil(caratteri / CARATTERI_COLONNA)));
}

/**
 * Quanto è lunga, in caratteri, la riga che il blocco scrive sul foglio:
 * `nome = formula = risultato unità`. Al testo si aggiunge quello che il testo
 * non dice — il riquadro dell'unità, e sulle formule scritte qui i bordi dei
 * campi — se no una riga corta nasce stretta al punto che la formula non si
 * legge più. Un blocco `formula` ancora vuoto conta il suo minimo: nasce di
 * una colonna e si allarga da sé mentre lo si scrive.
 */
function lunghezzaRiga(b: BloccoCalcolato): number {
  const nome = (b.blocco.tipo === 'formula' ? b.blocco.nome : b.nome).trim();
  const espressione = (b.blocco.tipo === 'formula' ? b.blocco.espressione : b.espressione).trim();
  const esito = b.errore
    ? b.errore
    : b.mancanti.length
      ? `manca ${b.mancanti.join(', ')}`
      : b.testo || `${formattaIn(b.valore, b.um)} ${b.um}`;
  const scritta = b.blocco.tipo === 'formula';
  // una definizione (`b = 0,30`) non mostra la formula: non le serve il posto
  const mostraEspressione = scritta || haOperazioni(espressione);
  const scritto =
    (nome.length ? nome.length + 3 : 0) + (espressione && mostraEspressione ? espressione.length + 3 : 0);
  return Math.max(scritta ? 14 : 0, scritto + esito.trim().length) + (scritta ? 12 : 8);
}

/**
 * Un risultato pronto da tirare dentro dalle altre schede: il taglio delle
 * Sollecitazioni, l'esito di una verifica. Il valore arriva nell'unità con cui
 * la scheda di provenienza lo mostra; a convertirlo pensa il quaderno.
 */
export interface ImportoScheda {
  id: string;
  /** Nome con cui il valore diventa richiamabile nel quaderno. */
  nome: string;
  /** Come si chiama nell'elenco del pannello: «M max», «Esito taglio». */
  etichetta: string;
  /** Scheda da cui arriva, per il segno di provenienza. */
  scheda: string;
  valore: number;
  um: string;
  /** Testo al posto del numero, per quello che non è un numero (un esito). */
  testo?: string;
}

/** Tutto quello che serve a dare un valore ai blocchi del quaderno. */
export interface Sorgenti {
  /** Le grandezze del pannello, già ricalcolate (libreria compresa). */
  voci: VoceCalcolata[];
  preimpostate: Preimpostata[];
  importi: ImportoScheda[];
  elenco: string[];
}

/** Un blocco con dentro il suo valore di adesso. */
export interface BloccoCalcolato {
  blocco: BloccoQuaderno;
  /** Numero di passo mostrato sul foglio: 01, 02, … */
  passo: string;
  /** true = occupa tutta la riga (nota, immagine, capitolo). */
  pieno: boolean;
  /** true = il valore si ricalcola da solo dalla sua fonte. */
  collegato: boolean;
  /** Etichetta del tipo di blocco, come compare sulla pastiglia. */
  etichetta: string;
  /** Scheda o libreria di provenienza, se il blocco ne ha una. */
  provenienza: string;
  /** Nota che accompagna la fonte (la spiegazione della formula). */
  nota: string;
  /* ── solo per i blocchi di calcolo ── */
  nome: string;
  /** Formula come è scritta, con i nomi delle grandezze. */
  espressione: string;
  /** Numero da mostrare, letto nell'unità `um`. */
  valore: number;
  /** Valore in unità base: è quello che vedono i blocchi successivi. */
  valoreBase: number;
  um: string;
  /** Unità ricavata dall'operazione, quando non se n'è scelta una. */
  umAuto: string;
  /** Unità che porta la fonte (la formula preimpostata, la grandezza, l'import). */
  umFonte: string;
  /** Unità fra cui si può scegliere per leggere questo risultato. */
  umAmmesse: string[];
  /** true = il valore è un dato scritto, non il risultato di un'operazione:
   *  l'unità dà la scala al numero invece di convertirlo. */
  dato: boolean;
  dim: Dim | null;
  /** Testo al posto del numero (esiti delle verifiche). */
  testo: string;
  errore: string;
  /** Grandezze che servirebbero e non ci sono ancora. */
  mancanti: string[];
  /** true = il nome non entra fra le variabili (vuoto, già usato, non ammesso). */
  nomeIgnorato: boolean;
}

const VUOTO = {
  collegato: false,
  etichetta: '',
  provenienza: '',
  nota: '',
  nome: '',
  espressione: '',
  valore: NaN,
  valoreBase: NaN,
  um: '',
  umAuto: '',
  umFonte: '',
  umAmmesse: [] as string[],
  dato: false,
  dim: null,
  testo: '',
  errore: '',
  mancanti: [] as string[],
  nomeIgnorato: false,
};

/** I blocchi che occupano tutta la riga: hanno un contenuto, non un numero. */
const PIENI: TipoBlocco[] = ['nota', 'immagine', 'capitolo'];

/**
 * Due numeri sono «lo stesso numero» se differiscono meno di un miliardesimo
 * relativo: lo stesso valore passato per una conversione di unità può tornare
 * indietro con l'ultimo bit diverso, e non è un valore diverso.
 */
function stessoNumero(a: number, b: number): boolean {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b), 1e-12);
}

/**
 * Ricalcola il quaderno intero, in ordine. Ogni blocco vede le grandezze del
 * pannello e i risultati dei blocchi che lo precedono; un blocco con un nome
 * nuovo e valido diventa a sua volta una grandezza richiamabile.
 */
export function ricalcolaQuaderno(
  blocchi: BloccoQuaderno[],
  { voci, preimpostate, importi, elenco = UNITA_DEFAULT }: Sorgenti,
): BloccoCalcolato[] {
  const vars = variabili(voci);
  const unita = unitaVariabili(voci);

  return blocchi.map((blocco, i) => {
    const passo = String(i + 1).padStart(2, '0');
    const pieno = PIENI.includes(blocco.tipo);
    const base: BloccoCalcolato = { blocco, passo, pieno, ...VUOTO };

    if (blocco.tipo === 'nota') return { ...base, etichetta: 'nota' };
    if (blocco.tipo === 'immagine') return { ...base, etichetta: 'schema' };
    if (blocco.tipo === 'capitolo')
      return { ...base, collegato: true, etichetta: 'capitolo', provenienza: blocco.fonte };

    /* ── i blocchi di calcolo: nome, formula e da dove viene il numero ── */

    let nome = blocco.nome.trim();
    let espressione = '';
    let umFonte = '';
    let etichetta = 'operazione';
    let provenienza = '';
    let nota = '';
    /** Valore già pronto (grandezza, import) invece di una formula da valutare. */
    let pronto: { valoreBase: number; dim: Dim; testo?: string } | null = null;

    if (blocco.tipo === 'valore') {
      const v = voci.find((x) => x.id === blocco.fonte);
      if (!v) return { ...base, etichetta: 'grandezza', errore: 'grandezza non più in elenco' };
      nome = v.nome.trim();
      espressione = v.espressione.trim();
      umFonte = v.umEffettiva;
      etichetta = 'grandezza';
      nota = v.nota;
      const testa = { ...base, collegato: true, etichetta, nome, espressione, nota, um: umFonte, umFonte };
      if (v.errore) return { ...testa, errore: v.errore };
      // una grandezza ancora da compilare è un promemoria, non un errore
      if (!espressione) return { ...testa, mancanti: [nome || 'il valore'] };
      pronto = { valoreBase: v.valoreBase, dim: v.dim ?? {} };
    } else if (blocco.tipo === 'operazione') {
      const p = preimpostate.find((x) => x.id === blocco.fonte);
      if (!p) return { ...base, etichetta, errore: 'formula non più in elenco' };
      nome = p.nome.trim();
      espressione = p.espressione.trim();
      umFonte = p.um.trim();
      provenienza = 'formule';
      nota = p.nota;
    } else if (blocco.tipo === 'formula') {
      espressione = blocco.espressione.trim();
      etichetta = 'formula';
    } else {
      const im = importi.find((x) => x.id === blocco.fonte);
      if (!im) return { ...base, etichetta: 'import', errore: 'valore non più disponibile' };
      nome = im.nome.trim();
      // il nome basta: come si chiama nella scheda di provenienza lo dice la nota
      espressione = '';
      nota = im.etichetta;
      umFonte = im.um;
      etichetta = 'import';
      provenienza = im.scheda;
      pronto = { valoreBase: inBase(im.valore, im.um), dim: dimUnita(im.um), testo: im.testo };
    }

    const umScelta = blocco.um.trim() || umFonte;

    // il valore: o è già pronto (grandezza, import) o si valuta la formula
    let valore = NaN;
    let dim: Dim | null = null;
    let errore = '';
    let mancanti: string[] = [];
    let testo = pronto?.testo ?? '';
    /** true = numero puro che viene da grandezze con unità: un rapporto. */
    let rapporto = false;

    if (pronto) {
      valore = pronto.valoreBase;
      dim = pronto.dim;
    } else if (!espressione) {
      errore = blocco.tipo === 'formula' ? '' : 'formula vuota';
      mancanti = blocco.tipo === 'formula' ? ['una formula'] : [];
    } else {
      mancanti = nomiMancanti(espressione, vars);
      if (mancanti.length) {
        // niente errore: mancano dei dati, non è sbagliata
      } else {
        const esito = valutaConUnita(espressione, vars, unita);
        if (esito.ok) {
          valore = esito.valore;
          dim = esito.dim;
          rapporto = esito.rapporto;
        } else errore = esito.errore;
      }
    }

    const letto = Number.isFinite(valore) ? leggiRisultato(valore, dim, umScelta, elenco, rapporto) : null;
    const dimFinale = letto ? letto.dim : (dim ?? dimUnita(umScelta));
    const um = letto ? letto.um : umScelta;

    // il nome entra fra le variabili solo se è nuovo: due `M` diversi
    // renderebbero ambiguo il richiamo, e il primo ha la precedenza
    const registrabile =
      !!nome && nomeAmmesso(nome) && !(nome in vars) && !!letto && Number.isFinite(letto.valoreBase);
    if (registrabile && letto) {
      vars[nome] = letto.valoreBase;
      unita[nome] = letto.dim ?? {};
    }

    /**
     * L'avviso «questo nome è già usato più su» ha senso solo quando dietro allo
     * stesso nome c'è un **numero diverso**: allora sì che il richiamo più in
     * basso è ambiguo. Una grandezza tirata dal pannello, invece, *è* la sua
     * variabile — b sul foglio e b nel pannello sono lo stesso b — e segnalarla
     * come doppione era un falso allarme su ogni blocco collegato.
     */
    const doppioneVero =
      !!nome && !registrabile && !!letto && !stessoNumero(vars[nome], letto.valoreBase);

    return {
      blocco,
      passo,
      pieno,
      collegato: blocco.tipo !== 'formula',
      etichetta,
      provenienza,
      nota,
      nome,
      espressione,
      valore: letto ? letto.valore : NaN,
      valoreBase: letto ? letto.valoreBase : NaN,
      um,
      umAuto: letto?.umAuto ?? '',
      umFonte,
      umAmmesse: dimFinale ? unitaCompatibili(dimFinale, elenco) : [],
      dato: letto ? letto.dato : true,
      dim: dimFinale,
      testo,
      errore,
      mancanti,
      nomeIgnorato: doppioneVero,
    };
  });
}

/**
 * Riga di testo di un blocco di calcolo, per il «Copia» e per l'HTML:
 * `nome = formula = risultato unità`. È la stessa riga che si vede sul foglio.
 */
export function testoBlocco(b: BloccoCalcolato): string {
  const testa = b.nome ? `${b.nome} = ` : '';
  if (b.errore) return `${testa}${b.espressione} — errore: ${b.errore}`;
  if (b.mancanti.length) return `${testa}${b.espressione || '—'} — manca ${b.mancanti.join(', ')}`;
  if (b.testo) return `${testa}${b.testo}`;
  const um = b.um ? ` ${b.um}` : '';
  const numero = formattaIn(b.valore, b.um);
  // il secondo uguale serve solo se c'è un conto da mostrare: `b = 0,30 m` è
  // una definizione, `A = b*h = 0,09 mq` è una formula
  const formula = haOperazioni(b.espressione) ? `${b.espressione} = ` : '';
  return `${testa}${formula}${numero}${um}`;
}

/**
 * Come sta un rapporto di verifica letto in percento: sotto l'80 % c'è
 * margine, fra l'80 e il 100 si è al limite, oltre il 100 non passa. È il
 * semaforo che si mette a matita a fianco del numero, e vale solo dove il
 * numero è davvero una percentuale — sugli altri risultati non c'è nulla da
 * dire.
 */
export type LivelloEsito = '' | 'ok' | 'limite' | 'fuori';

export function livelloEsito(b: BloccoCalcolato): LivelloEsito {
  if (b.errore || b.mancanti.length || b.testo) return '';
  if (b.um.trim() !== '%' || !Number.isFinite(b.valore)) return '';
  if (b.valore > 100) return 'fuori';
  if (b.valore >= 80) return 'limite';
  return 'ok';
}

/** Larghezza minima di uno schema: sotto non si legge più niente. */
export const LARGHEZZA_MIN = 20;

/** Larghezza di uno schema riportata dentro i limiti; 0 = intera colonna. */
export function larghezzaValida(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(Math.min(100, Math.max(LARGHEZZA_MIN, n)));
}

/** Quanti posti liberi si possono lasciare prima di un blocco: due righe piene. */
export const SALTO_MAX = 2 * COLONNE_FOGLIO;

/** Posti liberi prima di un blocco, riportati fra 0 e `SALTO_MAX`. */
export function saltoValido(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(SALTO_MAX, Math.round(n));
}

/** Colonne di un blocco riportate fra 1 e 3; 0 = lascia decidere al tipo. */
export function colonneValide(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(COLONNE_FOGLIO, Math.max(1, Math.round(n)));
}

/** Rimette in ordine i blocchi che arrivano da un salvataggio. */
export function normalizzaBlocchi(raw: Partial<BloccoQuaderno>[]): BloccoQuaderno[] {
  const tipi: TipoBlocco[] = ['valore', 'operazione', 'formula', 'import', 'nota', 'immagine', 'capitolo'];
  return (Array.isArray(raw) ? raw : []).flatMap((b, i) => {
    const tipo = tipi.find((t) => t === b?.tipo);
    if (!tipo) return [];
    return [
      {
        id: b?.id || `q-${i}`,
        tipo,
        fonte: b?.fonte ?? '',
        nome: b?.nome ?? '',
        espressione: b?.espressione ?? '',
        um: b?.um ?? '',
        testo: b?.testo ?? '',
        appunto: b?.appunto ?? '',
        colonne: colonneValide(b?.colonne),
        salto: saltoValido(b?.salto),
        img: typeof b?.img === 'string' ? b.img : '',
        larghezza: larghezzaValida(b?.larghezza),
      },
    ];
  });
}
