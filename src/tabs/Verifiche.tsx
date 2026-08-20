import { Cube, Wrench, Tree, GridFour } from '@phosphor-icons/react';
import { useCalcoli, useStore, inputVerifiche, type MaterialeId } from '../state/store';
import { num } from '../calc/azioni';
import { validaTaglioArmato, validaTaglioNonArmato, valido } from '../calc/validazione';
import { ACCIAIO_ARMATURA, ACCIAIO_STRUTTURALE, CLS, DIAMETRI } from '../data/materiali';
import { TIPI_PROFILO, taglieDisponibili, type TipoProfilo } from '../data/profili-acciaio';
import {
  CONDIZIONI_CARICO,
  PSI_TABELLATI,
  type Formatura,
  type PuntoCarico,
} from '../calc/instabilita';
import type { RisultatiClasse } from '../calc/classificazione';
import { Bar, Field, NumInput, Origine, Output, Select, Seg, Verdict } from '../components/ui';
import { ComandiScheda } from '../components/ComandiScheda';
import { SezioneArmata, SezioneTaglio } from '../components/Disegni';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** I profili cavi, gli unici per cui la formatura cambia la curva. */
const TUBI: TipoProfilo[] = ['TUBO_QUADRO', 'TUBO_RETT', 'TUBO_TONDO'];

/** Le tre verifiche di sezione, che condividono un pannello solo. */
const SCHEDE_ELASTICHE = ['acciaio-flessione', 'acciaio-compressione', 'acciaio-taglio'];

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
    { id: 'acciaio-flesso-torsionale', label: 'Instabilità flesso-torsionale' },
    { id: 'acciaio-punta', label: 'Instabilità di punta' },
    { id: 'acciaio-combinata', label: 'Presso-flessione' },
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
    instabilitaLT: lt,
    instabilitaPunta: pu,
    pressoflessione: pf,
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
  const setST = (patch: Partial<typeof v.stabilita>) => dispatch({ type: 'stabilita', patch });
  const scollega = () => dispatch({ type: 'verifiche', patch: { collegaSollecitazioni: false } });

  const condizione = CONDIZIONI_CARICO.find((c) => c.id === v.stabilita.carico);
  /*
   * I pezzi che le schede in acciaio hanno in comune. Sono funzioni che
   * restituiscono JSX, non componenti: un componente definito qui dentro
   * cambierebbe identità a ogni render e React rimonterebbe i campi, con la
   * messa a fuoco che salta via mentre si scrive.
   */
  const scegliProfilo = (pfx: string) => (
    <>
      <Field id={`${pfx}_tipo`} tab="verifiche" label="Tipo di profilo">
        <select
          id={`${pfx}_tipo`}
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

      <Field id={`${pfx}_profilo`} tab="verifiche" label="Profilo">
        <Select
          id={`${pfx}_profilo`}
          value={v.acciaio.profilo}
          options={taglieDisponibili(v.acciaio.tipoProfilo)}
          onChange={(x) => setAC({ profilo: x })}
        />
      </Field>

      <Field
        id={`${pfx}_grado`}
        tab="verifiche"
        label="Classe di acciaio"
        dettaglio={{
          formula: `fyk = ${fx(lt.fyk, 0)} N/mm²; ε = √(235/fyk) = ${fx(lt.classe.epsilon, 3)}`,
          ref: 'NTC2018 §11.3.4.1',
        }}
      >
        <Select
          id={`${pfx}_grado`}
          value={v.acciaio.acciaio}
          options={Object.keys(ACCIAIO_STRUTTURALE)}
          onChange={(x) => setAC({ acciaio: x })}
        />
      </Field>
    </>
  );

  const scegliFormatura = (pfx: string) => (
    <Field
      id={`${pfx}_form`}
      tab="verifiche"
      label="Formatura del profilo cavo"
      dettaglio={{
        formula: 'A caldo (EN 10210) → curva a; a freddo (EN 10219) → curva c',
        ref: 'NTC2018 tab. 4.2.VIII',
      }}
    >
      <select
        id={`${pfx}_form`}
        className="input"
        value={v.stabilita.formatura}
        onChange={(e) => setST({ formatura: e.target.value as Formatura })}
      >
        <option value="freddo">Formato a freddo</option>
        <option value="caldo">Laminato a caldo</option>
      </select>
    </Field>
  );

  const scegliModulo = (id: string) => (
    <select
      id={id}
      className="input"
      value={v.stabilita.modulo}
      onChange={(e) => setST({ modulo: e.target.value as typeof v.stabilita.modulo })}
    >
      <option value="automatico">Dalla classe della sezione</option>
      <option value="plastico">Plastico — classe 1 e 2</option>
      <option value="elastico">Elastico — classe 3</option>
    </select>
  );

  const profiloIgnoto = () => (
    <p className="note" style={{ color: 'var(--warn)' }}>
      Profilo non riconosciuto: verificare la taglia selezionata.
    </p>
  );

  /** L'avviso che accompagna una sezione snella: la classe 4 non si verifica così. */
  const avvisoClasse = (c: RisultatiClasse, sollecitazione: string) =>
    c.classe4 && c.pareti.length ? (
      <p className="note" style={{ color: 'var(--warn)' }}>
        Sezione in classe 4 in {sollecitazione} (
        {c.pareti
          .filter((w) => w.classe === 4)
          .map((w) => `${w.nome} c/t = ${fx(w.rapporto, 1)} > ${fx(w.limiti[2], 1)}`)
          .join('; ')}
        ): instabilizza localmente prima di snervare. Le proprietà efficaci non sono
        calcolate — il risultato qui sotto usa la sezione lorda ed è ottimistico: va
        cambiato profilo o irrigidita l’anima.
      </p>
    ) : null;

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
      case 'acciaio-flesso-torsionale':
        return `${fx(lt.esito.sfruttamento * 100, 0)}%`;
      case 'acciaio-punta':
        return `${fx(pu.esito.sfruttamento * 100, 0)}%`;
      case 'acciaio-combinata':
        return Number.isFinite(pf.sfruttamento) ? `${fx(pf.sfruttamento * 100, 0)}%` : '∞';
      default:
        return '—';
    }
  };

  return (
    <div className="stack scheda-verifiche">
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

      {v.materiale === 'acciaio' && attiva && SCHEDE_ELASTICHE.includes(attiva.id) && (
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
                {scegliProfilo('ac')}

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
                    value={inp.acciaio.VEd}
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
                    { k: 'classe', v: `${lt.classe.classe} fless. / ${pu.classe.classe} compr.` },
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
                        <td className="num">{fx(num(inp.acciaio.VEd), 1)} kN</td>
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

      {v.materiale === 'acciaio' && attiva?.id === 'acciaio-flesso-torsionale' && (
        <section className="panel" id="pannello-verifica" role="tabpanel" aria-labelledby="tab-acciaio-flesso-torsionale">
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <div className="esito-testa">
              <Verdict ok={lt.esito.ok} margine={lt.esito.margine} />
              <Bar sfruttamento={lt.esito.sfruttamento} />
              <span className="note">
                {lt.richiesta
                  ? 'Instabilità flesso-torsionale — Mb,Rd = χLT · Wy · fyk / γM1 · NTC2018 §4.2.4.1.3.2'
                  : 'Sezione non sbandabile (inerzia laterale pari a quella nel piano): χLT = 1 · NTC2018 §4.2.4.1.3.2'}
              </span>
            </div>

            <div className="panel-split">
              <div className="fields">
                {scegliProfilo('lt')}

                <Field
                  id="lt_MEd"
                  tab="verifiche"
                  label="Momento sollecitante MEd"
                  unit="kNm"
                  origine={<Origine testo="condiviso con le altre verifiche in acciaio" />}
                  dettaglio={{
                    formula: `MEd / Mb,Rd = ${fx(lt.esito.sfruttamento, 3)}`,
                    ref: 'NTC2018 §4.2.4.1.3.2',
                  }}
                >
                  <NumInput id="lt_MEd" value={v.acciaio.MEd} onChange={(x) => setAC({ MEd: x })} />
                </Field>

                <Field
                  id="lt_L"
                  tab="verifiche"
                  label="Lunghezza libera di sbandamento L"
                  unit="mm"
                  dettaglio={{
                    formula: 'Distanza fra due ritegni torsionali consecutivi dell’ala compressa',
                    ref: 'NTC2018 §4.2.4.1.3.2',
                  }}
                >
                  <NumInput id="lt_L" value={v.stabilita.L} onChange={(x) => setST({ L: x })} />
                </Field>

                <Field
                  id="lt_carico"
                  tab="verifiche"
                  label="Condizione di carico e vincolo"
                  dettaglio={{
                    formula: `C1 = ${fx(lt.C1, 3)}; C2 = ${fx(lt.C2, 3)}; C3 = ${fx(lt.C3, 3)}`,
                    ref: 'ENV 1993-1-1, prospetto F.1',
                  }}
                >
                  <select
                    id="lt_carico"
                    className="input"
                    value={v.stabilita.carico}
                    onChange={(e) => {
                      const carico = e.target.value;
                      const ammessi = CONDIZIONI_CARICO.find((c) => c.id === carico)?.k ?? ['1'];
                      // k = 0.7 esiste solo per i momenti d'estremità: cambiando
                      // condizione un valore non più ammesso va riportato a 1
                      const kz = ammessi.includes(v.stabilita.kz) ? v.stabilita.kz : '1';
                      setST({ carico, kz });
                    }}
                  >
                    {CONDIZIONI_CARICO.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} — {c.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {condizione?.psi && (
                  <Field
                    id="lt_psi"
                    tab="verifiche"
                    label="Rapporto fra i momenti di estremità ψ"
                    unit="—"
                    dettaglio={{
                      formula: 'ψ = MB / MA — ψ = 1 è momento costante, il caso più severo',
                      ref: 'ENV 1993-1-1, prospetto F.1.1',
                    }}
                  >
                    <Select
                      id="lt_psi"
                      value={v.stabilita.psi}
                      options={PSI_TABELLATI}
                      onChange={(x) => setST({ psi: x })}
                    />
                  </Field>
                )}

                <Field
                  id="lt_kz"
                  tab="verifiche"
                  label="Coefficiente di vincolo alla rotazione kz"
                  unit="—"
                  dettaglio={{
                    formula: '1 = estremi liberi di ruotare attorno all’asse debole; 0.5 = incastrati',
                    ref: 'ENV 1993-1-1, prospetto F.1',
                  }}
                >
                  <Select
                    id="lt_kz"
                    value={v.stabilita.kz}
                    options={condizione?.k ?? ['1']}
                    onChange={(x) => setST({ kz: x })}
                  />
                </Field>

                <Field
                  id="lt_kw"
                  tab="verifiche"
                  label="Coefficiente di vincolo all’ingobbamento kw"
                  unit="—"
                  dettaglio={{
                    formula: 'Di norma 1: l’ingobbamento agli estremi si impedisce solo con irrigidimenti apposta',
                    ref: 'ENV 1993-1-1, prospetto F.1',
                  }}
                >
                  <Select
                    id="lt_kw"
                    value={v.stabilita.kw}
                    options={['1', '0.7', '0.5']}
                    onChange={(x) => setST({ kw: x })}
                  />
                </Field>

                <Field
                  id="lt_punto"
                  tab="verifiche"
                  label="Punto di applicazione del carico"
                  dettaglio={{
                    formula: `zg = ${fx(lt.zg, 0)} mm rispetto al baricentro (positivo = destabilizzante)`,
                    ref: 'ENV 1993-1-1, prospetto F.1',
                  }}
                >
                  <select
                    id="lt_punto"
                    className="input"
                    value={v.stabilita.puntoCarico}
                    onChange={(e) => setST({ puntoCarico: e.target.value as PuntoCarico })}
                  >
                    <option value="superiore">Ala superiore (destabilizzante)</option>
                    <option value="baricentro">Baricentro</option>
                    <option value="inferiore">Ala inferiore (stabilizzante)</option>
                  </select>
                </Field>

                <Field
                  id="lt_modulo"
                  tab="verifiche"
                  label="Modulo resistente"
                  dettaglio={{
                    formula: `Wy = ${fx(lt.Wy / 1000, 1)} cm³ (modulo ${lt.moduloUsato})`,
                    ref: 'NTC2018 §4.2.3 e §4.2.4.1.3.2',
                    coeffs: [
                      { k: 'classe in flessione', v: `${lt.classe.classe}` },
                      { k: 'Wel,x', v: `${fx(lt.proprieta?.Wx ?? 0, 1)} cm³` },
                      { k: 'Wpl,x', v: `${fx(lt.proprieta?.Wplx ?? 0, 1)} cm³` },
                    ],
                  }}
                >
                  {scegliModulo('lt_modulo')}
                </Field>

                <Field id="lt_gm1" tab="verifiche" label="Coefficiente parziale γM1" unit="—">
                  <NumInput
                    id="lt_gm1"
                    value={v.stabilita.gammaM1}
                    onChange={(x) => setST({ gammaM1: x })}
                  />
                </Field>

                <Field
                  id="lt_modoMcr"
                  tab="verifiche"
                  label="Momento critico Mcr"
                  dettaglio={{
                    formula: `Mcr dal prospetto F.1 = ${fx(lt.McrCalcolato, 2)} kNm`,
                    ref: 'ENV 1993-1-1, prospetto F.1',
                  }}
                >
                  <select
                    id="lt_modoMcr"
                    className="input"
                    value={v.stabilita.modoMcr}
                    onChange={(e) => setST({ modoMcr: e.target.value as 'automatico' | 'manuale' })}
                  >
                    <option value="automatico">Calcolato dal prospetto F.1</option>
                    <option value="manuale">Imposto a mano</option>
                  </select>
                </Field>

                {v.stabilita.modoMcr === 'manuale' && (
                  <Field
                    id="lt_Mcr"
                    tab="verifiche"
                    label="Momento critico imposto Mcr"
                    unit="kNm"
                    dettaglio={{
                      formula: 'Da un’analisi di stabilità a parte, o da un altro schema di carico',
                      ref: 'NTC2018 §4.2.4.1.3.2',
                    }}
                  >
                    <NumInput
                      id="lt_Mcr"
                      value={v.stabilita.McrManuale}
                      onChange={(x) => setST({ McrManuale: x })}
                    />
                  </Field>
                )}
              </div>

              <div className="col-aside">
                {!lt.proprieta && profiloIgnoto()}
                {avvisoClasse(lt.classe, 'flessione')}
                {!lt.richiesta && lt.proprieta && (
                  <p className="note">
                    Sezione con inerzia laterale pari a quella nel piano di flessione: lo
                    sbandamento laterale non può avvenire e la verifica non è richiesta.
                    Mb,Rd coincide con il momento resistente della sezione.
                  </p>
                )}
                {lt.richiesta && lt.kUsato !== num(v.stabilita.kz) && (
                  <p className="note" style={{ color: 'var(--warn)' }}>
                    La tabella dei coefficienti C è a gradini: si è usato k = {fx(lt.kUsato, 2)}.
                  </p>
                )}

                <Output
                  titolo="Sezione e torsione"
                  voci={[
                    { k: 'h × b', v: `${fx(lt.proprieta?.h ?? 0, 0)} × ${fx(lt.proprieta?.b ?? 0, 0)}`, u: 'mm' },
                    { k: 'Ix', v: fx(lt.proprieta?.Ix ?? 0, 0), u: 'cm⁴' },
                    { k: 'Imin', v: fx(lt.Iz / 1e4, 1), u: 'cm⁴' },
                    { k: 'It', v: fx(lt.It / 1e4, 2), u: 'cm⁴' },
                    { k: 'Iw', v: fx(lt.Iw / 1e6, 0), u: 'cm⁶' },
                    { k: 'Wy', v: fx(lt.Wy / 1000, 1), u: 'cm³' },
                    { k: 'classe', v: `${lt.classe.classe} (${lt.moduloUsato})` },
                  ]}
                />

                <div style={{ marginTop: 12 }}>
                  <Output
                    titolo="Instabilità flesso-torsionale"
                    voci={[
                      { k: 'C1 / C2 / C3', v: `${fx(lt.C1, 3)} / ${fx(lt.C2, 3)} / ${fx(lt.C3, 3)}` },
                      { k: 'zg', v: fx(lt.zg, 0), u: 'mm' },
                      { k: 'Mcr', v: lt.richiesta ? fx(lt.Mcr, 2) : '—', u: 'kNm' },
                      { k: 'λLT', v: lt.richiesta ? fx(lt.lambdaLT, 3) : '—' },
                      { k: 'curva (αLT)', v: `${lt.curva} (${fx(lt.alfaLT, 2)})` },
                      { k: 'ΦLT', v: lt.richiesta ? fx(lt.phiLT, 3) : '—' },
                      { k: 'χLT', v: fx(lt.chiLT, 3) },
                      { k: 'Mc,Rd', v: fx(lt.McRd, 1), u: 'kNm' },
                      { k: 'Mb,Rd', v: fx(lt.MbRd, 1), u: 'kNm' },
                    ]}
                  />
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
                      <tr style={{ color: 'var(--color-accent-300)' }}>
                        <td>MEd ≤ Mb,Rd</td>
                        <td className="num">{fx(num(v.acciaio.MEd), 1)} kNm</td>
                        <td className="num">{fx(lt.MbRd, 1)} kNm</td>
                        <td>
                          <Verdict ok={lt.esito.ok} margine={lt.esito.margine} />
                        </td>
                      </tr>
                      <tr>
                        <td>MEd ≤ Mc,Rd (sezione)</td>
                        <td className="num">{fx(num(v.acciaio.MEd), 1)} kNm</td>
                        <td className="num">{fx(lt.McRd, 1)} kNm</td>
                        <td>
                          <Verdict ok={num(v.acciaio.MEd) <= lt.McRd} margine={(1 - num(v.acciaio.MEd) / lt.McRd) * 100} />
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

      {v.materiale === 'acciaio' && attiva?.id === 'acciaio-punta' && (
        <section className="panel" id="pannello-verifica" role="tabpanel" aria-labelledby="tab-acciaio-punta">
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <div className="esito-testa">
              <Verdict ok={pu.esito.ok} margine={pu.esito.margine} />
              <Bar sfruttamento={pu.esito.sfruttamento} />
              <span className="note">
                Instabilità flessionale dell’asta compressa — Nb,Rd = χ · A · fyk / γM1 · NTC2018
                §4.2.4.1.3.1
              </span>
            </div>

            <div className="panel-split">
              <div className="fields">
                {scegliProfilo('pu')}

                <Field
                  id="pu_NEd"
                  tab="verifiche"
                  label="Compressione NEd (compressione &gt; 0)"
                  unit="kN"
                  origine={<Origine testo="condiviso con le altre verifiche in acciaio" />}
                  dettaglio={{
                    formula: `NEd / Nb,Rd = ${fx(pu.esito.sfruttamento, 3)}`,
                    ref: 'NTC2018 §4.2.4.1.3.1',
                  }}
                >
                  <NumInput id="pu_NEd" value={v.acciaio.NEd} onChange={(x) => setAC({ NEd: x })} />
                </Field>

                <Field
                  id="pu_Ly"
                  tab="verifiche"
                  label="Lunghezza dell’asta nel piano y-y"
                  unit="mm"
                  dettaglio={{
                    formula: `Lcr,y = βy · Ly = ${fx(pu.y.Lcr, 0)} mm`,
                    ref: 'NTC2018 §4.2.4.1.3.1',
                  }}
                >
                  <NumInput id="pu_Ly" value={v.stabilita.Ly} onChange={(x) => setST({ Ly: x })} />
                </Field>

                <Field
                  id="pu_by"
                  tab="verifiche"
                  label="Coefficiente di libera inflessione βy"
                  unit="—"
                  dettaglio={{
                    formula: '1 = cerniera-cerniera; 0.7 = incastro-cerniera; 0.5 = incastro-incastro; 2 = mensola',
                    ref: 'NTC2018 §4.2.4.1.3.1',
                  }}
                >
                  <NumInput id="pu_by" value={v.stabilita.betaY} onChange={(x) => setST({ betaY: x })} />
                </Field>

                <Field
                  id="pu_Lz"
                  tab="verifiche"
                  label="Lunghezza dell’asta nel piano z-z"
                  unit="mm"
                  dettaglio={{
                    formula: `Lcr,z = βz · Lz = ${fx(pu.z.Lcr, 0)} mm`,
                    ref: 'NTC2018 §4.2.4.1.3.1',
                  }}
                >
                  <NumInput id="pu_Lz" value={v.stabilita.Lz} onChange={(x) => setST({ Lz: x })} />
                </Field>

                <Field
                  id="pu_bz"
                  tab="verifiche"
                  label="Coefficiente di libera inflessione βz"
                  unit="—"
                  dettaglio={{
                    formula: 'Spesso più basso di βy: i controventi trattengono l’asse debole più spesso',
                    ref: 'NTC2018 §4.2.4.1.3.1',
                  }}
                >
                  <NumInput id="pu_bz" value={v.stabilita.betaZ} onChange={(x) => setST({ betaZ: x })} />
                </Field>

                {TUBI.includes(v.acciaio.tipoProfilo) && scegliFormatura('pu')}

                <Field id="pu_gm1" tab="verifiche" label="Coefficiente parziale γM1" unit="—">
                  <NumInput
                    id="pu_gm1"
                    value={v.stabilita.gammaM1}
                    onChange={(x) => setST({ gammaM1: x })}
                  />
                </Field>
              </div>

              <div className="col-aside">
                {!pu.proprieta && profiloIgnoto()}
                {avvisoClasse(pu.classe, 'compressione')}
                {(pu.y.troppoSnella || pu.z.troppoSnella) && (
                  <p className="note" style={{ color: 'var(--warn)' }}>
                    Snellezza oltre 200 ({fx(Math.max(pu.y.lambda, pu.z.lambda), 0)}): fuori
                    dalla buona pratica per un’asta portante, va accorciata o trattenuta.
                  </p>
                )}

                <div className="table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Asse</th>
                        <th className="num sym">Lcr</th>
                        <th className="num sym">λ</th>
                        <th className="num sym">λ̄</th>
                        <th>curva</th>
                        <th className="num sym">χ</th>
                        <th className="num sym">Nb,Rd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[pu.y, pu.z].map((a) => (
                        <tr
                          key={a.asse}
                          style={pu.governa === a.asse ? { color: 'var(--color-accent-300)' } : undefined}
                        >
                          <td>{a.asse === 'y' ? 'y-y (forte)' : 'z-z (debole)'}</td>
                          <td className="num">{fx(a.Lcr, 0)} mm</td>
                          <td className="num">{fx(a.lambda, 1)}</td>
                          <td className="num">{fx(a.lambdaAd, 3)}</td>
                          <td>
                            {a.curva} ({fx(a.alfa, 2)})
                          </td>
                          <td className="num">{fx(a.chi, 3)}</td>
                          <td className="num">{fx(a.NbRd, 1)} kN</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Output
                    titolo="Instabilità di punta"
                    voci={[
                      { k: 'λ1', v: fx(pu.lambda1, 2) },
                      { k: 'Ncr,y', v: fx(pu.y.Ncr, 0), u: 'kN' },
                      { k: 'Ncr,z', v: fx(pu.z.Ncr, 0), u: 'kN' },
                      { k: 'governa', v: pu.governa === 'y' ? 'asse y-y' : 'asse z-z' },
                      { k: 'χmin', v: fx(pu.chiMin, 3) },
                      { k: 'Nc,Rd', v: fx(pu.NcRd, 1), u: 'kN' },
                      { k: 'Nb,Rd', v: fx(pu.NbRd, 1), u: 'kN' },
                    ]}
                  />
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
                      <tr style={{ color: 'var(--color-accent-300)' }}>
                        <td>NEd ≤ Nb,Rd</td>
                        <td className="num">{fx(Math.max(num(v.acciaio.NEd), 0), 1)} kN</td>
                        <td className="num">{fx(pu.NbRd, 1)} kN</td>
                        <td>
                          <Verdict ok={pu.esito.ok} margine={pu.esito.margine} />
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

      {v.materiale === 'acciaio' && attiva?.id === 'acciaio-combinata' && (
        <section className="panel" id="pannello-verifica" role="tabpanel" aria-labelledby="tab-acciaio-combinata">
          <div className="panel-body" style={{ paddingTop: 14 }}>
            <div className="esito-testa">
              <Verdict ok={pf.esito.ok} margine={pf.esito.margine} />
              <Bar sfruttamento={pf.sfruttamento} />
              <span className="note">
                Asta presso-inflessa — Metodo A, Circolare NTC2018 §C4.2.4.1.3.3
              </span>
            </div>

            <div className="panel-split">
              <div className="fields">
                {scegliProfilo('pf')}

                <Field
                  id="pf_NEd"
                  tab="verifiche"
                  label="Compressione NEd (compressione &gt; 0)"
                  unit="kN"
                  origine={<Origine testo="condiviso con le altre verifiche in acciaio" />}
                  dettaglio={{
                    formula: `1° termine = NEd / Nb,Rd = ${fx(pf.termineN, 3)}`,
                    ref: 'Circolare §C4.2.4.1.3.3',
                  }}
                >
                  <NumInput id="pf_NEd" value={v.acciaio.NEd} onChange={(x) => setAC({ NEd: x })} />
                </Field>

                <Field
                  id="pf_MEd"
                  tab="verifiche"
                  label="Momento My,Ed (asse forte)"
                  unit="kNm"
                  dettaglio={{
                    formula: `2° termine = My,Ed / [χLT · My,Rd · (1 − NEd/Ncr,y)] = ${fx(pf.termineMy, 3)}`,
                    ref: 'Circolare §C4.2.4.1.3.3',
                  }}
                >
                  <NumInput id="pf_MEd" value={v.acciaio.MEd} onChange={(x) => setAC({ MEd: x })} />
                </Field>

                <Field
                  id="pf_MzEd"
                  tab="verifiche"
                  label="Momento Mz,Ed (asse debole)"
                  unit="kNm"
                  dettaglio={{
                    formula: `3° termine = Mz,Ed / [Mz,Rd · (1 − NEd/Ncr,z)] = ${fx(pf.termineMz, 3)}`,
                    ref: 'Circolare §C4.2.4.1.3.3',
                  }}
                >
                  <NumInput id="pf_MzEd" value={v.acciaio.MzEd} onChange={(x) => setAC({ MzEd: x })} />
                </Field>

                <Field
                  id="pf_modulo"
                  tab="verifiche"
                  label="Modulo resistente"
                  dettaglio={{
                    formula: `Wy = ${fx(pf.Wy / 1000, 1)} cm³; Wz = ${fx(pf.Wz / 1000, 1)} cm³ (${pf.moduloUsato})`,
                    ref: 'NTC2018 §4.2.3',
                    coeffs: [
                      { k: 'classe in compressione', v: `${pf.classe.classe}` },
                      { k: 'classe in flessione', v: `${lt.classe.classe}` },
                    ],
                  }}
                >
                  {scegliModulo('pf_modulo')}
                </Field>

                <p className="note">
                  Le lunghezze di libera inflessione e il tratto non trattenuto sono quelli delle
                  schede «Instabilità di punta» e «Instabilità flesso-torsionale»: questa verifica
                  ne mette insieme i risultati.
                </p>
              </div>

              <div className="col-aside">
                {!lt.proprieta && profiloIgnoto()}
                {avvisoClasse(pf.classe, 'presso-flessione')}
                {pf.oltreCritico && (
                  <p className="note" style={{ color: 'var(--warn)' }}>
                    NEd raggiunge il carico critico euleriano (Ncr,y = {fx(pu.y.Ncr, 0)} kN,
                    Ncr,z = {fx(pu.z.Ncr, 0)} kN): l’asta è instabile già da sola, e la formula
                    del secondo ordine non ha più significato.
                  </p>
                )}

                <div className="table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Termine</th>
                        <th className="num">Domanda</th>
                        <th className="num">Capacità</th>
                        <th className="num">Amplif.</th>
                        <th className="num">Valore</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>NEd / Nb,Rd</td>
                        <td className="num">{fx(Math.max(num(v.acciaio.NEd), 0), 1)} kN</td>
                        <td className="num">{fx(pu.NbRd, 1)} kN</td>
                        <td className="num">—</td>
                        <td className="num">{fx(pf.termineN, 3)}</td>
                      </tr>
                      <tr>
                        <td>My,Ed / (χLT · My,Rd)</td>
                        <td className="num">{fx(Math.abs(num(v.acciaio.MEd)), 1)} kNm</td>
                        <td className="num">{fx((lt.chiLT * pf.Wy * lt.fyk) / num(v.stabilita.gammaM1 || '1.05') / 1e6, 1)} kNm</td>
                        <td className="num">{fx(pf.amplificaY, 3)}</td>
                        <td className="num">{fx(pf.termineMy, 3)}</td>
                      </tr>
                      <tr>
                        <td>Mz,Ed / Mz,Rd</td>
                        <td className="num">{fx(Math.abs(num(v.acciaio.MzEd)), 1)} kNm</td>
                        <td className="num">{fx((pf.Wz * lt.fyk) / num(v.stabilita.gammaM1 || '1.05') / 1e6, 1)} kNm</td>
                        <td className="num">{fx(pf.amplificaZ, 3)}</td>
                        <td className="num">{fx(pf.termineMz, 3)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4}>Somma dei tre termini ≤ 1</td>
                        <td className="num">{fx(pf.sfruttamento, 3)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Output
                    titolo="Grandezze richiamate"
                    voci={[
                      { k: 'χmin (punta)', v: fx(pu.chiMin, 3) },
                      { k: 'χLT', v: fx(lt.chiLT, 3) },
                      { k: 'Ncr,y', v: fx(pu.y.Ncr, 0), u: 'kN' },
                      { k: 'Ncr,z', v: fx(pu.z.Ncr, 0), u: 'kN' },
                      { k: 'Wy', v: fx(pf.Wy / 1000, 1), u: 'cm³' },
                      { k: 'Wz', v: fx(pf.Wz / 1000, 1), u: 'cm³' },
                    ]}
                  />
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
