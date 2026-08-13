/**
 * Scheda 1 — Azioni. Funzioni pure: unica sorgente di verità è lo stato degli
 * input, tutto il resto è calcolato.
 *
 * Riferimenti: NTC2018 (DM 17/01/2018) cap. 3.
 */

import { ST, CU, ZONE_NEVE, VB0, ESPOSIZIONE, CAT } from '../data/ntc2018';
import {
  PVR,
  coefficienteCC,
  coefficienteSS,
  interpolaTR,
  periodoRitorno,
  risolviSito,
  STATI_LIMITE,
  type FonteSito,
  type StatoLimite,
} from './sismica';
import type { ZonaSismica } from '../data/comuni';
import { parametriSito } from '../data/parametri-sismici';

export interface InputAzioni {
  // sisma — sito
  regione: string;
  /** Sigla della provincia (es. "AQ"). */
  prov: string;
  comune: string;
  /** Stato limite di riferimento per l'azione sismica. */
  sl: StatoLimite;
  /** ag/g imposto a mano; vuoto = dal reticolo di riferimento. */
  agManuale: string;
  suolo: string;
  topo: string;
  vn: string;
  cu: string;
  /** F0 imposto a mano; vuoto = dal reticolo. */
  F0: string;
  /** TC* del sito (s) imposto a mano; vuoto = dal reticolo. */
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
  sl: 'SLV',
  agManuale: '',
  suolo: 'C',
  topo: 'T1',
  vn: '50',
  cu: 'II (ordinaria) — 1.0',
  F0: '',
  TCstar: '',
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
    /** Provenienza dei parametri e classificazione del comune. */
    fonte: FonteSito;
    nota: string;
    manuali: { ag: boolean; F0: boolean; TCstar: boolean };
    zona?: ZonaSismica;
    zonaLabel?: string;
    sito: string;
    /** Periodi caratteristici dello spettro orizzontale — §3.2.3.2.1. */
    Cc: number;
    TCstar: number;
    TB: number;
    TC: number;
    TD: number;
    /** ag, F0 e TC* del sito per i quattro stati limite — Tab. 3.2.I. */
    statiLimite: { id: StatoLimite; label: string; TR: number; ag: number; F0: number; TCstar: number }[];
  };
  neve: { qsk: number; qs: number; mu: number; ce: number; ct: number };
  vento: { vb: number; qb: number; ce: number; cp: number; cd: number; p: number; pSotto: number };
  variabili: { qk: number; Qk: number; Hk: number; psi0: number; psi1: number; psi2: number; categoria: string };
  terre: { ka: number; Sa: number; za: number; Mrib: number };
}

export function calcolaAzioni(inp: InputAzioni): RisultatiAzioni {
  // ── azione sismica — §3.2 ──────────────────────────────────────────────
  const cu = CU[inp.cu] ?? 1;
  const VN = num(inp.vn);
  const VR = Math.max(VN * cu, 35); // §2.4.3: VR ≥ 35 anni
  const sl: StatoLimite = inp.sl ?? 'SLV';
  const TR = periodoRitorno(VR, PVR[sl] ?? PVR.SLV);

  // i campi possono arrivare vuoti, o assenti da un JSON di una versione precedente
  const forzato = (v: string | undefined) => (String(v ?? '').trim() ? num(v) : undefined);
  const sito = risolviSito(inp.regione, inp.prov, inp.comune, TR, {
    ag: forzato(inp.agManuale),
    F0: forzato(inp.F0),
    TCstar: forzato(inp.TCstar),
  });

  const { ag, F0, TCstar } = sito;
  const Ss = coefficienteSS(inp.suolo, ag, F0);
  const St = ST[inp.topo] ?? 1;
  const S = Ss * St;
  const q = num(inp.q) || 1;
  const Sd = (ag * S * F0) / q;
  const Cc = coefficienteCC(inp.suolo, TCstar);
  const TC = Cc * TCstar;
  const TB = TC / 3;
  const TD = 4 * ag + 1.6;

  // quadro dei quattro stati limite sullo stesso VR
  const tabellaSito = sito.comune ? parametriSito(sito.comune.indice) : undefined;
  const statiLimite = STATI_LIMITE.map((s) => {
    const tr = periodoRitorno(VR, s.PVR);
    return {
      id: s.id,
      label: s.label,
      TR: tr,
      ag: tabellaSito ? interpolaTR(tabellaSito.ag, tr) : ag,
      F0: tabellaSito ? interpolaTR(tabellaSito.F0, tr) : F0,
      TCstar: tabellaSito ? interpolaTR(tabellaSito.TCstar, tr) : TCstar,
    };
  });

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
      fonte: sito.fonte,
      nota: sito.nota,
      manuali: sito.manuali,
      zona: sito.zona,
      zonaLabel: sito.zonaLabel,
      sito: sito.comune ? `${sito.comune.nome} (${sito.comune.sigla})` : '—',
      Cc,
      TCstar,
      TB,
      TC,
      TD,
      statiLimite,
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
