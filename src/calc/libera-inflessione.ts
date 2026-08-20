/**
 * Lunghezza di libera inflessione — il coefficiente β delle aste compresse.
 *
 * L'instabilità di punta ruota tutta attorno a β: la resistenza va con
 * 1/(β·L)² fin quando la snellezza conta, così passare da β = 0.7 a β = 2
 * divide il carico critico per otto. È anche il numero più facile da sbagliare,
 * perché non si legge da nessuna parte: va dedotto da come l'asta è trattenuta
 * agli estremi, e da se i suoi estremi possono spostarsi l'uno rispetto
 * all'altro.
 *
 * Due strade, tutt'e due qui dentro:
 *
 *  - **schemi elementari** (prospetto classico di CNR-UNI 10011, ripreso da
 *    Ballio-Mazzolani e dal commentario AISC): sei casi di vincolo con il loro
 *    β teorico. Accanto sta il β **consigliato per il progetto**, più alto,
 *    perché un incastro vero non è mai quello del disegno: un nodo bullonato
 *    cede, una base di colonna ruota, e contare sull'incastro perfetto è la
 *    strada per sopravvalutare la resistenza. Fra i due, in progetto si usa il
 *    secondo;
 *  - **colonne di telaio** (UNI EN 1993-1-1, appendice E della ENV, formule di
 *    Wood): β dai fattori di distribuzione η1 e η2, che dicono quanta parte
 *    della rigidezza al nodo è della colonna e quanta delle travi che vi
 *    arrivano. Qui la differenza vera la fa se il telaio è **a nodi fissi**
 *    (controventato: β ≤ 1) o **a nodi spostabili** (β ≥ 1, e cresce in fretta).
 */

/** Schema di vincolo di un'asta compressa. */
export interface SchemaVincoli {
  id: string;
  /** Nome dei vincoli, dal basso verso l'alto. */
  label: string;
  /** β teorico, dalla soluzione elastica esatta. */
  teorico: number;
  /** β consigliato in progetto, quando il vincolo reale approssima l'ideale. */
  consigliato: number;
  /** Vero se gli estremi possono spostarsi l'uno rispetto all'altro. */
  traslazione: boolean;
  /** Perché quel valore, in una riga. */
  nota: string;
}

/**
 * I sei casi elementari. I β teorici sono quelli della soluzione di Eulero;
 * i consigliati vengono dal prospetto di CNR-UNI 10011 (lo stesso della
 * tabella C-A-7.1 dell'AISC, riportato da Ballio-Mazzolani in «Strutture in
 * acciaio»), e valgono quando il vincolo reale si avvicina a quello ideale.
 */
export const SCHEMI_VINCOLI: SchemaVincoli[] = [
  {
    id: 'incastro-incastro',
    label: 'Incastro – incastro, senza traslazione',
    teorico: 0.5,
    consigliato: 0.65,
    traslazione: false,
    nota: 'Il caso più favorevole. Difficile da avere davvero: serve che entrambi i nodi non ruotino di nulla.',
  },
  {
    id: 'incastro-cerniera',
    label: 'Incastro – cerniera, senza traslazione',
    teorico: 0.7,
    consigliato: 0.8,
    traslazione: false,
    nota: 'Colonna incastrata alla base e trattenuta in testa da un solaio o da un controvento.',
  },
  {
    id: 'cerniera-cerniera',
    label: 'Cerniera – cerniera, senza traslazione',
    teorico: 1,
    consigliato: 1,
    traslazione: false,
    nota: 'Il riferimento: è l’asta di Eulero. Aste di controvento e bielle stanno qui.',
  },
  {
    id: 'incastro-incastro-traslante',
    label: 'Incastro – incastro, con traslazione',
    teorico: 1,
    consigliato: 1.2,
    traslazione: true,
    nota: 'Telaio non controventato con nodi rigidi: gli estremi non ruotano ma la testa si sposta.',
  },
  {
    id: 'incastro-cerniera-traslante',
    label: 'Incastro – cerniera, con traslazione',
    teorico: 2,
    consigliato: 2,
    traslazione: true,
    nota: 'Testa libera di ruotare e di spostarsi: la colonna lavora come una mensola incernierata in testa.',
  },
  {
    id: 'mensola',
    label: 'Incastro – estremo libero (mensola)',
    teorico: 2,
    consigliato: 2.1,
    traslazione: true,
    nota: 'Pilastro isolato, palo di un cartellone, colonna di un pensilina: niente lo trattiene in testa.',
  },
];

export const schemaVincoli = (id: string): SchemaVincoli | undefined =>
  SCHEMI_VINCOLI.find((s) => s.id === id);

/**
 * Fattore di distribuzione di un nodo: η = Kc / (Kc + ΣKtravi), con K = I/L.
 * Vale 0 con travi infinitamente rigide (incastro perfetto) e 1 senza travi
 * (cerniera). È adimensionale, e le rigidezze si possono passare in qualunque
 * unità purché la stessa per tutte. Con dati che non stanno in piedi (somma
 * nulla o negativa) restituisce 1, che è il caso severo: nessun aiuto dalle
 * travi.
 */
export function fattoreDistribuzione(Kcolonne: number, Ktravi: number): number {
  const tot = Kcolonne + Ktravi;
  if (tot <= 0 || Kcolonne < 0) return 1;
  return Math.min(1, Math.max(0, Kcolonne / tot));
}

/** Il telaio è controventato (nodi fissi) o no (nodi spostabili). */
export type TipoTelaio = 'fissi' | 'mobili';

/**
 * β di una colonna di telaio dai due fattori di distribuzione — formule di
 * Wood, appendice E della ENV 1993-1-1:
 *
 *   nodi fissi:      β = [1 + 0.145·(η1+η2) − 0.265·η1·η2]
 *                        / [2 − 0.364·(η1+η2) − 0.247·η1·η2]
 *   nodi spostabili: β = √{ [1 − 0.2·(η1+η2) − 0.12·η1·η2]
 *                        / [1 − 0.8·(η1+η2) + 0.6·η1·η2] }
 *
 * Ai due estremi del campo si ritrovano i casi elementari: con η1 = η2 = 0
 * (incastri perfetti) danno 0.5 e 1.0, con η1 = η2 = 1 (cerniere) danno 1.0 e
 * infinito — un telaio spostabile su due cerniere è un cinematismo, e la
 * formula lo dice divergendo.
 */
export function betaTelaio(eta1: number, eta2: number, tipo: TipoTelaio): number {
  const e1 = Math.min(1, Math.max(0, eta1));
  const e2 = Math.min(1, Math.max(0, eta2));
  if (tipo === 'fissi') {
    const num = 1 + 0.145 * (e1 + e2) - 0.265 * e1 * e2;
    const den = 2 - 0.364 * (e1 + e2) - 0.247 * e1 * e2;
    return den > 0 ? num / den : Infinity;
  }
  const num = 1 - 0.2 * (e1 + e2) - 0.12 * e1 * e2;
  const den = 1 - 0.8 * (e1 + e2) + 0.6 * e1 * e2;
  if (den <= 0 || num <= 0) return Infinity;
  return Math.sqrt(num / den);
}

/** Come è stato scelto β per un asse. */
export type ModoBeta = string;

/**
 * β effettivo di un asse: da uno schema elementare, dalle formule di Wood, o
 * scritto a mano. Le tre strade convivono perché rispondono a domande diverse:
 * un'asta di controvento ha uno schema, una colonna di telaio ha due travi ai
 * nodi, e a volte il numero arriva da un'analisi fatta altrove.
 */
export function betaDaModo(
  modo: ModoBeta,
  betaManuale: number,
  eta1: number,
  eta2: number,
): number {
  if (modo === 'telaio-fissi') return betaTelaio(eta1, eta2, 'fissi');
  if (modo === 'telaio-mobili') return betaTelaio(eta1, eta2, 'mobili');
  const schema = schemaVincoli(modo);
  if (schema) return schema.consigliato;
  return betaManuale;
}

/** Vero quando il modo scelto richiede i due fattori di distribuzione. */
export const modoTelaio = (modo: ModoBeta): boolean =>
  modo === 'telaio-fissi' || modo === 'telaio-mobili';
