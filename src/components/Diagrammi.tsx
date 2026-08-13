import { useEffect, useRef, useState } from 'react';
import type { PuntoDiagramma, SchemaId } from '../calc/trave';
import { SCHEMI_BY_ID } from '../calc/trave';
import type { Orientamento } from '../calc/sollecitazioni';

/**
 * Diagrammi di sollecitazione disegnati in SVG (niente libreria di charting).
 *
 * Due scelte tengono in piedi tutto il resto:
 *
 *  1. il riquadro si misura (ResizeObserver) e il viewBox è costruito sulla
 *     dimensione reale in px, quindi il disegno è sempre in scala 1:1 e non si
 *     deforma mai — solo l'asse dei valori viene scalato;
 *  2. il disegno è espresso in coordinate (a, b) sull'asse dell'elemento:
 *     `a` corre lungo l'asta a partire dal nodo A, `b` è lo scostamento
 *     trasversale. L'orientamento verticale è una sola trasformazione di
 *     queste coordinate (rotazione di 90°), non una seconda variante di codice.
 *     I testi restano orizzontali perché sono posizionati, non ruotati.
 *
 * I colori vengono dai token: gli elementi portano una classe (dg-*) e app.css
 * la lega a var(--diagram-*).
 */

/* ─────────────────────────── misura del riquadro ─────────────────────────── */

function useMisura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setBox({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, box] as const;
}

/* ─────────────────────────── assi dell'elemento ─────────────────────────── */

interface Assi {
  /** Lunghezza in px del tratto che rappresenta l'elemento. */
  len: number;
  /** Spazio trasversale disponibile dal lato dei carichi (b negativo). */
  ampCarichi: number;
  /** Spazio trasversale disponibile dal lato delle etichette (b positivo). */
  ampEtichette: number;
  /** Da (a, b) al punto sullo schermo. */
  p: (a: number, b: number) => [number, number];
}

/**
 * @param fraz posizione dell'asse dell'elemento nello spazio trasversale
 *             (0 = tutto lo spazio ai carichi, 1 = tutto alle etichette).
 */
function assi(w: number, h: number, orient: Orientamento, padA: number, fraz: number): Assi {
  if (orient === 'verticale') {
    // rotazione di −90°: «lungo l'asse» va verso l'alto, «trasversale» a destra
    const asse = Math.round(fraz * w);
    return {
      len: Math.max(1, h - 2 * padA),
      ampCarichi: asse,
      ampEtichette: w - asse,
      p: (a, b) => [asse + b, h - padA - a],
    };
  }
  const asse = Math.round(fraz * h);
  return {
    len: Math.max(1, w - 2 * padA),
    ampCarichi: asse,
    ampEtichette: h - asse,
    p: (a, b) => [padA + a, asse + b],
  };
}

/** `M`/`L` di un path a partire da coordinate (a, b). */
const seg = (c: 'M' | 'L', ax: Assi, a: number, b: number) => {
  const [x, y] = ax.p(a, b);
  return `${c}${x.toFixed(2)},${y.toFixed(2)}`;
};

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/* ─────────────────────────── riquadro ─────────────────────────── */

function Riquadro({
  titolo,
  picco,
  disegna,
}: {
  titolo: string;
  picco: string;
  disegna: (w: number, h: number) => React.ReactNode;
}) {
  const [ref, box] = useMisura<HTMLDivElement>();

  return (
    <div className="diagram">
      <div className="diagram-head">
        <span className="t">{titolo}</span>
        <span className="peak">{picco}</span>
      </div>
      <div className="diagram-canvas" ref={ref}>
        {box.w > 0 && box.h > 0 && (
          <svg viewBox={`0 0 ${box.w} ${box.h}`} role="img" aria-label={`${titolo} — ${picco}`}>
            {disegna(box.w, box.h)}
          </svg>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── etichette quotate ─────────────────────────── */

/** Testo sempre orizzontale, tenuto dentro il riquadro. */
function Etichetta({
  x,
  y,
  w,
  h,
  children,
  accent = false,
  ancora = 'middle',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  children: React.ReactNode;
  accent?: boolean;
  ancora?: 'start' | 'middle' | 'end';
}) {
  const cx = Math.min(w - 4, Math.max(4, x));
  const cy = Math.min(h - 4, Math.max(11, y));
  return (
    <text
      x={cx}
      y={cy}
      className={`dg-testo${accent ? ' is-accent' : ''}`}
      textAnchor={ancora}
      dominantBaseline="middle"
    >
      {children}
    </text>
  );
}

/* ─────────────────────────── schema statico e carichi ────────────────────── */

export function DiagrammaCarichi({
  schema,
  L,
  q,
  qTri,
  P,
  aP,
  N,
  RA,
  RB,
  orientamento,
}: {
  schema: SchemaId;
  L: number;
  q: number;
  /** Rampa triangolare (kN/m) da x=0 a x=L, sovrapposta a q — es. spinta delle terre. */
  qTri?: { w0: number; w1: number };
  P: number;
  aP: number;
  /** Sforzo normale di progetto (kN), disegnato solo in verticale. */
  N: number;
  RA: number;
  RB: number;
  orientamento: Orientamento;
}) {
  const verticale = orientamento === 'verticale';

  const disegna = (w: number, h: number) => {
    const ax = assi(w, h, orientamento, verticale ? 40 : 44, 0.64);
    const { len } = ax;
    const hCar = Math.max(16, Math.min(42, ax.ampCarichi - 14));
    const bEtich = Math.min(ax.ampEtichette - 8, 26);

    const el: React.ReactNode[] = [];

    // ── carico distribuito: frecce verso l'asta (uniformi o a rampa) ──────
    const haTri = !!qTri && (Math.abs(qTri.w0) > 1e-9 || Math.abs(qTri.w1) > 1e-9);
    if (Math.abs(q) > 1e-9 || haTri) {
      const n = verticale ? 9 : 13;
      const wMax = Math.max(Math.abs(q + (qTri?.w0 ?? 0)), Math.abs(q + (qTri?.w1 ?? 0)), 1e-9);
      const altezza = (a: number) => {
        if (!haTri) return hCar;
        const t = len > 0 ? a / len : 0;
        const wi = q + qTri!.w0 + (qTri!.w1 - qTri!.w0) * t;
        return Math.max(6, (Math.abs(wi) / wMax) * hCar);
      };
      for (let i = 0; i < n; i++) {
        const a = (len * i) / (n - 1);
        const hi = altezza(a);
        el.push(
          <path
            key={`q${i}`}
            className="dg-carico"
            strokeWidth={1}
            d={
              seg('M', ax, a, -hi) +
              seg('L', ax, a, -4) +
              seg('M', ax, a - 3.5, -10) +
              seg('L', ax, a, -3) +
              seg('L', ax, a + 3.5, -10)
            }
          />,
        );
      }
      el.push(
        <path
          key="qline"
          className="dg-carico"
          strokeWidth={1}
          d={haTri ? seg('M', ax, 0, -altezza(0)) + seg('L', ax, len, -altezza(len)) : seg('M', ax, 0, -hCar) + seg('L', ax, len, -hCar)}
        />,
      );
    }

    // ── carico concentrato ───────────────────────────────────────────────
    if (Math.abs(P) > 1e-9) {
      const aP_ = L > 0 ? Math.min(1, Math.max(0, aP / L)) * len : 0;
      el.push(
        <path
          key="P"
          className="dg-carico"
          strokeWidth={1.6}
          d={
            seg('M', ax, aP_, -hCar - 14) +
            seg('L', ax, aP_, -4) +
            seg('M', ax, aP_ - 4.5, -12) +
            seg('L', ax, aP_, -3) +
            seg('L', ax, aP_ + 4.5, -12)
          }
        />,
      );
    }

    // ── sforzo normale in sommità (solo elemento verticale) ──────────────
    if (verticale && Math.abs(N) > 1e-9) {
      el.push(
        <path
          key="N"
          className="dg-carico"
          strokeWidth={1.8}
          d={
            seg('M', ax, len + 24, 0) +
            seg('L', ax, len + 5, 0) +
            seg('M', ax, len + 12, -4.5) +
            seg('L', ax, len + 4, 0) +
            seg('L', ax, len + 12, 4.5)
          }
        />,
      );
      // etichetta di fianco alla freccia, non sopra
      const [nx, ny] = ax.p(len + 15, -10);
      el.push(
        <Etichetta key="Nlab" x={nx} y={ny} w={w} h={h} accent ancora="end">
          N {fx(Math.abs(N), 1)} kN
        </Etichetta>,
      );
    }

    // ── asta ─────────────────────────────────────────────────────────────
    el.push(
      <path
        key="asta"
        className="dg-beam"
        strokeWidth={2.5}
        d={seg('M', ax, 0, 0) + seg('L', ax, len, 0)}
      />,
    );

    // ── vincoli ──────────────────────────────────────────────────────────
    const vinc = SCHEMI_BY_ID[schema].vincoli;
    const vincolo = (a: number, v: { v: boolean; r: boolean }, lato: 'A' | 'B') => {
      if (!v.v && !v.r) return null; // estremo libero
      const dir = lato === 'A' ? -1 : 1;

      if (v.v && v.r) {
        // incastro: piastra trasversale + tratteggio verso l'esterno
        let d = seg('M', ax, a, -14) + seg('L', ax, a, 14);
        for (const t of [-10, -5, 0, 5, 10]) {
          d += seg('M', ax, a, t) + seg('L', ax, a + dir * 7, t + 5);
        }
        return <path key={`v${lato}`} className="dg-vinc" strokeWidth={1.2} d={d} />;
      }

      if (v.v && !v.r) {
        // appoggio / cerniera
        const d =
          seg('M', ax, a, 0) +
          seg('L', ax, a - 9, 14) +
          seg('L', ax, a + 9, 14) +
          'Z' +
          seg('M', ax, a - 13, 16) +
          seg('L', ax, a + 13, 16);
        return <path key={`v${lato}`} className="dg-vinc" strokeWidth={1.4} d={d} />;
      }

      // doppio pendolo: blocca la rotazione, libera la traslazione
      const d =
        seg('M', ax, a - 8, -11) +
        seg('L', ax, a - 8, 11) +
        seg('M', ax, a + 3, -11) +
        seg('L', ax, a + 3, 11);
      const [c1x, c1y] = ax.p(a - 2.5, -6);
      const [c2x, c2y] = ax.p(a - 2.5, 6);
      return (
        <g key={`v${lato}`} className="dg-vinc" strokeWidth={1.4}>
          <path d={d} />
          <circle cx={c1x} cy={c1y} r={2.5} />
          <circle cx={c2x} cy={c2y} r={2.5} />
        </g>
      );
    };

    el.push(vincolo(0, vinc.A, 'A'), vincolo(len, vinc.B, 'B'));

    // ── quote: nodi, luce, reazioni ──────────────────────────────────────
    const [ax0, ay0] = ax.p(0, bEtich + 8);
    const [ax1, ay1] = ax.p(len, bEtich + 8);
    const [axm, aym] = ax.p(len / 2, bEtich + 8);

    el.push(
      <Etichetta key="A" x={ax0} y={ay0} w={w} h={h}>
        A
      </Etichetta>,
      <Etichetta key="B" x={ax1} y={ay1} w={w} h={h}>
        B
      </Etichetta>,
      <Etichetta key="L" x={axm} y={aym} w={w} h={h}>
        {verticale ? 'H' : 'L'} = {fx(L)} m
      </Etichetta>,
    );

    if (vinc.A.v && Math.abs(RA) > 1e-6) {
      const [rx, ry] = ax.p(0, bEtich + 22);
      el.push(
        <Etichetta key="RA" x={rx} y={ry} w={w} h={h} accent>
          RA {fx(RA, 1)} kN
        </Etichetta>,
      );
    }
    if (vinc.B.v && Math.abs(RB) > 1e-6) {
      const [rx, ry] = ax.p(len, bEtich + 22);
      el.push(
        <Etichetta key="RB" x={rx} y={ry} w={w} h={h} accent>
          RB {fx(RB, 1)} kN
        </Etichetta>,
      );
    }

    return el;
  };

  return (
    <Riquadro
      // in verticale i riquadri stanno in griglia e sono stretti: sigla, non etichetta estesa
      titolo={`Carichi — ${verticale ? SCHEMI_BY_ID[schema].short : SCHEMI_BY_ID[schema].label}`}
      picco={
        `q ${fx(q)} kN/m` +
        (Math.abs(P) > 1e-9 ? ` · P ${fx(P, 1)} kN` : '') +
        (verticale && Math.abs(N) > 1e-9 ? ` · N ${fx(N, 1)} kN` : '')
      }
      disegna={disegna}
    />
  );
}

/* ─────────────────────────── serie M, V, deformata ───────────────────────── */

export function DiagrammaSerie({
  titolo,
  punti,
  sel,
  L,
  unita,
  decimali = 1,
  giu = false,
  variante = 'accent',
  orientamento,
  quotaEstremi = false,
}: {
  titolo: string;
  punti: PuntoDiagramma[];
  sel: (p: PuntoDiagramma) => number;
  L: number;
  unita: string;
  decimali?: number;
  /** true = valori positivi verso il basso (convenzione dei momenti). */
  giu?: boolean;
  variante?: 'accent' | 'faint';
  orientamento: Orientamento;
  /** Quota anche i valori ai due estremi (utile per gli incastri). */
  quotaEstremi?: boolean;
}) {
  if (!punti.length) return null;

  const vals = punti.map(sel);
  const max = Math.max(...vals.map(Math.abs), 1e-9);
  const faint = variante === 'faint' ? ' is-faint' : '';

  // punto di picco: valore e ascissa
  let iPicco = 0;
  for (let i = 1; i < vals.length; i++) if (Math.abs(vals[i]) > Math.abs(vals[iPicco])) iPicco = i;

  const disegna = (w: number, h: number) => {
    const ax = assi(w, h, orientamento, orientamento === 'verticale' ? 24 : 40, 0.5);
    const { len } = ax;
    const amp = Math.max(6, Math.min(ax.ampCarichi, ax.ampEtichette) - 14);

    const a = (x: number) => (L > 0 ? (x / L) * len : 0);
    const b = (v: number) => (giu ? 1 : -1) * (v / max) * amp;

    const linea = punti.map((p, i) => seg(i ? 'L' : 'M', ax, a(p.x), b(sel(p)))).join('');
    const area =
      seg('M', ax, a(punti[0].x), 0) +
      punti.map((p) => seg('L', ax, a(p.x), b(sel(p)))).join('') +
      seg('L', ax, a(punti[punti.length - 1].x), 0) +
      'Z';

    const el: React.ReactNode[] = [
      <path
        key="asse"
        className="dg-axis"
        strokeWidth={1}
        d={seg('M', ax, 0, 0) + seg('L', ax, len, 0)}
      />,
      <path key="area" className={`dg-area${faint}`} d={area} />,
      <path key="linea" className={`dg-line${faint}`} strokeWidth={1.6} d={linea} />,
    ];

    // marcatore sul picco: valore e ascissa
    const pk = punti[iPicco];
    if (Math.abs(sel(pk)) > max * 1e-6) {
      const ap = a(pk.x);
      const bp = b(sel(pk));
      const [px, py] = ax.p(ap, bp);
      el.push(
        <circle key="pk" className={`dg-punto${faint}`} cx={px} cy={py} r={2.6} />,
        <path
          key="pkl"
          className="dg-axis"
          strokeWidth={1}
          strokeDasharray="2 3"
          d={seg('M', ax, ap, 0) + seg('L', ax, ap, bp)}
        />,
      );
      // etichetta spostata oltre il picco, dalla parte del diagramma
      const [lx, ly] = ax.p(ap, bp + Math.sign(bp || 1) * 11);
      el.push(
        <Etichetta
          key="pkt"
          x={lx}
          y={ly}
          w={w}
          h={h}
          accent={variante === 'accent'}
          ancora={ap > len * 0.8 ? 'end' : ap < len * 0.2 ? 'start' : 'middle'}
        >
          {fx(sel(pk), decimali)} {unita} · x {fx(pk.x)} m
        </Etichetta>,
      );
    }

    if (quotaEstremi) {
      for (const [chiave, p] of [
        ['e0', punti[0]],
        ['e1', punti[punti.length - 1]],
      ] as const) {
        const v = sel(p);
        if (Math.abs(v) < max * 0.02) continue;
        const ap = a(p.x);
        const [lx, ly] = ax.p(ap, b(v) + Math.sign(b(v) || 1) * 11);
        el.push(
          <Etichetta
            key={chiave}
            x={lx}
            y={ly}
            w={w}
            h={h}
            ancora={chiave === 'e0' ? 'start' : 'end'}
          >
            {fx(v, decimali)}
          </Etichetta>,
        );
      }
    }

    return el;
  };

  return (
    <Riquadro titolo={titolo} picco={`max ${max.toPrecision(3)} ${unita}`} disegna={disegna} />
  );
}
