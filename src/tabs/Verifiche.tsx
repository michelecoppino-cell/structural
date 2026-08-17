import { Cube, Wrench, Tree, GridFour } from '@phosphor-icons/react';
import { useCalcoli, useStore, inputVerifiche, type MaterialeId } from '../state/store';
import { num } from '../calc/azioni';
import { validaTaglioArmato, validaTaglioNonArmato, valido } from '../calc/validazione';
import { ACCIAIO_ARMATURA, ACCIAIO_STRUTTURALE, CLS, DIAMETRI } from '../data/materiali';
import { TIPI_PROFILO, taglieDisponibili, type TipoProfilo } from '../data/profili-acciaio';
import { Bar, Field, NumInput, Origine, Output, Select, Seg, Verdict } from '../components/ui';
import { ComandiScheda } from '../components/ComandiScheda';
import { SezioneArmata, SezioneTaglio } from '../components/Disegni';

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
    { id: 'flessione-ca', label: 'Flessione (SLU)' },
  ],
  acciaio: [
    { id: 'acciaio-flessione', label: 'Flessione elastica' },
    { id: 'acciaio-compressione', label: 'Compressione elastica' },
    { id: 'acciaio-taglio', label: 'Taglio elastico' },
  ],
  legno: [],
  muratura: [],
};

export default function Verifiche() {
  const { state, dispatch } = useStore();
  const {
    taglioNonArmato: na,
    taglioArmato: ar,
    flessioneCA: fl,
    acciaio: ac,
    VEdSollecitazioni,
  } = useCalcoli();
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
  const setFL = (patch: Partial<typeof v.flessioneCA>) => dispatch({ type: 'flessioneCA', patch });
  const setAC = (patch: Partial<typeof v.acciaio>) => dispatch({ type: 'acciaioSezione', patch });
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

  const sfruttamento = (id: string) => {
    switch (id) {
      case 'taglio-non-armato':
        return bloccoNA ? '—' : `${fx(na.esito.sfruttamento * 100, 0)}%`;
      case 'taglio-armato':
        return bloccoAR ? '—' : `${fx(ar.esito.sfruttamento * 100, 0)}%`;
      case 'flessione-ca':
        return `${fx(fl.esito.sfruttamento * 100, 0)}%`;
      case 'acciaio-flessione':
        return `${fx(ac.esitoFlessione.sfruttamento * 100, 0)}%`;
      case 'acciaio-compressione':
        return `${fx(ac.esitoCompressione.sfruttamento * 100, 0)}%`;
      case 'acciaio-taglio':
        return `${fx(ac.esitoTaglio.sfruttamento * 100, 0)}%`;
      default:
        return '—';
    }
  };

  return (
    <div className="stack">
      {/* ── comandi della scheda, in testa ─────────────────────────────── */}
      <ComandiScheda>
        {/* le pastiglie della scheda — materiale, verifica, VEd — stanno tutte
            in fila a sinistra: si leggono in un colpo d'occhio, invece di
            spargersi per la barra */}
        <div className="ver-comandi">
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
        </div>
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
                  nBarre={Math.max(2, num(inp.taglioArmato.nBracci))}
                  nBracci={num(inp.taglioArmato.nBracci)}
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

      {v.materiale === 'cls' && attiva?.id === 'flessione-ca' && (
        <section className="panel" id="pannello-verifica" role="tabpanel" aria-labelledby="tab-flessione-ca">
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <div className="esito-testa">
              <Verdict ok={fl.esito.ok} margine={fl.esito.margine} />
              <Bar sfruttamento={fl.esito.sfruttamento} />
              <span className="note">
                Flessione semplice (SLU) — sezione rettangolare, stress-block rettangolare · NTC2018
                §4.1.2.1.2
              </span>
            </div>

            <div className="panel-split">
              <div className="fields">
                <Field
                  id="fl_MEd"
                  tab="verifiche"
                  label="Momento sollecitante MEd"
                  unit="kNm"
                  dettaglio={{
                    formula: `MEd / MRd = ${fx(fl.esito.sfruttamento, 3)}`,
                    ref: 'NTC2018 §4.1.2.1.2',
                  }}
                >
                  <NumInput id="fl_MEd" value={v.flessioneCA.MEd} onChange={(x) => setFL({ MEd: x })} />
                </Field>

                <Field
                  id="fl_cls"
                  tab="verifiche"
                  label="Classe di calcestruzzo"
                  dettaglio={{
                    formula: `fcd = 0.85 · fck / γc = ${fx(fl.fcd)} N/mm²`,
                    ref: 'NTC2018 §4.1.2.1.1',
                  }}
                >
                  <Select
                    id="fl_cls"
                    value={v.flessioneCA.cls}
                    options={Object.keys(CLS)}
                    onChange={(x) => setFL({ cls: x })}
                  />
                </Field>

                <Field id="fl_gc" tab="verifiche" label="Coefficiente parziale γc" unit="—">
                  <NumInput id="fl_gc" value={v.flessioneCA.gammaC} onChange={(x) => setFL({ gammaC: x })} />
                </Field>

                <Field
                  id="fl_acciaio"
                  tab="verifiche"
                  label="Acciaio da armatura"
                  dettaglio={{ formula: `fyd = fyk / γs = ${fx(fl.fyd)} N/mm²`, ref: 'NTC2018 §11.3.2' }}
                >
                  <Select
                    id="fl_acciaio"
                    value={v.flessioneCA.acciaio}
                    options={Object.keys(ACCIAIO_ARMATURA)}
                    onChange={(x) => setFL({ acciaio: x })}
                  />
                </Field>

                <Field id="fl_gs" tab="verifiche" label="Coefficiente parziale γs" unit="—">
                  <NumInput id="fl_gs" value={v.flessioneCA.gammaS} onChange={(x) => setFL({ gammaS: x })} />
                </Field>

                <Field id="fl_b" tab="verifiche" label="Base b" unit="mm">
                  <NumInput id="fl_b" value={v.flessioneCA.b} onChange={(x) => setFL({ b: x })} />
                </Field>

                <Field id="fl_h" tab="verifiche" label="Altezza h" unit="mm">
                  <NumInput id="fl_h" value={v.flessioneCA.h} onChange={(x) => setFL({ h: x })} />
                </Field>

                <Field
                  id="fl_c"
                  tab="verifiche"
                  label="Copriferro lato teso c"
                  unit="mm"
                  dettaglio={{ formula: `d = h − c = ${fx(fl.d, 0)} mm`, ref: 'NTC2018 §4.1.6.1.3' }}
                >
                  <NumInput id="fl_c" value={v.flessioneCA.c} onChange={(x) => setFL({ c: x })} />
                </Field>

                <Field id="fl_n1" tab="verifiche" label="Armatura tesa — n. barre ⌀1" unit="n">
                  <NumInput id="fl_n1" value={v.flessioneCA.n1} onChange={(x) => setFL({ n1: x })} />
                </Field>
                <Field id="fl_phi1" tab="verifiche" label="Diametro ⌀1" unit="mm">
                  <Select
                    id="fl_phi1"
                    value={v.flessioneCA.phi1}
                    options={DIAMETRI.map(String)}
                    onChange={(x) => setFL({ phi1: x })}
                  />
                </Field>
                <Field id="fl_n2" tab="verifiche" label="Armatura tesa — n. barre ⌀2" unit="n">
                  <NumInput id="fl_n2" value={v.flessioneCA.n2} onChange={(x) => setFL({ n2: x })} />
                </Field>
                <Field id="fl_phi2" tab="verifiche" label="Diametro ⌀2" unit="mm">
                  <Select
                    id="fl_phi2"
                    value={v.flessioneCA.phi2}
                    options={DIAMETRI.map(String)}
                    onChange={(x) => setFL({ phi2: x })}
                  />
                </Field>

                <Field id="fl_c2" tab="verifiche" label="Copriferro lato compresso c'" unit="mm">
                  <NumInput id="fl_c2" value={v.flessioneCA.c2} onChange={(x) => setFL({ c2: x })} />
                </Field>
                <Field id="fl_n1c" tab="verifiche" label="Armatura compressa — n. barre ⌀1" unit="n">
                  <NumInput id="fl_n1c" value={v.flessioneCA.n1c} onChange={(x) => setFL({ n1c: x })} />
                </Field>
                <Field id="fl_phi1c" tab="verifiche" label="Diametro ⌀1 (compressa)" unit="mm">
                  <Select
                    id="fl_phi1c"
                    value={v.flessioneCA.phi1c}
                    options={DIAMETRI.map(String)}
                    onChange={(x) => setFL({ phi1c: x })}
                  />
                </Field>
              </div>

              <div className="col-aside">
                <SezioneArmata
                  b={num(v.flessioneCA.b)}
                  h={num(v.flessioneCA.h)}
                  c={num(v.flessioneCA.c)}
                  c2={num(v.flessioneCA.c2)}
                  d={fl.d}
                  x={fl.x}
                  As={fl.As}
                  As2={fl.As2}
                  tesi={[
                    { n: num(v.flessioneCA.n1), phi: num(v.flessioneCA.phi1) },
                    { n: num(v.flessioneCA.n2), phi: num(v.flessioneCA.phi2) },
                  ].filter((l) => l.n > 0)}
                  compressi={[
                    { n: num(v.flessioneCA.n1c), phi: num(v.flessioneCA.phi1c) },
                  ].filter((l) => l.n > 0)}
                />

                {fl.duttilitaScarsa && (
                  <p className="note" style={{ color: 'var(--warn)' }}>
                    x/d = {fx(fl.xSuD, 2)} &gt; 0.45 — sezione poco duttile, valutare un'armatura tesa
                    inferiore o una compressa maggiore.
                  </p>
                )}
                <Output
                  voci={[
                    { k: 'fcd', v: fx(fl.fcd), u: 'N/mm²' },
                    { k: 'fyd', v: fx(fl.fyd, 0), u: 'N/mm²' },
                    { k: 'd', v: fx(fl.d, 0), u: 'mm' },
                    { k: 'As tesa', v: fx(fl.As, 0), u: 'mm²' },
                    { k: 'As compressa', v: fx(fl.As2, 0), u: 'mm²' },
                    { k: 'x', v: fx(fl.x, 1), u: 'mm' },
                    { k: 'x/d', v: fx(fl.xSuD, 3) },
                    { k: 'MRd', v: fx(fl.MRd, 1), u: 'kNm' },
                    { k: 'MEd/MRd', v: fx(fl.esito.sfruttamento, 3) },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {v.materiale === 'acciaio' && attiva && attiva.id.startsWith('acciaio-') && (
        <section className="panel" id="pannello-verifica" role="tabpanel" aria-labelledby={`tab-${attiva.id}`}>
          <div className="panel-body" style={{ paddingTop: 14 }}>
            {(() => {
              const es =
                attiva.id === 'acciaio-flessione'
                  ? ac.esitoFlessione
                  : attiva.id === 'acciaio-compressione'
                    ? ac.esitoCompressione
                    : ac.esitoTaglio;
              const nota =
                attiva.id === 'acciaio-flessione'
                  ? 'Flessione elastica — MRd = Wel,x · fyd · NTC2018 §4.2.4.1.2'
                  : attiva.id === 'acciaio-compressione'
                    ? 'Compressione semplice elastica — NRd = A · fyd (instabilità non verificata) · NTC2018 §4.2.4.1.2'
                    : 'Taglio elastico — VRd = Avz · fyd/√3 · NTC2018 §4.2.4.1.3';
              return (
                <div className="esito-testa">
                  <Verdict ok={es.ok} margine={es.margine} />
                  <Bar sfruttamento={es.sfruttamento} />
                  <span className="note">{nota}</span>
                </div>
              );
            })()}

            <div className="panel-split">
              <div className="fields">
                <Field id="ac_tipo" tab="verifiche" label="Tipo di profilo">
                  <select
                    id="ac_tipo"
                    className="input"
                    value={v.acciaio.tipoProfilo}
                    onChange={(e) => {
                      const tipo = e.target.value as TipoProfilo;
                      setAC({ tipoProfilo: tipo, profilo: taglieDisponibili(tipo)[0] ?? '' });
                    }}
                  >
                    {TIPI_PROFILO.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="ac_profilo" tab="verifiche" label="Profilo">
                  <Select
                    id="ac_profilo"
                    value={v.acciaio.profilo}
                    options={taglieDisponibili(v.acciaio.tipoProfilo)}
                    onChange={(x) => setAC({ profilo: x })}
                  />
                </Field>

                <Field
                  id="ac_grado"
                  tab="verifiche"
                  label="Classe di acciaio"
                  dettaglio={{ formula: `fyd = fyk / γM0 = ${fx(ac.fyd, 0)} N/mm²`, ref: 'NTC2018 §11.3.4.1' }}
                >
                  <Select
                    id="ac_grado"
                    value={v.acciaio.acciaio}
                    options={Object.keys(ACCIAIO_STRUTTURALE)}
                    onChange={(x) => setAC({ acciaio: x })}
                  />
                </Field>

                <Field id="ac_gm0" tab="verifiche" label="Coefficiente parziale γM0" unit="—">
                  <NumInput id="ac_gm0" value={v.acciaio.gammaM0} onChange={(x) => setAC({ gammaM0: x })} />
                </Field>

                <Field
                  id="ac_MEd"
                  tab="verifiche"
                  label="Momento sollecitante MEd"
                  unit="kNm"
                  dettaglio={{ formula: `σ = MEd/Wx = ${fx(ac.sigmaM)} N/mm²`, ref: 'NTC2018 §4.2.4.1.2' }}
                >
                  <NumInput id="ac_MEd" value={v.acciaio.MEd} onChange={(x) => setAC({ MEd: x })} />
                </Field>

                <Field
                  id="ac_NEd"
                  tab="verifiche"
                  label="Sforzo normale NEd (compressione &gt; 0)"
                  unit="kN"
                  dettaglio={{ formula: `σ = NEd/A = ${fx(ac.sigmaN)} N/mm²`, ref: 'NTC2018 §4.2.4.1.2' }}
                >
                  <NumInput id="ac_NEd" value={v.acciaio.NEd} onChange={(x) => setAC({ NEd: x })} />
                </Field>

                <Field
                  id="ac_VEd"
                  tab="verifiche"
                  label="Taglio sollecitante VEd"
                  unit="kN"
                  origine={origineVEd}
                  dettaglio={{ formula: `τ = VEd/Avz = ${fx(ac.tau)} N/mm²`, ref: 'NTC2018 §4.2.4.1.3' }}
                >
                  <NumInput
                    id="ac_VEd"
                    value={collegato ? VEdSollecitazioni.toFixed(1) : v.acciaio.VEd}
                    disabled={collegato}
                    onChange={(x) => setAC({ VEd: x })}
                  />
                </Field>
              </div>

              <div className="col-aside">
                {!ac.proprieta && (
                  <p className="note" style={{ color: 'var(--warn)' }}>
                    Profilo non riconosciuto: verificare la taglia selezionata.
                  </p>
                )}
                <Output
                  titolo="Proprietà della sezione"
                  voci={[
                    { k: 'A', v: fx(ac.proprieta?.A ?? 0, 1), u: 'cm²' },
                    { k: 'h × b', v: `${fx(ac.proprieta?.h ?? 0, 0)} × ${fx(ac.proprieta?.b ?? 0, 0)}`, u: 'mm' },
                    { k: 'Ix', v: fx(ac.proprieta?.Ix ?? 0, 0), u: 'cm⁴' },
                    { k: 'Wx,el', v: fx(ac.proprieta?.Wx ?? 0, 1), u: 'cm³' },
                    { k: 'Avz', v: fx(ac.proprieta?.Avz ?? 0, 2), u: 'cm²' },
                    { k: 'fyd', v: fx(ac.fyd, 0), u: 'N/mm²' },
                  ]}
                />

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
                      <tr style={attiva.id === 'acciaio-flessione' ? { color: 'var(--color-accent-300)' } : undefined}>
                        <td>MEd ≤ MRd</td>
                        <td className="num">{fx(num(v.acciaio.MEd), 1)} kNm</td>
                        <td className="num">{fx(ac.MRd, 1)} kNm</td>
                        <td>
                          <Verdict ok={ac.esitoFlessione.ok} margine={ac.esitoFlessione.margine} />
                        </td>
                      </tr>
                      <tr style={attiva.id === 'acciaio-compressione' ? { color: 'var(--color-accent-300)' } : undefined}>
                        <td>NEd ≤ NRd</td>
                        <td className="num">{fx(num(v.acciaio.NEd), 1)} kN</td>
                        <td className="num">{fx(ac.NRd, 1)} kN</td>
                        <td>
                          <Verdict ok={ac.esitoCompressione.ok} margine={ac.esitoCompressione.margine} />
                        </td>
                      </tr>
                      <tr style={attiva.id === 'acciaio-taglio' ? { color: 'var(--color-accent-300)' } : undefined}>
                        <td>VEd ≤ VRd</td>
                        <td className="num">
                          {fx(collegato ? VEdSollecitazioni : num(v.acciaio.VEd), 1)} kN
                        </td>
                        <td className="num">{fx(ac.VRd, 1)} kN</td>
                        <td>
                          <Verdict ok={ac.esitoTaglio.ok} margine={ac.esitoTaglio.margine} />
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

      {(v.materiale === 'legno' || v.materiale === 'muratura') && (
        <div className="placeholder">
          <div className="t">{MATERIALI.find((m) => m.id === v.materiale)?.label}</div>
          <div className="d">
            {v.materiale === 'legno'
              ? 'Verifiche di resistenza e deformabilità per elementi in legno secondo NTC2018 §4.4.'
              : 'Verifiche di pareti in muratura secondo NTC2018 §4.5 — pressoflessione nel piano e fuori piano, taglio.'}
          </div>
        </div>
      )}
    </div>
  );
}
