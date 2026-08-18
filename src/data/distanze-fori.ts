/**
 * Distanze dai bordi e interassi dei fori delle unioni bullonate o chiodate —
 * NTC2018 §4.2.8.1, Fig. 4.2.5 (gli stessi limiti di EN 1993-1-8 Tab. 3.3).
 *
 * I minimi sono multipli del diametro del foro d0 e servono a non spaccare il
 * piatto: il rifollamento ha bisogno di materiale davanti al bullone. I massimi
 * sono multipli dello spessore t — il più sottile fra gli elementi esterni
 * collegati — e servono al contrario: tengono i piatti a contatto, contro
 * l'instabilità locale del lembo compresso e, all'aperto, contro l'acqua che
 * entrerebbe fra le lamiere.
 *
 * `1` è la direzione della forza, `2` quella ortogonale; `e` sono le distanze
 * dal bordo, `p` gli interassi. `p1,0` è l'interasse della fila esterna e
 * `p1,i` quello delle file interne di un allineamento in direzione della forza.
 */

export interface RigaDistanza {
  /** Simbolo di Fig. 4.2.5. */
  sigla: string;
  /** Che cos'è, detto a parole. */
  descrizione: string;
  /** Minimo, in multipli del diametro del foro d0. */
  minimo: string;
  /** Massimo per le unioni esposte a fenomeni corrosivi o ambientali. */
  maxEsposte: string;
  /** Massimo per le unioni non esposte. */
  maxNonEsposte: string;
  /** Massimo per gli acciai resistenti alla corrosione (UNI EN 10025-5). */
  maxCorten: string;
}

/** Un trattino dove la norma non pone limite. */
const NO = '—';

export const DISTANZE_FORI: RigaDistanza[] = [
  {
    sigla: 'e1',
    descrizione: 'dal bordo, nella direzione della forza',
    minimo: '1,2 d0',
    maxEsposte: '4t + 40 mm',
    maxNonEsposte: NO,
    maxCorten: 'max(8t; 125 mm)',
  },
  {
    sigla: 'e2',
    descrizione: 'dal bordo, ortogonale alla forza',
    minimo: '1,2 d0',
    maxEsposte: '4t + 40 mm',
    maxNonEsposte: NO,
    maxCorten: 'max(8t; 125 mm)',
  },
  {
    sigla: 'p1',
    descrizione: 'interasse dei fori nella direzione della forza',
    minimo: '2,2 d0',
    maxEsposte: 'min(14t; 200 mm)',
    maxNonEsposte: 'min(14t; 200 mm)',
    maxCorten: 'min(14t; 175 mm)',
  },
  {
    sigla: 'p1,0',
    descrizione: 'interasse della fila esterna, direzione della forza',
    minimo: NO,
    maxEsposte: 'min(14t; 200 mm)',
    maxNonEsposte: NO,
    maxCorten: 'min(14t; 175 mm)',
  },
  {
    sigla: 'p1,i',
    descrizione: 'interasse delle file interne, direzione della forza',
    minimo: NO,
    maxEsposte: 'min(28t; 400 mm)',
    maxNonEsposte: NO,
    maxCorten: 'min(14t; 175 mm)',
  },
  {
    sigla: 'p2',
    descrizione: 'interasse delle file ortogonale alla forza',
    minimo: '2,4 d0',
    maxEsposte: 'min(14t; 200 mm)',
    maxNonEsposte: 'min(14t; 200 mm)',
    maxCorten: 'min(14t; 175 mm)',
  },
];

/** Coefficienti dei minimi: quanti d0 per ciascuna distanza. */
export const MINIMI_D0: Record<string, number> = {
  e1: 1.2,
  e2: 1.2,
  p1: 2.2,
  p2: 2.4,
};

/** Il minimo in mm di una distanza, dato il diametro del foro d0. */
export function distanzaMinima(sigla: string, d0: number): number | undefined {
  const c = MINIMI_D0[sigla];
  return c === undefined ? undefined : c * d0;
}
