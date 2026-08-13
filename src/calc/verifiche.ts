/**
 * Scheda 3 — Verifiche.
 *
 * Trascrizione dei fogli di calcolo presenti in repository:
 *  - "01 - Verifica a taglio elementi non armati.xlsx"  → NTC2018 §4.1.2.3.5.1
 *  - "02 - Verifica a taglio elementi armati.xlsx"      → NTC2018 §4.1.2.3.5.2
 *    (foglio VERIFICA_STAFFE)
 */

import { CLS, TONDI } from '../data/materiali';
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
