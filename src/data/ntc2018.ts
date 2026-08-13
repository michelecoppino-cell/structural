/**
 * Tabelle normative NTC2018 (DM 17/01/2018).
 *
 * NOTA: i valori qui riportati sono un estratto ridotto, sufficiente al
 * predimensionamento. Il reticolo sismico completo (ag, F0, TC* per i 10751
 * nodi dell'Allegato B) va caricato da file dati in una fase successiva:
 * qui sono elencate poche località di riferimento.
 */

/** ag/g su suolo rigido, TR = 475 anni (estratto Allegato B). */
export const AG: Record<string, number> = {
  "L'Aquila": 0.261,
  Roma: 0.128,
  Milano: 0.05,
  Napoli: 0.168,
  Firenze: 0.131,
  Torino: 0.055,
  Bologna: 0.157,
  Palermo: 0.163,
  Venezia: 0.065,
  Bari: 0.049,
};

/** Coefficiente di amplificazione stratigrafica SS — Tab. 3.2.IV. */
export const SS: Record<string, number> = { A: 1.0, B: 1.2, C: 1.45, D: 1.7, E: 1.55 };

/** Coefficiente di amplificazione topografica ST — Tab. 3.2.V. */
export const ST: Record<string, number> = { T1: 1.0, T2: 1.2, T3: 1.2, T4: 1.4 };

/** Coefficiente d'uso CU — Tab. 2.4.II. */
export const CU: Record<string, number> = {
  'I (ridotta) — 0.7': 0.7,
  'II (ordinaria) — 1.0': 1.0,
  'III (affollata) — 1.5': 1.5,
  'IV (strategica) — 2.0': 2.0,
};

/**
 * Carico neve al suolo qsk — Tab. 3.4.I.
 * base = valore per as ≤ 200 m; oltre: coef · [1 + (as / rif)²].
 */
export const ZONE_NEVE: Record<string, { base: number; coef: number; rif: number }> = {
  'I — Alpina': { base: 1.5, coef: 1.39, rif: 728 },
  'I — Mediterranea': { base: 1.5, coef: 1.35, rif: 602 },
  'II — Mediterranea': { base: 1.0, coef: 0.85, rif: 481 },
  'III — Mediterranea': { base: 0.6, coef: 0.51, rif: 481 },
};

/** Velocità base di riferimento vb,0 per zona — Tab. 3.3.I. */
export const VB0: Record<string, number> = {
  '1 — 25 m/s': 25,
  '2 — 25 m/s': 25,
  '3 — 27 m/s': 27,
  '4 — 28 m/s': 28,
  '5 — 28 m/s': 28,
  '6 — 27 m/s': 27,
  '7 — 28 m/s': 28,
  '8 — 30 m/s': 30,
  '9 — 31 m/s': 31,
};

/** Parametri per il coefficiente di esposizione ce(z) — Tab. 3.3.II. */
export const ESPOSIZIONE: Record<string, { kr: number; z0: number; zmin: number }> = {
  'I': { kr: 0.17, z0: 0.01, zmin: 2 },
  'II': { kr: 0.19, z0: 0.05, zmin: 4 },
  'III': { kr: 0.2, z0: 0.1, zmin: 5 },
  'IV': { kr: 0.22, z0: 0.3, zmin: 8 },
  'V': { kr: 0.23, z0: 0.7, zmin: 12 },
};

/**
 * Carichi variabili per categoria d'uso — Tab. 3.1.II.
 * [qk (kN/m²), Qk (kN), Hk (kN/m), ψ0, ψ1, ψ2]
 */
export const CAT: Record<string, [number, number, number, number, number, number]> = {
  'A — Ambienti residenziali': [2.0, 2.0, 1.0, 0.7, 0.5, 0.3],
  'B1 — Uffici non aperti al pubblico': [2.0, 2.0, 1.0, 0.7, 0.5, 0.3],
  'B2 — Uffici aperti al pubblico': [3.0, 2.0, 1.0, 0.7, 0.5, 0.3],
  'C1 — Aule, ristoranti': [3.0, 4.0, 1.0, 0.7, 0.7, 0.6],
  'C2 — Balconi, scale, ballatoi': [4.0, 4.0, 2.0, 0.7, 0.7, 0.6],
  'C3 — Ambienti privi di ostacoli': [5.0, 5.0, 3.0, 0.7, 0.7, 0.6],
  'D1 — Negozi': [4.0, 4.0, 1.0, 0.7, 0.7, 0.6],
  'D2 — Centri commerciali': [5.0, 5.0, 1.0, 0.7, 0.7, 0.6],
  'E1 — Magazzini, archivi': [6.0, 7.0, 1.0, 1.0, 0.9, 0.8],
  'F — Rimesse ≤ 30 kN': [2.5, 10.0, 1.0, 0.7, 0.7, 0.6],
  'H — Coperture non accessibili': [0.5, 1.2, 1.0, 0.0, 0.0, 0.0],
};

/** Coefficienti parziali per le azioni — Tab. 2.6.I (STR, A1). */
export const GAMMA = {
  /** Permanenti strutturali G1 — sfavorevole. */
  G1: 1.3,
  /** Permanenti non strutturali G2 — sfavorevole. */
  G2: 1.5,
  /** Variabili Q — sfavorevole. */
  Q: 1.5,
} as const;

/** ψ per neve (as ≤ 1000 m) e vento — Tab. 2.5.I. */
export const PSI_AMBIENTALI = {
  neve: { psi0: 0.5, psi1: 0.2, psi2: 0.0 },
  vento: { psi0: 0.6, psi1: 0.2, psi2: 0.0 },
} as const;
