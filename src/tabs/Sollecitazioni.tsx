import { useState } from 'react';
import { ArrowsHorizontal, ArrowsVertical, Info } from '@phosphor-icons/react';
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
import { Accordion, DettaglioPanel, NumInput, Output, Seg, Select, type Dettaglio } from '../components/ui';
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

/** Campo compatto — etichetta sopra, input stretto: per la fascia comandi a riga singola. */
function MiniCampo({
  id,
  label,
  value,
  onChange,
  errore,
  select,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  errore?: string;
  select?: string[];
}) {
  return (
    <div className={`mini-campo${errore ? ' is-error' : ''}`} title={errore}>
      <label htmlFor={id}>{label}</label>
      {select ? (
        <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          {select.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <NumInput id={id} value={value} onChange={onChange} />
      )}
    </div>
  );
}

export default function Sollecitazioni() {
  const { state, dispatch } = useStore();
  const { azioni: az, sollecitazioni: r } = useCalcoli();
  const inp = state.sollecitazioni;
  const set = (patch: Partial<typeof inp>) => dispatch({ type: 'sollecitazioni', patch });
  const [geomOpen, setGeomOpen] = useState(false);

  const err = validaSollecitazioni(inp);
  const tutte = sorgenti(inp, az);
  const verticale = inp.orientamento === 'verticale';
  const t = r.trave;
  const schema = SCHEMI_BY_ID[inp.schema];

  /** Formule di tutta la fascia "geometria e carichi", riunite in un solo (i). */
  const dettaglioGeom: Dettaglio = {
    formula:
      `Schema ${schema.label} su ${verticale ? 'H' : 'L'} = ${fx(r.L)} m` +
      (verticale ? `; N = Σ(γ·ψ·qk)·A = ${fx(r.N, 1)} kN` : `; q = Σ(γ·ψ·qk)·i = ${fx(r.q)} kN/m`) +
      `; P = ${fx(num(inp.P))} kN a x = ${fx(num(inp.aP))} m`,
    ref: 'NTC2018 §2.5.3 — γG1 1.30, γG2 1.50, γQ 1.50 (Tab. 2.6.I, A1-STR)',
    coeffs: r.contributi.map((c) => ({ k: c.sorgente.label, v: `${fx(c.qd)} kN/m²` })),
  };

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

      {/* ── diagrammi: prendono tutta l'altezza che avanza, una schermata sola ── */}
      <div className="soll-col soll-risultati">
        <section className="panel panel-diagrammi">
          <div className="panel-body" style={{ paddingTop: 10 }}>
            <div className={`diagrams ${inp.orientamento}`}>
              <DiagrammaCarichi
                schema={inp.schema}
                L={r.L}
                q={r.q}
                qTri={r.wTri}
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

      {/* ── in alto a destra: risultati e sezione resistente, ad accordion ── */}
      <div className="soll-side">
        <Accordion
          id="soll-risultati"
          title="Sollecitazioni"
          hint={`M ${fx(t.MmaxAbs.val, 1)} kNm · V ${fx(t.VmaxAbs.val, 1)} kN`}
        >
          <Output
            titolo={COMBINAZIONI.find((c) => c.id === inp.combinazione)?.label ?? 'Output'}
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
                v: Number.isFinite(t.Lsuf) ? `${verticale ? 'H' : 'L'}/${fx(t.Lsuf, 0)}` : '∞',
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
                  <td colSpan={5}>{verticale ? 'q trasversale (kN/m) · N (kN)' : 'q di progetto (kN/m)'}</td>
                  <td className="num">{verticale ? `${fx(r.q)} · ${fx(r.N, 1)}` : fx(r.q)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Accordion>

        <Accordion
          id="soll-inerzia"
          title="Momento d'inerzia — sezione resistente"
          hint={`${inp.sezioneMateriale === 'manuale' ? 'manuale' : inp.sezioneMateriale === 'cls' ? 'c.a.' : 'acciaio'} · J ${fx(r.J, 0)} cm⁴`}
        >
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
              <div>
                <div className="field-row">
                  <label htmlFor="soll_E">Modulo elastico E</label>
                  <div className="field-control">
                    <NumInput id="soll_E" value={inp.E} errore={!!err.E} onChange={(v) => set({ E: v })} />
                    <span className="field-unit">MPa</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="field-row">
                  <label htmlFor="soll_J">Momento d'inerzia J</label>
                  <div className="field-control">
                    <NumInput id="soll_J" value={inp.J} errore={!!err.J} onChange={(v) => set({ J: v })} />
                    <span className="field-unit">cm⁴</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {inp.sezioneMateriale === 'cls' && (
            <div className="fields fields-fitti fields-compatti" style={{ marginTop: 10 }}>
              <div>
                <div className="field-row">
                  <label htmlFor="soll_sez_cls">Classe di calcestruzzo</label>
                  <Select
                    id="soll_sez_cls"
                    value={inp.sezioneCls}
                    options={Object.keys(CLS)}
                    onChange={(v) => set({ sezioneCls: v })}
                  />
                </div>
              </div>
              <div>
                <div className="field-row">
                  <label htmlFor="soll_sez_b">Base b</label>
                  <div className="field-control">
                    <NumInput id="soll_sez_b" value={inp.sezioneB} onChange={(v) => set({ sezioneB: v })} />
                    <span className="field-unit">mm</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="field-row">
                  <label htmlFor="soll_sez_h">Altezza h</label>
                  <div className="field-control">
                    <NumInput id="soll_sez_h" value={inp.sezioneH} onChange={(v) => set({ sezioneH: v })} />
                    <span className="field-unit">mm</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {inp.sezioneMateriale === 'acciaio' && (
            <div className="fields fields-fitti fields-compatti" style={{ marginTop: 10 }}>
              <div>
                <div className="field-row">
                  <label htmlFor="soll_sez_tipo">Tipo di profilo</label>
                  <select
                    id="soll_sez_tipo"
                    className="input"
                    value={inp.sezioneTipoProfilo}
                    onChange={(e) => {
                      const tipo = e.target.value as TipoProfilo;
                      set({ sezioneTipoProfilo: tipo, sezioneProfilo: taglieDisponibili(tipo)[0] ?? '' });
                    }}
                  >
                    {TIPI_PROFILO.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="field-row">
                  <label htmlFor="soll_sez_profilo">Profilo</label>
                  <Select
                    id="soll_sez_profilo"
                    value={inp.sezioneProfilo}
                    options={taglieDisponibili(inp.sezioneTipoProfilo)}
                    onChange={(v) => set({ sezioneProfilo: v })}
                  />
                </div>
              </div>
            </div>
          )}

          {inp.sezioneMateriale !== 'manuale' && (
            <Output voci={[{ k: 'E', v: fx(r.E, 0), u: 'MPa' }, { k: 'J', v: fx(r.J, 0), u: 'cm⁴' }]} />
          )}
        </Accordion>
      </div>

      {/* ── fascia comandi: una riga sola sotto i diagrammi ─────────────── */}
      <div className="soll-col soll-comandi">
        <section className="panel">
          <div className="panel-body" style={{ paddingTop: 12 }}>
            <div className="soll-riga-body">
              <div className="soll-blocco">
                <span className="kicker">Schema statico</span>
                <select
                  id="soll_schema"
                  className="input"
                  style={{ width: 200 }}
                  value={inp.schema}
                  onChange={(e) => set({ schema: e.target.value as SchemaId })}
                >
                  {SCHEMI.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="soll-blocco">
                <span className="kicker">&nbsp;</span>
                <div className="schema-preview" title={schema.note}>
                  <MiniSchema id={inp.schema} />
                </div>
              </div>

              <div className="soll-blocco">
                <span className="kicker">Carichi applicati</span>
                <div className="row-wrap">
                  {tutte.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="chip-toggle"
                      aria-pressed={!!inp.attive[s.id]}
                      title={`${s.descr} — ${s.ref}`}
                      onClick={() =>
                        set({
                          attive: { ...inp.attive, [s.id]: !inp.attive[s.id] } as Record<SorgenteId, boolean>,
                        })
                      }
                    >
                      {s.label}
                      <span className="val">
                        {fx(s.qk)} {s.perMetro ? 'kN/m' : 'kN/m²'}
                        {s.origine === 'azioni' ? ' ↩' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="soll-blocco">
                <span className="kicker">
                  Geometria e carichi
                  <button
                    type="button"
                    className="field-info"
                    aria-expanded={geomOpen}
                    title="Formule e riferimenti"
                    onClick={() => setGeomOpen((v) => !v)}
                  >
                    <Info size={14} />
                  </button>
                </span>
                <div className="soll-geom-grid">
                  <MiniCampo
                    id="soll_L"
                    label={verticale ? 'H (m)' : 'L (m)'}
                    value={inp.L}
                    errore={err.L}
                    onChange={(v) => set({ L: v })}
                  />
                  <MiniCampo
                    id="soll_i"
                    label="Interasse (m)"
                    value={inp.interasse}
                    errore={err.interasse}
                    onChange={(v) => set({ interasse: v })}
                  />
                  {verticale && (
                    <MiniCampo
                      id="soll_A"
                      label="Area infl. (m²)"
                      value={inp.areaInfluenza}
                      errore={err.areaInfluenza}
                      onChange={(v) => set({ areaInfluenza: v })}
                    />
                  )}
                  <MiniCampo
                    id="soll_pp"
                    label="G1 (kN/m²)"
                    value={inp.pp}
                    errore={err.pp}
                    onChange={(v) => set({ pp: v })}
                  />
                  <MiniCampo
                    id="soll_g2"
                    label="G2 (kN/m²)"
                    value={inp.g2}
                    errore={err.g2}
                    onChange={(v) => set({ g2: v })}
                  />
                  <MiniCampo id="soll_P" label="P (kN)" value={inp.P} onChange={(v) => set({ P: v })} />
                  <MiniCampo
                    id="soll_aP"
                    label="x di P (m)"
                    value={inp.aP}
                    errore={err.aP}
                    onChange={(v) => set({ aP: v })}
                  />
                </div>
              </div>
            </div>

            {geomOpen && (
              <div style={{ marginTop: 10 }}>
                <DettaglioPanel dettaglio={dettaglioGeom} />
                <p className="note" style={{ marginTop: 6 }}>
                  ↩ = valore ripreso dalla scheda Azioni.
                  {verticale
                    ? ' In verticale i carichi gravitazionali diventano sforzo normale sull’area di influenza; la spinta delle terre ha andamento triangolare lungo H.'
                    : ' In orizzontale tutti i carichi agiscono trasversalmente sull’interasse.'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
