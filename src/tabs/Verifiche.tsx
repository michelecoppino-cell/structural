import { useEffect } from 'react';
import { Cube, Wrench, Tree, GridFour } from '@phosphor-icons/react';
import { useStore, type MaterialeId } from '../state/store';
import { calcolaAzioni } from '../calc/azioni';
import { calcolaSollecitazioni } from '../calc/sollecitazioni';
import { verificaTaglioArmato, verificaTaglioNonArmato } from '../calc/verifiche';
import { CLS, DIAMETRI } from '../data/materiali';
import { Accordion, Bar, Field, NumInput, Output, Select, Seg, Verdict } from '../components/ui';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

const MATERIALI: { id: MaterialeId; label: string; icon: React.ReactNode }[] = [
  { id: 'cls', label: 'Calcestruzzo', icon: <Cube size={14} /> },
  { id: 'acciaio', label: 'Acciaio', icon: <Wrench size={14} /> },
  { id: 'legno', label: 'Legno', icon: <Tree size={14} /> },
  { id: 'muratura', label: 'Muratura', icon: <GridFour size={14} /> },
];

export default function Verifiche() {
  const { state, dispatch } = useStore();
  const v = state.verifiche;

  // VEd allineato al taglio massimo calcolato nella scheda Sollecitazioni
  const az = calcolaAzioni(state.azioni);
  const soll = calcolaSollecitazioni(state.sollecitazioni, az);
  const VEdSoll = Math.abs(soll.trave.VmaxAbs.val);

  useEffect(() => {
    if (!v.collegaSollecitazioni) return;
    const val = VEdSoll.toFixed(1);
    if (v.taglioNonArmato.VEd !== val) dispatch({ type: 'taglioNonArmato', patch: { VEd: val } });
    if (v.taglioArmato.VEd !== val) dispatch({ type: 'taglioArmato', patch: { VEd: val } });
  }, [VEdSoll, v.collegaSollecitazioni, v.taglioNonArmato.VEd, v.taglioArmato.VEd, dispatch]);

  const na = verificaTaglioNonArmato(v.taglioNonArmato);
  const ar = verificaTaglioArmato(v.taglioArmato);
  const setNA = (patch: Partial<typeof v.taglioNonArmato>) => dispatch({ type: 'taglioNonArmato', patch });
  const setAR = (patch: Partial<typeof v.taglioArmato>) => dispatch({ type: 'taglioArmato', patch });

  return (
    <div className="stack">
      <div className="row-wrap">
        <Seg<MaterialeId>
          label="Materiale"
          value={v.materiale}
          onChange={(m) => dispatch({ type: 'verifiche', patch: { materiale: m } })}
          options={MATERIALI}
        />
        <button
          type="button"
          className="chip-toggle"
          aria-pressed={v.collegaSollecitazioni}
          onClick={() =>
            dispatch({ type: 'verifiche', patch: { collegaSollecitazioni: !v.collegaSollecitazioni } })
          }
          title="Usa il taglio massimo calcolato nella scheda Sollecitazioni"
        >
          VEd da Sollecitazioni
          <span className="val">{fx(VEdSoll, 1)} kN</span>
        </button>
      </div>

      {v.materiale === 'cls' && (
        <>
          {/* ── §4.1.2.3.5.1 ─────────────────────────────────────────────── */}
          <Accordion
            id="taglio_non_armato"
            title="Taglio — elementi senza armature trasversali"
            icon={<Cube size={18} />}
            hint={`VRd ${fx(na.VRd, 1)} kN · sfruttamento ${fx(na.esito.sfruttamento * 100, 1)}%`}
          >
            <div className="row-wrap" style={{ marginBottom: 10 }}>
              <Verdict ok={na.esito.ok} margine={na.esito.margine} />
              <Bar sfruttamento={na.esito.sfruttamento} />
              <span className="note">NTC2018 §4.1.2.3.5.1 — eq. 4.1.23</span>
            </div>

            <div className="fields">
              <Field
                id="na_VEd"
                tab="verifiche"
                label="Taglio agente di progetto VEd"
                unit="kN"
                dettaglio={{
                  formula: `VEd / VRd = ${fx(na.esito.sfruttamento, 3)}`,
                  ref: 'NTC2018 §4.1.2.3.5.1',
                }}
              >
                <NumInput
                  id="na_VEd"
                  value={v.taglioNonArmato.VEd}
                  disabled={v.collegaSollecitazioni}
                  onChange={(x) => setNA({ VEd: x })}
                />
              </Field>

              <Field
                id="na_NEd"
                tab="verifiche"
                label="Sforzo assiale di progetto NEd"
                unit="kN"
                dettaglio={{
                  formula: `σcp = NEd/Ac = ${fx(na.sigmaCp, 3)} N/mm² (limitata a 0.2·fcd = ${fx(0.2 * na.fcd, 2)})`,
                  ref: 'NTC2018 §4.1.2.3.5.1',
                }}
              >
                <NumInput id="na_NEd" value={v.taglioNonArmato.NEd} onChange={(x) => setNA({ NEd: x })} />
              </Field>

              <Field
                id="na_cls"
                tab="verifiche"
                label="Classe di calcestruzzo"
                dettaglio={{
                  formula: `fcd = fck · 0.85 / γc = ${fx(na.fck, 0)} · 0.85 / ${v.taglioNonArmato.gammaC} = ${fx(na.fcd)} N/mm²`,
                  ref: 'NTC2018 §4.1.2.1.1',
                  coeffs: [
                    { k: 'Rck', v: `${fx(na.rck, 0)} N/mm²` },
                    { k: 'fck', v: `${fx(na.fck, 0)} N/mm²` },
                  ],
                }}
              >
                <Select
                  id="na_cls"
                  value={v.taglioNonArmato.cls}
                  options={Object.keys(CLS)}
                  onChange={(x) => setNA({ cls: x })}
                />
              </Field>

              <Field id="na_gc" tab="verifiche" label="Coefficiente parziale γc" unit="—">
                <NumInput id="na_gc" value={v.taglioNonArmato.gammaC} onChange={(x) => setNA({ gammaC: x })} />
              </Field>

              <Field id="na_bw" tab="verifiche" label="Larghezza minima bw" unit="mm">
                <NumInput id="na_bw" value={v.taglioNonArmato.bw} onChange={(x) => setNA({ bw: x })} />
              </Field>

              <Field id="na_h" tab="verifiche" label="Altezza sezione h" unit="mm">
                <NumInput id="na_h" value={v.taglioNonArmato.h} onChange={(x) => setNA({ h: x })} />
              </Field>

              <Field
                id="na_d"
                tab="verifiche"
                label="Altezza utile d"
                unit="mm"
                dettaglio={{
                  formula: `k = 1 + √(200/d) ≤ 2 = ${fx(na.k, 3)}`,
                  ref: 'NTC2018 §4.1.2.3.5.1',
                }}
              >
                <NumInput id="na_d" value={v.taglioNonArmato.d} onChange={(x) => setNA({ d: x })} />
              </Field>

              <Field
                id="na_n1"
                tab="verifiche"
                label="Armatura tesa — n. barre ⌀1"
                unit="n"
                dettaglio={{
                  formula: `As = n1·A(⌀1) + n2·A(⌀2) = ${fx(na.As, 0)} mm²;  ρ1 = As/(bw·d) = ${fx(na.rho1, 5)}`,
                  ref: 'NTC2018 §4.1.2.3.5.1 — ρ1 ≤ 0.02',
                  coeffs: [
                    { k: 'As', v: `${fx(na.As, 0)} mm²` },
                    { k: 'ρ1', v: fx(na.rho1, 5) },
                  ],
                }}
              >
                <NumInput id="na_n1" value={v.taglioNonArmato.n1} onChange={(x) => setNA({ n1: x })} />
              </Field>

              <Field id="na_phi1" tab="verifiche" label="Diametro ⌀1" unit="mm">
                <Select
                  id="na_phi1"
                  value={v.taglioNonArmato.phi1}
                  options={DIAMETRI.map(String)}
                  onChange={(x) => setNA({ phi1: x })}
                />
              </Field>

              <Field id="na_n2" tab="verifiche" label="Armatura tesa — n. barre ⌀2" unit="n">
                <NumInput id="na_n2" value={v.taglioNonArmato.n2} onChange={(x) => setNA({ n2: x })} />
              </Field>

              <Field id="na_phi2" tab="verifiche" label="Diametro ⌀2" unit="mm">
                <Select
                  id="na_phi2"
                  value={v.taglioNonArmato.phi2}
                  options={DIAMETRI.map(String)}
                  onChange={(x) => setNA({ phi2: x })}
                />
              </Field>

              <Field
                id="na_vmin"
                tab="verifiche"
                label="Resistenza minima garantita νmin"
                unit="N/mm²"
                dettaglio={{
                  formula: `VRd = max[ (0.18·k·(100·ρ1·fck)^⅓/γc + 0.15·σcp)·bw·d ; (νmin + 0.15·σcp)·bw·d ] = ${fx(na.VRd, 1)} kN`,
                  ref: 'NTC2018 §4.1.2.3.5.1 — eq. 4.1.23',
                  coeffs: [
                    { k: 'νmin', v: fx(na.vmin, 4) },
                    { k: 'ramo', v: na.ramo === 'minimo' ? 'νmin' : 'ρ1' },
                  ],
                }}
              >
                <input className="input num" readOnly value={fx(na.vmin, 4)} />
              </Field>
            </div>

            {na.rho1Eccessivo && (
              <p className="note" style={{ color: 'var(--warn)' }}>
                Attenzione: percentuale di armatura longitudinale &gt; 2% — ρ1 è stato limitato a 0.02.
              </p>
            )}

            <Output
              voci={[
                { k: 'k', v: fx(na.k, 3) },
                { k: 'ρ1', v: fx(na.rho1, 5) },
                { k: 'σcp', v: fx(na.sigmaCp, 3), u: 'N/mm²' },
                { k: 'VRd', v: fx(na.VRd, 1), u: 'kN' },
                { k: 'τRd', v: fx(na.tauRd, 3), u: 'N/mm²' },
                { k: 'VEd/VRd', v: fx(na.esito.sfruttamento, 3) },
              ]}
            />
          </Accordion>

          {/* ── §4.1.2.3.5.2 ─────────────────────────────────────────────── */}
          <Accordion
            id="taglio_armato"
            title="Taglio — elementi con armature trasversali"
            icon={<Cube size={18} />}
            hint={`VRd ${fx(ar.VRd, 1)} kN · cotϑ ${fx(ar.cotTheta, 2)} · ${ar.governa}`}
          >
            <div className="row-wrap" style={{ marginBottom: 10 }}>
              <Verdict ok={ar.esito.ok} margine={ar.esito.margine} />
              <Bar sfruttamento={ar.esito.sfruttamento} />
              <span className="note">NTC2018 §4.1.2.3.5.2 — eq. 4.1.18 / 4.1.19</span>
            </div>

            <div className="fields">
              <Field
                id="ar_VEd"
                tab="verifiche"
                label="Taglio sollecitante VEd"
                unit="kN"
                dettaglio={{
                  formula: `VRd = min(VRsd, VRcd) = min(${fx(ar.VRsd, 1)}, ${fx(ar.VRcd, 1)}) = ${fx(ar.VRd, 1)} kN`,
                  ref: 'NTC2018 §4.1.2.3.5.2',
                }}
              >
                <NumInput
                  id="ar_VEd"
                  value={v.taglioArmato.VEd}
                  disabled={v.collegaSollecitazioni}
                  onChange={(x) => setAR({ VEd: x })}
                />
              </Field>

              <Field
                id="ar_NEd"
                tab="verifiche"
                label="Sforzo assiale NEd (compressione &gt; 0)"
                unit="kN"
                dettaglio={{
                  formula: `αc = ${fx(ar.alfaC, 3)} per σcp/fcd = ${fx(ar.fcd > 0 ? ar.sigmaCp / ar.fcd : 0, 3)}`,
                  ref: 'NTC2018 §4.1.2.3.5.2',
                }}
              >
                <NumInput id="ar_NEd" value={v.taglioArmato.NEd} onChange={(x) => setAR({ NEd: x })} />
              </Field>

              <Field
                id="ar_cls"
                tab="verifiche"
                label="Classe di calcestruzzo"
                dettaglio={{
                  formula: `f'cd = 0.5 · fcd = ${fx(ar.f1cd)} N/mm²`,
                  ref: 'NTC2018 §4.1.2.3.5.2',
                }}
              >
                <Select
                  id="ar_cls"
                  value={v.taglioArmato.cls}
                  options={Object.keys(CLS)}
                  onChange={(x) => setAR({ cls: x })}
                />
              </Field>

              <Field id="ar_fyd" tab="verifiche" label="Snervamento di progetto fyd" unit="N/mm²">
                <NumInput id="ar_fyd" value={v.taglioArmato.fyd} onChange={(x) => setAR({ fyd: x })} />
              </Field>

              <Field id="ar_bw" tab="verifiche" label="Larghezza reagente bw" unit="mm">
                <NumInput id="ar_bw" value={v.taglioArmato.bw} onChange={(x) => setAR({ bw: x })} />
              </Field>

              <Field id="ar_h" tab="verifiche" label="Altezza sezione h" unit="mm">
                <NumInput id="ar_h" value={v.taglioArmato.h} onChange={(x) => setAR({ h: x })} />
              </Field>

              <Field
                id="ar_c"
                tab="verifiche"
                label="Copriferro c"
                unit="mm"
                dettaglio={{
                  formula: `d = h − ⌀staffa − ⌀long/2 − c = ${fx(ar.d, 1)} mm`,
                  ref: 'NTC2018 §4.1.6.1.3',
                }}
              >
                <NumInput id="ar_c" value={v.taglioArmato.c} onChange={(x) => setAR({ c: x })} />
              </Field>

              <Field id="ar_phiL" tab="verifiche" label="Diametro armatura longitudinale" unit="mm">
                <Select
                  id="ar_phiL"
                  value={v.taglioArmato.phiLong}
                  options={DIAMETRI.map(String)}
                  onChange={(x) => setAR({ phiLong: x })}
                />
              </Field>

              <Field
                id="ar_phiS"
                tab="verifiche"
                label="Diametro staffa"
                unit="mm"
                dettaglio={{
                  formula: `Asw = π·⌀²/4 · nb = ${fx(ar.Asw, 1)} mm²`,
                  ref: 'NTC2018 §4.1.6.1.1',
                }}
              >
                <Select
                  id="ar_phiS"
                  value={v.taglioArmato.phiStaffa}
                  options={DIAMETRI.map(String)}
                  onChange={(x) => setAR({ phiStaffa: x })}
                />
              </Field>

              <Field id="ar_nb" tab="verifiche" label="Numero di bracci" unit="n">
                <NumInput id="ar_nb" value={v.taglioArmato.nBracci} onChange={(x) => setAR({ nBracci: x })} />
              </Field>

              <Field
                id="ar_s"
                tab="verifiche"
                label="Passo delle staffe s"
                unit="mm"
                dettaglio={{
                  formula: `ωsw = (Asw·fyd)/(bw·s·fcd) = ${fx(ar.omegaSw, 5)};  cotϑ* = √(ν·αc/ωsw − 1) = ${fx(ar.cotThetaStar, 3)}`,
                  ref: 'NTC2018 §4.1.2.3.5.2 — 1 ≤ cotϑ ≤ 2.5',
                  coeffs: [
                    { k: 'cotϑ adottata', v: fx(ar.cotTheta, 3) },
                    { k: 'ϑ', v: `${fx(ar.theta, 1)}°` },
                    { k: 'passo max', v: `${fx(ar.passoMax, 0)} mm` },
                  ],
                }}
              >
                <NumInput id="ar_s" value={v.taglioArmato.passo} onChange={(x) => setAR({ passo: x })} />
              </Field>

              <Field
                id="ar_alfa"
                tab="verifiche"
                label="Inclinazione delle staffe α"
                unit="°"
                dettaglio={{
                  formula: `VRsd = 0.9·d·(Asw/s)·fyd·(cotα + cotϑ)·sinα = ${fx(ar.VRsd, 1)} kN`,
                  ref: 'NTC2018 §4.1.2.3.5.2 — eq. 4.1.18',
                }}
              >
                <NumInput id="ar_alfa" value={v.taglioArmato.alfa} onChange={(x) => setAR({ alfa: x })} />
              </Field>
            </div>

            <div className="table-scroll" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Verifica</th>
                    <th className="num">Domanda</th>
                    <th className="num">Capacità</th>
                    <th>Esito</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Taglio — VEd ≤ VRd</td>
                    <td className="num">{fx(ar.esito.sfruttamento * ar.VRd, 1)} kN</td>
                    <td className="num">{fx(ar.VRd, 1)} kN</td>
                    <td>
                      <Verdict ok={ar.esito.ok} margine={ar.esito.margine} />
                    </td>
                  </tr>
                  <tr>
                    <td>Armatura minima — Asw,min = 1.5·bw</td>
                    <td className="num">{fx(ar.AswMin, 0)} mm²/m</td>
                    <td className="num">{fx((ar.Asw / Math.max(1, Number(v.taglioArmato.passo))) * 1000, 0)} mm²/m</td>
                    <td>
                      <Verdict ok={ar.esitoAswMin.ok} margine={ar.esitoAswMin.margine} />
                    </td>
                  </tr>
                  <tr>
                    <td>Passo massimo — min(330; 0.8·d)</td>
                    <td className="num">{v.taglioArmato.passo} mm</td>
                    <td className="num">{fx(ar.passoMax, 0)} mm</td>
                    <td>
                      <Verdict ok={ar.esitoPasso.ok} margine={ar.esitoPasso.margine} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Output
              voci={[
                { k: 'd', v: fx(ar.d, 0), u: 'mm' },
                { k: 'Asw', v: fx(ar.Asw, 1), u: 'mm²' },
                { k: 'cotϑ', v: fx(ar.cotTheta, 3) },
                { k: 'VRsd', v: fx(ar.VRsd, 1), u: 'kN' },
                { k: 'VRcd', v: fx(ar.VRcd, 1), u: 'kN' },
                { k: 'VRd', v: fx(ar.VRd, 1), u: 'kN' },
              ]}
            />
          </Accordion>
        </>
      )}

      {v.materiale !== 'cls' && (
        <div className="placeholder">
          <div className="t">{MATERIALI.find((m) => m.id === v.materiale)?.label}</div>
          <div className="d">
            {v.materiale === 'acciaio'
              ? 'Verifica di aste in acciaio (resistenza, instabilità, schiacciamento anima) — da trasporre dal foglio Verifica_aste_acciaio_rev01.xlsm, con il sagomario dei profili.'
              : v.materiale === 'legno'
                ? 'Verifiche di resistenza e deformabilità per elementi in legno secondo NTC2018 §4.4.'
                : 'Verifiche di pareti in muratura secondo NTC2018 §4.5 — pressoflessione nel piano e fuori piano, taglio.'}
          </div>
        </div>
      )}
    </div>
  );
}
