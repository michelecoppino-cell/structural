import { ArrowsHorizontal, ArrowsVertical } from '@phosphor-icons/react';
import { useStore } from '../state/store';
import { calcolaAzioni, num } from '../calc/azioni';
import {
  COMBINAZIONI,
  calcolaSollecitazioni,
  sorgenti,
  type Combinazione,
  type Orientamento,
  type SorgenteId,
} from '../calc/sollecitazioni';
import { SCHEMI, type SchemaId } from '../calc/trave';
import { Field, NumInput, Output, Seg } from '../components/ui';
import { DiagrammaCarichi, DiagrammaSerie } from '../components/Diagrammi';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** Icona dello schema statico per le card di selezione. */
function MiniSchema({ id }: { id: SchemaId }) {
  const v = SCHEMI.find((s) => s.id === id)!.vincoli;
  const y = 20;
  const [xa, xb] = [12, 108];
  const C = 'currentColor';

  const vincolo = (x: number, c: { v: boolean; r: boolean }, lato: 'A' | 'B') => {
    if (!c.v && !c.r) return null;
    if (c.v && c.r) {
      const dir = lato === 'A' ? -1 : 1;
      return (
        <g stroke={C} strokeWidth={1.2}>
          <line x1={x} y1={y - 8} x2={x} y2={y + 8} />
          {[-6, -2, 2, 6].map((d) => (
            <line key={d} x1={x} y1={y + d} x2={x + dir * 4} y2={y + d + 3} strokeWidth={0.9} />
          ))}
        </g>
      );
    }
    if (c.v) {
      return (
        <g stroke={C} strokeWidth={1.2} fill="none">
          <path d={`M${x},${y} L${x - 5},${y + 8} L${x + 5},${y + 8} Z`} />
          <line x1={x - 7} y1={y + 10} x2={x + 7} y2={y + 10} />
        </g>
      );
    }
    return (
      <g stroke={C} strokeWidth={1.2} fill="none">
        <line x1={x - 4} y1={y - 6} x2={x - 4} y2={y + 6} />
        <line x1={x + 2} y1={y - 6} x2={x + 2} y2={y + 6} />
      </g>
    );
  };

  return (
    <svg viewBox="0 0 120 34" aria-hidden="true">
      <line x1={xa} y1={y} x2={xb} y2={y} stroke={C} strokeWidth={2} />
      {vincolo(xa, v.A, 'A')}
      {vincolo(xb, v.B, 'B')}
    </svg>
  );
}

export default function Sollecitazioni() {
  const { state, dispatch } = useStore();
  const inp = state.sollecitazioni;
  const az = calcolaAzioni(state.azioni);
  const r = calcolaSollecitazioni(inp, az);
  const set = (patch: Partial<typeof inp>) => dispatch({ type: 'sollecitazioni', patch });

  const tutte = sorgenti(inp, az);
  const verticale = inp.orientamento === 'verticale';
  const t = r.trave;

  return (
    <div className="stack">
      {/* ── selettori ──────────────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="row-wrap" style={{ marginBottom: 12 }}>
            <Seg<Orientamento>
              label="Orientamento dell'elemento"
              value={inp.orientamento}
              onChange={(v) => set({ orientamento: v })}
              options={[
                { id: 'orizzontale', label: 'Orizzontale', icon: <ArrowsHorizontal size={14} /> },
                { id: 'verticale', label: 'Verticale', icon: <ArrowsVertical size={14} /> },
              ]}
            />
            <Seg<Combinazione>
              label="Combinazione di carico"
              value={inp.combinazione}
              onChange={(v) => set({ combinazione: v })}
              options={COMBINAZIONI.map((c) => ({ id: c.id, label: c.label.replace(' (fondamentale)', '') }))}
            />
          </div>

          <div className="section-title">Schema statico</div>
          <div className="scheme-grid" style={{ marginBottom: 14 }}>
            {SCHEMI.map((s) => (
              <button
                key={s.id}
                type="button"
                className="scheme-card"
                aria-pressed={inp.schema === s.id}
                title={s.note}
                onClick={() => set({ schema: s.id })}
              >
                <MiniSchema id={s.id} />
                <span className="nm">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="section-title">Carichi applicati</div>
          <div className="row-wrap">
            {tutte.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip-toggle"
                aria-pressed={!!inp.attive[s.id]}
                title={`${s.descr} — ${s.ref}`}
                onClick={() =>
                  set({ attive: { ...inp.attive, [s.id]: !inp.attive[s.id] } as Record<SorgenteId, boolean> })
                }
              >
                {s.label}
                <span className="val">
                  {fx(s.qk)} kN/m²{s.origine === 'azioni' ? ' ↩' : ''}
                </span>
              </button>
            ))}
          </div>
          <p className="note" style={{ marginTop: 6 }}>
            ↩ = valore ripreso dalla scheda Azioni.
            {verticale
              ? ' In elemento verticale i carichi gravitazionali diventano sforzo normale sull’area di influenza; solo le azioni orizzontali flettono l’elemento.'
              : ' In elemento orizzontale tutti i carichi selezionati agiscono trasversalmente sull’interasse.'}
          </p>
        </div>
      </section>

      {/* ── dati geometrici e di carico ────────────────────────────────── */}
      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="section-title">Geometria e carichi</div>
          <div className="fields">
            <Field
              id="soll_L"
              tab="sollecitazioni"
              label={verticale ? 'Altezza H' : 'Luce di calcolo L'}
              unit="m"
              dettaglio={{
                formula: `Schema ${SCHEMI.find((s) => s.id === inp.schema)?.label} su luce L = ${fx(r.L)} m`,
                ref: 'Soluzioni di travi elementari variamente caricate',
              }}
            >
              <NumInput id="soll_L" value={inp.L} onChange={(v) => set({ L: v })} />
            </Field>

            <Field
              id="soll_i"
              tab="sollecitazioni"
              label="Interasse (larghezza di influenza)"
              unit="m"
              dettaglio={{
                formula: `q = Σ (γ · ψ · qk) · i = ${fx(r.q)} kN/m`,
                ref: 'NTC2018 §2.5.3',
                coeffs: r.contributi.map((c) => ({
                  k: c.sorgente.label,
                  v: `${fx(c.qd)} kN/m²`,
                })),
              }}
            >
              <NumInput id="soll_i" value={inp.interasse} onChange={(v) => set({ interasse: v })} />
            </Field>

            {verticale && (
              <Field
                id="soll_A"
                tab="sollecitazioni"
                label="Area di influenza (carichi verticali)"
                unit="m²"
                dettaglio={{
                  formula: `N = Σ (γ · ψ · qk) · A = ${fx(r.N, 1)} kN`,
                  ref: 'NTC2018 §2.5.3',
                }}
              >
                <NumInput id="soll_A" value={inp.areaInfluenza} onChange={(v) => set({ areaInfluenza: v })} />
              </Field>
            )}

            <Field
              id="soll_pp"
              tab="sollecitazioni"
              label="Peso proprio strutturale G1"
              unit="kN/m²"
              dettaglio={{
                formula: `γG1 = 1.30 in combinazione SLU sfavorevole`,
                ref: 'NTC2018 §2.6.1 — Tab. 2.6.I',
              }}
            >
              <NumInput id="soll_pp" value={inp.pp} onChange={(v) => set({ pp: v })} />
            </Field>

            <Field
              id="soll_g2"
              tab="sollecitazioni"
              label="Permanenti non strutturali G2"
              unit="kN/m²"
              dettaglio={{
                formula: `γG2 = 1.50 in combinazione SLU sfavorevole`,
                ref: 'NTC2018 §2.6.1 — Tab. 2.6.I',
              }}
            >
              <NumInput id="soll_g2" value={inp.g2} onChange={(v) => set({ g2: v })} />
            </Field>

            <Field
              id="soll_P"
              tab="sollecitazioni"
              label="Carico concentrato P"
              unit="kN"
              dettaglio={{
                formula: `P applicato a x = ${fx(num(inp.aP))} m dall’estremo A`,
                ref: 'NTC2018 §3.1.4 — Qk da Tab. 3.1.II',
                coeffs: [{ k: 'Qk tabellare', v: `${fx(az.variabili.Qk)} kN` }],
              }}
            >
              <NumInput id="soll_P" value={inp.P} onChange={(v) => set({ P: v })} />
            </Field>

            <Field id="soll_aP" tab="sollecitazioni" label="Ascissa del carico concentrato" unit="m">
              <NumInput id="soll_aP" value={inp.aP} onChange={(v) => set({ aP: v })} />
            </Field>

            <Field
              id="soll_E"
              tab="sollecitazioni"
              label="Modulo elastico E"
              unit="MPa"
              dettaglio={{
                formula: `EJ = E · J = ${fx(num(inp.E), 0)} MPa · ${fx(num(inp.J), 0)} cm⁴ = ${fx(r.EJ, 0)} kNm²`,
                ref: 'NTC2018 §4.1.1.1 (Ecm) / §4.2.1 (E acciaio)',
              }}
            >
              <NumInput id="soll_E" value={inp.E} onChange={(v) => set({ E: v })} />
            </Field>

            <Field
              id="soll_J"
              tab="sollecitazioni"
              label="Momento d'inerzia J"
              unit="cm⁴"
              dettaglio={{
                formula: `f = ${fx(Math.abs(t.fmax.val) * 1000, 2)} mm  →  L/f = ${Number.isFinite(t.Lsuf) ? fx(t.Lsuf, 0) : '∞'}`,
                ref: 'NTC2018 §4.1.2.2.2 — limiti di deformabilità',
              }}
            >
              <NumInput id="soll_J" value={inp.J} onChange={(v) => set({ J: v })} />
            </Field>
          </div>

          <Output
            titolo={`Sollecitazioni — ${COMBINAZIONI.find((c) => c.id === inp.combinazione)?.label}`}
            voci={[
              { k: 'q di progetto', v: fx(r.q), u: 'kN/m' },
              ...(verticale ? [{ k: 'N di progetto', v: fx(r.N, 1), u: 'kN' }] : []),
              { k: 'M max', v: fx(t.MmaxAbs.val, 1), u: 'kNm' },
              { k: 'V max', v: fx(t.VmaxAbs.val, 1), u: 'kN' },
              { k: 'RA', v: fx(t.reazioni.A.R, 1), u: 'kN' },
              { k: 'RB', v: fx(t.reazioni.B.R, 1), u: 'kN' },
              { k: 'f max', v: fx(Math.abs(t.fmax.val) * 1000, 2), u: 'mm' },
              { k: 'L / f', v: Number.isFinite(t.Lsuf) ? fx(t.Lsuf, 0) : '∞' },
            ]}
          />
        </div>
      </section>

      {/* ── diagrammi ──────────────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="section-title">
            Diagrammi — {verticale ? 'carichi a sinistra, sollecitazioni a destra' : 'carichi in alto, sollecitazioni in basso'}
          </div>
          <div className={`diagrams ${inp.orientamento}`}>
            <DiagrammaCarichi
              schema={inp.schema}
              L={r.L}
              q={r.q}
              P={num(inp.P)}
              aP={num(inp.aP)}
              orientamento={inp.orientamento}
            />
            <DiagrammaSerie
              titolo="Momento flettente M"
              punti={t.punti}
              sel={(p) => p.M}
              L={r.L}
              unita="kNm"
              giu
            />
            <DiagrammaSerie titolo="Taglio V" punti={t.punti} sel={(p) => p.V} L={r.L} unita="kN" />
            <DiagrammaSerie
              titolo="Deformata"
              punti={t.punti}
              sel={(p) => p.v * 1000}
              L={r.L}
              unita="mm"
              giu
              colore="#9397ab"
            />
          </div>
        </div>
      </section>

      {/* ── contributi di carico ───────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="section-title">Contributi alla combinazione</div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Azione</th>
                  <th>Ruolo</th>
                  <th className="num">qk</th>
                  <th className="num">γ</th>
                  <th className="num">ψ</th>
                  <th className="num">qd</th>
                </tr>
              </thead>
              <tbody>
                {r.contributi.map((c) => (
                  <tr key={c.sorgente.id}>
                    <td>{c.sorgente.descr}</td>
                    <td style={{ color: 'var(--text-faint)' }}>{c.ruolo}</td>
                    <td className="num">{fx(c.sorgente.qk)}</td>
                    <td className="num">{fx(c.gamma)}</td>
                    <td className="num">{fx(c.psi)}</td>
                    <td className="num">{fx(c.qd)}</td>
                  </tr>
                ))}
                {!r.contributi.length && (
                  <tr>
                    <td colSpan={6} style={{ color: 'var(--text-faint)' }}>
                      Nessun carico selezionato.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>
                    {verticale ? 'q trasversale (kN/m) · N (kN)' : 'q di progetto (kN/m)'}
                  </td>
                  <td className="num">{verticale ? `${fx(r.q)} · ${fx(r.N, 1)}` : fx(r.q)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="note" style={{ marginTop: 8 }}>
            Coefficienti parziali γG1 = 1.30, γG2 = 1.50, γQ = 1.50 (Tab. 2.6.I, A1-STR); l'azione
            variabile principale è quella con il valore caratteristico maggiore.
          </p>
        </div>
      </section>
    </div>
  );
}
