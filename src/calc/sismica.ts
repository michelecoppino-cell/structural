/**
 * Pericolosità sismica di base — NTC2018 §3.2, Allegati A e B.
 *
 * Il sito si individua scegliendo regione → provincia → comune. Per ogni
 * comune sono precalcolati ag, F0 e TC* ai 9 periodi di ritorno del reticolo
 * di riferimento (media pesata con 1/d sui 4 nodi più vicini, All. A); qui si
 * interpola fra quei periodi per il TR dello stato limite richiesto e si
 * ricavano SS, CC e i periodi dello spettro con le formule di Tab. 3.2.IV.
 *
 * Ogni parametro può essere forzato a mano: il valore inserito vince sempre
 * su quello del reticolo, e la scheda dichiara quale dei due sta usando.
 */

import { trovaComune, type Comune, type ZonaSismica } from '../data/comuni';
import { TR_RETICOLO, parametriSito } from '../data/parametri-sismici';

/** Stati limite e relative probabilità di superamento in VR — Tab. 3.2.I. */
export const STATI_LIMITE = [
  { id: 'SLO', label: 'SLO — operatività', PVR: 0.81 },
  { id: 'SLD', label: 'SLD — danno', PVR: 0.63 },
  { id: 'SLV', label: 'SLV — salvaguardia della vita', PVR: 0.1 },
  { id: 'SLC', label: 'SLC — prevenzione del collasso', PVR: 0.05 },
] as const;

export type StatoLimite = (typeof STATI_LIMITE)[number]['id'];

export const PVR: Record<StatoLimite, number> = Object.fromEntries(
  STATI_LIMITE.map((s) => [s.id, s.PVR]),
) as Record<StatoLimite, number>;

/**
 * Limite superiore di ag/g per zona sismica (TR = 475 anni).
 * OPCM 3519/2006, all. 1b. Serve solo come rete di sicurezza quando il comune
 * non è in elenco: con il reticolo caricato non entra mai in gioco.
 */
export const AG_ZONA: Record<ZonaSismica, number> = { 1: 0.35, 2: 0.25, 3: 0.15, 4: 0.05 };

/** Categorie di sottosuolo — Tab. 3.2.II e Tab. 3.2.IV. */
export const SUOLI: Record<string, { descr: string }> = {
  A: { descr: 'Ammassi rocciosi affioranti — Vs,eq > 800 m/s' },
  B: { descr: 'Rocce tenere e depositi molto addensati — Vs,eq 360÷800 m/s' },
  C: { descr: 'Depositi mediamente addensati — Vs,eq 180÷360 m/s' },
  D: { descr: 'Depositi poco addensati — Vs,eq < 180 m/s' },
  E: { descr: 'Terreni C o D su substrato rigido, spessore 3÷30 m' },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Periodo di ritorno dell'azione: TR = −VR / ln(1 − PVR) — §3.2.1. */
export function periodoRitorno(VR: number, pvr: number): number {
  return -VR / Math.log(1 - pvr);
}

/**
 * Valore del parametro per un TR qualsiasi, interpolato fra i periodi
 * tabellati con legge log-log (NTC2018, All. A). Fuori dall'intervallo
 * 30÷2475 anni si resta sul valore estremo, come prescrive la norma.
 */
export function interpolaTR(valori: readonly number[], TR: number): number {
  const T = clamp(TR, TR_RETICOLO[0], TR_RETICOLO[TR_RETICOLO.length - 1]);
  let i = TR_RETICOLO.findIndex((t) => t >= T);
  if (i <= 0) return valori[0];
  const [t1, t2] = [TR_RETICOLO[i - 1], TR_RETICOLO[i]];
  const [p1, p2] = [valori[i - 1], valori[i]];
  if (p1 <= 0 || p2 <= 0) return p1;
  const logp = Math.log(p1) + (Math.log(p2 / p1) * Math.log(T / t1)) / Math.log(t2 / t1);
  return Math.exp(logp);
}

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

/** Forma spettrale in uso: i parametri che definiscono lo spettro orizzontale. */
export interface FormaSpettro {
  /** ag/g del sito. */
  ag: number;
  /** S = SS · ST. */
  S: number;
  F0: number;
  TB: number;
  TC: number;
  TD: number;
}

/**
 * Spettro elastico orizzontale Se(T)/g — §3.2.3.2.1, eq. 3.2.4, con η = 1
 * (smorzamento convenzionale ξ = 5%).
 */
export function spettroElastico(T: number, f: FormaSpettro): number {
  const { ag, S, F0, TC, TD } = f;
  const TB = Math.max(f.TB, 1e-4);
  const t = Math.max(T, 0);
  if (t < TB) return ag * S * F0 * (t / TB + (1 / F0) * (1 - t / TB));
  if (t < TC) return ag * S * F0;
  if (t < TD) return ag * S * F0 * (TC / t);
  return ag * S * F0 * ((TC * TD) / (t * t));
}

/**
 * Spettro di progetto Sd(T)/g: Se(T)/q, con il limite inferiore 0.2·ag
 * prescritto da §3.2.3.5 per le componenti orizzontali agli SLU.
 */
export function spettroProgetto(T: number, f: FormaSpettro, q: number): number {
  return Math.max(spettroElastico(T, f) / Math.max(q, 1), 0.2 * f.ag);
}

/** Ramo dello spettro in cui cade T, per dichiararlo in scheda e relazione. */
export function ramoSpettro(T: number, f: FormaSpettro): string {
  if (T < f.TB) return 'ramo crescente, T < TB';
  if (T < f.TC) return 'plateau, TB ≤ T < TC';
  if (T < f.TD) return 'ramo a velocità costante, TC ≤ T < TD';
  return 'ramo a spostamento costante, T ≥ TD';
}

/** Ordinate spettrali per un periodo assegnato, in g e in m/s². */
export interface OrdinateSpettro {
  /** Periodo richiesto, in secondi. */
  T: number;
  Se: number;
  SeMS2: number;
  Sd: number;
  SdMS2: number;
  ramo: string;
  /** true = Sd è tenuto in piedi dal minimo 0.2·ag di §3.2.3.5. */
  minimo: boolean;
}

export function ordinateSpettro(T: number, f: FormaSpettro, q: number): OrdinateSpettro {
  const Se = spettroElastico(T, f);
  const Sd = spettroProgetto(T, f, q);
  return {
    T,
    Se,
    SeMS2: Se * 9.81,
    Sd,
    SdMS2: Sd * 9.81,
    ramo: ramoSpettro(T, f),
    minimo: Sd > Se / Math.max(q, 1) + 1e-12,
  };
}

export type FonteSito = 'reticolo' | 'zona';

export interface Override {
  /** ag/g imposto a mano; undefined = dal reticolo. */
  ag?: number;
  F0?: number;
  TCstar?: number;
}

export interface SitoSismico {
  comune?: Comune;
  zona?: ZonaSismica;
  zonaLabel?: string;
  /** Periodo di ritorno usato per leggere il reticolo, in anni. */
  TR: number;
  ag: number;
  F0: number;
  TCstar: number;
  /** Da dove arrivano i parametri non forzati a mano. */
  fonte: FonteSito;
  /** Quali dei tre parametri sono stati imposti a mano. */
  manuali: { ag: boolean; F0: boolean; TCstar: boolean };
  /** Riga di spiegazione per scheda e relazione. */
  nota: string;
}

const num3 = (v: number) => v.toFixed(3);

/** Parametri del sito per un dato periodo di ritorno. */
export function risolviSito(
  regione: string,
  sigla: string,
  nomeComune: string,
  TR: number,
  override: Override = {},
): SitoSismico {
  const comune = trovaComune(regione, sigla, nomeComune);
  const tabella = comune ? parametriSito(comune.indice) : undefined;

  const manuali = {
    ag: Number.isFinite(override.ag) && (override.ag as number) > 0,
    F0: Number.isFinite(override.F0) && (override.F0 as number) > 0,
    TCstar: Number.isFinite(override.TCstar) && (override.TCstar as number) > 0,
  };

  const base = tabella
    ? {
        ag: interpolaTR(tabella.ag, TR),
        F0: interpolaTR(tabella.F0, TR),
        TCstar: interpolaTR(tabella.TCstar, TR),
        fonte: 'reticolo' as FonteSito,
      }
    : {
        // comune sconosciuto: si ripiega sul limite della zona sismica
        ag: AG_ZONA[comune?.zona ?? 3],
        F0: 2.5,
        TCstar: 0.3,
        fonte: 'zona' as FonteSito,
      };

  const ag = manuali.ag ? (override.ag as number) : base.ag;
  const F0 = manuali.F0 ? (override.F0 as number) : base.F0;
  const TCstar = manuali.TCstar ? (override.TCstar as number) : base.TCstar;

  const dove = comune ? `${comune.nome} (${comune.sigla})` : 'sito non individuato';
  const forzati = (['ag', 'F0', 'TCstar'] as const).filter((k) => manuali[k]);
  const nota =
    base.fonte === 'reticolo'
      ? `ag = ${num3(ag)} g, F0 = ${F0.toFixed(3)}, TC* = ${num3(TCstar)} s per ${dove} ` +
        `— reticolo di riferimento, TR = ${TR.toFixed(0)} anni` +
        (forzati.length ? `; imposti a mano: ${forzati.join(', ')}` : '')
      : `Reticolo non disponibile per ${dove}: assunto ag = ${num3(ag)} g, ` +
        `limite superiore della zona sismica ${comune?.zonaLabel ?? '3'}`;

  return {
    comune,
    zona: comune?.zona,
    zonaLabel: comune?.zonaLabel,
    TR,
    ag,
    F0,
    TCstar,
    fonte: base.fonte,
    manuali,
    nota,
  };
}
