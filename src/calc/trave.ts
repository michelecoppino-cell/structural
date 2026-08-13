/**
 * Solutore di trave a campata unica (Eulero–Bernoulli, EJ costante).
 *
 * Invece di codificare a mano le formule chiuse di ogni schema statico
 * (tabella "Soluzioni di travi elementari variamente caricate"), la trave è
 * risolta con elementi finiti a 2 nodi: aggiungere uno schema significa
 * aggiungere una riga di vincoli, non un nuovo set di formule. Gli spostamenti
 * nodali di questo elemento sono esatti per carichi uniformi e concentrati,
 * quindi i diagrammi coincidono con le soluzioni in forma chiusa (verificato
 * in trave.test.ts contro il PDF degli schemi statici).
 *
 * Convenzioni:
 *  - x da 0 (nodo A) a L (nodo B), in metri;
 *  - carichi positivi verso il basso (kN/m, kN);
 *  - freccia f positiva verso il basso (m);
 *  - taglio V = somma delle forze verticali a sinistra della sezione (kN);
 *  - momento M positivo se tende le fibre inferiori (kNm).
 */

export type SchemaId =
  | 'appoggio-appoggio'
  | 'mensola'
  | 'incastro-incastro'
  | 'incastro-cerniera'
  | 'incastro-pendolo';

export interface SchemaStatico {
  id: SchemaId;
  label: string;
  short: string;
  /** Vincoli al nodo A e al nodo B: v = traslazione, r = rotazione. */
  vincoli: { A: { v: boolean; r: boolean }; B: { v: boolean; r: boolean } };
  note: string;
}

export const SCHEMI: SchemaStatico[] = [
  {
    id: 'appoggio-appoggio',
    label: 'Appoggio — appoggio',
    short: 'App–App',
    vincoli: { A: { v: true, r: false }, B: { v: true, r: false } },
    note: 'Trave semplicemente appoggiata, isostatica.',
  },
  {
    id: 'mensola',
    label: 'Incastro (mensola)',
    short: 'Mensola',
    vincoli: { A: { v: true, r: true }, B: { v: false, r: false } },
    note: 'Incastro in A, estremo B libero. Isostatica.',
  },
  {
    id: 'incastro-incastro',
    label: 'Doppio incastro',
    short: 'Inc–Inc',
    vincoli: { A: { v: true, r: true }, B: { v: true, r: true } },
    note: 'Trave con doppio incastro — PDF schemi statici, tav. 1.',
  },
  {
    id: 'incastro-cerniera',
    label: 'Incastro — cerniera',
    short: 'Inc–Cer',
    vincoli: { A: { v: true, r: true }, B: { v: true, r: false } },
    note: 'Trave con incastro e cerniera — PDF schemi statici, tav. 1.',
  },
  {
    id: 'incastro-pendolo',
    label: 'Incastro — doppio pendolo',
    short: 'Inc–Pend',
    vincoli: { A: { v: true, r: true }, B: { v: false, r: true } },
    note: 'Trave con incastro e doppio pendolo — PDF schemi statici, tav. 2.',
  },
];

export const SCHEMI_BY_ID = Object.fromEntries(SCHEMI.map((s) => [s.id, s])) as Record<
  SchemaId,
  SchemaStatico
>;

export interface CaricoConcentrato {
  /** Intensità in kN, positiva verso il basso. */
  P: number;
  /** Ascissa di applicazione in m. */
  a: number;
}

export interface InputTrave {
  schema: SchemaId;
  /** Luce in m. */
  L: number;
  /** Carico uniformemente distribuito in kN/m. */
  q: number;
  /** Carichi concentrati. */
  P?: CaricoConcentrato[];
  /**
   * Carico linearmente variabile (kN/m) sovrapposto a q, da x=0 (w0) a x=L
   * (w1) — usato per l'andamento triangolare della spinta delle terre.
   */
  wTri?: { w0: number; w1: number };
  /** Rigidezza flessionale EJ in kNm². */
  EJ: number;
  /** Numero di punti di campionamento dei diagrammi. */
  n?: number;
}

export interface PuntoDiagramma {
  x: number;
  V: number;
  M: number;
  v: number;
}

export interface RisultatoTrave {
  punti: PuntoDiagramma[];
  /** Reazioni verticali verso l'alto (kN) e momenti di incastro (kNm). */
  reazioni: { A: { R: number; M: number }; B: { R: number; M: number } };
  Mmax: number;
  Mmin: number;
  MmaxAbs: { val: number; x: number };
  VmaxAbs: { val: number; x: number };
  fmax: { val: number; x: number };
  /** Rapporto luce/freccia (L/f); Infinity se la freccia è nulla. */
  Lsuf: number;
  labile: boolean;
}

/** Risolve K·u = f con eliminazione di Gauss e pivoting parziale. */
function solve(K: number[][], f: number[]): number[] | null {
  const n = f.length;
  const A = K.map((row, i) => [...row, f[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    }
    if (Math.abs(A[piv][col]) < 1e-12) return null; // struttura labile
    [A[col], A[piv]] = [A[piv], A[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = A[r][col] / A[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) A[r][c] -= factor * A[col][c];
    }
  }
  return A.map((row, i) => row[n] / A[i][i]);
}

export function risolviTrave(inp: InputTrave): RisultatoTrave {
  const L = inp.L > 0 ? inp.L : 1;
  const EJ = inp.EJ > 0 ? inp.EJ : 1;
  const q = inp.q || 0;
  const carichi = (inp.P ?? []).filter((c) => c.P !== 0 && c.a >= 0 && c.a <= L);
  const nSample = Math.max(20, inp.n ?? 200);

  // carico distribuito totale in x: uniforme q + rampa lineare wTri (0 se assente)
  const w0Tri = inp.wTri?.w0 ?? 0;
  const w1Tri = inp.wTri?.w1 ?? 0;
  const wCost = q + w0Tri; // intensità a x = 0
  const wSlope = w1Tri - w0Tri; // variazione lineare su tutta la luce
  const wAt = (x: number) => wCost + (wSlope * x) / L;

  // ── nodi: mesh grossolana + ascisse dei carichi concentrati ───────────────
  // L'elemento di trave è esatto ai nodi per carichi uniformi e concentrati:
  // bastano pochi elementi, e una mesh fitta peggiorerebbe solo il
  // condizionamento del sistema. I diagrammi sono poi campionati a parte.
  const nEl = 16;
  const xs = new Set<number>();
  for (let i = 0; i <= nEl; i++) xs.add((i * L) / nEl);
  for (const c of carichi) xs.add(c.a);
  const nodi = [...xs].sort((a, b) => a - b);
  const nn = nodi.length;
  const ndof = 2 * nn;

  const K: number[][] = Array.from({ length: ndof }, () => new Array(ndof).fill(0));
  const F = new Array(ndof).fill(0);

  for (let e = 0; e < nn - 1; e++) {
    const le = nodi[e + 1] - nodi[e];
    if (le <= 0) continue;
    const c = EJ / (le * le * le);
    const ke = [
      [12 * c, 6 * le * c, -12 * c, 6 * le * c],
      [6 * le * c, 4 * le * le * c, -6 * le * c, 2 * le * le * c],
      [-12 * c, -6 * le * c, 12 * c, -6 * le * c],
      [6 * le * c, 2 * le * le * c, -6 * le * c, 4 * le * le * c],
    ];
    const map = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
    // carico distribuito, uniforme + rampa: vettore dei carichi nodali
    // equivalenti per un carico linearmente variabile wa → wb sull'elemento
    // (si riduce alle formule note qle/2, qle²/12 quando wa = wb).
    const wa = wAt(nodi[e]);
    const wb = wAt(nodi[e + 1]);
    const fe = [
      (le / 20) * (7 * wa + 3 * wb),
      (le * le) / 60 * (3 * wa + 2 * wb),
      (le / 20) * (3 * wa + 7 * wb),
      -((le * le) / 60) * (2 * wa + 3 * wb),
    ];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) K[map[i]][map[j]] += ke[i][j];
      F[map[i]] += fe[i];
    }
  }

  // carichi concentrati: applicati direttamente sul nodo corrispondente
  for (const c of carichi) {
    const idx = nodi.findIndex((x) => Math.abs(x - c.a) < 1e-9);
    if (idx >= 0) F[2 * idx] += c.P;
  }

  // ── vincoli ───────────────────────────────────────────────────────────────
  const vinc = SCHEMI_BY_ID[inp.schema].vincoli;
  const bloccati = new Set<number>();
  if (vinc.A.v) bloccati.add(0);
  if (vinc.A.r) bloccati.add(1);
  if (vinc.B.v) bloccati.add(ndof - 2);
  if (vinc.B.r) bloccati.add(ndof - 1);

  const liberi = Array.from({ length: ndof }, (_, i) => i).filter((i) => !bloccati.has(i));
  const Kr = liberi.map((i) => liberi.map((j) => K[i][j]));
  const Fr = liberi.map((i) => F[i]);
  const ur = solve(Kr, Fr);

  const u = new Array(ndof).fill(0);
  const labile = ur === null;
  if (ur) liberi.forEach((dof, k) => (u[dof] = ur[k]));

  // ── reazioni vincolari ────────────────────────────────────────────────────
  const reaz = (dof: number) => {
    let s = 0;
    for (let j = 0; j < ndof; j++) s += K[dof][j] * u[j];
    return s - F[dof];
  };
  // R positiva verso l'alto; M positivo se tende le fibre inferiori
  const RA = vinc.A.v ? -reaz(0) : 0;
  const RB = vinc.B.v ? -reaz(ndof - 2) : 0;
  const MA = vinc.A.r ? reaz(1) : 0;
  const MB = vinc.B.r ? -reaz(ndof - 1) : 0;

  // ── campionamento dei diagrammi ───────────────────────────────────────────
  // V ed M per equilibrio della parte a sinistra della sezione (esatti);
  // la freccia per interpolazione di Hermite sui valori nodali, con il
  // termine particolare di trave incastrata alle estremità per il carico
  // uniforme — anch'essa esatta.
  const ascisse = new Set<number>();
  for (let i = 0; i <= nSample; i++) ascisse.add((i * L) / nSample);
  for (const x of nodi) ascisse.add(x);
  for (const c of carichi) {
    ascisse.add(Math.max(0, c.a - 1e-6));
    ascisse.add(Math.min(L, c.a + 1e-6));
  }

  const freccia = (x: number) => {
    let e = 0;
    while (e < nn - 2 && nodi[e + 1] < x) e++;
    const le = nodi[e + 1] - nodi[e];
    if (le <= 0) return u[2 * e];
    const s = Math.min(1, Math.max(0, (x - nodi[e]) / le));
    const [v1, t1, v2, t2] = [u[2 * e], u[2 * e + 1], u[2 * e + 2], u[2 * e + 3]];
    const N1 = 1 - 3 * s * s + 2 * s ** 3;
    const N2 = le * (s - 2 * s * s + s ** 3);
    const N3 = 3 * s * s - 2 * s ** 3;
    const N4 = le * (-s * s + s ** 3);
    // correzione "trave incastrata alle estremità" per il carico distribuito
    // sull'elemento: esatta per carico uniforme, approssimata sulla media
    // dell'elemento quando il carico varia linearmente (rampa delle terre).
    const wMed = (wAt(nodi[e]) + wAt(nodi[e + 1])) / 2;
    const part = ((wMed * le ** 4) / (24 * EJ)) * s * s * (1 - s) ** 2;
    return N1 * v1 + N2 * t1 + N3 * v2 + N4 * t2 + part;
  };

  const punti: PuntoDiagramma[] = [...ascisse]
    .sort((a, b) => a - b)
    .map((x) => {
      let V = RA - (wCost * x + (wSlope * x * x) / (2 * L));
      let M = MA + RA * x - ((wCost * x * x) / 2 + (wSlope * x ** 3) / (6 * L));
      for (const c of carichi) {
        if (c.a < x - 1e-9) {
          V -= c.P;
          M -= c.P * (x - c.a);
        }
      }
      return { x, V, M, v: freccia(x) };
    });

  const peak = (sel: (p: PuntoDiagramma) => number) =>
    punti.reduce(
      (acc, p) => (Math.abs(sel(p)) > Math.abs(acc.val) ? { val: sel(p), x: p.x } : acc),
      { val: 0, x: 0 },
    );

  const Ms = punti.map((p) => p.M);
  const fmax = peak((p) => p.v);

  return {
    punti,
    reazioni: { A: { R: RA, M: MA }, B: { R: RB, M: MB } },
    Mmax: Math.max(...Ms),
    Mmin: Math.min(...Ms),
    MmaxAbs: peak((p) => p.M),
    VmaxAbs: peak((p) => p.V),
    fmax,
    Lsuf: Math.abs(fmax.val) > 1e-12 ? L / Math.abs(fmax.val) : Infinity,
    labile,
  };
}
