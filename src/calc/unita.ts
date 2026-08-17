/**
 * Unità di misura della calcolatrice: lettura, algebra e **conversione**.
 *
 * Fa tre cose:
 *  - controlla che l'unità scritta a mano sia una di quelle in elenco (così
 *    «mq2» o «kn/m» non passano inosservate);
 *  - ricava da sola l'unità del risultato quando si moltiplicano o dividono
 *    grandezze con nome: `b*h` con b e h in m dà mq, `A*γC` con γC in kN/mc
 *    dà kN/m, e così via;
 *  - **converte i numeri** quando si cambia l'unità con cui si vuole leggere
 *    il risultato: una tensione di 0,8 MPa scritta in kg/cmq diventa 8,16 —
 *    è il numero che si aggiorna, non l'etichetta.
 *
 * Per riuscirci ogni unità porta due cose: la **forma** e la **scala**.
 *  - la forma (`dim`) è una mappa simbolo base → esponente, e i simboli base
 *    sono due soli, il metro e il newton: `kg/cmq` → `{N: 1, m: -2}`;
 *  - la scala (`fattore`) dice quante unità base vale: 1 kN = 1000 N, quindi
 *    kN ha fattore 1000; kg/cmq ne ha 98066,5.
 *
 * Due unità sono intercambiabili quando hanno la stessa forma: il valore si
 * porta da una all'altra col rapporto dei fattori. I valori delle grandezze
 * vivono quindi **sempre in unità base** (m, N e i loro prodotti) e l'unità
 * scritta serve solo a leggerli: è quello che fa SMath, ed è la ragione per
 * cui una formula scritta mescolando metri, millimetri e MPa torna comunque
 * il numero giusto.
 *
 * **Il kg è un kgf.** Nel predimensionamento il kg e la tonnellata sono
 * forze — kg/mc è un peso di volume, kg/cmq una tensione — e qui valgono
 * quello: 1 kg = 9,80665 N, così 2500 kg/mc fanno 24,5 kN/mc come sui
 * manuali. Per le masse questa scheda non serve.
 *
 * I simboli che non sono in tabella valgono per sé stessi con fattore 1, così
 * un'unità inventata (pz, cad, €) attraversa i conti senza rompere niente.
 */

/** Unità come prodotto di potenze di simboli base: `{N: 1, m: -2}` = kN/mq. */
export type Dim = Record<string, number>;

/** Un'unità di misura letta: la sua forma e la sua scala sulle unità base. */
export interface Unita {
  dim: Dim;
  /** Quante unità base vale una di queste: kN → 1000, cm → 0,01. */
  fattore: number;
}

/** Accelerazione di gravità: il kg dei tecnici è un kgf, non una massa. */
const G = 9.80665;

/** Elenco di partenza delle unità proposte; l'utente lo può cambiare. */
export const UNITA_DEFAULT: string[] = [
  // lunghezze, aree, volumi
  'm',
  'cm',
  'mm',
  'mq',
  'cmq',
  'mmq',
  'mc',
  'cmc',
  'ml',
  // momenti d'inerzia: si leggono in cm⁴ da sempre
  'cm^4',
  'mm^4',
  // forze
  'N',
  'daN',
  'kN',
  'kg',
  't',
  // carichi e pesi di volume
  'kN/m',
  'kN/mq',
  'kN/mc',
  'kg/m',
  'kg/mq',
  'kg/mc',
  'kg/ml',
  // momenti
  'kNm',
  'kNcm',
  'Nmm',
  // tensioni
  'MPa',
  'N/mmq',
  'kg/cmq',
  'kN/cmq',
  'kPa',
  'Pa',
  // il resto
  '°',
  '%',
  '€',
  '€/mq',
];

/**
 * Come si scompone un simbolo: forma e scala. Le chiavi sono in minuscolo —
 * la ricerca non distingue le maiuscole, così `kn`, `kN` e `KN` sono la stessa
 * cosa — mentre la forma usa i simboli base `m` ed `N`.
 */
const SIMBOLI: Record<string, Unita> = {
  // ── lunghezze ──
  km: { dim: { m: 1 }, fattore: 1000 },
  m: { dim: { m: 1 }, fattore: 1 },
  ml: { dim: { m: 1 }, fattore: 1 },
  dm: { dim: { m: 1 }, fattore: 0.1 },
  cm: { dim: { m: 1 }, fattore: 0.01 },
  mm: { dim: { m: 1 }, fattore: 0.001 },
  // ── aree ──
  mq: { dim: { m: 2 }, fattore: 1 },
  dmq: { dim: { m: 2 }, fattore: 1e-2 },
  cmq: { dim: { m: 2 }, fattore: 1e-4 },
  mmq: { dim: { m: 2 }, fattore: 1e-6 },
  // ── volumi ──
  mc: { dim: { m: 3 }, fattore: 1 },
  dmc: { dim: { m: 3 }, fattore: 1e-3 },
  cmc: { dim: { m: 3 }, fattore: 1e-6 },
  mmc: { dim: { m: 3 }, fattore: 1e-9 },
  // ── forze ──
  n: { dim: { N: 1 }, fattore: 1 },
  dan: { dim: { N: 1 }, fattore: 10 },
  kn: { dim: { N: 1 }, fattore: 1e3 },
  mn: { dim: { N: 1 }, fattore: 1e6 },
  kg: { dim: { N: 1 }, fattore: G },
  kgf: { dim: { N: 1 }, fattore: G },
  t: { dim: { N: 1 }, fattore: 1000 * G },
  tf: { dim: { N: 1 }, fattore: 1000 * G },
  // ── tensioni e pressioni ──
  pa: { dim: { N: 1, m: -2 }, fattore: 1 },
  hpa: { dim: { N: 1, m: -2 }, fattore: 1e2 },
  kpa: { dim: { N: 1, m: -2 }, fattore: 1e3 },
  mpa: { dim: { N: 1, m: -2 }, fattore: 1e6 },
  gpa: { dim: { N: 1, m: -2 }, fattore: 1e9 },
  bar: { dim: { N: 1, m: -2 }, fattore: 1e5 },
  // ── momenti: scritti tutti attaccati, come si scrivono ──
  nm: { dim: { N: 1, m: 1 }, fattore: 1 },
  nmm: { dim: { N: 1, m: 1 }, fattore: 1e-3 },
  ncm: { dim: { N: 1, m: 1 }, fattore: 1e-2 },
  knm: { dim: { N: 1, m: 1 }, fattore: 1e3 },
  kncm: { dim: { N: 1, m: 1 }, fattore: 10 },
  knmm: { dim: { N: 1, m: 1 }, fattore: 1 },
};

/**
 * Unità con cui si preferisce leggere una certa forma quando non è stata
 * scelta a mano: una forza si legge in kN, un carico in kN/mq, una lunghezza
 * in metri. Serve a tenere ferma l'unità automatica mentre i numeri cambiano,
 * invece di farla saltare fra multipli a ogni cifra digitata.
 */
const PREFERITE: string[] = [
  'm',
  'mq',
  'mc',
  'kN',
  'kN/m',
  'kN/mq',
  'kN/mc',
  'kNm',
  'MPa',
  'cm^4',
  'mm',
  'cm',
  'cmq',
  'mmq',
  '°',
  '%',
  '€',
];

/**
 * Quando il numero letto nell'unità preferita è fuori da questa finestra si
 * cerca un multiplo più leggibile: 0,000113 mq diventano 113 mmq, 90000 N
 * diventano 90 kN. Dentro la finestra non si cambia niente.
 */
const MIN_LEGGIBILE = 1e-3;
const MAX_LEGGIBILE = 1e5;
/**
 * Ordine di grandezza a cui avvicinarsi quando si cerca il multiplo: le
 * centinaia, che è come si scrivono le cose a mano — 804 mmq, non 0,000804 mq.
 */
const BERSAGLIO = 2;

/** Simboli che restano tali e quali (si distinguono maiuscole e minuscole). */
const CASE_SENSIBILE = new Set(['N', 'kN', 'MPa', 'Pa', 'kPa', 't', 'T', 'kg', 'g']);

/** Simbolo scritto come lo si scrive di solito: `kn` → `kN`, `mpa` → `MPa`. */
function canonico(simbolo: string): string {
  const trovato = [...CASE_SENSIBILE].find((s) => s.toLowerCase() === simbolo.toLowerCase());
  return trovato ?? simbolo;
}

const APICI: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁻': '-' };

/** Moltiplica due unità sommando gli esponenti, togliendo gli zeri. */
export function mulDim(a: Dim, b: Dim): Dim {
  const out: Dim = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const n = (out[k] ?? 0) + v;
    if (Math.abs(n) < 1e-9) delete out[k];
    else out[k] = n;
  }
  return out;
}

export function divDim(a: Dim, b: Dim): Dim {
  return mulDim(a, invDim(b));
}

export function invDim(a: Dim): Dim {
  const out: Dim = {};
  for (const [k, v] of Object.entries(a)) out[k] = -v;
  return out;
}

/** Eleva un'unità a potenza: `mq^0.5` → m, `m^3` → mc. */
export function powDim(a: Dim, n: number): Dim {
  const out: Dim = {};
  for (const [k, v] of Object.entries(a)) {
    const e = v * n;
    if (Math.abs(e) > 1e-9) out[k] = Math.abs(e - Math.round(e)) < 1e-9 ? Math.round(e) : e;
  }
  return out;
}

export const adimensionale = (d: Dim): boolean => Object.keys(d).length === 0;

export function ugualiDim(a: Dim, b: Dim): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) < 1e-9);
}

/**
 * Legge un'unità scritta: `kg/mc`, `kN·m`, `m^3`, `mm²`, `€/mq`, e ne torna
 * forma e scala. La barra vale per il solo fattore che segue (`kN/m·m` = kN,
 * non kN/m²). Un'unità che non si riesce a leggere torna adimensionale.
 */
export function leggiUnita(testo: string): Unita {
  const src = testo.trim();
  if (!src) return { dim: {}, fattore: 1 };

  let dim: Dim = {};
  let fattore = 1;
  let segno = 1;
  let i = 0;

  while (i < src.length) {
    const c = src[i];
    if (c === ' ') {
      i += 1;
      continue;
    }
    if (c === '/' || c === ':') {
      segno = -1;
      i += 1;
      continue;
    }
    if (c === '*' || c === '·' || c === '×' || c === '.') {
      segno = 1;
      i += 1;
      continue;
    }

    // nome del simbolo: lettere e simboli di valuta o gradi
    let j = i;
    while (j < src.length && /[\p{L}°%€$_]/u.test(src[j])) j += 1;
    if (j === i) return { dim: {}, fattore: 1 }; // carattere inatteso
    const nome = src.slice(i, j);
    i = j;

    // esponente: ^2, ² o ³
    let esp = 1;
    if (src[i] === '^') {
      i += 1;
      let k = i;
      if (src[k] === '-' || src[k] === '−') k += 1;
      while (k < src.length && /[0-9.]/.test(src[k])) k += 1;
      const n = Number(src.slice(i, k).replace('−', '-'));
      if (!Number.isFinite(n)) return { dim: {}, fattore: 1 };
      esp = n;
      i = k;
    } else if (src[i] && APICI[src[i]]) {
      let s = '';
      while (src[i] && APICI[src[i]]) {
        s += APICI[src[i]];
        i += 1;
      }
      const n = Number(s);
      if (!Number.isFinite(n)) return { dim: {}, fattore: 1 };
      esp = n;
    }

    const base = SIMBOLI[nome.toLowerCase()] ?? { dim: { [canonico(nome)]: 1 }, fattore: 1 };
    const e = esp * segno;
    dim = mulDim(dim, powDim(base.dim, e));
    fattore *= base.fattore ** e;
    segno = 1;
  }

  return { dim, fattore };
}

/** Solo la forma di un'unità scritta: `kg/cmq` → `{N: 1, m: -2}`. */
export function dimUnita(testo: string): Dim {
  return leggiUnita(testo).dim;
}

/** Scala di un'unità scritta: quante unità base vale. */
export function fattoreUnita(testo: string): number {
  return leggiUnita(testo).fattore;
}

/* ─────────────────────────── conversione ─────────────────────────── */

/** Da un numero scritto in `um` al suo valore in unità base. */
export function inBase(valore: number, um: string): number {
  return valore * leggiUnita(um).fattore;
}

/** Da un valore in unità base al numero da leggere in `um`. */
export function daBase(valore: number, um: string): number {
  return valore / leggiUnita(um).fattore;
}

/** true se due unità hanno la stessa forma: allora il numero si converte. */
export function convertibile(da: string, a: string): boolean {
  return ugualiDim(dimUnita(da), dimUnita(a));
}

/**
 * Converte un numero fra due unità della stessa forma; `null` se le forme non
 * coincidono — un momento non si legge in metri, e inventare un numero
 * sarebbe peggio che dirlo.
 */
export function converti(valore: number, da: string, a: string): number | null {
  const u = leggiUnita(da);
  const v = leggiUnita(a);
  if (!ugualiDim(u.dim, v.dim)) return null;
  return (valore * u.fattore) / v.fattore;
}

/** Le unità dell'elenco che hanno la forma data: sono le sole intercambiabili. */
export function unitaCompatibili(dim: Dim, elenco: string[] = UNITA_DEFAULT): string[] {
  return elenco.filter((u) => ugualiDim(dimUnita(u), dim));
}

/* ─────────────────────────── scrittura ─────────────────────────── */

/** Simbolo di lunghezza col nome corto: m² → mq, cm³ → cmc. */
const CORTO: Record<string, [string, string]> = {
  m: ['mq', 'mc'],
  cm: ['cmq', 'cmc'],
  mm: ['mmq', 'mmc'],
};

function scrivi(simbolo: string, esponente: number): string {
  const e = Math.abs(esponente);
  if (e === 1) return simbolo;
  const corto = CORTO[simbolo];
  if (corto && (e === 2 || e === 3)) return corto[e - 2];
  return `${simbolo}^${e}`;
}

/** Unità composta dai simboli base: `a·b/c`. Ha sempre fattore 1. */
export function componiUnita(dim: Dim): string {
  if (adimensionale(dim)) return '';
  const voci = Object.entries(dim).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const sopra = voci.filter(([, e]) => e > 0).map(([s, e]) => scrivi(s, e));
  const sotto = voci.filter(([, e]) => e < 0).map(([s, e]) => scrivi(s, e));
  const testa = sopra.length ? sopra.join('·') : '1';
  return sotto.length ? `${testa}/${sotto.join('·')}` : testa;
}

/**
 * Unità con cui leggere un risultato quando non la si è scelta a mano.
 *
 * Si parte dalla preferita per quella forma — una forza in kN, un carico in
 * kN/mq — e la si tiene finché il numero resta leggibile; se viene un numero
 * assurdo (0,000113 mq per l'area di un tondino) si cerca fra i multipli
 * dello stesso elenco quello che dà l'ordine di grandezza più comodo. Senza
 * un valore da leggere si resta sulla preferita, così l'unità non salta.
 */
export function scriviUnita(dim: Dim, elenco: string[] = UNITA_DEFAULT, valore?: number): string {
  if (adimensionale(dim)) return '';

  const candidate = unitaCompatibili(dim, elenco);
  if (!candidate.length) return componiUnita(dim);

  const preferita = PREFERITE.find((u) => candidate.includes(u)) ?? candidate[0];
  if (valore === undefined || !Number.isFinite(valore) || valore === 0) return preferita;

  const letto = Math.abs(daBase(valore, preferita));
  if (letto >= MIN_LEGGIBILE && letto < MAX_LEGGIBILE) return preferita;

  // fuori scala: si prende il multiplo che avvicina di più l'ordine di
  // grandezza «bello», a pari punteggio quello che viene prima in elenco
  let scelta = preferita;
  let migliore = Infinity;
  for (const u of candidate) {
    const v = Math.abs(daBase(valore, u));
    if (!Number.isFinite(v) || v === 0) continue;
    const punteggio = Math.abs(Math.log10(v) - BERSAGLIO);
    if (punteggio < migliore - 1e-9) {
      migliore = punteggio;
      scelta = u;
    }
  }
  return scelta;
}

/** true se l'unità scritta è una di quelle in elenco (a meno di come è scritta). */
export function unitaInElenco(um: string, elenco: string[]): boolean {
  const u = um.trim();
  if (!u) return true; // vuota = «la calcolo io»
  if (elenco.some((x) => x.trim().toLowerCase() === u.toLowerCase())) return true;
  const dim = dimUnita(u);
  if (adimensionale(dim)) return false;
  // stessa forma **e** stessa scala: kg/cmq e MPa hanno la stessa forma ma
  // non sono la stessa unità, e scriverne una non in elenco va segnalato
  const f = fattoreUnita(u);
  return elenco.some((x) => {
    const y = leggiUnita(x);
    return ugualiDim(y.dim, dim) && Math.abs(y.fattore - f) < 1e-9 * Math.max(1, f);
  });
}

/** Elenco ripulito: niente doppioni, niente vuoti, nell'ordine dato. */
export function normalizzaElenco(elenco: string[]): string[] {
  const visti = new Set<string>();
  const out: string[] = [];
  for (const u of elenco) {
    const s = u.trim();
    if (!s || visti.has(s.toLowerCase())) continue;
    visti.add(s.toLowerCase());
    out.push(s);
  }
  return out;
}
