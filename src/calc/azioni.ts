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
  ordinateSpettro,
  periodoRitorno,
  risolviSito,
  STATI_LIMITE,
  type FonteSito,
  type FormaSpettro,
  type OrdinateSpettro,
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
  /** Periodo T per cui leggere Se(T) e Sd(T); vuoto = nessuna lettura. */
  Tsp: string;
  // neve
  zneve: string;
  as: string;
  /** Inclinazione della falda α (°): decide μ1 e il disegno della copertura. */
  alfaNeve: string;
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
  /** Attrito terra-muro δ (°): entra in Mononobe-Okabe, non in Rankine. */
  delta: string;
  /** Inclinazione del terrapieno β (°) rispetto all'orizzontale. */
  betaTerre: string;
  /** Inclinazione del paramento ψ (°) rispetto alla verticale. */
  psiTerre: string;
  /** true = si somma alla spinta statica l'incremento sismico. */
  sismaTerre: boolean;
  /** Coefficiente di riduzione βm dell'accelerazione — Tab. 7.11.II. */
  betam: string;
  /** kh imposto a mano; vuoto = βm · S · ag/g. */
  khManuale: string;
}

/**
 * Sito di partenza: Fagagna (UD), Friuli-Venezia Giulia.
 * I valori legati al sito sono coerenti fra loro:
 *  - as = 177 m — quota del capoluogo comunale;
 *  - zona di carico neve I — Alpina: Tab. 3.4.I elenca Udine fra le province
 *    della zona alpina;
 *  - zona di vento 1 (vb,0 = 25 m/s): Tab. 3.3.I assegna alla zona 1 tutto il
 *    Friuli-Venezia Giulia con la sola eccezione della provincia di Trieste.
 */
export const AZIONI_DEFAULT: InputAzioni = {
  regione: 'Friuli-Venezia Giulia',
  prov: 'UD',
  comune: 'Fagagna',
  sl: 'SLV',
  agManuale: '',
  suolo: 'C',
  topo: 'T1',
  vn: '50',
  cu: 'II (ordinaria) — 1.0',
  F0: '',
  TCstar: '',
  q: '1.33',
  Tsp: '',
  zneve: 'I — Alpina',
  as: '177',
  alfaNeve: '15',
  mu: '0.80',
  ceN: '1.00',
  ct: '1.00',
  zvento: '1 — 25 m/s',
  z: '9.00',
  espo: 'III',
  cp: '1.00',
  cd: '1.00',
  cat: 'B1 — Uffici non aperti al pubblico',
  gamma: '18.0',
  phi: '30',
  H: '2.50',
  delta: '0',
  betaTerre: '0',
  psiTerre: '0',
  sismaTerre: false,
  betam: '1.00',
  khManuale: '',
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
    /** Accelerazione di plateau dello spettro elastico Se = ag·S·F0 (g e m/s²). */
    SePlateau: number;
    SePlateauMS2: number;
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
    /** Parametri della forma spettrale, per rileggere lo spettro a qualsiasi T. */
    forma: FormaSpettro;
    /** Lettura dello spettro al periodo scritto in scheda; assente se non c'è. */
    periodo?: OrdinateSpettro;
    /** ag, F0 e TC* del sito per i quattro stati limite — Tab. 3.2.I. */
    statiLimite: { id: StatoLimite; label: string; TR: number; ag: number; F0: number; TCstar: number }[];
  };
  neve: {
    qsk: number;
    qs: number;
    mu: number;
    ce: number;
    ct: number;
    /** Inclinazione della falda e μ1 che le corrisponde in Tab. 3.4.II. */
    alfa: number;
    muSuggerito: number;
  };
  vento: { vb: number; qb: number; ce: number; cp: number; cd: number; p: number; pSotto: number };
  variabili: { qk: number; Qk: number; Hk: number; psi0: number; psi1: number; psi2: number; categoria: string };
  terre: {
    ka: number;
    Sa: number;
    za: number;
    Mrib: number;
    /** Spinta sismica — Mononobe-Okabe, §7.11.6.2.1 e §7.11.6.3.1. */
    sisma: {
      attiva: boolean;
      /** Accelerazione massima attesa al sito, amax/g = S · ag/g. */
      amax: number;
      kh: number;
      kv: number;
      /** Angolo sismico θ = atan[kh / (1 ∓ kv)], in gradi. */
      theta: number;
      /** Coefficiente di spinta attiva in condizioni sismiche. */
      kae: number;
      /** Spinta totale in sismica (statica + incremento), kN/m. */
      Ed: number;
      /** Solo incremento dinamico ΔEd = Ed − Sa, kN/m. */
      dEd: number;
      /** Momento ribaltante totale: Sa a H/3 più ΔEd a H/2. */
      Mtot: number;
      /** Vuoto se il calcolo è regolare, altrimenti perché non lo è. */
      avviso: string;
    };
  };
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
  const SePlateau = ag * S * F0;
  const Sd = SePlateau / q;
  const Cc = coefficienteCC(inp.suolo, TCstar);
  const TC = Cc * TCstar;
  const TB = TC / 3;
  const TD = 4 * ag + 1.6;
  const forma: FormaSpettro = { ag, S, F0, TB, TC, TD };

  // lettura dello spettro al periodo assegnato in scheda (campo facoltativo)
  const Tsp = forzato(inp.Tsp);
  const periodo = Tsp !== undefined && Tsp >= 0 ? ordinateSpettro(Tsp, forma, q) : undefined;

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
  // Tab. 3.4.II: μ1 = 0.80 fino a 30°, poi in calo lineare fino a 0 a 60°
  const alfaNeve = Math.abs(num(inp.alfaNeve));
  const muSuggerito = alfaNeve <= 30 ? 0.8 : alfaNeve >= 60 ? 0 : (0.8 * (60 - alfaNeve)) / 30;

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
  const gammaT = num(inp.gamma);
  const Sa = 0.5 * gammaT * H * H * ka;
  const za = H / 3;

  // ── spinta sismica delle terre — §7.11.6 (Mononobe-Okabe) ──────────────
  const sismaTerre = calcolaSpintaSismica(inp, { S, ag, phi, H, gammaT, Sa });

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
      SePlateau,
      SePlateauMS2: SePlateau * 9.81,
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
      forma,
      periodo,
      statiLimite,
    },
    neve: { qsk, qs, mu, ce: ceN, ct, alfa: alfaNeve, muSuggerito },
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
    terre: { ka, Sa, za, Mrib: Sa * za, sisma: sismaTerre },
  };
}

/* ───────────────── spinta sismica delle terre — §7.11.6 ───────────────── */

const rad = (g: number) => (g * Math.PI) / 180;

/**
 * Coefficiente di spinta attiva in condizioni sismiche secondo
 * **Mononobe-Okabe** (NTC2018 §7.11.6.2.1, eq. 7.11.7):
 *
 *   K = cos²(φ − θ − ψ) / { cosθ · cos²ψ · cos(δ + ψ + θ) ·
 *       [1 + √( sin(φ+δ)·sin(φ−θ−β) / (cos(δ+ψ+θ)·cos(β−ψ)) )]² }
 *
 * con ψ inclinazione del paramento sulla verticale, β inclinazione del
 * terrapieno sull'orizzontale, δ attrito terra-muro, θ angolo sismico.
 * Con θ = 0 e ψ = β = δ = 0 si ritrova il Ka di Rankine: la formula copre
 * anche il caso statico ed è quella che si degrada con continuità.
 *
 * `NaN` quando φ − θ − β < 0: il terrapieno non regge quell'accelerazione e
 * la radice perde significato — è la condizione da segnalare, non da nascondere.
 */
export function coefficienteMO(phi: number, theta: number, delta: number, beta: number, psi: number): number {
  const f = rad(phi);
  const t = rad(theta);
  const d = rad(delta);
  const b = rad(beta);
  const y = rad(psi);

  if (phi - theta - beta < 0) return NaN;

  const denomRadice = Math.cos(d + y + t) * Math.cos(b - y);
  if (denomRadice <= 0) return NaN;
  const radice = Math.sqrt((Math.sin(f + d) * Math.sin(f - t - b)) / denomRadice);
  const denom = Math.cos(t) * Math.cos(y) ** 2 * Math.cos(d + y + t) * (1 + radice) ** 2;
  if (!(denom > 0)) return NaN;
  return Math.cos(f - t - y) ** 2 / denom;
}

/**
 * Spinta in condizioni sismiche: si prova sia kv verso l'alto sia verso il
 * basso (§7.11.6.2.1 li ammette entrambi) e si tiene la combinazione che dà
 * la spinta maggiore, che è quella che dimensiona.
 */
function calcolaSpintaSismica(
  inp: InputAzioni,
  d: { S: number; ag: number; phi: number; H: number; gammaT: number; Sa: number },
): RisultatiAzioni['terre']['sisma'] {
  const { S, ag, phi, H, gammaT, Sa } = d;
  const amax = S * ag; // in g, §7.11.3.5.2
  const betam = num(inp.betam) || 1;
  const khScritto = String(inp.khManuale ?? '').trim();
  const kh = khScritto ? num(khScritto) : betam * amax;
  const kv = 0.5 * kh; // §7.11.6.2.1: kv = ±0.5·kh
  const delta = num(inp.delta);
  const beta = num(inp.betaTerre);
  const psi = num(inp.psiTerre);

  let migliore = { kae: NaN, Ed: -Infinity, theta: NaN, kv: 0 };
  for (const segno of [1, -1] as const) {
    // θ = atan[kh / (1 ∓ kv)]: il segno del verticale cambia sia θ sia il peso
    const fattore = 1 - segno * kv;
    if (fattore <= 0) continue;
    const theta = (Math.atan(kh / fattore) * 180) / Math.PI;
    const kae = coefficienteMO(phi, theta, delta, beta, psi);
    if (!Number.isFinite(kae)) continue;
    const Ed = 0.5 * gammaT * H * H * fattore * kae;
    if (Ed > migliore.Ed) migliore = { kae, Ed, theta, kv: segno * kv };
  }

  const trovata = Number.isFinite(migliore.kae);
  const Ed = trovata ? migliore.Ed : NaN;
  const dEd = trovata ? Math.max(0, Ed - Sa) : NaN;

  return {
    attiva: !!inp.sismaTerre,
    amax,
    kh,
    kv: trovata ? migliore.kv : kv,
    theta: migliore.theta,
    kae: migliore.kae,
    Ed,
    dEd,
    // la spinta statica resta a H/3, l'incremento dinamico si applica a metà
    // altezza (§7.11.6.3.1): il momento è la somma dei due contributi
    Mtot: trovata ? Sa * (H / 3) + dEd * (H / 2) : NaN,
    avviso: trovata
      ? ''
      : `Con kh = ${kh.toFixed(3)} risulta φ′ − θ − β < 0: il terrapieno non è in equilibrio sotto questa accelerazione. Serve un'analisi specifica, oppure una geometria diversa.`,
  };
}
