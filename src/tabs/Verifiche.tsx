import { Cube, Wrench, Tree, GridFour } from '@phosphor-icons/react';
import { useCalcoli, useStore, inputVerifiche, type MaterialeId } from '../state/store';
import { num } from '../calc/azioni';
import { validaTaglioArmato, validaTaglioNonArmato, valido } from '../calc/validazione';
import { ACCIAIO_ARMATURA, ACCIAIO_STRUTTURALE, CLS, DIAMETRI } from '../data/materiali';
import { LIMITI_FRECCIA, SCHEMI_FRECCIA } from '../calc/verifiche';
import {
  TIPI_PROFILO,
  pesoProfilo,
  taglieDisponibili,
  type TipoProfilo,
} from '../data/profili-acciaio';
import {
  SCHEMI_VINCOLI,
  modoTelaio,
  schemaVincoli,
} from '../calc/libera-inflessione';
import {
  CONDIZIONI_CARICO,
  PSI_TABELLATI,
  type Formatura,
  type PuntoCarico,
} from '../calc/instabilita';
import type { RisultatiClasse } from '../calc/classificazione';
import { Accordion, Bar, Field, NumInput, Origine, Output, Select, Seg, Verdict } from '../components/ui';
import { ComandiScheda } from '../components/ComandiScheda';
import { SchemaVincoli, SezioneArmata, SezioneTaglio } from '../components/Disegni';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** I profili cavi, gli unici per cui la formatura cambia la curva. */
const TUBI: TipoProfilo[] = ['TUBO_QUADRO', 'TUBO_RETT', 'TUBO_TONDO'];

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
  // l'acciaio non passa dalla barra: le sue verifiche stanno in due gruppi di
  // tendine, che si aprono una per volta senza perdere di vista le altre
  acciaio: [],
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
    deformazione: df,
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
  const setDF = (patch: Partial<typeof v.deformazione>) => dispatch({ type: 'deformazione', patch });
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

  /** Esito + sfruttamento accanto al titolo di una tendina. */
  const rigaEsito = (es: { ok: boolean; margine: number; sfruttamento: number }) => (
    <>
      <span className="quota-sfr">
        {Number.isFinite(es.sfruttamento) ? `${fx(es.sfruttamento * 100, 0)}%` : '∞'}
      </span>
      <Verdict ok={es.ok} margine={es.margine} />
    </>
  );

  /**
   * I campi che decidono β per un asse: lo schema di vincolo, e — solo dove
   * servono — i due fattori di distribuzione del telaio o il numero a mano.
   */
  const campiBeta = (asse: 'y' | 'z') => {
    const modo = asse === 'y' ? v.stabilita.modoY : v.stabilita.modoZ;
    const beta = asse === 'y' ? pu.y.beta : pu.z.beta;
    const schema = schemaVincoli(modo);
    const set = (patch: Record<string, string>) => setST(patch as Partial<typeof v.stabilita>);
    const campo = (suffisso: string) => `${asse === 'y' ? 'Y' : 'Z'}${suffisso}`;
    const id = (nome: string) => `pu_${nome}${asse}`;
    return (
      <>
        <Field
          id={id('modo')}
          tab="verifiche"
          label={`Vincoli e β nel piano ${asse}-${asse}`}
          dettaglio={{
            formula: schema
              ? `β teorico ${schema.teorico.toFixed(2)}, consigliato ${schema.consigliato.toFixed(2)} — ${schema.nota}`
              : modoTelaio(modo)
                ? 'β dalle formule di Wood sui fattori di distribuzione η1 e η2'
                : 'β scritto a mano',
            ref: 'Vedi la tendina «Come si sceglie β»',
            coeffs: [{ k: `β${asse}`, v: Number.isFinite(beta) ? beta.toFixed(3) : '∞' }],
          }}
        >
          <select
            id={id('modo')}
            className="input"
            value={modo}
            onChange={(e) => set({ [`modo${campo('')}`]: e.target.value })}
          >
            {SCHEMI_VINCOLI.map((sv) => (
              <option key={sv.id} value={sv.id}>
                {sv.label} — β {sv.consigliato.toFixed(2)}
              </option>
            ))}
            <option value="telaio-fissi">Colonna di telaio a nodi fissi (calcolato)</option>
            <option value="telaio-mobili">Colonna di telaio a nodi spostabili (calcolato)</option>
            <option value="manuale">β scritto a mano</option>
          </select>
        </Field>

        {modoTelaio(modo) && (
          <>
            <Field
              id={id('eta1')}
              tab="verifiche"
              label="Fattore di distribuzione η1 (nodo inferiore)"
              unit="—"
              dettaglio={{
                formula: 'η = Kc / (Kc + ΣKtravi), con K = I/L — 0 incastro, 1 cerniera',
                ref: 'UNI EN 1993-1-1, appendice E (Wood)',
              }}
            >
              <NumInput
                id={id('eta1')}
                value={asse === 'y' ? v.stabilita.eta1Y : v.stabilita.eta1Z}
                onChange={(x) => set({ [`eta1${campo('')}`]: x })}
              />
            </Field>
            <Field
              id={id('eta2')}
              tab="verifiche"
              label="Fattore di distribuzione η2 (nodo superiore)"
              unit="—"
            >
              <NumInput
                id={id('eta2')}
                value={asse === 'y' ? v.stabilita.eta2Y : v.stabilita.eta2Z}
                onChange={(x) => set({ [`eta2${campo('')}`]: x })}
              />
            </Field>
          </>
        )}

        {modo === 'manuale' && (
          <Field id={id('beta')} tab="verifiche" label={`Coefficiente β${asse}`} unit="—">
            <NumInput
              id={id('beta')}
              value={asse === 'y' ? v.stabilita.betaY : v.stabilita.betaZ}
              onChange={(x) => set({ [`beta${campo('')}`]: x })}
            />
          </Field>
        )}
      </>
    );
  };

  /** Il disegno dello schema scelto per un asse, o due righe se è un telaio. */
  const disegnoBeta = (asse: 'y' | 'z') => {
    const modo = asse === 'y' ? v.stabilita.modoY : v.stabilita.modoZ;
    const beta = asse === 'y' ? pu.y.beta : pu.z.beta;
    const titolo = `Piano ${asse}-${asse}`;
    if (schemaVincoli(modo)) return <SchemaVincoli schema={modo} beta={beta} titolo={titolo} />;
    return (
      <div className="disegno">
        <div className="titolo">{titolo}</div>
        <p className="note" style={{ margin: '6px 2px' }}>
          {modoTelaio(modo)
            ? `Colonna di telaio a nodi ${modo === 'telaio-fissi' ? 'fissi' : 'spostabili'}: β = ${
                Number.isFinite(beta) ? beta.toFixed(3) : '∞'
              } dalle formule di Wood.`
            : `β = ${Number.isFinite(beta) ? beta.toFixed(3) : '∞'}, scritto a mano.`}
        </p>
      </div>
    );
  };

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

      {v.materiale === 'acciaio' && (
        <>
          {/* ── la sezione, scelta una volta per tutte le verifiche ───────── */}
          <section className="panel">
            <div className="panel-body" style={{ paddingTop: 14 }}>
              <div className="kicker">Sezione</div>
              <div className="panel-split" style={{ marginTop: 10 }}>
                <div className="fields">
                  {scegliProfilo('ac')}

                  <Field
                    id="ac_gm0"
                    tab="verifiche"
                    label="Coefficiente parziale γM0 (resistenza)"
                    unit="—"
                    dettaglio={{ formula: `fyd = fyk / γM0 = ${fx(ac.fyd, 0)} N/mm²`, ref: 'NTC2018 §4.2.4.1.1' }}
                  >
                    <NumInput id="ac_gm0" value={v.acciaio.gammaM0} onChange={(x) => setAC({ gammaM0: x })} />
                  </Field>

                  <Field
                    id="ac_gm1"
                    tab="verifiche"
                    label="Coefficiente parziale γM1 (stabilità)"
                    unit="—"
                    dettaglio={{
                      formula: 'Vale per tutte e tre le verifiche di stabilità',
                      ref: 'NTC2018 §4.2.4.1.1',
                    }}
                  >
                    <NumInput id="ac_gm1" value={v.stabilita.gammaM1} onChange={(x) => setST({ gammaM1: x })} />
                  </Field>
                </div>

                <div className="col-aside">
                  {!ac.proprieta && profiloIgnoto()}
                  <Output
                    titolo="Proprietà della sezione"
                    voci={[
                      { k: 'A', v: fx(ac.proprieta?.A ?? 0, 1), u: 'cm²' },
                      { k: 'h × b', v: `${fx(ac.proprieta?.h ?? 0, 0)} × ${fx(ac.proprieta?.b ?? 0, 0)}`, u: 'mm' },
                      { k: 'peso', v: fx(ac.proprieta ? pesoProfilo(ac.proprieta) : 0, 1), u: 'kg/m' },
                      { k: 'Ix', v: fx(ac.proprieta?.Ix ?? 0, 0), u: 'cm⁴' },
                      { k: 'Imin', v: fx(ac.proprieta?.Imin ?? 0, 1), u: 'cm⁴' },
                      { k: 'Wx,el', v: fx(ac.proprieta?.Wx ?? 0, 1), u: 'cm³' },
                      { k: 'Wx,pl', v: fx(ac.proprieta?.Wplx ?? 0, 1), u: 'cm³' },
                      { k: 'Avz', v: fx(ac.proprieta?.Avz ?? 0, 2), u: 'cm²' },
                      { k: 'fyd', v: fx(ac.fyd, 0), u: 'N/mm²' },
                      {
                        k: 'classe',
                        v: `${lt.classe.classe} in flessione, ${pu.classe.classe} in compressione`,
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── gruppo 1: le verifiche elastiche di predimensionamento ────── */}
          <div className="section-title">Verifiche elastiche — predimensionamento</div>

          <Accordion
            id="ver-ac-flessione"
            title="Flessione elastica"
            hint="MEd ≤ MRd = Wel,x · fyd — §4.2.4.1.2"
            badge={rigaEsito(ac.esitoFlessione)}
          >
            <div className="panel-split">
              <div className="fields">
                <Field
                  id="ac_MEd"
                  tab="verifiche"
                  label="Momento sollecitante MEd"
                  unit="kNm"
                  dettaglio={{ formula: `σ = MEd/Wel,x = ${fx(ac.sigmaM)} N/mm²`, ref: 'NTC2018 §4.2.4.1.2' }}
                >
                  <NumInput id="ac_MEd" value={v.acciaio.MEd} onChange={(x) => setAC({ MEd: x })} />
                </Field>
                <p className="note campo-largo">
                  Verifica di sola sezione, con il modulo elastico: non tiene conto dello
                  sbandamento laterale, che sta nella scheda «Instabilità flesso-torsionale».
                </p>
              </div>
              <div className="col-aside">
                <Output
                  titolo="Flessione"
                  voci={[
                    { k: 'MEd', v: fx(num(v.acciaio.MEd), 1), u: 'kNm' },
                    { k: 'MRd', v: fx(ac.MRd, 1), u: 'kNm' },
                    { k: 'σ', v: fx(ac.sigmaM, 1), u: 'N/mm²' },
                    { k: 'MEd/MRd', v: fx(ac.esitoFlessione.sfruttamento, 3) },
                  ]}
                />
              </div>
            </div>
          </Accordion>

          <Accordion
            id="ver-ac-taglio"
            title="Taglio elastico"
            hint="VEd ≤ VRd = Avz · fyd/√3 — §4.2.4.1.2.4"
            badge={rigaEsito(ac.esitoTaglio)}
          >
            <div className="panel-split">
              <div className="fields">
                <Field
                  id="ac_VEd"
                  tab="verifiche"
                  label="Taglio sollecitante VEd"
                  unit="kN"
                  origine={origineVEd}
                  dettaglio={{ formula: `τ = VEd/Avz = ${fx(ac.tau)} N/mm²`, ref: 'NTC2018 §4.2.4.1.2.4' }}
                >
                  <NumInput
                    id="ac_VEd"
                    value={inp.acciaio.VEd}
                    disabled={collegato}
                    onChange={(x) => setAC({ VEd: x })}
                  />
                </Field>
                <p className="note campo-largo">
                  L’area resistente è quella dell’anima: il taglio parallelo all’asse forte lo
                  porta lei, le ali quasi niente.
                </p>
              </div>
              <div className="col-aside">
                <Output
                  titolo="Taglio"
                  voci={[
                    { k: 'VEd', v: fx(num(inp.acciaio.VEd), 1), u: 'kN' },
                    { k: 'VRd', v: fx(ac.VRd, 1), u: 'kN' },
                    { k: 'τ', v: fx(ac.tau, 1), u: 'N/mm²' },
                    { k: 'VEd/VRd', v: fx(ac.esitoTaglio.sfruttamento, 3) },
                  ]}
                />
              </div>
            </div>
          </Accordion>

          <Accordion
            id="ver-ac-compressione"
            title="Compressione elastica"
            hint="NEd ≤ NRd = A · fyd, senza instabilità — §4.2.4.1.2"
            badge={rigaEsito(ac.esitoCompressione)}
          >
            <div className="panel-split">
              <div className="fields">
                <Field
                  id="ac_NEd"
                  tab="verifiche"
                  label="Sforzo normale NEd (compressione &gt; 0)"
                  unit="kN"
                  dettaglio={{ formula: `σ = NEd/A = ${fx(ac.sigmaN)} N/mm²`, ref: 'NTC2018 §4.2.4.1.2' }}
                >
                  <NumInput id="ac_NEd" value={v.acciaio.NEd} onChange={(x) => setAC({ NEd: x })} />
                </Field>
                <p
                  className="note campo-largo"
                  style={
                    pu.esito.sfruttamento > ac.esitoCompressione.sfruttamento
                      ? { color: 'var(--warn)' }
                      : undefined
                  }
                >
                  È la resistenza della sola sezione. Su un’asta reale comanda quasi sempre
                  l’instabilità: qui Nb,Rd vale {fx(pu.NbRd, 1)} kN contro NRd = {fx(ac.NRd, 1)} kN.
                </p>
              </div>
              <div className="col-aside">
                <Output
                  titolo="Compressione"
                  voci={[
                    { k: 'NEd', v: fx(num(v.acciaio.NEd), 1), u: 'kN' },
                    { k: 'NRd (sezione)', v: fx(ac.NRd, 1), u: 'kN' },
                    { k: 'Nb,Rd (instabilità)', v: fx(pu.NbRd, 1), u: 'kN' },
                    { k: 'σ', v: fx(ac.sigmaN, 1), u: 'N/mm²' },
                    { k: 'NEd/NRd', v: fx(ac.esitoCompressione.sfruttamento, 3) },
                  ]}
                />
              </div>
            </div>
          </Accordion>

          <Accordion
            id="ver-ac-deformazione"
            title="Deformazione (SLE)"
            hint="f ≤ L/limite — §4.2.4.2.1, tab. 4.2.X"
            badge={rigaEsito(df.esito)}
          >
            <div className="panel-split">
              <div className="fields">
                <Field
                  id="df_schema"
                  tab="verifiche"
                  label="Schema statico"
                  dettaglio={{
                    formula: df.schema?.concentrato
                      ? `f = ${fx((df.schema?.k ?? 0) * 1000, 2)}/1000 · P·L³/(E·Ix)`
                      : `f = ${fx((df.schema?.k ?? 0) * 1000, 2)}/1000 · q·L⁴/(E·Ix)`,
                    ref: 'Soluzioni elastiche in forma chiusa',
                  }}
                >
                  <select
                    id="df_schema"
                    className="input"
                    value={v.deformazione.schema}
                    onChange={(e) => setDF({ schema: e.target.value })}
                  >
                    {SCHEMI_FRECCIA.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="df_L" tab="verifiche" label="Luce o sbalzo L" unit="m">
                  <NumInput id="df_L" value={v.deformazione.L} onChange={(x) => setDF({ L: x })} />
                </Field>

                <Field
                  id="df_q"
                  tab="verifiche"
                  label={df.schema?.concentrato ? 'Forza di esercizio P' : 'Carico di esercizio q'}
                  unit={df.schema?.concentrato ? 'kN' : 'kN/m'}
                  dettaglio={{
                    formula: 'Carico raro o quasi permanente, non quello di progetto agli SLU',
                    ref: 'NTC2018 §2.5.3',
                  }}
                >
                  <NumInput id="df_q" value={v.deformazione.q} onChange={(x) => setDF({ q: x })} />
                </Field>

                <Field
                  id="df_uso"
                  tab="verifiche"
                  label="Destinazione (limite di tabella)"
                  dettaglio={{
                    formula: `δmax ≤ L/${v.deformazione.limite} = ${fx(df.fAmmessa, 1)} mm`,
                    ref: 'NTC2018 §4.2.4.2.1, tab. 4.2.X',
                  }}
                >
                  <select
                    id="df_uso"
                    className="input"
                    value={v.deformazione.limite}
                    onChange={(e) => setDF({ limite: e.target.value })}
                  >
                    {LIMITI_FRECCIA.map((l) => (
                      <option key={l.id} value={String(l.limite)}>
                        {l.label} — L/{l.limite}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="df_lim" tab="verifiche" label="Limite L/…, scritto a mano" unit="—">
                  <NumInput id="df_lim" value={v.deformazione.limite} onChange={(x) => setDF({ limite: x })} />
                </Field>
              </div>

              <div className="col-aside">
                <Output
                  titolo="Deformazione"
                  voci={[
                    { k: 'Ix', v: fx(df.proprieta?.Ix ?? 0, 0), u: 'cm⁴' },
                    { k: 'f', v: fx(df.f, 1), u: 'mm' },
                    { k: 'f ammessa', v: fx(df.fAmmessa, 1), u: 'mm' },
                    { k: 'L/f', v: Number.isFinite(df.LsuF) ? fx(df.LsuF, 0) : '∞' },
                    { k: 'f/f amm', v: fx(df.esito.sfruttamento, 3) },
                  ]}
                />
                <p className="note" style={{ marginTop: 10 }}>
                  Freccia elastica in forma chiusa sull’inerzia dell’asse forte: serve a
                  scegliere l’altezza del profilo, non sostituisce il calcolo della struttura
                  reale con i suoi vincoli.
                </p>
              </div>
            </div>
          </Accordion>

          {/* ── gruppo 2: la stabilità ────────────────────────────────────── */}
          <div className="section-title">Verifiche di stabilità</div>

          <Accordion
            id="ver-ac-punta"
            title="Instabilità di punta"
            hint="NEd ≤ Nb,Rd = χ · A · fyk/γM1 — §4.2.4.1.3.1"
            badge={rigaEsito(pu.esito)}
          >
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

                <div className="kicker campo-largo" style={{ marginTop: 4 }}>
                  Sbandamento nel piano y-y (asse forte)
                </div>

                <Field
                  id="pu_Ly"
                  tab="verifiche"
                  label="Lunghezza dell’asta L"
                  unit="mm"
                  dettaglio={{
                    formula: `Lcr,y = βy · Ly = ${fx(pu.y.beta, 2)} · ${v.stabilita.Ly} = ${fx(pu.y.Lcr, 0)} mm`,
                    ref: 'NTC2018 §4.2.4.1.3.1',
                  }}
                >
                  <NumInput id="pu_Ly" value={v.stabilita.Ly} onChange={(x) => setST({ Ly: x })} />
                </Field>

                {campiBeta('y')}

                <div className="kicker campo-largo" style={{ marginTop: 4 }}>
                  Sbandamento nel piano z-z (asse debole)
                </div>

                <Field
                  id="pu_Lz"
                  tab="verifiche"
                  label="Lunghezza dell’asta L"
                  unit="mm"
                  dettaglio={{
                    formula: `Lcr,z = βz · Lz = ${fx(pu.z.beta, 2)} · ${v.stabilita.Lz} = ${fx(pu.z.Lcr, 0)} mm`,
                    ref: 'NTC2018 §4.2.4.1.3.1',
                  }}
                >
                  <NumInput id="pu_Lz" value={v.stabilita.Lz} onChange={(x) => setST({ Lz: x })} />
                </Field>

                {campiBeta('z')}

                {TUBI.includes(v.acciaio.tipoProfilo) && scegliFormatura('pu')}

              </div>

              <div className="col-aside">
                <div className="coppia-disegni">
                  {disegnoBeta('y')}
                  {disegnoBeta('z')}
                </div>
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
          </Accordion>

          <Accordion
            id="ver-ac-lt"
            title="Instabilità flesso-torsionale"
            hint="MEd ≤ Mb,Rd = χLT · Wy · fyk/γM1 — §4.2.4.1.3.2"
            badge={rigaEsito(lt.esito)}
          >
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
          </Accordion>

          <Accordion
            id="ver-ac-combinata"
            title="Presso-flessione combinata"
            hint="Somma dei tre termini ≤ 1 — Circolare §C4.2.4.1.3.3"
            badge={rigaEsito(pf.esito)}
          >
            <div className="esito-testa">
              <Verdict ok={pf.esito.ok} margine={pf.esito.margine} />
              <Bar sfruttamento={pf.sfruttamento} />
              <span className="note">
                Asta presso-inflessa — Metodo A, Circolare NTC2018 §C4.2.4.1.3.3
              </span>
            </div>

            <div className="panel-split">
              <div className="fields">
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

                <p className="note campo-largo">
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
          </Accordion>

          <Accordion
            id="ver-ac-guida-beta"
            title="Come si sceglie β"
            hint="Schemi di vincolo, valori consigliati e colonne di telaio"
          >
            <p className="note" style={{ marginBottom: 12 }}>
              β dice quanto è lunga l’asta <em>ai fini dell’instabilità</em>: Lcr = β·L è la
              distanza fra due punti di flesso della deformata di sbandamento, cioè il pezzo di
              asta che si comporta come un’asta di Eulero incernierata agli estremi. Conta più di
              ogni altro dato, perché il carico critico va con 1/(β·L)²: fra β = 0.7 e β = 2 il
              carico critico si divide per otto.
            </p>
            <p className="note" style={{ marginBottom: 12 }}>
              La domanda da farsi è sempre la stessa, e sono due: <strong>gli estremi ruotano?</strong>{' '}
              e <strong>possono spostarsi l’uno rispetto all’altro?</strong> La seconda pesa più
              della prima — un telaio non controventato non scende mai sotto β = 1, per quanto
              rigidi siano i nodi.
            </p>

            <div className="griglia-schemi">
              {SCHEMI_VINCOLI.map((sv) => (
                <div key={sv.id} className="scheda-schema">
                  <SchemaVincoli schema={sv.id} beta={sv.consigliato} />
                  <div className="titolo">{sv.label}</div>
                  <div className="valori">
                    β teorico {sv.teorico.toFixed(2)} · <strong>consigliato {sv.consigliato.toFixed(2)}</strong>
                  </div>
                  <div className="nota">{sv.nota}</div>
                </div>
              ))}
            </div>

            <p className="note" style={{ marginTop: 14 }}>
              I valori <strong>consigliati</strong> sono più alti dei teorici perché un incastro
              vero non è quello del disegno: una base di colonna ruota, un nodo bullonato cede. Il
              prospetto è quello classico di CNR-UNI 10011, lo stesso della tabella C-A-7.1 del
              commentario AISC, riportato da Ballio e Mazzolani in «Strutture in acciaio». In
              progetto si usano i consigliati; i teorici valgono solo se il vincolo è davvero
              quello ideale.
            </p>

            <div className="kicker" style={{ marginTop: 16 }}>Colonne di telaio</div>
            <p className="note" style={{ marginTop: 8 }}>
              Per una colonna di telaio i vincoli non sono né cerniere né incastri: sono le travi
              che le arrivano ai nodi, e la loro rigidezza. La UNI EN 1993-1-1 (appendice E della
              ENV, formule di Wood) le riassume in due <strong>fattori di distribuzione</strong>:
            </p>
            <pre className="formula-blocco">{`η = Kc / (Kc + ΣKtravi)      con K = I / L

η = 0   travi infinitamente rigide → incastro perfetto
η = 1   nessuna trave → cerniera

nodi fissi (telaio controventato):
  β = [1 + 0.145·(η1+η2) − 0.265·η1·η2] / [2 − 0.364·(η1+η2) − 0.247·η1·η2]

nodi spostabili (telaio non controventato):
  β = √{ [1 − 0.2·(η1+η2) − 0.12·η1·η2] / [1 − 0.8·(η1+η2) + 0.6·η1·η2] }`}</pre>
            <p className="note" style={{ marginTop: 8 }}>
              Agli estremi del campo tornano i casi elementari: η1 = η2 = 0 dà 0.5 a nodi fissi e
              1.0 a nodi spostabili, η1 = η2 = 1 dà 1.0 a nodi fissi e infinito a nodi spostabili
              — un telaio spostabile su due cerniere è un cinematismo, e la formula lo dice.
            </p>
            <p className="note" style={{ marginTop: 8 }}>
              Un’ultima cosa che si dimentica spesso: <strong>βy e βz sono due numeri diversi</strong>.
              Una colonna di capannone è un telaio nel piano dell’orditura (β &gt; 1) ed è
              controventata fuori piano, dove i correnti la trattengono ogni pochi metri: lì Lz è
              corta e β vale 1. Le due colonne di dati qui sopra vanno compilate separatamente.
            </p>
          </Accordion>
        </>
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
