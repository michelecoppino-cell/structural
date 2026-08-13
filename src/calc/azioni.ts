/**
 * Scheda 1 — Azioni. Funzioni pure: unica sorgente di verità è lo stato degli
 * input, tutto il resto è calcolato.
 *
 * Riferimenti: NTC2018 (DM 17/01/2018) cap. 3.
 */

import { AG, SS, ST, CU, ZONE_NEVE, VB0, ESPOSIZIONE, CAT } from '../data/ntc2018';

export interface InputAzioni {
  // sisma
  loc: string;
  suolo: string;
  topo: string;
  vn: string;
  cu: string;
  F0: string;
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
  loc: "L'Aquila",
  suolo: 'C',
  topo: 'T1',
  vn: '50',
  cu: 'II (ordinaria) — 1.0',
  F0: '2.42',
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
  sisma: { ag: number; Ss: number; St: number; S: number; cu: number; F0: number; q: number; Sd: number; VR: number; TR: number };
  neve: { qsk: number; qs: number; mu: number; ce: number; ct: number };
  vento: { vb: number; qb: number; ce: number; cp: number; cd: number; p: number; pSotto: number };
  variabili: { qk: number; Qk: number; Hk: number; psi0: number; psi1: number; psi2: number; categoria: string };
  terre: { ka: number; Sa: number; za: number; Mrib: number };
}

export function calcolaAzioni(inp: InputAzioni): RisultatiAzioni {
  // ── azione sismica — §3.2 ──────────────────────────────────────────────
  const ag = AG[inp.loc] ?? 0.15;
  const Ss = SS[inp.suolo] ?? 1;
  const St = ST[inp.topo] ?? 1;
  const S = Ss * St;
  const cu = CU[inp.cu] ?? 1;
  const F0 = num(inp.F0) || 2.42;
  const q = num(inp.q) || 1;
  const Sd = (ag * S * F0) / q;
  const VN = num(inp.vn);
  const VR = Math.max(VN * cu, 35); // §2.4.3: VR ≥ 35 anni
  const TR = -VR / Math.log(1 - 0.1); // SLV, PVR = 10%

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
    sisma: { ag, Ss, St, S, cu, F0, q, Sd, VR, TR },
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
