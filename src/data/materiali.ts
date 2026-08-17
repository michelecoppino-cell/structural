/**
 * Tabelle materiali — trascritte dai fogli di calcolo
 * "01 - Verifica a taglio elementi non armati.xlsx" (fogli TRAVE / TONDI)
 * e "02 - Verifica a taglio elementi armati.xlsx" (foglio DATI CLS).
 */

/** Classi di resistenza del calcestruzzo: [fck (MPa), Rck (MPa)]. */
export const CLS: Record<string, { fck: number; rck: number }> = {
  'C8/10': { fck: 8, rck: 10 },
  'C12/15': { fck: 12, rck: 15 },
  'C16/20': { fck: 16, rck: 20 },
  'C20/25': { fck: 20, rck: 25 },
  'C25/30': { fck: 25, rck: 30 },
  'C28/35': { fck: 28, rck: 35 },
  'C32/40': { fck: 32, rck: 40 },
  'C35/45': { fck: 35, rck: 45 },
  'C40/50': { fck: 40, rck: 50 },
  'C45/55': { fck: 45, rck: 55 },
  'C50/60': { fck: 50, rck: 60 },
  'C55/67': { fck: 55, rck: 67 },
  'C60/75': { fck: 60, rck: 75 },
  'C70/85': { fck: 70, rck: 85 },
  'C80/95': { fck: 80, rck: 95 },
  'C90/105': { fck: 90, rck: 105 },
};

/** Acciaio da armatura — §11.3.2. */
export const ACCIAIO_ARMATURA: Record<string, { fyk: number }> = {
  B450C: { fyk: 450 },
  B450A: { fyk: 450 },
};

/** Diametri commerciali dei tondi: area lorda e area netta filettata (mm²). */
export const TONDI: Record<number, { area: number; areaNetta?: number }> = {
  4: { area: 12.6 },
  6: { area: 28.3 },
  8: { area: 50.3 },
  10: { area: 78.5 },
  12: { area: 113.1, areaNetta: 84 },
  14: { area: 153.9, areaNetta: 115 },
  16: { area: 201.1, areaNetta: 157 },
  18: { area: 254.5, areaNetta: 192 },
  20: { area: 314.2, areaNetta: 245 },
  22: { area: 380.1, areaNetta: 303 },
  24: { area: 452.4, areaNetta: 353 },
  26: { area: 530.9 },
  28: { area: 615.8 },
  30: { area: 706.9, areaNetta: 561 },
  32: { area: 804.2 },
};

export const DIAMETRI = Object.keys(TONDI)
  .map(Number)
  .sort((a, b) => a - b);

/** Moduli elastici di riferimento (MPa) per il calcolo delle deformazioni. */
export const MODULI_E: Record<string, number> = {
  'Calcestruzzo C25/30 (Ecm 31476)': 31476,
  'Calcestruzzo C32/40 (Ecm 33643)': 33643,
  'Acciaio S275 (E 210000)': 210000,
  'Legno GL24h (E0,mean 11500)': 11500,
  'Muratura (E 1500)': 1500,
};

/** Modulo elastico secante del calcestruzzo Ecm (MPa) — NTC2018 §11.2.10.3 / EC2. */
export const ecmCLS = (fck: number): number => 22000 * ((fck + 8) / 10) ** 0.3;

/** Acciaio da carpenteria — §11.3.4.1, Tab. 11.3.IX (valori di normativa). */
export const ACCIAIO_STRUTTURALE: Record<string, { fyk: number; ftk: number }> = {
  S235: { fyk: 235, ftk: 360 },
  S275: { fyk: 275, ftk: 430 },
  S355: { fyk: 355, ftk: 510 },
  S450: { fyk: 440, ftk: 550 },
};

/** Resistenza a trazione media del calcestruzzo fctm (MPa) — §11.2.10.2. */
export const fctmCLS = (fck: number): number =>
  fck <= 50 ? 0.3 * fck ** (2 / 3) : 2.12 * Math.log(1 + (fck + 8) / 10);

/** Frattile inferiore della resistenza a trazione fctk = 0.7·fctm (MPa). */
export const fctkCLS = (fck: number): number => 0.7 * fctmCLS(fck);

/**
 * Coefficienti parziali di serie: quelli che nel 99% dei casi non si toccano.
 * Restano qui, fuori dalle tendine, perché la scelta del materiale deve dare
 * subito le resistenze di progetto senza far scegliere anche αcc e i γM.
 */
export const COEFF_DEFAULT = {
  /** Effetti di lunga durata sulla resistenza a compressione — §4.1.2.1.1. */
  alfacc: 0.85,
  /** Calcestruzzo — Tab. 4.1.I. */
  gammaC: 1.5,
  /** Acciaio da armatura — Tab. 4.1.I. */
  gammaS: 1.15,
  /** Carpenteria, resistenza delle sezioni — §4.2.4.1.1. */
  gammaM0: 1.05,
  /** Sezioni indebolite e collegamenti — §4.2.4.1.1, Tab. 4.2.XIV. */
  gammaM2: 1.25,
} as const;

/**
 * Gli acciai di un'unica tendina: carpenteria, armatura e classi dei bulloni.
 * Ognuno porta con sé i γ con cui si passa dal caratteristico al progetto, così
 * la scelta della sigla basta a dare fyd e ftd.
 */
export interface Acciaio {
  fyk: number;
  ftk: number;
  /** γ con cui si ricava fyd. */
  gammaY: number;
  /** γ con cui si ricava ftd. */
  gammaU: number;
  famiglia: 'carpenteria' | 'armatura' | 'bullone';
  nota: string;
}

export const ACCIAI: Record<string, Acciaio> = {
  S235: { fyk: 235, ftk: 360, gammaY: 1.05, gammaU: 1.25, famiglia: 'carpenteria', nota: 'carpenteria — γM0 1.05, γM2 1.25' },
  S275: { fyk: 275, ftk: 430, gammaY: 1.05, gammaU: 1.25, famiglia: 'carpenteria', nota: 'carpenteria — γM0 1.05, γM2 1.25' },
  S355: { fyk: 355, ftk: 510, gammaY: 1.05, gammaU: 1.25, famiglia: 'carpenteria', nota: 'carpenteria — γM0 1.05, γM2 1.25' },
  S450: { fyk: 440, ftk: 550, gammaY: 1.05, gammaU: 1.25, famiglia: 'carpenteria', nota: 'carpenteria — γM0 1.05, γM2 1.25' },
  B450C: { fyk: 450, ftk: 540, gammaY: 1.15, gammaU: 1.15, famiglia: 'armatura', nota: 'armatura ordinaria — γS 1.15' },
  B450A: { fyk: 450, ftk: 495, gammaY: 1.15, gammaU: 1.15, famiglia: 'armatura', nota: 'armatura in rotoli — γS 1.15' },
  '4.6': { fyk: 240, ftk: 400, gammaY: 1.25, gammaU: 1.25, famiglia: 'bullone', nota: 'classe bullone — γM2 1.25' },
  '5.6': { fyk: 300, ftk: 500, gammaY: 1.25, gammaU: 1.25, famiglia: 'bullone', nota: 'classe bullone — γM2 1.25' },
  '6.8': { fyk: 480, ftk: 600, gammaY: 1.25, gammaU: 1.25, famiglia: 'bullone', nota: 'classe bullone — γM2 1.25' },
  '8.8': { fyk: 640, ftk: 800, gammaY: 1.25, gammaU: 1.25, famiglia: 'bullone', nota: 'classe bullone — γM2 1.25' },
  '10.9': { fyk: 900, ftk: 1000, gammaY: 1.25, gammaU: 1.25, famiglia: 'bullone', nota: 'classe bullone — γM2 1.25' },
};

export const SIGLE_ACCIAIO = Object.keys(ACCIAI);
