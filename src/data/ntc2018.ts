/**
 * Tabelle normative NTC2018 (DM 17/01/2018).
 *
 * NOTA: i valori qui riportati sono un estratto ridotto, sufficiente al
 * predimensionamento. La pericolosità sismica di base sta in `calc/sismica.ts`
 * (zona sismica per comune + formule di Tab. 3.2.IV).
 */

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
 * Valori di uso corrente del coefficiente di forma cp per edifici a pianta
 * rettangolare, come promemoria del campo «cp»: si sceglie da qui e poi lo si
 * può correggere a mano.
 *
 * Sono i casi ordinari della Circolare 2019 §C3.3.8; per geometrie fuori dal
 * caso ordinario — tettoie, coperture curve, corpi isolati, effetti locali sui
 * bordi — il riferimento è la **CNR-DT 207**, che qui non si prova a riassumere.
 *
 * `alfa` è l'inclinazione della falda in gradi: per 20° < α ≤ 60° la falda
 * sopravento passa con continuità dalla depressione alla pressione.
 */
export function opzioniCp(alfa: number): { label: string; cp: number; ref: string }[] {
  const a = Math.abs(alfa);
  const faldaSopravento = a <= 20 ? -0.4 : a > 60 ? 0.8 : 0.03 * a - 1;
  return [
    { label: 'Parete sopravento', cp: 0.8, ref: 'Circolare 2019 §C3.3.8.1' },
    { label: 'Parete sottovento', cp: -0.4, ref: 'Circolare 2019 §C3.3.8.1' },
    { label: 'Pareti laterali (parallele al vento)', cp: -0.5, ref: 'CNR-DT 207 — App. G' },
    {
      label: 'Spinta d’insieme sopravento + sottovento',
      cp: 1.2,
      ref: 'Circolare 2019 §C3.3.8.1 — 0.8 + 0.4',
    },
    {
      label: `Falda sopravento (α = ${a.toFixed(0)}°)`,
      cp: Number(faldaSopravento.toFixed(2)),
      ref: 'Circolare 2019 §C3.3.8.2 — −0.4 fino a 20°, poi 0.03α − 1 fino a 60°',
    },
    { label: 'Falda sottovento', cp: -0.4, ref: 'Circolare 2019 §C3.3.8.2' },
    { label: 'Copertura piana', cp: -0.4, ref: 'Circolare 2019 §C3.3.8.2' },
  ];
}

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

/**
 * Urti di veicoli in transito — azioni eccezionali, NTC2018 §3.6.3.3.
 *
 * Le forze statiche equivalenti sono quelle della Tab. 3.6.II: `Fdx` agisce
 * nella direzione di marcia, `Fdy` in quella ortogonale, e le due non si
 * sommano. `h` è la quota di applicazione sopra il piano viabile (la risultante
 * si applica su un'area alta 0.25 m e larga 1.50 m, o quanto l'elemento se è
 * più stretto), `m` e `v` sono la massa e la velocità di riferimento del
 * veicolo, quelle da cui la tabella nasce e che servono al confronto
 * energetico di EN 1991-1-7 App. C.
 */
export const URTI: Record<
  string,
  { Fdx: number; Fdy: number; h: number; m: number; v: number; ref: string }
> = {
  'Autostrade e strade extraurbane principali': {
    Fdx: 1000,
    Fdy: 500,
    h: 1.25,
    m: 30,
    v: 90,
    ref: 'NTC2018 §3.6.3.3 — Tab. 3.6.II',
  },
  'Strade extraurbane secondarie e urbane di scorrimento': {
    Fdx: 750,
    Fdy: 375,
    h: 1.25,
    m: 30,
    v: 70,
    ref: 'NTC2018 §3.6.3.3 — Tab. 3.6.II',
  },
  'Strade urbane di quartiere e locali': {
    Fdx: 500,
    Fdy: 250,
    h: 1.25,
    m: 30,
    v: 50,
    ref: 'NTC2018 §3.6.3.3 — Tab. 3.6.II',
  },
  'Cortili e autorimesse — autovetture ≤ 30 kN': {
    Fdx: 50,
    Fdy: 25,
    h: 0.5,
    m: 1.5,
    v: 20,
    ref: 'EN 1991-1-7 §4.3.1 — Tab. 4.1',
  },
  'Cortili e autorimesse — automezzi > 30 kN': {
    Fdx: 150,
    Fdy: 75,
    h: 1.25,
    m: 3.5,
    v: 20,
    ref: 'EN 1991-1-7 §4.3.1 — Tab. 4.1',
  },
  'Carrelli elevatori e mezzi di servizio': {
    Fdx: 5,
    Fdy: 5,
    h: 0.75,
    m: 3,
    v: 10,
    ref: 'EN 1991-1-7 §4.4 — urto di mezzi di movimentazione',
  },
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
