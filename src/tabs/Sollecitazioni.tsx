import { ArrowsHorizontal, ArrowsVertical } from '@phosphor-icons/react';
import { useCalcoli, useStore } from '../state/store';
import { num } from '../calc/azioni';
import {
  COMBINAZIONI,
  sorgenti,
  type Combinazione,
  type Orientamento,
  type SezioneMateriale,
  type SorgenteId,
} from '../calc/sollecitazioni';
import { validaSollecitazioni } from '../calc/validazione';
import { SCHEMI, SCHEMI_BY_ID, type SchemaId } from '../calc/trave';
import { CLS } from '../data/materiali';
import { TIPI_PROFILO, taglieDisponibili, type TipoProfilo } from '../data/profili-acciaio';
import { Field, NumInput, Output, Seg, Select } from '../components/ui';
import { ComandiScheda } from '../components/ComandiScheda';
import { DiagrammaCarichi, DiagrammaSerie } from '../components/Diagrammi';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** Icona dello schema statico, accanto al menù di scelta. */
function MiniSchema({ id }: { id: SchemaId }) {
  const v = SCHEMI_BY_ID[id].vincoli;
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

/** Etichetta + controllo a tutta larghezza, per i menù della colonna comandi. */
function Menu({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="menu-blocco">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

export default function Sollecitazioni() {
  const { state, dispatch } = useStore();
  const { azioni: az, sollecitazioni: r } = useCalcoli();
  const inp = state.sollecitazioni;
  const set = (patch: Partial<typeof inp>) => dispatch({ type: 'sollecitazioni', patch });

  const err = validaSollecitazioni(inp);
  const tutte = sorgenti(inp, az);
  const verticale = inp.orientamento === 'verticale';
  const t = r.trave;
  const schema = SCHEMI_BY_ID[inp.schema];

  return (
    <div className="soll-layout">
      {/* ── comandi che stanno bene in testa: combinazione e orientamento ── */}
      <ComandiScheda>
        <select
          className="input"
          style={{ width: 'auto', minWidth: 190 }}
          aria-label="Combinazione di carico"
          value={inp.combinazione}
          onChange={(e) => set({ combinazione: e.target.value as Combinazione })}
        >
          {COMBINAZIONI.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <Seg<Orientamento>
          label="Orientamento dell'elemento"
          value={inp.orientamento}
          onChange={(v) => set({ orientamento: v })}
          options={[
            { id: 'orizzontale', label: 'Orizzontale', icon: <ArrowsHorizontal size={14} /> },
            { id: 'verticale', label: 'Verticale', icon: <ArrowsVertical size={14} /> },
          ]}
        />
      </ComandiScheda>

      {/* ── diagrammi ─────────────────────────────────────────────────── */}
      <div className="soll-col soll-risultati">
        <section className="panel panel-diagrammi">
          <div className="panel-body" style={{ paddingTop: 10 }}>
            <div className={`diagrams ${inp.orientamento}`}>
              <DiagrammaCarichi
                schema={inp.schema}
                L={r.L}
                q={r.q}
                P={num(inp.P)}
                aP={num(inp.aP)}
                N={r.N}
                RA={t.reazioni.A.R}
                RB={t.reazioni.B.R}
                orientamento={inp.orientamento}
              />
              <DiagrammaSerie
                titolo="Momento flettente M"
                punti={t.punti}
                sel={(p) => p.M}
                L={r.L}
                unita="kNm"
                giu
                quotaEstremi
                orientamento={inp.orientamento}
              />
              <DiagrammaSerie
                titolo="Taglio V"
                punti={t.punti}
                sel={(p) => p.V}
                L={r.L}
                unita="kN"
                quotaEstremi
                orientamento={inp.orientamento}
              />
              <DiagrammaSerie
                titolo="Deformata"
                punti={t.punti}
                sel={(p) => p.v * 1000}
                L={r.L}
                unita="mm"
                decimali={2}
                giu
                variante="faint"
                orientamento={inp.orientamento}
              />
            </div>
          </div>
        </section>
      </div>

      {/* ── risultati numerici ────────────────────────────────────────── */}
      <div className="soll-col soll-esiti">
        <section className="panel">
          <div className="panel-body" style={{ paddingTop: 12 }}>
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
                {
                  k: 'Deformabilità',
                  v: Number.isFinite(t.Lsuf)
                    ? `${verticale ? 'H' : 'L'}/${fx(t.Lsuf, 0)}`
                    : '∞',
                },
              ]}
            />

            <div className="table-scroll" style={{ marginTop: 12 }}>
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
                      <td className="faint">{c.ruolo}</td>
                      <td className="num">{fx(c.sorgente.qk)}</td>
                      <td className="num">{fx(c.gamma)}</td>
                      <td className="num">{fx(c.psi)}</td>
                      <td className="num">{fx(c.qd)}</td>
                    </tr>
                  ))}
                  {!r.contributi.length && (
                    <tr>
                      <td colSpan={6} className="faint">
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
          </div>
        </section>
      </div>

      {/* ── comandi: in fascia sotto i diagrammi su PC, in fondo su cellulare ─ */}
      <div className="soll-col soll-comandi">
        <section className="panel">
          <div className="panel-body" style={{ paddingTop: 12 }}>
            <div className="section-title">Schema di calcolo</div>

            <Menu id="soll_schema" label="Schema statico">
              <select
                id="soll_schema"
                className="input"
                value={inp.schema}
                onChange={(e) => set({ schema: e.target.value as SchemaId })}
              >
                {SCHEMI.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Menu>
            <div className="schema-preview" title={schema.note}>
              <MiniSchema id={inp.schema} />
              <span className="nota">{schema.note}</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-body" style={{ paddingTop: 12 }}>
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
                ? ' In verticale i carichi gravitazionali diventano sforzo normale sull’area di influenza.'
                : ' In orizzontale tutti i carichi agiscono trasversalmente sull’interasse.'}
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-body" style={{ paddingTop: 12 }}>
            <div className="section-title">Geometria e carichi</div>
            <div className="fields fields-fitti fields-compatti">
              <Field
                id="soll_L"
                tab="sollecitazioni"
                label={verticale ? 'Altezza H' : 'Luce di calcolo L'}
                unit="m"
                errore={err.L}
                dettaglio={{
                  formula: `Schema ${schema.label} su luce L = ${fx(r.L)} m`,
                  ref: 'Soluzioni di travi elementari variamente caricate',
                }}
              >
                <NumInput id="soll_L" value={inp.L} errore={!!err.L} onChange={(v) => set({ L: v })} />
              </Field>

              <Field
                id="soll_i"
                tab="sollecitazioni"
                label="Interasse"
                unit="m"
                errore={err.interasse}
                dettaglio={{
                  formula: `q = Σ (γ · ψ · qk) · i = ${fx(r.q)} kN/m — larghezza di influenza`,
                  ref: 'NTC2018 §2.5.3 — γG1 1.30, γG2 1.50, γQ 1.50 (Tab. 2.6.I, A1-STR)',
                  coeffs: r.contributi.map((c) => ({
                    k: c.sorgente.label,
                    v: `${fx(c.qd)} kN/m²`,
                  })),
                }}
              >
                <NumInput
                  id="soll_i"
                  value={inp.interasse}
                  errore={!!err.interasse}
                  onChange={(v) => set({ interasse: v })}
                />
              </Field>

              {verticale && (
                <Field
                  id="soll_A"
                  tab="sollecitazioni"
                  label="Area di influenza"
                  unit="m²"
                  errore={err.areaInfluenza}
                  dettaglio={{
                    formula: `N = Σ (γ · ψ · qk) · A = ${fx(r.N, 1)} kN`,
                    ref: 'NTC2018 §2.5.3',
                  }}
                >
                  <NumInput
                    id="soll_A"
                    value={inp.areaInfluenza}
                    errore={!!err.areaInfluenza}
                    onChange={(v) => set({ areaInfluenza: v })}
                  />
                </Field>
              )}

              <Field
                id="soll_pp"
                tab="sollecitazioni"
                label="Peso proprio G1"
                unit="kN/m²"
                errore={err.pp}
                dettaglio={{
                  formula: `γG1 = 1.30 in combinazione SLU sfavorevole`,
                  ref: 'NTC2018 §2.6.1 — Tab. 2.6.I',
                }}
              >
                <NumInput id="soll_pp" value={inp.pp} errore={!!err.pp} onChange={(v) => set({ pp: v })} />
              </Field>

              <Field
                id="soll_g2"
                tab="sollecitazioni"
                label="Permanenti G2"
                unit="kN/m²"
                errore={err.g2}
                dettaglio={{
                  formula: `γG2 = 1.50 in combinazione SLU sfavorevole`,
                  ref: 'NTC2018 §2.6.1 — Tab. 2.6.I',
                }}
              >
                <NumInput id="soll_g2" value={inp.g2} errore={!!err.g2} onChange={(v) => set({ g2: v })} />
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

              <Field
                id="soll_aP"
                tab="sollecitazioni"
                label="Ascissa di P"
                unit="m"
                errore={err.aP}
              >
                <NumInput id="soll_aP" value={inp.aP} errore={!!err.aP} onChange={(v) => set({ aP: v })} />
              </Field>

            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-body" style={{ paddingTop: 12 }}>
            <div className="section-title">Momento d'inerzia — sezione resistente</div>

            <Seg<SezioneMateriale>
              label="Supporto"
              value={inp.sezioneMateriale}
              onChange={(v) => set({ sezioneMateriale: v })}
              options={[
                { id: 'manuale', label: 'Manuale' },
                { id: 'cls', label: 'C.a. — b×h' },
                { id: 'acciaio', label: 'Acciaio — profilo' },
              ]}
            />

            {inp.sezioneMateriale === 'manuale' && (
              <div className="fields fields-fitti fields-compatti" style={{ marginTop: 10 }}>
                <Field
                  id="soll_E"
                  tab="sollecitazioni"
                  label="Modulo elastico E"
                  unit="MPa"
                  errore={err.E}
                  dettaglio={{
                    formula: `EJ = E · J = ${fx(num(inp.E), 0)} MPa · ${fx(num(inp.J), 0)} cm⁴ = ${fx(r.EJ, 0)} kNm²`,
                    ref: 'NTC2018 §4.1.1.1 (Ecm) / §4.2.1 (E acciaio)',
                  }}
                >
                  <NumInput id="soll_E" value={inp.E} errore={!!err.E} onChange={(v) => set({ E: v })} />
                </Field>

                <Field
                  id="soll_J"
                  tab="sollecitazioni"
                  label="Momento d'inerzia J"
                  unit="cm⁴"
                  errore={err.J}
                  dettaglio={{
                    formula: `f = ${fx(Math.abs(t.fmax.val) * 1000, 2)} mm  →  deformabilità = ${verticale ? 'H' : 'L'}/${Number.isFinite(t.Lsuf) ? fx(t.Lsuf, 0) : '∞'}`,
                    ref: 'NTC2018 §4.1.2.2.2 — limiti di deformabilità',
                  }}
                >
                  <NumInput id="soll_J" value={inp.J} errore={!!err.J} onChange={(v) => set({ J: v })} />
                </Field>
              </div>
            )}

            {inp.sezioneMateriale === 'cls' && (
              <div className="fields fields-fitti fields-compatti" style={{ marginTop: 10 }}>
                <Field id="soll_sez_cls" tab="sollecitazioni" label="Classe di calcestruzzo">
                  <Select
                    id="soll_sez_cls"
                    value={inp.sezioneCls}
                    options={Object.keys(CLS)}
                    onChange={(v) => set({ sezioneCls: v })}
                  />
                </Field>
                <Field id="soll_sez_b" tab="sollecitazioni" label="Base b" unit="mm">
                  <NumInput id="soll_sez_b" value={inp.sezioneB} onChange={(v) => set({ sezioneB: v })} />
                </Field>
                <Field id="soll_sez_h" tab="sollecitazioni" label="Altezza h" unit="mm">
                  <NumInput id="soll_sez_h" value={inp.sezioneH} onChange={(v) => set({ sezioneH: v })} />
                </Field>
                <Field
                  id="soll_sez_out"
                  tab="sollecitazioni"
                  label="E, J calcolati"
                  dettaglio={{
                    formula: `Ecm = 22000·((fck+8)/10)^0.3 = ${fx(r.E, 0)} MPa;  J = b·h³/12 = ${fx(r.J, 0)} cm⁴`,
                    ref: 'NTC2018 §11.2.10.3 — sezione rettangolare non fessurata',
                  }}
                >
                  <input className="input num" readOnly value={`E ${fx(r.E, 0)} · J ${fx(r.J, 0)}`} />
                </Field>
              </div>
            )}

            {inp.sezioneMateriale === 'acciaio' && (
              <div className="fields fields-fitti fields-compatti" style={{ marginTop: 10 }}>
                <Field id="soll_sez_tipo" tab="sollecitazioni" label="Tipo di profilo">
                  <select
                    id="soll_sez_tipo"
                    className="input"
                    value={inp.sezioneTipoProfilo}
                    onChange={(e) => {
                      const tipo = e.target.value as TipoProfilo;
                      set({ sezioneTipoProfilo: tipo, sezioneProfilo: taglieDisponibili(tipo)[0] ?? '' });
                    }}
                  >
                    {TIPI_PROFILO.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="soll_sez_profilo" tab="sollecitazioni" label="Profilo">
                  <Select
                    id="soll_sez_profilo"
                    value={inp.sezioneProfilo}
                    options={taglieDisponibili(inp.sezioneTipoProfilo)}
                    onChange={(v) => set({ sezioneProfilo: v })}
                  />
                </Field>
                <Field
                  id="soll_sez_out2"
                  tab="sollecitazioni"
                  label="E, J del profilo"
                  dettaglio={{
                    formula: `E = 210000 MPa;  J = Ix = ${fx(r.J, 0)} cm⁴`,
                    ref: 'NTC2018 §4.2.1 — profilo dal sagomario acciaio',
                  }}
                >
                  <input className="input num" readOnly value={`E ${fx(r.E, 0)} · J ${fx(r.J, 0)}`} />
                </Field>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
