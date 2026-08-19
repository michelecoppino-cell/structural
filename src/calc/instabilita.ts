/**
 * Instabilità flesso-torsionale delle travi inflesse — NTC2018 §4.2.4.1.3.2.
 *
 * Trascrizione del foglio `Verifica_aste_acciaio_rev01.xlsm` (foglio
 * "Verifica aste", righe 259-281 e funzione VBA `Mom_critico_Mcr`): momento
 * critico elastico secondo il prospetto F.1 della ENV 1993-1-1, snellezza
 * adimensionale, curva di instabilità e momento resistente ridotto.
 *
 * Il calcolo vale per **tutti i tipi di profilo** del sagomario. Cambia solo
 * quanto pesano i due termini di Mcr: nei profili aperti (doppi T, U,
 * angolari) comanda l'ingobbamento, nei tubi la rigidezza torsionale, che è
 * così alta da rendere la verifica quasi sempre non determinante — come dice
 * la fisica, non come una scorciatoia del foglio. Per le sezioni con Imin pari
 * all'inerzia forte (tubo quadro, tubo tondo) lo sbandamento laterale non può
 * proprio avvenire: la verifica non è richiesta e χLT vale 1.
 */

import { ACCIAIO_STRUTTURALE } from '../data/materiali';
import { proprietaProfilo, type ProprietaProfilo } from '../data/profili-acciaio';
import { num } from './azioni';
import { esito, type Esito, type InputAcciaioSezione } from './verifiche';

/** Modulo di Young dell'acciaio da carpenteria (N/mm²) — NTC2018 §11.3.4.1. */
export const E_ACCIAIO = 210000;
/** Modulo di taglio G = E / [2·(1+ν)] con ν = 0.3 (N/mm²). */
export const G_ACCIAIO = E_ACCIAIO / (2 * 1.3);

/** Fattori di imperfezione α delle curve di instabilità — NTC2018 §4.2.4.1.3.1. */
export const ALFA_CURVA: Record<string, number> = {
  a0: 0.13,
  a: 0.21,
  b: 0.34,
  c: 0.49,
  d: 0.76,
};

/**
 * Condizioni di carico e vincolo del prospetto F.1 della ENV 1993-1-1, con i
 * valori di k ammessi da ciascuna riga della tabella dei coefficienti C.
 */
export const CONDIZIONI_CARICO: { id: string; label: string; k: string[]; psi: boolean }[] = [
  { id: '1', label: 'Appoggiata — momenti alle estremità', k: ['1', '0.7', '0.5'], psi: true },
  { id: '2', label: 'Appoggiata — carico distribuito', k: ['1', '0.5'], psi: false },
  { id: '3', label: 'Incastrata — carico distribuito', k: ['1', '0.5'], psi: false },
  { id: '4', label: 'Appoggiata — forza in mezzeria', k: ['1', '0.5'], psi: false },
  { id: '5', label: 'Incastrata — forza in mezzeria', k: ['1', '0.5'], psi: false },
  { id: '6', label: 'Appoggiata — due forze a L/3', k: ['1', '0.5'], psi: false },
];

/** Rapporti fra i momenti di estremità tabellati per la condizione 1. */
export const PSI_TABELLATI = ['1', '0.75', '0.5', '0.25', '0', '-0.25', '-0.5', '-0.75', '-1'];

/**
 * Caso 1 — trave appoggiata con momenti alle estremità: [C1, C2, C3] per
 * ciascuna coppia (ψ, k), prospetto F.1.1 della ENV 1993-1-1.
 */
const C_MOMENTI: Record<string, Record<string, [number, number, number]>> = {
  '1': { '1': [1, 0, 1], '0.7': [1, 0, 1.113], '0.5': [1, 0, 1.144] },
  '0.75': { '1': [1.141, 0, 0.998], '0.7': [1.27, 0, 1.565], '0.5': [1.305, 0, 2.283] },
  '0.5': { '1': [1.323, 0, 0.992], '0.7': [1.473, 0, 1.556], '0.5': [1.514, 0, 2.271] },
  '0.25': { '1': [1.563, 0, 0.977], '0.7': [1.739, 0, 1.531], '0.5': [1.788, 0, 2.235] },
  '0': { '1': [1.879, 0, 0.939], '0.7': [2.092, 0, 1.473], '0.5': [2.15, 0, 2.15] },
  '-0.25': { '1': [2.281, 0, 0.855], '0.7': [2.538, 0, 1.34], '0.5': [2.609, 0, 1.957] },
  '-0.5': { '1': [2.704, 0, 0.676], '0.7': [3.009, 0, 1.059], '0.5': [3.093, 0, 1.546] },
  '-0.75': { '1': [2.927, 0, 0.366], '0.7': [3.009, 0, 0.575], '0.5': [3.093, 0, 0.837] },
  '-1': { '1': [2.752, 0, 0], '0.7': [3.063, 0, 0], '0.5': [3.149, 0, 0] },
};

/** Casi 2-6 — carichi trasversali, prospetto F.1.2 della ENV 1993-1-1. */
const C_CARICHI: Record<string, Record<string, [number, number, number]>> = {
  '2': { '1': [1.132, 0.459, 0.525], '0.5': [0.972, 0.304, 0.98] },
  '3': { '1': [1.285, 1.562, 0.753], '0.5': [0.712, 0.652, 1.07] },
  '4': { '1': [1.365, 0.553, 1.73], '0.5': [1.07, 0.432, 3.05] },
  '5': { '1': [1.565, 1.267, 2.64], '0.5': [0.938, 0.715, 4.8] },
  '6': { '1': [1.046, 0.43, 1.12], '0.5': [1.01, 0.41, 1.89] },
};

/** La chiave numericamente più vicina al valore chiesto: la tabella è discreta. */
function chiavePiuVicina(tabella: Record<string, unknown>, valore: number): string {
  const chiavi = Object.keys(tabella);
  return chiavi.reduce((best, k) =>
    Math.abs(parseFloat(k) - valore) < Math.abs(parseFloat(best) - valore) ? k : best,
  );
}

export interface CoefficientiC {
  C1: number;
  C2: number;
  C3: number;
  /** Valori effettivamente usati: la tabella è a gradini, non continua. */
  kUsato: number;
  psiUsato: number;
}

/**
 * C1, C2 e C3 per la condizione di carico scelta. k e ψ sono tabellati per
 * punti: un valore intermedio viene ricondotto al più vicino, e il valore
 * usato torna indietro nel risultato perché si veda quale riga ha vinto.
 */
export function coefficientiC(caso: string, k: number, psi: number): CoefficientiC {
  if (caso === '1') {
    const kPsi = chiavePiuVicina(C_MOMENTI, psi);
    const riga = C_MOMENTI[kPsi];
    const kk = chiavePiuVicina(riga, k);
    const [C1, C2, C3] = riga[kk];
    return { C1, C2, C3, kUsato: parseFloat(kk), psiUsato: parseFloat(kPsi) };
  }
  const riga = C_CARICHI[caso] ?? C_CARICHI['2'];
  const kk = chiavePiuVicina(riga, k);
  const [C1, C2, C3] = riga[kk];
  return { C1, C2, C3, kUsato: parseFloat(kk), psiUsato: psi };
}

/**
 * Curva di instabilità per flessione — NTC2018 tab. 4.2.VI. I doppi T
 * laminati stanno su "a" o "b" secondo h/b; tutto il resto (U, angolari,
 * tubi) ricade fra le "altre sezioni", cioè la curva d.
 */
export function curvaLT(tipoProfilo: string, h: number, b: number): string {
  const laminatoDoppioT = tipoProfilo === 'IPE' || tipoProfilo === 'HEA' || tipoProfilo === 'HEB';
  if (!laminatoDoppioT) return 'd';
  return b > 0 && h / b > 2 ? 'b' : 'a';
}

/** Dove è applicato il carico rispetto al baricentro della sezione. */
export type PuntoCarico = 'superiore' | 'baricentro' | 'inferiore';

export interface InputInstabilitaLT {
  /** Lunghezza del tratto non trattenuto lateralmente (mm). */
  L: string;
  /** Coefficiente di lunghezza efficace per la rotazione attorno all'asse debole. */
  kz: string;
  /** Coefficiente di lunghezza efficace per l'ingobbamento. */
  kw: string;
  /** Condizione di carico e vincolo (1-6) del prospetto F.1. */
  carico: string;
  /** Rapporto fra i momenti di estremità (solo condizione 1). */
  psi: string;
  puntoCarico: PuntoCarico;
  gammaM1: string;
  /** Modulo resistente: plastico per le sezioni compatte, elastico altrimenti. */
  modulo: 'elastico' | 'plastico';
  /** Mcr calcolato dal prospetto F.1 o imposto a mano (da un'analisi a parte). */
  modoMcr: 'automatico' | 'manuale';
  /** Momento critico imposto a mano (kNm). */
  McrManuale: string;
}

export const INSTABILITA_LT_DEFAULT: InputInstabilitaLT = {
  L: '2000',
  kz: '1',
  kw: '1',
  carico: '2',
  psi: '1',
  puntoCarico: 'superiore',
  gammaM1: '1.05',
  modulo: 'elastico',
  modoMcr: 'automatico',
  McrManuale: '0',
};

export interface RisultatiInstabilitaLT {
  proprieta?: ProprietaProfilo;
  /**
   * Falso quando lo sbandamento laterale non è possibile (inerzia laterale
   * pari a quella nel piano di flessione: tubo quadro, tubo tondo).
   */
  richiesta: boolean;
  fyk: number;
  /** Inerzia laterale minima, inerzia torsionale e ingobbamento (mm⁴, mm⁴, mm⁶). */
  Iz: number;
  It: number;
  Iw: number;
  C1: number;
  C2: number;
  C3: number;
  kUsato: number;
  psiUsato: number;
  /** Distanza fra punto di applicazione del carico e centro di taglio (mm). */
  zg: number;
  /** Momento critico dal prospetto F.1 (kNm). */
  McrCalcolato: number;
  /** Momento critico effettivamente usato (kNm). */
  Mcr: number;
  /** Modulo resistente usato (mm³). */
  Wy: number;
  curva: string;
  alfaLT: number;
  beta: number;
  lambdaLT0: number;
  lambdaLT: number;
  phiLT: number;
  chiLT: number;
  /** Momento resistente all'instabilità (kNm). */
  MbRd: number;
  /** Momento resistente della sola sezione, senza instabilità (kNm). */
  McRd: number;
  esito: Esito;
}

/**
 * Verifica di instabilità flesso-torsionale (NTC2018 §4.2.4.1.3.2).
 *
 *   Mcr = C1 · π²EIz/(kL)² · [ √( (k/kw)²·Iw/Iz + (kL)²GIt/(π²EIz) + (C2·zg)² ) − C2·zg ]
 *   λLT = √(Wy·fyk / Mcr)
 *   ΦLT = 0.5·[ 1 + αLT·(λLT − λLT,0) + β·λLT² ]
 *   χLT = 1 / [ ΦLT + √(ΦLT² − β·λLT²) ]  ≤ 1  (e ≤ 1/λLT² per i doppi T)
 *   Mb,Rd = χLT · Wy · fyk / γM1
 *
 * zj vale zero: le sezioni del sagomario sono simmetriche rispetto all'asse
 * di flessione, e per U e angolari la dissimmetria residua sta nell'altro
 * piano. Il termine C3·zj del foglio resta quindi fuori.
 */
export function verificaInstabilitaLT(
  sez: InputAcciaioSezione,
  inp: InputInstabilitaLT,
): RisultatiInstabilitaLT {
  const proprieta = proprietaProfilo(sez.tipoProfilo, sez.profilo);
  const { fyk } = ACCIAIO_STRUTTURALE[sez.acciaio] ?? ACCIAIO_STRUTTURALE.S275;
  const gammaM1 = num(inp.gammaM1) || 1.05;
  const MEd = num(sez.MEd);

  const Ix = (proprieta?.Ix ?? 0) * 1e4; // mm⁴
  const Iz = (proprieta?.Imin ?? 0) * 1e4; // mm⁴
  const It = (proprieta?.It ?? 0) * 1e4; // mm⁴
  const Iw = (proprieta?.Iw ?? 0) * 1e6; // mm⁶
  const h = proprieta?.h ?? 0;

  const Wy = (inp.modulo === 'plastico' ? (proprieta?.Wplx ?? 0) : (proprieta?.Wx ?? 0)) * 1000; // mm³
  const McRd = (Wy * fyk) / gammaM1 / 1e6; // kNm

  const curva = curvaLT(sez.tipoProfilo, h, proprieta?.b ?? 0);
  const alfaLT = ALFA_CURVA[curva] ?? 0.76;
  // NTC2018 §4.2.4.1.3.2: i doppi T laminati hanno il ramo dedicato
  // (λLT,0 = 0.4, β = 0.75), tutte le altre sezioni il caso generale
  const laminatoDoppioT =
    sez.tipoProfilo === 'IPE' || sez.tipoProfilo === 'HEA' || sez.tipoProfilo === 'HEB';
  const beta = laminatoDoppioT ? 0.75 : 1;
  const lambdaLT0 = laminatoDoppioT ? 0.4 : 0.2;

  const L = num(inp.L);
  const kz = num(inp.kz) || 1;
  const kw = num(inp.kw) || 1;
  const { C1, C2, C3, kUsato, psiUsato } = coefficientiC(inp.carico, kz, num(inp.psi));
  // carico sull'ala superiore = destabilizzante (zg > 0), su quella inferiore
  // = stabilizzante; per le sezioni doppiamente simmetriche zs = 0
  const zg = inp.puntoCarico === 'baricentro' ? 0 : (h / 2) * (inp.puntoCarico === 'superiore' ? 1 : -1);

  const kL = kUsato * L;
  let McrCalcolato = 0;
  if (Iz > 0 && kL > 0) {
    const base = (Math.PI ** 2 * E_ACCIAIO * Iz) / kL ** 2;
    const radicando =
      (kUsato / kw) ** 2 * (Iw / Iz) +
      (kL ** 2 * G_ACCIAIO * It) / (Math.PI ** 2 * E_ACCIAIO * Iz) +
      (C2 * zg) ** 2;
    McrCalcolato = (C1 * base * (Math.sqrt(Math.max(radicando, 0)) - C2 * zg)) / 1e6; // kNm
  }

  // sezione con inerzia laterale pari a quella nel piano di flessione (tubo
  // quadro, tubo tondo): non c'è un asse debole verso cui sbandare
  const richiesta = Iz > 0 && Ix > Iz * (1 + 1e-9);

  const Mcr = inp.modoMcr === 'manuale' ? num(inp.McrManuale) : McrCalcolato;

  const lambdaLT = richiesta && Mcr > 0 ? Math.sqrt((Wy * fyk) / (Mcr * 1e6)) : 0;
  const phiLT = 0.5 * (1 + alfaLT * (lambdaLT - lambdaLT0) + beta * lambdaLT ** 2);
  const sotto = phiLT ** 2 - beta * lambdaLT ** 2;
  const chiGrezzo = sotto > 0 ? 1 / (phiLT + Math.sqrt(sotto)) : 1;
  // limite superiore: χLT ≤ 1 sempre, e ≤ 1/λLT² per il ramo dei doppi T
  const tetto = laminatoDoppioT && lambdaLT > 0 ? Math.min(1, 1 / lambdaLT ** 2) : 1;
  const chiLT = !richiesta || lambdaLT === 0 ? 1 : Math.min(chiGrezzo, tetto);

  const MbRd = chiLT * McRd;

  return {
    proprieta,
    richiesta,
    fyk,
    Iz,
    It,
    Iw,
    C1,
    C2,
    C3,
    kUsato,
    psiUsato,
    zg,
    McrCalcolato,
    Mcr,
    Wy,
    curva,
    alfaLT,
    beta,
    lambdaLT0,
    lambdaLT,
    phiLT,
    chiLT,
    MbRd,
    McRd,
    esito: esito(MEd, MbRd),
  };
}
