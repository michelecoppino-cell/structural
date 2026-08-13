/**
 * Scheda 2 — Sollecitazioni.
 *
 * Combina le azioni scelte (peso proprio, permanenti portati e i carichi
 * calcolati nella scheda Azioni) secondo NTC2018 §2.5.3, le trasforma in
 * carico di linea sullo schema statico selezionato e risolve la trave.
 */

import { CLS, ecmCLS } from '../data/materiali';
import { GAMMA, PSI_AMBIENTALI } from '../data/ntc2018';
import { proprietaProfilo, type TipoProfilo } from '../data/profili-acciaio';
import type { RisultatiAzioni } from './azioni';
import { num } from './azioni';
import { risolviTrave, type RisultatoTrave, type SchemaId } from './trave';

export type SorgenteId = 'PP' | 'G2' | 'Qk' | 'neve' | 'vento' | 'terre';
export type Orientamento = 'orizzontale' | 'verticale';
export type Combinazione = 'SLU' | 'SLE-rara' | 'SLE-frequente' | 'SLE-qp';
/** Provenienza del modulo elastico e del momento d'inerzia della sezione. */
export type SezioneMateriale = 'manuale' | 'cls' | 'acciaio';

export const COMBINAZIONI: { id: Combinazione; label: string; ref: string }[] = [
  { id: 'SLU', label: 'SLU (fondamentale)', ref: 'NTC2018 §2.5.3 — eq. 2.5.1' },
  { id: 'SLE-rara', label: 'SLE rara', ref: 'NTC2018 §2.5.3 — eq. 2.5.2' },
  { id: 'SLE-frequente', label: 'SLE frequente', ref: 'NTC2018 §2.5.3 — eq. 2.5.3' },
  { id: 'SLE-qp', label: 'SLE quasi permanente', ref: 'NTC2018 §2.5.3 — eq. 2.5.4' },
];

export interface InputSollecitazioni {
  schema: SchemaId;
  orientamento: Orientamento;
  combinazione: Combinazione;
  /** Sorgenti di carico attive. */
  attive: Record<SorgenteId, boolean>;
  /** Luce / altezza dell'elemento (m). */
  L: string;
  /** Interasse — larghezza di influenza (m). */
  interasse: string;
  /** Area di influenza per i carichi gravitazionali in verticale (m²). */
  areaInfluenza: string;
  /** Peso proprio strutturale G1 (kN/m²). */
  pp: string;
  /** Permanenti non strutturali G2 (kN/m²). */
  g2: string;
  /** Carico concentrato aggiuntivo (kN) e sua ascissa (m). */
  P: string;
  aP: string;
  /** Modulo elastico (MPa) e momento d'inerzia (cm⁴) per la deformata — usati quando sezioneMateriale = 'manuale'. */
  E: string;
  J: string;
  /** Provenienza di E e J: manuale, sezione rettangolare in c.a. o profilo in acciaio. */
  sezioneMateriale: SezioneMateriale;
  /** Sezione in c.a.: base × altezza (mm) e classe di calcestruzzo. */
  sezioneB: string;
  sezioneH: string;
  sezioneCls: string;
  /** Sezione in acciaio: tipo di profilo e taglia. */
  sezioneTipoProfilo: TipoProfilo;
  sezioneProfilo: string;
}

export const SOLLECITAZIONI_DEFAULT: InputSollecitazioni = {
  schema: 'appoggio-appoggio',
  orientamento: 'orizzontale',
  combinazione: 'SLU',
  // di default agisce il solo Qk variabile da tabella NTC
  attive: { PP: false, G2: false, Qk: true, neve: false, vento: false, terre: false },
  L: '5.00',
  interasse: '1.00',
  areaInfluenza: '10.00',
  pp: '3.00',
  g2: '2.00',
  P: '0',
  aP: '2.50',
  E: '31476',
  J: '540000',
  sezioneMateriale: 'manuale',
  sezioneB: '300',
  sezioneH: '500',
  sezioneCls: 'C25/30',
  sezioneTipoProfilo: 'IPE',
  sezioneProfilo: 'IPE 200',
};

export interface Sorgente {
  id: SorgenteId;
  label: string;
  descr: string;
  /** kN/m² caratteristici. */
  qk: number;
  tipo: 'G1' | 'G2' | 'Q';
  direzione: 'gravitazionale' | 'orizzontale';
  psi0: number;
  psi1: number;
  psi2: number;
  /** Da dove viene il valore. */
  origine: 'input' | 'azioni';
  ref: string;
  /** true = qk è già una forza per metro (kN/m), non un carico per m² da moltiplicare per l'interasse. */
  perMetro?: boolean;
}

export function sorgenti(inp: InputSollecitazioni, az: RisultatiAzioni): Sorgente[] {
  return [
    {
      id: 'PP',
      label: 'PP',
      descr: 'Peso proprio strutturale G1',
      qk: num(inp.pp),
      tipo: 'G1',
      direzione: 'gravitazionale',
      psi0: 1,
      psi1: 1,
      psi2: 1,
      origine: 'input',
      ref: 'NTC2018 §2.5.1 — G1',
    },
    {
      id: 'G2',
      label: 'G2',
      descr: 'Permanenti non strutturali',
      qk: num(inp.g2),
      tipo: 'G2',
      direzione: 'gravitazionale',
      psi0: 1,
      psi1: 1,
      psi2: 1,
      origine: 'input',
      ref: 'NTC2018 §2.5.1 — G2',
    },
    {
      id: 'Qk',
      label: 'Qk',
      descr: `Variabile ${az.variabili.categoria.split(' — ')[0]} — Tab. 3.1.II`,
      qk: az.variabili.qk,
      tipo: 'Q',
      direzione: 'gravitazionale',
      psi0: az.variabili.psi0,
      psi1: az.variabili.psi1,
      psi2: az.variabili.psi2,
      origine: 'azioni',
      ref: 'NTC2018 §3.1.4 — Tab. 3.1.II',
    },
    {
      id: 'neve',
      label: 'Neve',
      descr: 'Carico neve in copertura qs',
      qk: az.neve.qs,
      tipo: 'Q',
      direzione: 'gravitazionale',
      ...PSI_AMBIENTALI.neve,
      origine: 'azioni',
      ref: 'NTC2018 §3.4',
    },
    {
      id: 'vento',
      label: 'Vento',
      descr: 'Pressione del vento p (sopravento)',
      qk: az.vento.p,
      tipo: 'Q',
      direzione: 'orizzontale',
      ...PSI_AMBIENTALI.vento,
      origine: 'azioni',
      ref: 'NTC2018 §3.3',
    },
    {
      id: 'terre',
      label: 'Terre',
      descr: 'Spinta delle terre Sa',
      qk: az.terre.Sa,
      tipo: 'G2',
      direzione: 'orizzontale',
      psi0: 1,
      psi1: 1,
      psi2: 1,
      origine: 'azioni',
      ref: 'NTC2018 §6.5.3',
      perMetro: true,
    },
  ];
}

export interface ContributoCarico {
  sorgente: Sorgente;
  /** Coefficiente parziale γ applicato. */
  gamma: number;
  /** Coefficiente di combinazione ψ applicato. */
  psi: number;
  /** Contributo di progetto in kN/m². */
  qd: number;
  /** Ruolo nella combinazione. */
  ruolo: 'permanente' | 'variabile principale' | 'variabile secondario';
}

/**
 * Applica γ e ψ alle sorgenti attive secondo la combinazione scelta.
 * La variabile principale è quella con il contributo maggiore.
 */
export function combina(
  attive: Sorgente[],
  comb: Combinazione,
): { contributi: ContributoCarico[]; principale?: SorgenteId } {
  const permanenti = attive.filter((s) => s.tipo !== 'Q');
  const variabili = attive.filter((s) => s.tipo === 'Q');
  const slu = comb === 'SLU';

  const principale = [...variabili].sort((a, b) => b.qk - a.qk)[0];

  const gPerm = (s: Sorgente) => (slu ? (s.tipo === 'G1' ? GAMMA.G1 : GAMMA.G2) : 1);

  const contributi: ContributoCarico[] = permanenti.map((s) => ({
    sorgente: s,
    gamma: gPerm(s),
    psi: 1,
    qd: s.qk * gPerm(s),
    ruolo: 'permanente',
  }));

  for (const s of variabili) {
    const isPrinc = principale?.id === s.id;
    const gamma = slu ? GAMMA.Q : 1;
    let psi: number;
    switch (comb) {
      case 'SLU':
      case 'SLE-rara':
        psi = isPrinc ? 1 : s.psi0;
        break;
      case 'SLE-frequente':
        psi = isPrinc ? s.psi1 : s.psi2;
        break;
      case 'SLE-qp':
        psi = s.psi2;
        break;
    }
    contributi.push({
      sorgente: s,
      gamma,
      psi,
      qd: s.qk * gamma * psi,
      ruolo: isPrinc ? 'variabile principale' : 'variabile secondario',
    });
  }

  return { contributi, principale: principale?.id };
}

export interface RisultatiSollecitazioni {
  contributi: ContributoCarico[];
  principale?: SorgenteId;
  /** Carico di linea trasversale di progetto (kN/m). */
  q: number;
  /** Sforzo normale di progetto (kN), solo per elementi verticali. */
  N: number;
  /** Rigidezza flessionale EJ (kNm²). */
  EJ: number;
  /** Modulo elastico (MPa) e momento d'inerzia (cm⁴) effettivamente usati. */
  E: number;
  J: number;
  L: number;
  /** Rampa triangolare della spinta delle terre (kN/m), se attiva in verticale. */
  wTri?: { w0: number; w1: number };
  trave: RisultatoTrave;
}

export function calcolaSollecitazioni(
  inp: InputSollecitazioni,
  az: RisultatiAzioni,
): RisultatiSollecitazioni {
  const tutte = sorgenti(inp, az);
  const attive = tutte.filter((s) => inp.attive[s.id]);
  const { contributi, principale } = combina(attive, inp.combinazione);

  const verticale = inp.orientamento === 'verticale';
  const i = num(inp.interasse);
  const A = num(inp.areaInfluenza);

  // In un elemento verticale i carichi gravitazionali diventano sforzo
  // normale sull'area di influenza, mentre solo le azioni orizzontali
  // (vento, terre) flettono l'elemento. La spinta delle terre, in verticale,
  // non è uniforme: ha andamento triangolare (nullo in sommità, massimo alla
  // base) e viene tenuta fuori da q per essere passata come rampa a parte.
  const L0 = num(inp.L);
  let q = 0;
  let N = 0;
  let wTri: { w0: number; w1: number } | undefined;
  for (const c of contributi) {
    if (verticale && c.sorgente.direzione === 'gravitazionale') {
      N += c.qd * A;
    } else if (verticale && c.sorgente.id === 'terre') {
      // qd è la spinta risultante (kN/m di sviluppo del muro), già integrata
      // sull'altezza: il picco del triangolo equivalente è 2·Sa/H, massimo
      // alla base (x=0=A, tipicamente l'incastro) e nullo in sommità (x=L=B,
      // il piano campagna da cui parte il cuneo di spinta).
      const picco = L0 > 0 ? (2 * c.qd) / L0 : 0;
      wTri = { w0: picco, w1: 0 };
    } else {
      q += c.qd * (c.sorgente.perMetro ? 1 : i);
    }
  }

  // sezione: manuale = E/J inseriti a mano; c.a. = rettangolo b×h; acciaio = profilo scelto
  let E = num(inp.E);
  let J = num(inp.J);
  if (inp.sezioneMateriale === 'cls') {
    const { fck } = CLS[inp.sezioneCls] ?? CLS['C25/30'];
    E = ecmCLS(fck);
    const b = num(inp.sezioneB);
    const h = num(inp.sezioneH);
    J = (b * h ** 3) / 12 / 1e4; // mm⁴ → cm⁴
  } else if (inp.sezioneMateriale === 'acciaio') {
    E = 210000;
    J = proprietaProfilo(inp.sezioneTipoProfilo, inp.sezioneProfilo)?.Ix ?? 0;
  }

  // E [MPa] → kN/m² (×1e3), J [cm⁴] → m⁴ (×1e-8)  ⇒  EJ [kNm²] = E·J·1e-5
  const EJ = E * J * 1e-5;
  const L = num(inp.L);
  const P = num(inp.P);

  const trave = risolviTrave({
    schema: inp.schema,
    L,
    q,
    EJ,
    wTri,
    P: P !== 0 ? [{ P, a: Math.min(Math.max(num(inp.aP), 0), L) }] : [],
  });

  return { contributi, principale, q, N, EJ, E, J, L, wTri, trave };
}
