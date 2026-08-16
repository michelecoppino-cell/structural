/**
 * Unità di misura della calcolatrice: lettura, confronto e algebra.
 *
 * Serve a due cose:
 *  - controllare che l'unità scritta a mano sia una di quelle in elenco (così
 *    «mq2» o «kn/m» non passano inosservate);
 *  - ricavare da sola l'unità del risultato quando si moltiplicano o dividono
 *    operazioni con nome: `b*h` con b e h in m dà mq, `area*gCLS` con gCLS in
 *    kN/mc dà kN/m, e così via.
 *
 * Non si convertono i valori: le unità sono **simboliche**. `cm*cm` fa cmq,
 * non 0.0001 mq — chi scrive i numeri sa in che unità li sta scrivendo, e una
 * conversione silenziosa dei valori sarebbe peggio di nessuna conversione.
 *
 * Un'unità è tenuta come mappa simbolo → esponente: `kg/mc` → `{kg: 1, m: -3}`.
 * I simboli che non sono nella tabella delle equivalenze valgono per sé stessi,
 * così un'unità inventata (pz, cad, €) attraversa i conti senza rompere niente.
 */

/** Unità come prodotto di potenze di simboli base: `{kN: 1, m: -2}` = kN/mq. */
export type Dim = Record<string, number>;

/** Elenco di partenza delle unità proposte; l'utente lo può cambiare. */
export const UNITA_DEFAULT: string[] = [
  'm',
  'mq',
  'mc',
  'ml',
  'cm',
  'cmq',
  'mm',
  'mmq',
  'kg',
  'kg/m',
  'kg/mq',
  'kg/mc',
  'kg/ml',
  't',
  'N',
  'kN',
  'kN/m',
  'kN/mq',
  'kN/mc',
  'kN/cmq',
  'kNm',
  'MPa',
  'N/mmq',
  '°',
  '%',
  '€',
  '€/mq',
];

/**
 * Come si scompone un simbolo: solo forma, mai scala. `mq` è m², `MPa` è
 * N/mmq, `ml` (metro lineare) è un metro come gli altri.
 */
const EQUIVALENZE: Record<string, Dim> = {
  m: { m: 1 },
  ml: { m: 1 },
  mq: { m: 2 },
  mc: { m: 3 },
  cm: { cm: 1 },
  cmq: { cm: 2 },
  cmc: { cm: 3 },
  mm: { mm: 1 },
  mmq: { mm: 2 },
  mmc: { mm: 3 },
  mpa: { N: 1, mm: -2 },
  pa: { N: 1, m: -2 },
  kpa: { kN: 1, m: -2 },
  kn: { kN: 1 },
  knm: { kN: 1, m: 1 },
  nm: { N: 1, m: 1 },
};

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
 * Legge un'unità scritta: `kg/mc`, `kN·m`, `m^3`, `mm²`, `€/mq`.
 * La barra vale per il solo fattore che segue (`kN/m·m` = kN, non kN/m²).
 */
export function leggiUnita(testo: string): Dim {
  const src = testo.trim();
  if (!src) return {};

  let dim: Dim = {};
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
    if (j === i) return {}; // carattere inatteso: unità non interpretabile
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
      if (!Number.isFinite(n)) return {};
      esp = n;
      i = k;
    } else if (src[i] && APICI[src[i]]) {
      let s = '';
      while (src[i] && APICI[src[i]]) {
        s += APICI[src[i]];
        i += 1;
      }
      const n = Number(s);
      if (!Number.isFinite(n)) return {};
      esp = n;
    }

    const base = EQUIVALENZE[nome.toLowerCase()] ?? { [canonico(nome)]: 1 };
    dim = mulDim(dim, powDim(base, esp * segno));
    segno = 1;
  }

  return dim;
}

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

/**
 * Scrive un'unità nel modo più riconoscibile: se una di quelle in elenco ha la
 * stessa forma si usa quella (così N/mmq esce come MPa se MPa è in elenco),
 * altrimenti si compone `a·b/c`.
 */
export function scriviUnita(dim: Dim, elenco: string[] = UNITA_DEFAULT): string {
  if (adimensionale(dim)) return '';

  const inElenco = elenco.find((u) => ugualiDim(leggiUnita(u), dim));
  if (inElenco) return inElenco;

  const voci = Object.entries(dim).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const sopra = voci.filter(([, e]) => e > 0).map(([s, e]) => scrivi(s, e));
  const sotto = voci.filter(([, e]) => e < 0).map(([s, e]) => scrivi(s, e));
  const testa = sopra.length ? sopra.join('·') : '1';
  return sotto.length ? `${testa}/${sotto.join('·')}` : testa;
}

/** true se l'unità scritta è una di quelle in elenco (a meno di come è scritta). */
export function unitaInElenco(um: string, elenco: string[]): boolean {
  const u = um.trim();
  if (!u) return true; // vuota = «la calcolo io»
  if (elenco.some((x) => x.trim().toLowerCase() === u.toLowerCase())) return true;
  const dim = leggiUnita(u);
  return !adimensionale(dim) && elenco.some((x) => ugualiDim(leggiUnita(x), dim));
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
