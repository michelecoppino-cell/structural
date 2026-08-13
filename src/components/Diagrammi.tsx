import type { PuntoDiagramma, SchemaId } from '../calc/trave';
import { SCHEMI_BY_ID } from '../calc/trave';
import type { Orientamento } from '../calc/sollecitazioni';

/**
 * Diagrammi di sollecitazione disegnati in SVG (niente libreria di charting).
 * In orizzontale i riquadri sono impilati con i carichi in alto; in verticale
 * sono affiancati con i carichi a sinistra, secondo l'orientamento scelto.
 */

const ACC = '#c9932e';
const FAINT = '#75798c';
const AXIS = 'rgba(233,233,237,.35)';

// viewBox proporzionato al riquadro reale (900 × 120 px): con
// preserveAspectRatio="none" il disegno riempie la larghezza senza
// deformare in modo percettibile vincoli e frecce.
const W = 900;
const H = 120;
const PAD_X = 40;
const PAD_Y = 18;

interface Serie {
  punti: PuntoDiagramma[];
  sel: (p: PuntoDiagramma) => number;
}

function scala(punti: PuntoDiagramma[], sel: (p: PuntoDiagramma) => number) {
  const vals = punti.map(sel);
  const max = Math.max(...vals.map(Math.abs), 1e-9);
  return { max, vals };
}

function pathArea(
  { punti, sel }: Serie,
  L: number,
  h: number,
  /** true = valori positivi disegnati verso il basso (convenzione dei momenti). */
  giu: boolean,
) {
  const { max } = scala(punti, sel);
  const x = (v: number) => PAD_X + (L > 0 ? (v / L) * (W - 2 * PAD_X) : 0);
  const y0 = h / 2;
  const amp = h / 2 - PAD_Y;
  const y = (v: number) => y0 + (giu ? 1 : -1) * (v / max) * amp;

  const linea = punti.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(2)},${y(sel(p)).toFixed(2)}`);
  const area = [
    `M${x(punti[0]?.x ?? 0).toFixed(2)},${y0}`,
    ...punti.map((p) => `L${x(p.x).toFixed(2)},${y(sel(p)).toFixed(2)}`),
    `L${x(punti[punti.length - 1]?.x ?? 0).toFixed(2)},${y0}`,
    'Z',
  ];
  return { linea: linea.join(''), area: area.join(''), y0 };
}

function Riquadro({
  titolo,
  picco,
  children,
  altezza = H,
}: {
  titolo: string;
  picco: string;
  children: React.ReactNode;
  altezza?: number;
}) {
  return (
    <div className="diagram">
      <div className="diagram-head">
        <span className="t">{titolo}</span>
        <span className="peak">{picco}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${altezza}`} preserveAspectRatio="none" role="img" aria-label={titolo}>
        {children}
      </svg>
    </div>
  );
}

function Asse({ y }: { y: number }) {
  return <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke={AXIS} strokeWidth={1} />;
}

/** Schema statico con i vincoli e i carichi applicati. */
export function DiagrammaCarichi({
  schema,
  L,
  q,
  P,
  aP,
  orientamento,
}: {
  schema: SchemaId;
  L: number;
  q: number;
  P: number;
  aP: number;
  orientamento: Orientamento;
}) {
  const yTrave = 78;
  const vinc = SCHEMI_BY_ID[schema].vincoli;
  const xa = PAD_X;
  const xb = W - PAD_X;

  const frecce = [];
  const n = 13;
  if (Math.abs(q) > 1e-9) {
    for (let i = 0; i < n; i++) {
      const x = xa + ((xb - xa) * i) / (n - 1);
      frecce.push(
        <g key={i} stroke={ACC} strokeWidth={1}>
          <line x1={x} y1={34} x2={x} y2={yTrave - 4} />
          <path d={`M${x - 3.5},${yTrave - 10} L${x},${yTrave - 3} L${x + 3.5},${yTrave - 10}`} fill="none" />
        </g>,
      );
    }
  }

  const vincolo = (x: number, v: { v: boolean; r: boolean }, lato: 'A' | 'B') => {
    if (!v.v && !v.r) return null; // estremo libero
    if (v.v && v.r) {
      // incastro
      const dir = lato === 'A' ? -1 : 1;
      return (
        <g stroke={FAINT} strokeWidth={1.4}>
          <line x1={x} y1={yTrave - 14} x2={x} y2={yTrave + 14} />
          {[-10, -5, 0, 5, 10].map((d) => (
            <line key={d} x1={x} y1={yTrave + d} x2={x + dir * 7} y2={yTrave + d + 5} strokeWidth={1} />
          ))}
        </g>
      );
    }
    if (v.v && !v.r) {
      // appoggio / cerniera
      return (
        <g stroke={FAINT} strokeWidth={1.4} fill="none">
          <path d={`M${x},${yTrave} L${x - 9},${yTrave + 14} L${x + 9},${yTrave + 14} Z`} />
          <line x1={x - 13} y1={yTrave + 16} x2={x + 13} y2={yTrave + 16} />
        </g>
      );
    }
    // doppio pendolo (blocca la rotazione, libera la traslazione)
    return (
      <g stroke={FAINT} strokeWidth={1.4} fill="none">
        <line x1={x - 8} y1={yTrave - 11} x2={x - 8} y2={yTrave + 11} />
        <line x1={x + 3} y1={yTrave - 11} x2={x + 3} y2={yTrave + 11} />
        <circle cx={x - 2.5} cy={yTrave - 6} r={2.5} stroke={FAINT} />
        <circle cx={x - 2.5} cy={yTrave + 6} r={2.5} stroke={FAINT} />
      </g>
    );
  };

  const xP = PAD_X + (L > 0 ? Math.min(1, Math.max(0, aP / L)) * (xb - xa) : 0);

  return (
    <Riquadro
      titolo={`Carichi — ${SCHEMI_BY_ID[schema].label}${orientamento === 'verticale' ? ' (elemento verticale)' : ''}`}
      picco={`q ${q.toFixed(2)} kN/m${Math.abs(P) > 1e-9 ? ` · P ${P.toFixed(1)} kN` : ''}`}
    >
      {frecce}
      {Math.abs(q) > 1e-9 && <line x1={xa} y1={34} x2={xb} y2={34} stroke={ACC} strokeWidth={1} />}
      {Math.abs(P) > 1e-9 && (
        <g stroke={ACC} strokeWidth={1.6}>
          <line x1={xP} y1={16} x2={xP} y2={yTrave - 4} />
          <path d={`M${xP - 4.5},${yTrave - 12} L${xP},${yTrave - 3} L${xP + 4.5},${yTrave - 12}`} fill="none" />
        </g>
      )}
      <line x1={xa} y1={yTrave} x2={xb} y2={yTrave} stroke="#e9e9ed" strokeWidth={2.5} />
      {vincolo(xa, vinc.A, 'A')}
      {vincolo(xb, vinc.B, 'B')}
      <text x={xa} y={yTrave + 33} fill={FAINT} fontSize={11} textAnchor="middle">
        A
      </text>
      <text x={xb} y={yTrave + 33} fill={FAINT} fontSize={11} textAnchor="middle">
        B
      </text>
      <text x={W / 2} y={yTrave + 33} fill={FAINT} fontSize={11} textAnchor="middle">
        L = {L.toFixed(2)} m
      </text>
    </Riquadro>
  );
}

export function DiagrammaSerie({
  titolo,
  punti,
  sel,
  L,
  unita,
  giu = false,
  colore = ACC,
}: {
  titolo: string;
  punti: PuntoDiagramma[];
  sel: (p: PuntoDiagramma) => number;
  L: number;
  unita: string;
  giu?: boolean;
  colore?: string;
}) {
  if (!punti.length) return null;
  const { max } = scala(punti, sel);
  const { linea, area, y0 } = pathArea({ punti, sel }, L, H, giu);

  return (
    <Riquadro titolo={titolo} picco={`max ${max.toPrecision(3)} ${unita}`}>
      <Asse y={y0} />
      <path d={area} fill={colore} opacity={0.16} />
      <path d={linea} fill="none" stroke={colore} strokeWidth={1.6} />
    </Riquadro>
  );
}
