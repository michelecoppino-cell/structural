/**
 * Scheda 1 — Azioni. Funzioni pure: unica sorgente di verità è lo stato degli
 * input, tutto il resto è calcolato.
 *
 * Riferimenti: NTC2018 (DM 17/01/2018) cap. 3.
 */

import { ST, CU, ZONE_NEVE, VB0, ESPOSIZIONE, CAT } from '../data/ntc2018';
import { coefficienteCC, coefficienteSS, risolviSito, type FonteAg } from './sismica';
import type { ZonaSismica } from '../data/comuni';

export interface InputAzioni {
  // sisma — sito
  regione: string;
  /** Sigla della provincia (es. "AQ"). */
  prov: string;
  comune: string;
  /** ag/g inserito a mano; vuoto = ricavato dalla mappatura nazionale. */
  agManuale: string;
  suolo: string;
  topo: string;
  vn: string;
  cu: string;
  F0: string;
  /** TC* del sito (s) — periodo di inizio del tratto a velocità costante. */
  TCstar: string;
  q: string;
  // neve
  zneve: string;
  as: string;
  mu: string;
  ceN: string;
  ct: string;
  // vento
  zvento: string;
  z: string;
  espo: string;
  cp: string;
  cd: string;
  // carichi variabili
  cat: string;
  // spinta delle terre
  gamma: string;
  phi: string;
  H: string;
  delta: string;
}

export const AZIONI_DEFAULT: InputAzioni = {
  regione: 'Abruzzo',
  prov: 'AQ',
  comune: "L'Aquila",
  agManuale: '',
  suolo: 'C',
  topo: 'T1',
  vn: '50',
  cu: 'II (ordinaria) — 1.0',
  F0: '2.42',
  TCstar: '0.35',
  q: '3.0',
  zneve: 'II — Mediterranea',
  as: '714',
  mu: '0.80',
  ceN: '1.00',
  ct: '1.00',
  zvento: '3 — 27 m/s',
  z: '9.00',
  espo: 'III',
  cp: '1.00',
  cd: '1.00',
  cat: 'B1 — Uffici non aperti al pubblico',
  gamma: '18.0',
  phi: '30',
  H: '2.50',
  delta: '0',
};

/** parseFloat tollerante alla virgola decimale; NaN → 0. */
export const num = (v: string | number | undefined): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export interface RisultatiAzioni {
  sisma: {
    ag: number;
    Ss: number;
    St: number;
    S: number;
    cu: number;
    F0: number;
    q: number;
    Sd: number;
    VR: number;
    TR: number;
    /** Provenienza di ag e classificazione del comune. */
    fonteAg: FonteAg;
    notaAg: string;
    zona?: ZonaSismica;
    zonaLabel?: string;
    sito: string;
    /** Periodi caratteristici dello spettro orizzontale — §3.2.3.2.1. */
    Cc: number;
    TCstar: number;
    TB: number;
    TC: number;
    TD: number;
  };
  neve: { qsk: number; qs: number; mu: number; ce: number; ct: number };
  vento: { vb: number; qb: number; ce: number; cp: number; cd: number; p: number; pSotto: number };
  variabili: { qk: number; Qk: number; Hk: number; psi0: number; psi1: number; psi2: number; categoria: string };
  terre: { ka: number; Sa: number; za: number; Mrib: number };
}

export function calcolaAzioni(inp: InputAzioni): RisultatiAzioni {
  // ── azione sismica — §3.2 ──────────────────────────────────────────────
  // il campo può arrivare vuoto o assente da un JSON salvato prima di questa versione
  const agIns = String(inp.agManuale ?? '').trim() ? num(inp.agManuale) : undefined;
  const sito = risolviSito(inp.regione, inp.prov, inp.comune, agIns);
  const ag = sito.ag;
  const F0 = num(inp.F0) || 2.42;
  const Ss = coefficienteSS(inp.suolo, ag, F0);
  const St = ST[inp.topo] ?? 1;
  const S = Ss * St;
  const cu = CU[inp.cu] ?? 1;
  const q = num(inp.q) || 1;
  const Sd = (ag * S * F0) / q;
  const VN = num(inp.vn);
  const VR = Math.max(VN * cu, 35); // §2.4.3: VR ≥ 35 anni
  const TR = -VR / Math.log(1 - 0.1); // SLV, PVR = 10%
  const TCstar = num(inp.TCstar) || 0.35;
  const Cc = coefficienteCC(inp.suolo, TCstar);
  const TC = Cc * TCstar;
  const TB = TC / 3;
  const TD = 4 * ag + 1.6;

  // ── carico neve — §3.4 ─────────────────────────────────────────────────
  const zn = ZONE_NEVE[inp.zneve] ?? ZONE_NEVE['II — Mediterranea'];
  const as = num(inp.as);
  const qsk = as <= 200 ? zn.base : zn.coef * (1 + (as / zn.rif) ** 2);
  const mu = num(inp.mu);
  const ceN = num(inp.ceN);
  const ct = num(inp.ct);
  const qs = mu * qsk * ceN * ct;

  // ── azione del vento — §3.3 ────────────────────────────────────────────
  const vb = VB0[inp.zvento] ?? 27;
  const qb = (0.5 * 1.25 * vb * vb) / 1000; // kN/m²
  const e = ESPOSIZIONE[inp.espo] ?? ESPOSIZIONE['III'];
  const zEff = Math.max(num(inp.z), e.zmin);
  const ctop = 1; // coefficiente di topografia
  const lnz = Math.log(zEff / e.z0);
  const ce = e.kr ** 2 * ctop * lnz * (7 + ctop * lnz);
  const cp = num(inp.cp);
  const cd = num(inp.cd);
  const p = qb * ce * cp * cd;

  // ── carichi variabili — Tab. 3.1.II ────────────────────────────────────
  const c = CAT[inp.cat] ?? CAT['A — Ambienti residenziali'];

  // ── spinta delle terre — §6.5.3 (Rankine) ──────────────────────────────
  const phi = num(inp.phi);
  const ka = Math.tan(((45 - phi / 2) * Math.PI) / 180) ** 2;
  const H = num(inp.H);
  const Sa = 0.5 * num(inp.gamma) * H * H * ka;
  const za = H / 3;

  return {
    sisma: {
      ag,
      Ss,
      St,
      S,
      cu,
      F0,
      q,
      Sd,
      VR,
      TR,
      fonteAg: sito.fonte,
      notaAg: sito.nota,
      zona: sito.zona,
      zonaLabel: sito.comune?.zonaLabel,
      sito: sito.comune ? `${sito.comune.nome} (${sito.comune.sigla})` : '—',
      Cc,
      TCstar,
      TB,
      TC,
      TD,
    },
    neve: { qsk, qs, mu, ce: ceN, ct },
    vento: { vb, qb, ce, cp, cd, p, pSotto: -p * 0.5 },
    variabili: {
      qk: c[0],
      Qk: c[1],
      Hk: c[2],
      psi0: c[3],
      psi1: c[4],
      psi2: c[5],
      categoria: inp.cat,
    },
    terre: { ka, Sa, za, Mrib: Sa * za },
  };
}
