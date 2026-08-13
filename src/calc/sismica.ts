/**
 * Pericolosità sismica di base — NTC2018 §3.2.
 *
 * Il sito è individuato scegliendo regione → provincia → comune: da lì
 * arrivano la classificazione sismica nazionale (zona 1÷4) e le coordinate.
 *
 * L'accelerazione ag è determinata, in ordine di preferenza:
 *  1. dal valore inserito a mano (parametro di reticolo dell'Allegato B,
 *     quando il progettista ce l'ha per il sito specifico);
 *  2. dal valore tabellato per le località di riferimento;
 *  3. dal limite superiore della zona sismica del comune — valore cautelativo
 *     di predimensionamento (OPCM 3519/2006, all. 1b).
 *
 * SS e CC seguono le formule di Tab. 3.2.IV, che dipendono da ag, F0 e TC*:
 * non sono più coefficienti fissi per categoria di sottosuolo.
 */

import { trovaComune, type Comune, type ZonaSismica } from '../data/comuni';

/**
 * ag/g su suolo rigido per TR = 475 anni, dal reticolo dell'Allegato B,
 * per alcune località di riferimento. Chiave: "SIGLA:Comune".
 */
export const AG_TABELLATE: Record<string, number> = {
  "AQ:L'Aquila": 0.261,
  'RM:Roma': 0.128,
  'MI:Milano': 0.05,
  'NA:Napoli': 0.168,
  'FI:Firenze': 0.131,
  'TO:Torino': 0.055,
  'BO:Bologna': 0.157,
  'PA:Palermo': 0.163,
  'VE:Venezia': 0.065,
  'BA:Bari': 0.049,
};

/**
 * Limite superiore di ag/g per zona sismica (TR = 475 anni).
 * OPCM 3519/2006, all. 1b: zona 1 ag > 0.25g, zona 2 0.15÷0.25g,
 * zona 3 0.05÷0.15g, zona 4 ≤ 0.05g. Per la zona 1 si assume 0.35g,
 * estremo superiore della scala di classificazione.
 */
export const AG_ZONA: Record<ZonaSismica, number> = { 1: 0.35, 2: 0.25, 3: 0.15, 4: 0.05 };

export type FonteAg = 'manuale' | 'tabella' | 'zona';

export interface SitoSismico {
  comune?: Comune;
  /** Accelerazione orizzontale massima su suolo rigido, in g (TR = 475 anni). */
  ag: number;
  fonte: FonteAg;
  /** Spiegazione della provenienza del valore, mostrata in scheda e relazione. */
  nota: string;
  zona?: ZonaSismica;
}

/** Categorie di sottosuolo — Tab. 3.2.II e Tab. 3.2.IV. */
export const SUOLI: Record<string, { descr: string }> = {
  A: { descr: 'Ammassi rocciosi affioranti — Vs,eq > 800 m/s' },
  B: { descr: 'Rocce tenere e depositi molto addensati — Vs,eq 360÷800 m/s' },
  C: { descr: 'Depositi mediamente addensati — Vs,eq 180÷360 m/s' },
  D: { descr: 'Depositi poco addensati — Vs,eq < 180 m/s' },
  E: { descr: 'Terreni C o D su substrato rigido, spessore 3÷30 m' },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Coefficiente di amplificazione stratigrafica SS — Tab. 3.2.IV.
 * ag è in g, F0 adimensionale.
 */
export function coefficienteSS(suolo: string, ag: number, F0: number): number {
  const x = F0 * ag;
  switch (suolo) {
    case 'A':
      return 1.0;
    case 'B':
      return clamp(1.4 - 0.4 * x, 1.0, 1.2);
    case 'C':
      return clamp(1.7 - 0.6 * x, 1.0, 1.5);
    case 'D':
      return clamp(2.4 - 1.5 * x, 0.9, 1.8);
    case 'E':
      return clamp(2.0 - 1.1 * x, 1.0, 1.6);
    default:
      return 1.0;
  }
}

/** Coefficiente CC per il periodo TC — Tab. 3.2.IV; TCstar in secondi. */
export function coefficienteCC(suolo: string, TCstar: number): number {
  const T = Math.max(TCstar, 1e-3);
  switch (suolo) {
    case 'A':
      return 1.0;
    case 'B':
      return 1.1 * T ** -0.2;
    case 'C':
      return 1.05 * T ** -0.33;
    case 'D':
      return 1.25 * T ** -0.5;
    case 'E':
      return 1.15 * T ** -0.4;
    default:
      return 1.0;
  }
}

const fx3 = (v: number) => v.toFixed(3);

/**
 * Risolve il sito sismico a partire dalla scelta regione/provincia/comune.
 * `agManuale` (in g) ha sempre la precedenza quando è un numero valido.
 */
export function risolviSito(
  regione: string,
  sigla: string,
  nomeComune: string,
  agManuale?: number,
): SitoSismico {
  const comune = trovaComune(regione, sigla, nomeComune);

  if (agManuale !== undefined && Number.isFinite(agManuale) && agManuale > 0) {
    return {
      comune,
      ag: agManuale,
      fonte: 'manuale',
      nota: `ag = ${fx3(agManuale)} g inserito a mano (reticolo di riferimento, All. B)`,
      zona: comune?.zona,
    };
  }

  if (!comune) {
    return {
      ag: AG_ZONA[3],
      fonte: 'zona',
      nota: 'Comune non selezionato: assunto il limite della zona sismica 3',
      zona: 3,
    };
  }

  const tabellato = AG_TABELLATE[`${comune.sigla}:${comune.nome}`];
  if (tabellato !== undefined) {
    return {
      comune,
      ag: tabellato,
      fonte: 'tabella',
      nota: `ag = ${fx3(tabellato)} g da reticolo di riferimento per ${comune.nome} (TR = 475 anni)`,
      zona: comune.zona,
    };
  }

  const ag = AG_ZONA[comune.zona];
  return {
    comune,
    ag,
    fonte: 'zona',
    nota:
      `ag = ${fx3(ag)} g, limite superiore della zona sismica ${comune.zonaLabel} ` +
      `assegnata a ${comune.nome} (${comune.sigla}): valore cautelativo di predimensionamento`,
    zona: comune.zona,
  };
}
