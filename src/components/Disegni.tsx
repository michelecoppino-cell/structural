/**
 * Disegni di supporto: stanno nella colonna di destra dei pannelli e servono a
 * far vedere di che cosa si sta parlando mentre si compilano i campi.
 *
 * Sono SVG a viewBox fisso ma con rapporto d'aspetto conservato (nessun
 * `preserveAspectRatio="none"`): la larghezza è quella della colonna, l'altezza
 * segue. I colori vengono dai token attraverso le classi `dg-*`.
 */

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

function Cornice({ titolo, children, viewBox }: { titolo: string; children: React.ReactNode; viewBox: string }) {
  return (
    <div className="disegno">
      <div className="titolo">{titolo}</div>
      <svg viewBox={viewBox} role="img" aria-label={titolo}>
        {children}
      </svg>
    </div>
  );
}

/* ─────────────────────── sezione in c.a. quotata ─────────────────────── */

export function SezioneTaglio({
  bw,
  h,
  d,
  c = 0,
  phiStaffa = 0,
  phiLong = 20,
  nBarre = 0,
  passo,
  staffe,
}: {
  bw: number;
  h: number;
  d: number;
  /** Copriferro, solo per la sezione staffata. */
  c?: number;
  phiStaffa?: number;
  phiLong?: number;
  nBarre?: number;
  passo?: number;
  staffe?: boolean;
}) {
  const W = 260;
  const H = 190;
  const maxW = 108;
  const maxH = 132;
  const bwOk = bw > 0 ? bw : 300;
  const hOk = h > 0 ? h : 500;
  const k = Math.min(maxW / bwOk, maxH / hOk);
  const w = bwOk * k;
  const ht = hOk * k;
  const x0 = 78;
  const y0 = 26;
  const x1 = x0 + w;
  const y1 = y0 + ht;

  // altezza utile: misurata dal lembo compresso (in alto)
  const yd = y0 + Math.min(ht, Math.max(0, d * k));
  const cc = Math.min(w / 2 - 2, Math.max(3, c * k));
  const rLong = Math.max(1.8, (phiLong * k) / 2);

  const barre = [];
  const n = Math.max(0, Math.min(8, Math.round(nBarre)));
  for (let i = 0; i < n; i++) {
    const bx = n === 1 ? (x0 + x1) / 2 : x0 + cc + rLong + ((w - 2 * (cc + rLong)) * i) / (n - 1);
    barre.push(<circle key={i} className="dg-punto" cx={bx} cy={yd} r={rLong} />);
  }

  return (
    <Cornice titolo="Sezione — quote di calcolo" viewBox={`0 0 ${W} ${H}`}>
      {/* calcestruzzo */}
      <rect x={x0} y={y0} width={w} height={ht} className="dg-beam" strokeWidth={1.6} fill="none" />

      {/* staffa */}
      {staffe && (
        <rect
          x={x0 + cc}
          y={y0 + cc}
          width={Math.max(4, w - 2 * cc)}
          height={Math.max(4, ht - 2 * cc)}
          rx={Math.max(2, (phiStaffa * k) / 2)}
          className="dg-line"
          strokeWidth={Math.max(1.2, phiStaffa * k)}
          fill="none"
        />
      )}

      {barre}

      {/* quota bw, sotto */}
      <path
        className="dg-axis"
        strokeWidth={1}
        d={`M${x0},${y1 + 14} L${x1},${y1 + 14} M${x0},${y1 + 10} L${x0},${y1 + 18} M${x1},${y1 + 10} L${x1},${y1 + 18}`}
      />
      <text x={(x0 + x1) / 2} y={y1 + 28} className="dg-testo" textAnchor="middle">
        bw = {fx(bw, 0)} mm
      </text>

      {/* quota h, a sinistra */}
      <path
        className="dg-axis"
        strokeWidth={1}
        d={`M${x0 - 16},${y0} L${x0 - 16},${y1} M${x0 - 20},${y0} L${x0 - 12},${y0} M${x0 - 20},${y1} L${x0 - 12},${y1}`}
      />
      <text x={x0 - 22} y={(y0 + y1) / 2} className="dg-testo" textAnchor="end" dominantBaseline="middle">
        h {fx(h, 0)}
      </text>

      {/* quota d, a destra */}
      <path
        className="dg-axis"
        strokeWidth={1}
        d={`M${x1 + 16},${y0} L${x1 + 16},${yd} M${x1 + 12},${y0} L${x1 + 20},${y0} M${x1 + 12},${yd} L${x1 + 20},${yd}`}
      />
      <path className="dg-axis" strokeWidth={1} strokeDasharray="3 3" d={`M${x0},${yd} L${x1 + 16},${yd}`} />
      <text x={x1 + 22} y={(y0 + yd) / 2} className="dg-testo is-accent" dominantBaseline="middle">
        d {fx(d, 0)}
      </text>

      {staffe && passo !== undefined && (
        <text x={x0} y={16} className="dg-testo is-accent">
          staffe ⌀{fx(phiStaffa, 0)} / {fx(passo, 0)} mm
        </text>
      )}
      {!staffe && (
        <text x={x0} y={16} className="dg-testo">
          {n} ⌀{fx(phiLong, 0)} tesi
        </text>
      )}
    </Cornice>
  );
}

/* ─────────────────────── spettro di risposta ─────────────────────── */

/** Se(T)/g secondo §3.2.3.2.1, con η = 1 (ξ = 5%). */
function spettroElastico(T: number, ag: number, S: number, F0: number, TB: number, TC: number, TD: number) {
  if (T < TB) return ag * S * F0 * (T / TB + (1 / F0) * (1 - T / TB));
  if (T < TC) return ag * S * F0;
  if (T < TD) return ag * S * F0 * (TC / T);
  return ag * S * F0 * ((TC * TD) / (T * T));
}

export function Spettro({
  ag,
  S,
  F0,
  TB,
  TC,
  TD,
  q,
}: {
  ag: number;
  S: number;
  F0: number;
  TB: number;
  TC: number;
  TD: number;
  q: number;
}) {
  const W = 260;
  const H = 170;
  const x0 = 34;
  const y0 = 20;
  const x1 = W - 12;
  const y1 = H - 28;
  const Tmax = Math.max(4, TD * 1.2);

  const punti: { T: number; se: number; sd: number }[] = [];
  const nn = 120;
  for (let i = 0; i <= nn; i++) {
    const T = (Tmax * i) / nn;
    const se = spettroElastico(T, ag, S, F0, Math.max(TB, 1e-4), TC, TD);
    // §3.2.3.5: lo spettro di progetto non scende sotto 0.2·ag
    const sd = Math.max(se / Math.max(q, 1), 0.2 * ag);
    punti.push({ T, se, sd });
  }
  const smax = Math.max(...punti.map((p) => p.se), 1e-6);

  const X = (T: number) => x0 + (T / Tmax) * (x1 - x0);
  const Y = (s: number) => y1 - (s / smax) * (y1 - y0);
  const path = (sel: (p: (typeof punti)[number]) => number) =>
    punti.map((p, i) => `${i ? 'L' : 'M'}${X(p.T).toFixed(1)},${Y(sel(p)).toFixed(1)}`).join('');

  return (
    <Cornice titolo="Spettro di risposta orizzontale" viewBox={`0 0 ${W} ${H}`}>
      <path className="dg-axis" strokeWidth={1} d={`M${x0},${y0} L${x0},${y1} L${x1},${y1}`} />
      {[TB, TC, TD].map((T, i) => (
        <path
          key={i}
          className="dg-axis"
          strokeWidth={1}
          strokeDasharray="2 3"
          d={`M${X(T)},${y0} L${X(T)},${y1}`}
        />
      ))}
      <path className="dg-line is-faint" strokeWidth={1.4} d={path((p) => p.se)} />
      <path className="dg-line" strokeWidth={1.8} d={path((p) => p.sd)} />

      <text x={x0 - 4} y={y0 + 4} className="dg-testo" textAnchor="end">
        {fx(smax, 3)}
      </text>
      <text x={x0 - 4} y={y1} className="dg-testo" textAnchor="end">
        0
      </text>
      <text x={x1} y={y1 + 14} className="dg-testo" textAnchor="end">
        T = {fx(Tmax, 1)} s
      </text>
      <text x={X(TC)} y={y1 + 14} className="dg-testo" textAnchor="middle">
        TC
      </text>
      <text x={x0 + 6} y={y0 + 4} className="dg-testo is-accent">
        Sd(T) — q = {fx(q, 1)}
      </text>
      <text x={x0 + 6} y={y0 + 16} className="dg-testo">
        Se(T) — elastico
      </text>
    </Cornice>
  );
}

/* ─────────────────────── paramento e spinta delle terre ─────────────────── */

export function Paramento({
  H,
  ka,
  Sa,
  za,
  dEd,
}: {
  H: number;
  ka: number;
  Sa: number;
  za: number;
  /** Incremento sismico ΔEd (kN/m): se c'è, si disegna anche il suo diagramma. */
  dEd?: number;
}) {
  const W = 260;
  const Ht = 182;
  const xw = 92; // faccia interna del muro
  const y0 = 22;
  const y1 = Ht - 30;
  const alt = y1 - y0;
  const spinta = 74; // ampiezza del diagramma triangolare
  const sisma = dEd !== undefined && Number.isFinite(dEd) && dEd > 0;
  // l'incremento dinamico si rappresenta come diagramma costante su H,
  // risultante a metà altezza: ampiezza in proporzione alla spinta statica
  const ampiezzaSisma = sisma ? Math.min(52, (spinta * dEd) / Math.max(Sa, 1e-6)) : 0;
  const yMezzo = (y0 + y1) / 2;

  return (
    <Cornice
      titolo={sisma ? 'Spinta delle terre — statica e sismica' : 'Spinta delle terre — Rankine'}
      viewBox={`0 0 ${W} ${Ht}`}
    >
      {/* muro */}
      <path
        className="dg-beam"
        strokeWidth={1.6}
        fill="none"
        d={`M${xw - 26},${y0} L${xw},${y0} L${xw},${y1} L${xw - 34},${y1} Z`}
      />
      {/* terreno a monte */}
      <path className="dg-axis" strokeWidth={1} d={`M${xw},${y0} L${W - 10},${y0}`} />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const x = xw + 12 + i * 24;
        return <path key={i} className="dg-axis" strokeWidth={1} d={`M${x},${y0} L${x - 7},${y0 - 7}`} />;
      })}
      {/* diagramma triangolare della spinta */}
      <path
        className="dg-area"
        d={`M${xw},${y0} L${xw + spinta},${y1} L${xw},${y1} Z`}
      />
      <path
        className="dg-line"
        strokeWidth={1.4}
        d={`M${xw},${y0} L${xw + spinta},${y1}`}
      />
      {/* risultante a za dal piede */}
      <path
        className="dg-carico"
        strokeWidth={1.6}
        d={`M${xw + 52},${y1 - (alt * za) / Math.max(H, 1e-6)} L${xw + 8},${y1 - (alt * za) / Math.max(H, 1e-6)} M${xw + 16},${y1 - (alt * za) / Math.max(H, 1e-6) - 4} L${xw + 7},${y1 - (alt * za) / Math.max(H, 1e-6)} L${xw + 16},${y1 - (alt * za) / Math.max(H, 1e-6) + 4}`}
      />
      <text x={xw + 56} y={y1 - (alt * za) / Math.max(H, 1e-6)} className="dg-testo is-accent" dominantBaseline="middle">
        Sa {fx(Sa, 1)} kN/m
      </text>
      {/* fondazione */}
      <path className="dg-beam" strokeWidth={1.6} fill="none" d={`M${xw - 44},${y1} L${xw + 10},${y1}`} />
      {/* quota H */}
      <path
        className="dg-axis"
        strokeWidth={1}
        d={`M${xw - 48},${y0} L${xw - 48},${y1} M${xw - 52},${y0} L${xw - 44},${y0} M${xw - 52},${y1} L${xw - 44},${y1}`}
      />
      <text x={xw - 54} y={(y0 + y1) / 2} className="dg-testo" textAnchor="end" dominantBaseline="middle">
        H {fx(H)} m
      </text>

      {/* incremento sismico: diagramma costante lungo H, risultante a H/2 */}
      {sisma && (
        <>
          <path
            className="dg-line is-faint"
            strokeWidth={1.4}
            strokeDasharray="4 3"
            d={`M${xw},${y0} L${xw + ampiezzaSisma},${y0} L${xw + ampiezzaSisma},${y1} L${xw},${y1}`}
          />
          <path
            className="dg-carico is-faint"
            strokeWidth={1.6}
            d={`M${xw + ampiezzaSisma + 34},${yMezzo} L${xw + ampiezzaSisma + 6},${yMezzo} M${xw + ampiezzaSisma + 14},${yMezzo - 4} L${xw + ampiezzaSisma + 5},${yMezzo} L${xw + ampiezzaSisma + 14},${yMezzo + 4}`}
          />
          <text x={xw + ampiezzaSisma + 38} y={yMezzo} className="dg-testo" dominantBaseline="middle">
            ΔEd {fx(dEd!, 1)}
          </text>
        </>
      )}

      <text x={8} y={y1 + 16} className="dg-testo">
        za = H/3 = {fx(za)} m · Ka = {fx(ka, 3)}
      </text>
      {sisma && (
        <text x={8} y={y1 + 27} className="dg-testo">
          ΔEd costante su H, risultante a H/2
        </text>
      )}
    </Cornice>
  );
}

/* ─────────────────────── vento: andamento in altezza ─────────────────────── */

/** ce(z) secondo §3.3.7, con ct = 1 e il taglio a zmin sotto la quota minima. */
function ceDi(z: number, kr: number, z0: number, zmin: number): number {
  const zz = Math.max(z, zmin);
  const ln = Math.log(zz / z0);
  return kr * kr * ln * (7 + ln);
}

/**
 * Pressione del vento lungo l'altezza: la pressione non è costante, cresce
 * con ce(z) e resta ferma al valore di zmin nella parte bassa dell'edificio.
 * A sinistra la spinta sopravento, a destra la depressione sottovento.
 */
export function ProfiloVento({
  z,
  qb,
  cp,
  cd,
  kr,
  z0,
  zmin,
}: {
  z: number;
  qb: number;
  cp: number;
  cd: number;
  kr: number;
  z0: number;
  zmin: number;
}) {
  const W = 260;
  const H = 190;
  const yTerra = H - 26;
  const yCima = 22;
  const xEd = 134; // faccia sopravento dell'edificio
  const larghezza = 42;
  const scala = 66; // ampiezza massima del diagramma di pressione

  const zTot = Math.max(z, 0.5);
  /** Quota in metri → ordinata sul disegno. */
  const quota = (q: number) => yTerra + ((yCima - yTerra) * q) / zTot;

  const n = 24;
  const punti = Array.from({ length: n + 1 }, (_, i) => {
    const zi = (zTot * i) / n;
    const p = qb * ceDi(zi, kr, z0, zmin) * Math.abs(cp) * cd;
    return { zi, p };
  });
  const pMax = Math.max(...punti.map((x) => x.p), 1e-6);
  const X = (p: number) => xEd - (p / pMax) * scala;

  const profilo = punti.map((x, i) => `${i ? 'L' : 'M'}${X(x.p).toFixed(1)},${quota(x.zi).toFixed(1)}`).join('');
  const area = `M${xEd},${yTerra} ${profilo.slice(1)} L${xEd},${yCima} Z`;

  const pCima = punti[punti.length - 1].p;
  const pBase = punti[0].p;
  // il vento in copertura è depressione: la freccia sottovento esce dalla parete
  const sotto = pCima * 0.5;

  return (
    <Cornice titolo="Vento — andamento della pressione in altezza" viewBox={`0 0 ${W} ${H}`}>
      {/* terreno */}
      <path className="dg-axis" strokeWidth={1} d={`M10,${yTerra} L${W - 10},${yTerra}`} />

      {/* edificio */}
      <rect
        x={xEd}
        y={yCima}
        width={larghezza}
        height={yTerra - yCima}
        className="dg-beam"
        strokeWidth={1.6}
        fill="none"
      />

      {/* diagramma della pressione sopravento */}
      <path className="dg-area" d={area} />
      <path className="dg-line" strokeWidth={1.6} d={profilo} />

      {/* frecce di spinta, a passo costante */}
      {[0.1, 0.35, 0.6, 0.85, 1].map((t) => {
        const zi = zTot * t;
        const p = qb * ceDi(zi, kr, z0, zmin) * Math.abs(cp) * cd;
        const y = quota(zi);
        return (
          <path
            key={t}
            className="dg-carico"
            strokeWidth={1}
            d={`M${X(p).toFixed(1)},${y.toFixed(1)} L${xEd - 3},${y.toFixed(1)} M${xEd - 9},${(y - 3).toFixed(1)} L${xEd - 2},${y.toFixed(1)} L${xEd - 9},${(y + 3).toFixed(1)}`}
          />
        );
      })}

      {/* depressione sottovento: frecce che tirano via dalla parete */}
      {[0.25, 0.6, 0.95].map((t) => {
        const y = quota(zTot * t);
        const x = xEd + larghezza;
        return (
          <path
            key={t}
            className="dg-carico is-faint"
            strokeWidth={1}
            d={`M${x + 3},${y.toFixed(1)} L${x + 26},${y.toFixed(1)} M${x + 20},${(y - 3).toFixed(1)} L${x + 27},${y.toFixed(1)} L${x + 20},${(y + 3).toFixed(1)}`}
          />
        );
      })}

      {/* quote del diagramma */}
      {/* sotto zmin la pressione resta quella di zmin: si vede il tratto dritto */}
      {zmin < zTot && (
        <path
          className="dg-axis"
          strokeWidth={1}
          strokeDasharray="2 3"
          d={`M8,${quota(zmin).toFixed(1)} L${xEd},${quota(zmin).toFixed(1)}`}
        />
      )}

      <text x={6} y={yCima - 8} className="dg-testo">
        p(z) = qb·ce(z)·cp·cd
      </text>
      <text x={X(pCima) - 4} y={yCima + 4} className="dg-testo is-accent" textAnchor="end">
        {fx(pCima)} kN/m²
      </text>
      <text x={X(pBase) - 4} y={yTerra - 4} className="dg-testo" textAnchor="end">
        {fx(pBase)}
      </text>
      {zmin < zTot && (
        <text x={6} y={quota(zmin) - 4} className="dg-testo">
          zmin {fx(zmin, 0)} m
        </text>
      )}
      <text x={xEd + larghezza + 30} y={quota(zTot * 0.6)} className="dg-testo" dominantBaseline="middle">
        {fx(-sotto)}
      </text>
      <text x={xEd + larghezza / 2} y={yTerra + 16} className="dg-testo" textAnchor="middle">
        z = {fx(z)} m
      </text>
    </Cornice>
  );
}

/* ─────────────────────── falda e carico neve ─────────────────────── */

/**
 * Carico neve sulla copertura a due falde.
 *
 * Il punto delicato è che qs è riferito alla **proiezione orizzontale**: su
 * ogni striscia verticale di uguale larghezza grava lo stesso carico, quindi
 * il diagramma è una fascia di spessore costante *misurato in verticale* sopra
 * la falda — non un carico che si assottiglia verso il colmo, e nemmeno una
 * fascia perpendicolare alla falda.
 */
export function Falda({
  qsk,
  qs,
  mu,
  alfa = 15,
}: {
  qsk: number;
  qs: number;
  mu: number;
  /** Inclinazione della falda, in gradi. */
  alfa?: number;
}) {
  const W = 260;
  const H = 172;
  const xa = 30;
  const xc = W / 2;
  const xb = W - 30;
  const yG = 122; // quota di gronda
  // il colmo sale con l'inclinazione, entro i limiti del riquadro
  const salita = Math.min(52, ((xc - xa) * Math.tan((Math.min(Math.abs(alfa), 75) * Math.PI) / 180)));
  const yC = yG - salita;

  /** Quota della falda alla generica ascissa. */
  const yFalda = (x: number) =>
    x <= xc ? yG + ((yC - yG) * (x - xa)) / (xc - xa) : yC + ((yG - yC) * (x - xc)) / (xb - xc);

  // spessore della fascia di carico: costante in verticale, come qs
  const spessore = 30;

  const frecce = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = xa + ((xb - xa) * i) / (n - 1);
    const y = yFalda(x);
    frecce.push(
      <path
        key={i}
        className="dg-carico"
        strokeWidth={1}
        d={`M${x.toFixed(1)},${(y - spessore).toFixed(1)} L${x.toFixed(1)},${(y - 3).toFixed(1)} M${(x - 3).toFixed(1)},${(y - 9).toFixed(1)} L${x.toFixed(1)},${(y - 2).toFixed(1)} L${(x + 3).toFixed(1)},${(y - 9).toFixed(1)}`}
      />,
    );
  }

  const fascia = [
    `M${xa},${yG - spessore}`,
    `L${xc},${yC - spessore}`,
    `L${xb},${yG - spessore}`,
    `L${xb},${yG}`,
    `L${xc},${yC}`,
    `L${xa},${yG}`,
    'Z',
  ].join(' ');

  return (
    <Cornice titolo="Carico neve — μ1·qsk sulla proiezione orizzontale" viewBox={`0 0 ${W} ${H}`}>
      {/* fascia di carico: spessore costante misurato in verticale */}
      <path className="dg-area" d={fascia} />
      <path
        className="dg-carico"
        strokeWidth={1.2}
        d={`M${xa},${yG - spessore} L${xc},${yC - spessore} L${xb},${yG - spessore}`}
      />
      {frecce}

      {/* copertura */}
      <path className="dg-beam" strokeWidth={2} fill="none" d={`M${xa},${yG} L${xc},${yC} L${xb},${yG}`} />
      <path
        className="dg-vinc"
        strokeWidth={1.2}
        fill="none"
        d={`M${xa},${yG} L${xa},${H - 32} M${xb},${yG} L${xb},${H - 32}`}
      />
      <path className="dg-axis" strokeWidth={1} d={`M${xa - 8},${H - 32} L${xb + 8},${H - 32}`} />

      {/* riferimento orizzontale alla gronda, per leggere l'inclinazione */}
      <path className="dg-axis" strokeWidth={1} strokeDasharray="3 3" d={`M${xa},${yG} L${xb},${yG}`} />
      <text x={8} y={16} className="dg-testo">
        α = {fx(alfa, 0)}°
      </text>

      <text x={xc} y={H - 16} className="dg-testo is-accent" textAnchor="middle">
        qs = μ1·qsk·CE·Ct = {fx(qs)} kN/m²
      </text>
      <text x={xc} y={H - 4} className="dg-testo" textAnchor="middle">
        qsk {fx(qsk)} kN/m² · μ1 {fx(mu)} · uniforme su ogni falda
      </text>
    </Cornice>
  );
}
