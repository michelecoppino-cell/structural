import { Cube, Wrench, Tree, GridFour } from '@phosphor-icons/react';
import { useCalcoli, useStore, inputVerifiche, type MaterialeId } from '../state/store';
import { num } from '../calc/azioni';
import { validaTaglioArmato, validaTaglioNonArmato, valido } from '../calc/validazione';
import { CLS, DIAMETRI } from '../data/materiali';
import { Bar, Field, NumInput, Origine, Output, Select, Seg, Verdict } from '../components/ui';
import { ComandiScheda } from '../components/ComandiScheda';
import { SezioneTaglio } from '../components/Disegni';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

const MATERIALI: { id: MaterialeId; label: string; icon: React.ReactNode }[] = [
  { id: 'cls', label: 'Calcestruzzo', icon: <Cube size={14} /> },
  { id: 'acciaio', label: 'Acciaio', icon: <Wrench size={14} /> },
  { id: 'legno', label: 'Legno', icon: <Tree size={14} /> },
  { id: 'muratura', label: 'Muratura', icon: <GridFour size={14} /> },
];

/**
 * Elenco delle verifiche per materiale. La barra di schede si costruisce da
 * qui: aggiungere flessione o pressoflessione significa aggiungere una voce,
 * non toccare l'impaginazione.
 */
const VERIFICHE: Record<MaterialeId, { id: string; label: string }[]> = {
  cls: [
    { id: 'taglio-non-armato', label: 'Taglio non armato' },
    { id: 'taglio-armato', label: 'Taglio armato' },
  ],
  acciaio: [],
  legno: [],
  muratura: [],
};

export default function Verifiche() {
  const { state, dispatch } = useStore();
  const { taglioNonArmato: na, taglioArmato: ar, VEdSollecitazioni } = useCalcoli();
  const v = state.verifiche;

  // VEd è un valore derivato quando il collegamento è attivo: non viene
  // salvato nello stato, che conserva solo il numero scritto a mano.
  const inp = inputVerifiche(state, VEdSollecitazioni);
  const collegato = v.collegaSollecitazioni;

  const errNA = validaTaglioNonArmato(inp.taglioNonArmato);
  const errAR = validaTaglioArmato(inp.taglioArmato);
  const bloccoNA = !valido(errNA);
  const bloccoAR = !valido(errAR);

  const setNA = (patch: Partial<typeof inp.taglioNonArmato>) => dispatch({ type: 'taglioNonArmato', patch });
  const setAR = (patch: Partial<typeof inp.taglioArmato>) => dispatch({ type: 'taglioArmato', patch });
  const scollega = () => dispatch({ type: 'verifiche', patch: { collegaSollecitazioni: false } });

  const lista = VERIFICHE[v.materiale];
  const attiva = lista.find((x) => x.id === state.ui.verifica) ?? lista[0];

  /** Badge di provenienza del VEd, cliccabile per scollegarlo. */
  const origineVEd = collegato ? (
    <Origine
      testo={`da Sollecitazioni · ${fx(VEdSollecitazioni, 1)} kN`}
      titolo="Valore ripreso dal taglio massimo della scheda Sollecitazioni — premi per scollegarlo"
      ripreso
      onClick={scollega}
    />
  ) : (
    <Origine testo="inserito a mano" />
  );

  const sfruttamento = (id: string) =>
    id === 'taglio-non-armato'
      ? bloccoNA
        ? '—'
        : `${fx(na.esito.sfruttamento * 100, 0)}%`
      : bloccoAR
        ? '—'
        : `${fx(ar.esito.sfruttamento * 100, 0)}%`;

  return (
    <div className="stack">
      {/* ── comandi della scheda, in testa ─────────────────────────────── */}
      <ComandiScheda>
        <Seg<MaterialeId>
          label="Materiale"
          value={v.materiale}
          onChange={(m) => dispatch({ type: 'verifiche', patch: { materiale: m } })}
          options={MATERIALI}
        />
        {!!lista.length && attiva && (
          <Seg<string>
            label="Verifica"
            ruolo="tabs"
            idPannello="pannello-verifica"
            value={attiva.id}
            onChange={(id) => dispatch({ type: 'verificaAttiva', id })}
            options={lista.map((x) => ({ ...x, nota: sfruttamento(x.id) }))}
          />
        )}
        <button
          type="button"
          className="chip-toggle"
          aria-pressed={collegato}
          onClick={() => dispatch({ type: 'verifiche', patch: { collegaSollecitazioni: !collegato } })}
          title="Usa il taglio massimo calcolato nella scheda Sollecitazioni"
        >
          VEd da Sollecitazioni
          <span className="val">{fx(VEdSollecitazioni, 1)} kN</span>
        </button>
      </ComandiScheda>

      {v.materiale === 'cls' && attiva?.id === 'taglio-non-armato' && (
        <section className="panel" id="pannello-verifica" role="tabpanel" aria-labelledby="tab-taglio-non-armato">
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <div className="esito-testa">
              <Verdict ok={na.esito.ok} margine={na.esito.margine} bloccato={bloccoNA} />
              <Bar sfruttamento={na.esito.sfruttamento} bloccato={bloccoNA} />
              <span className="note">
                Taglio — elementi senza armature trasversali · NTC2018 §4.1.2.3.5.1, eq. 4.1.23
              </span>
            </div>

            <div className="panel-split">
              <div className="fields">
                <Field
                  id="na_VEd"
                  tab="verifiche"
                  label="Taglio agente di progetto VEd"
                  unit="kN"
                  errore={errNA.VEd}
                  origine={origineVEd}
                  dettaglio={{
                    formula: `VEd / VRd = ${fx(na.esito.sfruttamento, 3)}`,
                    ref: 'NTC2018 §4.1.2.3.5.1',
                  }}
                >
                  <NumInput
                    id="na_VEd"
                    value={inp.taglioNonArmato.VEd}
                    disabled={collegato}
                    errore={!!errNA.VEd}
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
                  <NumInput id="na_NEd" value={inp.taglioNonArmato.NEd} onChange={(x) => setNA({ NEd: x })} />
                </Field>

                <Field
                  id="na_cls"
                  tab="verifiche"
                  label="Classe di calcestruzzo"
                  dettaglio={{
                    formula: `fcd = fck · 0.85 / γc = ${fx(na.fck, 0)} · 0.85 / ${inp.taglioNonArmato.gammaC} = ${fx(na.fcd)} N/mm²`,
                    ref: 'NTC2018 §4.1.2.1.1',
                    coeffs: [
                      { k: 'Rck', v: `${fx(na.rck, 0)} N/mm²` },
                      { k: 'fck', v: `${fx(na.fck, 0)} N/mm²` },
                    ],
                  }}
                >
                  <Select
                    id="na_cls"
                    value={inp.taglioNonArmato.cls}
                    options={Object.keys(CLS)}
                    onChange={(x) => setNA({ cls: x })}
                  />
                </Field>

                <Field id="na_gc" tab="verifiche" label="Coefficiente parziale γc" unit="—" errore={errNA.gammaC}>
                  <NumInput
                    id="na_gc"
                    value={inp.taglioNonArmato.gammaC}
                    errore={!!errNA.gammaC}
                    onChange={(x) => setNA({ gammaC: x })}
                  />
                </Field>

                <Field id="na_bw" tab="verifiche" label="Larghezza minima bw" unit="mm" errore={errNA.bw}>
                  <NumInput
                    id="na_bw"
                    value={inp.taglioNonArmato.bw}
                    errore={!!errNA.bw}
                    onChange={(x) => setNA({ bw: x })}
                  />
                </Field>

                <Field id="na_h" tab="verifiche" label="Altezza sezione h" unit="mm" errore={errNA.h}>
                  <NumInput
                    id="na_h"
                    value={inp.taglioNonArmato.h}
                    errore={!!errNA.h}
                    onChange={(x) => setNA({ h: x })}
                  />
                </Field>

                <Field
                  id="na_d"
                  tab="verifiche"
                  label="Altezza utile d"
                  unit="mm"
                  errore={errNA.d}
                  dettaglio={{
                    formula: `k = 1 + √(200/d) ≤ 2 = ${fx(na.k, 3)}`,
                    ref: 'NTC2018 §4.1.2.3.5.1',
                  }}
                >
                  <NumInput
                    id="na_d"
                    value={inp.taglioNonArmato.d}
                    errore={!!errNA.d}
                    onChange={(x) => setNA({ d: x })}
                  />
                </Field>

                <Field
                  id="na_n1"
                  tab="verifiche"
                  label="Armatura tesa — n. barre ⌀1"
                  unit="n"
                  errore={errNA.n1}
                  dettaglio={{
                    formula: `As = n1·A(⌀1) + n2·A(⌀2) = ${fx(na.As, 0)} mm²;  ρ1 = As/(bw·d) = ${fx(na.rho1, 5)}`,
                    ref: 'NTC2018 §4.1.2.3.5.1 — ρ1 ≤ 0.02',
                    coeffs: [
                      { k: 'As', v: `${fx(na.As, 0)} mm²` },
                      { k: 'ρ1', v: fx(na.rho1, 5) },
                    ],
                  }}
                >
                  <NumInput
                    id="na_n1"
                    value={inp.taglioNonArmato.n1}
                    errore={!!errNA.n1}
                    onChange={(x) => setNA({ n1: x })}
                  />
                </Field>

                <Field id="na_phi1" tab="verifiche" label="Diametro ⌀1" unit="mm">
                  <Select
                    id="na_phi1"
                    value={inp.taglioNonArmato.phi1}
                    options={DIAMETRI.map(String)}
                    onChange={(x) => setNA({ phi1: x })}
                  />
                </Field>

                <Field
                  id="na_n2"
                  tab="verifiche"
                  label="Armatura tesa — n. barre ⌀2"
                  unit="n"
                  errore={errNA.n2}
                >
                  <NumInput
                    id="na_n2"
                    value={inp.taglioNonArmato.n2}
                    errore={!!errNA.n2}
                    onChange={(x) => setNA({ n2: x })}
                  />
                </Field>

                <Field id="na_phi2" tab="verifiche" label="Diametro ⌀2" unit="mm">
                  <Select
                    id="na_phi2"
                    value={inp.taglioNonArmato.phi2}
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

              <div className="col-aside">
                <SezioneTaglio
                  bw={num(inp.taglioNonArmato.bw)}
                  h={num(inp.taglioNonArmato.h)}
                  d={num(inp.taglioNonArmato.d)}
                  phiLong={num(inp.taglioNonArmato.phi1)}
                  nBarre={num(inp.taglioNonArmato.n1)}
                />

                {na.rho1Eccessivo && (
                  <p className="note" style={{ color: 'var(--warn)' }}>
                    Percentuale di armatura longitudinale &gt; 2% — ρ1 è stato limitato a 0.02.
                  </p>
                )}

                <Output
                  voci={[
                    { k: 'k', v: fx(na.k, 3) },
                    { k: 'ρ1', v: fx(na.rho1, 5) },
                    { k: 'σcp', v: fx(na.sigmaCp, 3), u: 'N/mm²' },
                    { k: 'VRd', v: fx(na.VRd, 1), u: 'kN' },
                    { k: 'τRd', v: fx(na.tauRd, 3), u: 'N/mm²' },
                    { k: 'VEd/VRd', v: bloccoNA ? '—' : fx(na.esito.sfruttamento, 3) },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {v.materiale === 'cls' && attiva?.id === 'taglio-armato' && (
        <section className="panel" id="pannello-verifica" role="tabpanel" aria-labelledby="tab-taglio-armato">
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <div className="esito-testa">
              <Verdict ok={ar.esito.ok} margine={ar.esito.margine} bloccato={bloccoAR} />
              <Bar sfruttamento={ar.esito.sfruttamento} bloccato={bloccoAR} />
              <span className="note">
                Taglio — elementi con armature trasversali · NTC2018 §4.1.2.3.5.2, eq. 4.1.18 / 4.1.19
              </span>
            </div>

            <div className="panel-split">
              <div className="fields">
                <Field
                  id="ar_VEd"
                  tab="verifiche"
                  label="Taglio sollecitante VEd"
                  unit="kN"
                  errore={errAR.VEd}
                  origine={origineVEd}
                  dettaglio={{
                    formula: `VRd = min(VRsd, VRcd) = min(${fx(ar.VRsd, 1)}, ${fx(ar.VRcd, 1)}) = ${fx(ar.VRd, 1)} kN`,
                    ref: 'NTC2018 §4.1.2.3.5.2',
                  }}
                >
                  <NumInput
                    id="ar_VEd"
                    value={inp.taglioArmato.VEd}
                    disabled={collegato}
                    errore={!!errAR.VEd}
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
                  <NumInput id="ar_NEd" value={inp.taglioArmato.NEd} onChange={(x) => setAR({ NEd: x })} />
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
                    value={inp.taglioArmato.cls}
                    options={Object.keys(CLS)}
                    onChange={(x) => setAR({ cls: x })}
                  />
                </Field>

                <Field
                  id="ar_fyd"
                  tab="verifiche"
                  label="Snervamento di progetto fyd"
                  unit="N/mm²"
                  errore={errAR.fyd}
                >
                  <NumInput
                    id="ar_fyd"
                    value={inp.taglioArmato.fyd}
                    errore={!!errAR.fyd}
                    onChange={(x) => setAR({ fyd: x })}
                  />
                </Field>

                <Field id="ar_bw" tab="verifiche" label="Larghezza reagente bw" unit="mm" errore={errAR.bw}>
                  <NumInput
                    id="ar_bw"
                    value={inp.taglioArmato.bw}
                    errore={!!errAR.bw}
                    onChange={(x) => setAR({ bw: x })}
                  />
                </Field>

                <Field id="ar_h" tab="verifiche" label="Altezza sezione h" unit="mm" errore={errAR.h}>
                  <NumInput
                    id="ar_h"
                    value={inp.taglioArmato.h}
                    errore={!!errAR.h}
                    onChange={(x) => setAR({ h: x })}
                  />
                </Field>

                <Field
                  id="ar_c"
                  tab="verifiche"
                  label="Copriferro c"
                  unit="mm"
                  errore={errAR.c}
                  dettaglio={{
                    formula: `d = h − ⌀staffa − ⌀long/2 − c = ${fx(ar.d, 1)} mm`,
                    ref: 'NTC2018 §4.1.6.1.3',
                  }}
                >
                  <NumInput
                    id="ar_c"
                    value={inp.taglioArmato.c}
                    errore={!!errAR.c}
                    onChange={(x) => setAR({ c: x })}
                  />
                </Field>

                <Field id="ar_phiL" tab="verifiche" label="Diametro armatura longitudinale" unit="mm">
                  <Select
                    id="ar_phiL"
                    value={inp.taglioArmato.phiLong}
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
                    value={inp.taglioArmato.phiStaffa}
                    options={DIAMETRI.map(String)}
                    onChange={(x) => setAR({ phiStaffa: x })}
                  />
                </Field>

                <Field id="ar_nb" tab="verifiche" label="Numero di bracci" unit="n" errore={errAR.nBracci}>
                  <NumInput
                    id="ar_nb"
                    value={inp.taglioArmato.nBracci}
                    errore={!!errAR.nBracci}
                    onChange={(x) => setAR({ nBracci: x })}
                  />
                </Field>

                <Field
                  id="ar_s"
                  tab="verifiche"
                  label="Passo delle staffe s"
                  unit="mm"
                  errore={errAR.passo}
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
                  <NumInput
                    id="ar_s"
                    value={inp.taglioArmato.passo}
                    errore={!!errAR.passo}
                    onChange={(x) => setAR({ passo: x })}
                  />
                </Field>

                <Field
                  id="ar_alfa"
                  tab="verifiche"
                  label="Inclinazione delle staffe α"
                  unit="°"
                  errore={errAR.alfa}
                  dettaglio={{
                    formula: `VRsd = 0.9·d·(Asw/s)·fyd·(cotα + cotϑ)·sinα = ${fx(ar.VRsd, 1)} kN`,
                    ref: 'NTC2018 §4.1.2.3.5.2 — eq. 4.1.18',
                  }}
                >
                  <NumInput
                    id="ar_alfa"
                    value={inp.taglioArmato.alfa}
                    errore={!!errAR.alfa}
                    onChange={(x) => setAR({ alfa: x })}
                  />
                </Field>
              </div>

              <div className="col-aside">
                <SezioneTaglio
                  bw={num(inp.taglioArmato.bw)}
                  h={num(inp.taglioArmato.h)}
                  d={ar.d}
                  c={num(inp.taglioArmato.c)}
                  phiStaffa={num(inp.taglioArmato.phiStaffa)}
                  phiLong={num(inp.taglioArmato.phiLong)}
                  nBarre={num(inp.taglioArmato.nBracci) + 1}
                  passo={num(inp.taglioArmato.passo)}
                  staffe
                />

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

                <div className="table-scroll">
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
                        <td>VEd ≤ VRd</td>
                        <td className="num">{fx(num(inp.taglioArmato.VEd), 1)} kN</td>
                        <td className="num">{fx(ar.VRd, 1)} kN</td>
                        <td>
                          <Verdict ok={ar.esito.ok} margine={ar.esito.margine} bloccato={bloccoAR} />
                        </td>
                      </tr>
                      <tr>
                        <td>Asw,min = 1.5·bw</td>
                        <td className="num">{fx(ar.AswMin, 0)} mm²/m</td>
                        <td className="num">
                          {fx((ar.Asw / Math.max(1, num(inp.taglioArmato.passo))) * 1000, 0)} mm²/m
                        </td>
                        <td>
                          <Verdict ok={ar.esitoAswMin.ok} margine={ar.esitoAswMin.margine} bloccato={bloccoAR} />
                        </td>
                      </tr>
                      <tr>
                        <td>Passo ≤ min(330; 0.8·d)</td>
                        <td className="num">{inp.taglioArmato.passo} mm</td>
                        <td className="num">{fx(ar.passoMax, 0)} mm</td>
                        <td>
                          <Verdict ok={ar.esitoPasso.ok} margine={ar.esitoPasso.margine} bloccato={bloccoAR} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
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
