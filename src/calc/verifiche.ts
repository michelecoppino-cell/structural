/**
 * Scheda 3 — Verifiche.
 *
 * Trascrizione dei fogli di calcolo presenti in repository:
 *  - "01 - Verifica a taglio elementi non armati.xlsx"  → NTC2018 §4.1.2.3.5.1
 *  - "02 - Verifica a taglio elementi armati.xlsx"      → NTC2018 §4.1.2.3.5.2
 *    (foglio VERIFICA_STAFFE)
 */

import { ACCIAIO_ARMATURA, ACCIAIO_STRUTTURALE, CLS, TONDI } from '../data/materiali';
import { proprietaProfilo, type ProprietaProfilo, type TipoProfilo } from '../data/profili-acciaio';
import { num } from './azioni';

export interface Esito {
  /** Rapporto domanda/capacità. */
  sfruttamento: number;
  /** Margine percentuale rispetto alla capacità (positivo = verificato). */
  margine: number;
  ok: boolean;
}

export function esito(domanda: number, capacita: number): Esito {
  const s = capacita > 0 ? domanda / capacita : domanda > 0 ? Infinity : 0;
  return { sfruttamento: s, margine: (1 - s) * 100, ok: s <= 1 };
}

const areaTondo = (phi: number) => TONDI[phi]?.area ?? (Math.PI * phi * phi) / 4;

/* ────────────────────────────────────────────────────────────────────────────
   §4.1.2.3.5.1 — Elementi senza armature trasversali resistenti a taglio
   ──────────────────────────────────────────────────────────────────────── */

export interface InputTaglioNonArmato {
  VEd: string;
  NEd: string;
  cls: string;
  gammaC: string;
  bw: string;
  h: string;
  d: string;
  n1: string;
  phi1: string;
  n2: string;
  phi2: string;
}

export const TAGLIO_NON_ARMATO_DEFAULT: InputTaglioNonArmato = {
  VEd: '0',
  NEd: '0',
  cls: 'C32/40',
  gammaC: '1.5',
  bw: '1000',
  h: '1200',
  d: '1130',
  n1: '5',
  phi1: '20',
  n2: '0',
  phi2: '8',
};

export interface RisultatiTaglioNonArmato {
  fck: number;
  rck: number;
  fcd: number;
  As: number;
  rho1: number;
  rho1Eccessivo: boolean;
  k: number;
  sigmaCp: number;
  sigmaCpLimitata: boolean;
  vmin: number;
  VRd: number;
  /** Ramo che governa: 'armatura' = eq. principale, 'minimo' = νmin. */
  ramo: 'armatura' | 'minimo';
  tauRd: number;
  esito: Esito;
}

export function verificaTaglioNonArmato(inp: InputTaglioNonArmato): RisultatiTaglioNonArmato {
  const { fck, rck } = CLS[inp.cls] ?? CLS['C25/30'];
  const gammaC = num(inp.gammaC) || 1.5;
  const fcd = (fck * 0.85) / gammaC;

  const bw = num(inp.bw);
  const h = num(inp.h);
  const d = num(inp.d);
  const Ac = bw * h;

  const As = num(inp.n1) * areaTondo(num(inp.phi1)) + num(inp.n2) * areaTondo(num(inp.phi2));
  const rho1Raw = bw > 0 && d > 0 ? As / (bw * d) : 0;
  const rho1 = Math.min(rho1Raw, 0.02); // §4.1.2.3.5.1: ρ1 ≤ 0.02
  const k = Math.min(2, 1 + Math.sqrt(d > 0 ? 200 / d : 0));

  // σcp = NEd/Ac ≤ 0.2·fcd (compressione positiva)
  const sigmaCpRaw = Ac > 0 ? (num(inp.NEd) * 1000) / Ac : 0;
  const sigmaCp = Math.min(sigmaCpRaw, 0.2 * fcd);

  const vmin = 0.035 * k ** 1.5 * fck ** 0.5;

  const vArm = ((0.18 * k * (100 * rho1 * fck) ** (1 / 3)) / gammaC + 0.15 * sigmaCp) * ((bw * d) / 1000);
  const vMin = (vmin + 0.15 * sigmaCp) * ((bw * d) / 1000);
  const VRd = Math.max(vArm, vMin);

  return {
    fck,
    rck,
    fcd,
    As,
    rho1,
    rho1Eccessivo: rho1Raw > 0.02,
    k,
    sigmaCp,
    sigmaCpLimitata: sigmaCpRaw > 0.2 * fcd,
    vmin,
    VRd,
    ramo: vArm >= vMin ? 'armatura' : 'minimo',
    tauRd: Ac > 0 ? (VRd * 1000) / Ac : 0,
    esito: esito(num(inp.VEd), VRd),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   §4.1.2.3.5.2 — Elementi con armature trasversali resistenti a taglio
   ──────────────────────────────────────────────────────────────────────── */

export interface InputTaglioArmato {
  VEd: string;
  NEd: string;
  cls: string;
  gammaC: string;
  fyd: string;
  bw: string;
  h: string;
  c: string;
  phiLong: string;
  phiStaffa: string;
  nBracci: string;
  passo: string;
  alfa: string;
}

export const TAGLIO_ARMATO_DEFAULT: InputTaglioArmato = {
  VEd: '96.3',
  NEd: '0',
  cls: 'C32/40',
  gammaC: '1.5',
  fyd: '391',
  bw: '1000',
  h: '1200',
  c: '40',
  phiLong: '20',
  phiStaffa: '20',
  nBracci: '2',
  passo: '200',
  alfa: '90',
};

export interface RisultatiTaglioArmato {
  fck: number;
  fcd: number;
  f1cd: number;
  d: number;
  Asw: number;
  sigmaCp: number;
  alfaC: number;
  omegaSw: number;
  cotThetaStar: number;
  cotTheta: number;
  theta: number;
  clamp: 'inferiore' | 'superiore' | 'nessuno';
  VRsd: number;
  VRcd: number;
  VRd: number;
  /** Meccanismo che governa la resistenza. */
  governa: 'trazione (staffe)' | 'compressione (bielle)';
  AswMin: number;
  passoMax: number;
  esito: Esito;
  esitoAswMin: Esito;
  esitoPasso: Esito;
}

export function verificaTaglioArmato(inp: InputTaglioArmato): RisultatiTaglioArmato {
  const { fck } = CLS[inp.cls] ?? CLS['C25/30'];
  const gammaC = num(inp.gammaC) || 1.5;
  const fcd = (fck * 0.85) / gammaC;
  const nu = 0.5;
  const f1cd = nu * fcd;

  const bw = num(inp.bw);
  const h = num(inp.h);
  const phiStaffa = num(inp.phiStaffa);
  const phiLong = num(inp.phiLong);
  const d = h - phiStaffa - phiLong / 2 - num(inp.c);

  const fyd = num(inp.fyd) || 391;
  const s = num(inp.passo) || 1;
  const nb = num(inp.nBracci);
  const Asw = ((Math.PI * phiStaffa * phiStaffa) / 4) * nb;

  const alfa = num(inp.alfa) || 90;
  const alfaRad = (alfa * Math.PI) / 180;
  const cotAlfa = Math.abs(Math.tan(alfaRad)) > 1e-9 ? 1 / Math.tan(alfaRad) : 0;

  const sigmaCp = bw * h > 0 ? (num(inp.NEd) * 1000) / (bw * h) : 0;
  const r = fcd > 0 ? sigmaCp / fcd : 0;
  const alfaC =
    sigmaCp <= 0 ? 1 : r < 0.25 ? 1 + r : r < 0.5 ? 1.25 : r < 1 ? 2.5 * (1 - r) : 0;

  // ωsw = (Asw·fyd) / (bw·s·fcd)
  const omegaSw = bw > 0 && s > 0 && fcd > 0 ? (Asw / (bw * s)) * (fyd / fcd) : 0;

  // angolo di contemporanea crisi dei due meccanismi
  const arg = omegaSw > 0 ? (nu * alfaC) / omegaSw - 1 : 0;
  const cotThetaStar = arg > 0 ? Math.sqrt(arg) : 1;
  const cotTheta = Math.min(2.5, Math.max(1, cotThetaStar)); // §4.1.2.3.5.2
  const clamp = cotThetaStar < 1 ? 'inferiore' : cotThetaStar > 2.5 ? 'superiore' : 'nessuno';

  // eq. 4.1.18 — taglio trazione
  const VRsd = (0.9 * d * (Asw / s) * fyd * (cotAlfa + cotTheta) * Math.sin(alfaRad)) / 1000;
  // eq. 4.1.19 — taglio compressione
  const VRcd =
    (0.9 * d * bw * alfaC * f1cd * ((cotTheta + cotAlfa) / (1 + cotTheta ** 2))) / 1000;

  const VRd = Math.min(VRsd, VRcd);

  // minimi di normativa §4.1.6.1.1
  const AswMin = 1.5 * bw; // mm²/m
  const AswEff = s > 0 ? (Asw / s) * 1000 : 0; // mm²/m
  const passoMax = Math.min(330, 0.8 * d);

  return {
    fck,
    fcd,
    f1cd,
    d,
    Asw,
    sigmaCp,
    alfaC,
    omegaSw,
    cotThetaStar,
    cotTheta,
    theta: (Math.atan(1 / cotTheta) * 180) / Math.PI,
    clamp,
    VRsd,
    VRcd,
    VRd,
    governa: VRsd <= VRcd ? 'trazione (staffe)' : 'compressione (bielle)',
    AswMin,
    passoMax,
    esito: esito(num(inp.VEd), VRd),
    esitoAswMin: esito(AswMin, AswEff),
    esitoPasso: esito(s, passoMax),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   §4.1.2.1.2 — Flessione semplice (SLU), sezione rettangolare in c.a.
   Stress-block rettangolare (0.8x, fcd), sull'esempio dell'esito di verifica
   di Gelfi-VCA: MRd calcolato con armatura tesa (e, se presente, compressa)
   entrambe snervate.
   ──────────────────────────────────────────────────────────────────────── */

export interface InputFlessioneCA {
  MEd: string;
  cls: string;
  gammaC: string;
  acciaio: string;
  gammaS: string;
  b: string;
  h: string;
  c: string;
  n1: string;
  phi1: string;
  n2: string;
  phi2: string;
  c2: string;
  n1c: string;
  phi1c: string;
  n2c: string;
  phi2c: string;
}

export const FLESSIONE_CA_DEFAULT: InputFlessioneCA = {
  MEd: '180',
  cls: 'C25/30',
  gammaC: '1.5',
  acciaio: 'B450C',
  gammaS: '1.15',
  b: '300',
  h: '500',
  c: '40',
  n1: '4',
  phi1: '20',
  n2: '0',
  phi2: '16',
  c2: '40',
  n1c: '2',
  phi1c: '16',
  n2c: '0',
  phi2c: '16',
};

export interface RisultatiFlessioneCA {
  fck: number;
  fcd: number;
  fyk: number;
  fyd: number;
  d: number;
  d2: number;
  As: number;
  As2: number;
  x: number;
  xSuD: number;
  duttilitaScarsa: boolean;
  MRd: number;
  esito: Esito;
}

export function verificaFlessioneCA(inp: InputFlessioneCA): RisultatiFlessioneCA {
  const { fck } = CLS[inp.cls] ?? CLS['C25/30'];
  const gammaC = num(inp.gammaC) || 1.5;
  const fcd = (fck * 0.85) / gammaC;

  const { fyk } = ACCIAIO_ARMATURA[inp.acciaio] ?? ACCIAIO_ARMATURA.B450C;
  const gammaS = num(inp.gammaS) || 1.15;
  const fyd = fyk / gammaS;

  const b = num(inp.b);
  const h = num(inp.h);
  const d = h - num(inp.c);
  const d2 = num(inp.c2);

  const As = num(inp.n1) * areaTondo(num(inp.phi1)) + num(inp.n2) * areaTondo(num(inp.phi2));
  const As2 = num(inp.n1c) * areaTondo(num(inp.phi1c)) + num(inp.n2c) * areaTondo(num(inp.phi2c));

  // equilibrio alla traslazione, ipotizzando l'armatura tesa e compressa
  // entrambe snervate: 0.8·x·b·fcd + As2·fyd = As·fyd
  const xRaw = b > 0 && fcd > 0 ? ((As - As2) * fyd) / (0.8 * b * fcd) : 0;
  const x = Math.min(Math.max(xRaw, 0), d);

  const MRd = (0.8 * x * b * fcd * (d - 0.4 * x) + As2 * fyd * (d - d2)) / 1e6; // kNm

  const xSuD = d > 0 ? x / d : 0;

  return {
    fck,
    fcd,
    fyk,
    fyd,
    d,
    d2,
    As,
    As2,
    x,
    xSuD,
    duttilitaScarsa: xSuD > 0.45,
    MRd,
    esito: esito(num(inp.MEd), MRd),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   Acciaio da carpenteria — verifiche elastiche (§4.2.4.1.2)
   Momento resistente elastico MRd = Wel·fyd, NRd = A·fyd, VRd = Avz·fyd/√3.
   Profili: IPE, HEA, HEB, UPN, tubi (quadri, rettangolari, tondi), angolari.
   ──────────────────────────────────────────────────────────────────────── */

export interface InputAcciaioSezione {
  tipoProfilo: TipoProfilo;
  profilo: string;
  acciaio: string;
  gammaM0: string;
  MEd: string;
  NEd: string;
  VEd: string;
}

export const ACCIAIO_SEZIONE_DEFAULT: InputAcciaioSezione = {
  tipoProfilo: 'IPE',
  profilo: 'IPE 200',
  acciaio: 'S275',
  gammaM0: '1.05',
  MEd: '20',
  NEd: '0',
  VEd: '30',
};

export interface RisultatiAcciaioSezione {
  proprieta?: ProprietaProfilo;
  fyk: number;
  fyd: number;
  MRd: number;
  NRd: number;
  VRd: number;
  sigmaM: number;
  sigmaN: number;
  tau: number;
  esitoFlessione: Esito;
  esitoCompressione: Esito;
  esitoTaglio: Esito;
}

export function verificaAcciaioSezione(inp: InputAcciaioSezione): RisultatiAcciaioSezione {
  const proprieta = proprietaProfilo(inp.tipoProfilo, inp.profilo);
  const { fyk } = ACCIAIO_STRUTTURALE[inp.acciaio] ?? ACCIAIO_STRUTTURALE.S275;
  const gammaM0 = num(inp.gammaM0) || 1.05;
  const fyd = fyk / gammaM0;

  const Wx = proprieta?.Wx ?? 0;
  const A = proprieta?.A ?? 0;
  const Avz = proprieta?.Avz ?? 0;

  const MRd = (Wx * fyd) / 1000; // kNm
  const NRd = (A * fyd) / 10; // kN
  const VRd = (Avz * fyd) / Math.sqrt(3) / 10; // kN

  const MEd = num(inp.MEd);
  const NEd = num(inp.NEd);
  const VEd = num(inp.VEd);

  return {
    proprieta,
    fyk,
    fyd,
    MRd,
    NRd,
    VRd,
    sigmaM: Wx > 0 ? (1000 * MEd) / Wx : 0,
    sigmaN: A > 0 ? (10 * NEd) / A : 0,
    tau: Avz > 0 ? (10 * VEd) / Avz : 0,
    esitoFlessione: esito(MEd, MRd),
    esitoCompressione: esito(NEd, NRd),
    esitoTaglio: esito(VEd, VRd),
  };
}
