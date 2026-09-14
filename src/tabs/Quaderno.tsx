import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from 'react';
import {
  Backspace,
  CaretDown,
  CaretUp,
  Check,
  ClipboardText,
  DotsSixVertical,
  DownloadSimple,
  GridNine,
  Image as ImageIcon,
  Info,
  Minus,
  NotePencil,
  PencilSimple,
  Plus,
  Printer,
  Ruler,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { useStore, type CapitoloId } from '../state/store';
import { ComandiScheda } from '../components/ComandiScheda';
import {
  GRANDEZZE_CATALOGO,
  PREIMPOSTATE_DEFAULT,
  VOCI_DEFAULT,
  formatta,
  formattaIn,
  haOperazioni,
  nomiRichiesti,
  ricalcola,
  vociDaSelezioni,
  type Preimpostata,
  type Selezioni,
  type TipoVoce,
  type VoceCalcolo,
  type VoceCalcolata,
} from '../calc/calcolatrice';
import {
  corredoFormula,
  larghezzaValida,
  livelloEsito,
  nuovoBlocco,
  ricalcolaQuaderno,
  type Corredo,
  type BloccoCalcolato,
  type BloccoQuaderno,
  type TipoBlocco,
} from '../calc/quaderno';
import { CAPITOLI, blocchiCapitolo, importiDaSchede, titoloCapitolo } from '../calc/relazione';
import { documentoHtml, documentoTesto, nomeFile, oggi } from '../calc/esportazione';
import { salvaConNome } from '../calc/salvataggio';
import { UNITA_DEFAULT, normalizzaElenco, unitaInElenco } from '../calc/unita';
import { ACCIAI, CLS, DIAMETRI, SIGLE_ACCIAIO } from '../data/materiali';
import { TAGLIE_BULLONE } from '../data/bulloni';
import { TIPI_PROFILO, taglieDisponibili, type TipoProfilo } from '../data/profili-acciaio';

/* ─────────────────────────── cose di servizio ─────────────────────────── */

/** Che cosa dice il colore di un rapporto letto in percento. */
const SEMAFORO = {
  ok: 'sotto l’80 %: c’è margine',
  limite: 'fra l’80 e il 100 %: al limite',
  fuori: 'oltre il 100 %: non verificato',
} as const;

/** Larghezza massima di uno schema incollato: oltre, il file diventa enorme. */
const LATO_MAX = 1400;

/**
 * Le grandezze che l'app sa proporre: quelle di partenza più il catalogo. È
 * l'elenco da cui una formula preimpostata pesca le variabili che le servono e
 * che non ci sono ancora — con la loro unità di misura, che è la parte che
 * conta: una `q` senza unità fa tornare un numero che non vuol dire niente.
 */
const CATALOGO: Omit<VoceCalcolo, 'id'>[] = [
  ...VOCI_DEFAULT.map(({ id: _id, ...g }) => g),
  ...GRANDEZZE_CATALOGO,
];

/**
 * I tasti dei campi del foglio: **invio conferma e chiude**. Su un foglio non
 * si «salva» una casella: si finisce di scrivere e si passa oltre.
 *
 * Shift+invio non passa di qui: in un campo di testo va a capo da sé, e su una
 * riga di calcolo lo raccoglie il blocco, che con quello chiude la linea del
 * foglio (vedi `tasti` in `BloccoCard`).
 */
function tastiCampo(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  if (e.key !== 'Enter' || e.shiftKey) return;
  e.preventDefault();
  e.currentTarget.blur();
}

/**
 * Un campo di testo che cresce con quello che ci si scrive. Sulla carta un
 * campo non è una casella con la barra di scorrimento: è il testo del
 * documento, e il documento è alto quanto quello che ci sta scritto.
 */
function CampoTesto({
  value,
  onChange,
  onKeyDown,
  ...resto
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'rows'> & {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...resto}
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!e.defaultPrevented) tastiCampo(e);
      }}
    />
  );
}

/**
 * Quanto è largo un campo che si misura sul suo contenuto. `field-sizing` fa
 * già tutto dove c'è; dove non c'è, questo è il numero di caratteri con cui il
 * campo nasce — così la riga resta larga quanto quello che porta scritto.
 */
function misuraCampo(testo: string, minimo: number): number {
  return Math.max(minimo, testo.length + 1);
}

/** La γ dei pesi di volume si scrive con il pedice: γC, non gC. */
function Nome({ nome }: { nome: string }) {
  const m = /^([γΓ])(.+)$/.exec(nome.trim());
  if (!m) return <>{nome}</>;
  return (
    <>
      {m[1]}
      <sub>{m[2]}</sub>
    </>
  );
}

/**
 * Payload del drag & drop: che cosa si sta trascinando nel quaderno. Con
 * `sposta` valorizzato non è roba nuova che arriva dal pannello, ma un blocco
 * già sul foglio che sta cambiando posto.
 */
interface Trascinato {
  tipo: TipoBlocco;
  fonte: string;
  /** id del blocco che si sta spostando, per il riordino. */
  sposta?: string;
}

const MIME = 'application/x-quaderno';

function iniziaTrascinamento(e: DragEvent, dato: Trascinato) {
  e.dataTransfer.setData(MIME, JSON.stringify(dato));
  e.dataTransfer.setData('text/plain', dato.fonte);
  e.dataTransfer.effectAllowed = 'copy';
}

function leggiTrascinato(e: DragEvent): Trascinato | null {
  try {
    const raw = e.dataTransfer.getData(MIME);
    if (!raw) return null;
    const d = JSON.parse(raw) as Trascinato;
    return d?.tipo ? d : null;
  } catch {
    return null;
  }
}

/**
 * Riduce uno schema incollato a una misura da documento e lo mette in un data
 * URL: l'immagine viaggia dentro il progetto e dentro l'HTML esportato, quindi
 * tenerla piccola non è un vezzo — è la differenza fra un file che si apre e
 * uno che non si salva nemmeno.
 */
function leggiImmagine(file: File): Promise<string> {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onerror = () => rifiuta(new Error('immagine non leggibile'));
    lettore.onload = () => {
      const src = String(lettore.result);
      const img = new Image();
      img.onerror = () => risolvi(src);
      img.onload = () => {
        const scala = Math.min(1, LATO_MAX / Math.max(img.width, img.height));
        if (scala >= 1 && src.length < 400_000) return risolvi(src);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scala));
        c.height = Math.max(1, Math.round(img.height * scala));
        const ctx = c.getContext('2d');
        if (!ctx) return risolvi(src);
        // fondo bianco: un PNG trasparente su carta bianca deve restare leggibile
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        risolvi(c.toDataURL('image/jpeg', 0.9));
      };
      img.src = src;
    };
    lettore.readAsDataURL(file);
  });
}

/** Prima immagine fra i file trascinati o negli appunti. */
function immagineDa(dati: DataTransfer | null): File | null {
  if (!dati) return null;
  for (const f of Array.from(dati.files)) if (f.type.startsWith('image/')) return f;
  for (const it of Array.from(dati.items)) {
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const f = it.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

/* ─────────────────────────── sezioni del pannello ─────────────────────── */

function Sezione({
  id,
  titolo,
  hint,
  children,
}: {
  id: string;
  titolo: string;
  hint?: string;
  children: ReactNode;
}) {
  const { state, dispatch } = useStore();
  const aperto = !!state.ui.open[id];
  return (
    <div className={`quad-sez${aperto ? ' is-aperta' : ''}`}>
      <button
        type="button"
        className="quad-sez-testa"
        aria-expanded={aperto}
        aria-controls={`${id}-corpo`}
        onClick={() => dispatch({ type: 'toggleOpen', id })}
      >
        <span className="t">{titolo}</span>
        {hint && !aperto && <span className="d">{hint}</span>}
        {aperto ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
      </button>
      {aperto && (
        <div className="quad-sez-corpo" id={`${id}-corpo`}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * I campi con cui si sistema una grandezza: nome, unità, nota, colonna. Sono
 * gli stessi sotto la riga di una costante e nell'elenco che apre la matita
 * delle variabili — l'anagrafica di una grandezza è una sola.
 */
function CampiGrandezza({
  v,
  elenco,
  onAggiorna,
  onElimina,
}: {
  v: VoceCalcolata;
  elenco: string[];
  onAggiorna: (patch: Partial<VoceCalcolo>) => void;
  onElimina: () => void;
}) {
  const fuori = !!v.um.trim() && !unitaInElenco(v.um, elenco);
  return (
    <div className="quad-gr-modifica">
      <div className="mini-campo">
        <label htmlFor={`qn-${v.id}`}>Nome</label>
        <input
          id={`qn-${v.id}`}
          className={`input${v.nome.trim() && !v.nomeValido ? ' is-error' : ''}`}
          value={v.nome}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onAggiorna({ nome: e.target.value })}
        />
      </div>
      <div className="mini-campo">
        <label htmlFor={`qu-${v.id}`}>Unità</label>
        <input
          id={`qu-${v.id}`}
          className={`input${fuori ? ' is-error' : ''}`}
          value={v.um}
          list="quad-elenco-unita"
          placeholder={v.umCalcolata || 'kN/mq'}
          autoComplete="off"
          spellCheck={false}
          title={fuori ? 'Unità non in elenco' : undefined}
          onChange={(e) => onAggiorna({ um: e.target.value })}
        />
      </div>
      <div className="mini-campo quad-campo-largo">
        <label htmlFor={`qt-${v.id}`}>Nota</label>
        <input
          id={`qt-${v.id}`}
          className="input"
          value={v.nota}
          autoComplete="off"
          onChange={(e) => onAggiorna({ nota: e.target.value })}
        />
      </div>
      <div className="mini-campo">
        <label htmlFor={`qc-${v.id}`}>Colonna</label>
        <select
          id={`qc-${v.id}`}
          className="input"
          value={v.tipo ?? 'operazione'}
          onChange={(e) => onAggiorna({ tipo: e.target.value as TipoVoce })}
        >
          <option value="compilabile">Da compilare</option>
          <option value="fissa">Fissa</option>
          <option value="operazione">Operazione</option>
        </select>
      </div>
      <button type="button" className="btn btn-secondary btn-icon" title="Elimina la grandezza" onClick={onElimina}>
        <Trash size={13} />
      </button>
    </div>
  );
}

/**
 * Una variabile nell'elenco del pannello: una pastiglia con il nome e l'unità
 * di misura, niente numero. Toccandola finisce sul foglio, ed è **lì** che si
 * scrive il valore — il pannello dice che cosa esiste, il foglio quanto vale.
 */
function PastigliaVariabile({
  v,
  dentro,
  onAggiungi,
}: {
  v: VoceCalcolata;
  /** true = una riga che la richiama è già sul foglio. */
  dentro: boolean;
  onAggiungi: () => void;
}) {
  return (
    <button
      type="button"
      className={`quad-chip is-variabile${dentro ? ' is-dentro' : ''}`}
      draggable
      onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'valore', fonte: v.id })}
      title={`${v.nota || v.nome} — tocca per metterla sul foglio: il valore si scrive lì`}
      onClick={onAggiungi}
    >
      <span className="n">
        <Nome nome={v.nome || '—'} />
      </span>
      {v.umEffettiva && <span className="um">{v.umEffettiva}</span>}
    </button>
  );
}

/**
 * Una grandezza nel pannello: il valore si scrive dentro la pastiglia, il nome
 * la trascina nel quaderno e il «+» ce la mette senza trascinare. Toccando il
 * nome si aprono unità, nota e colonna.
 */
function RigaGrandezza({
  v,
  elenco,
  aperta,
  onApri,
  onAggiorna,
  onElimina,
  onAggiungi,
}: {
  v: VoceCalcolata;
  elenco: string[];
  aperta: boolean;
  onApri: () => void;
  onAggiorna: (patch: Partial<VoceCalcolo>) => void;
  onElimina: () => void;
  onAggiungi: () => void;
}) {
  return (
    <div className={`quad-gr${v.errore ? ' is-errore' : ''}${aperta ? ' is-aperta' : ''}`}>
      <div
        className="quad-gr-riga"
        draggable
        onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'valore', fonte: v.id })}
        title={`${v.nota || v.nome} — trascina nel quaderno, o tocca il «+»`}
      >
        <button type="button" className="quad-gr-nome" aria-expanded={aperta} onClick={onApri}>
          <Nome nome={v.nome || '—'} />
        </button>
        <input
          className={`input quad-gr-valore${v.errore ? ' is-error' : ''}`}
          value={v.espressione}
          placeholder="—"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-label={`Valore di ${v.nome || 'grandezza'}`}
          onChange={(e) => onAggiorna({ espressione: e.target.value })}
        />
        <span className="quad-gr-um" title={v.umEffettiva}>
          {v.umEffettiva}
        </span>
        <button
          type="button"
          className={`quad-gr-edita${aperta ? ' is-aperta' : ''}`}
          aria-expanded={aperta}
          title={aperta ? 'Chiudi la modifica' : 'Edita nome, unità, nota e colonna'}
          onClick={onApri}
        >
          {aperta ? <Check size={11} weight="bold" /> : <PencilSimple size={11} />}
        </button>
        <button type="button" className="quad-gr-piu" title="Metti nel quaderno" onClick={onAggiungi}>
          <Plus size={11} weight="bold" />
        </button>
      </div>

      {aperta && <CampiGrandezza v={v} elenco={elenco} onAggiorna={onAggiorna} onElimina={onElimina} />}
    </div>
  );
}

/** Le scelte a tendina da cui nascono le grandezze fisse di libreria. */
function ScelteLibreria({
  sel,
  derivate,
  onCambia,
  onAggiungi,
}: {
  sel: Selezioni;
  derivate: VoceCalcolata[];
  onCambia: (patch: Partial<Selezioni>) => void;
  onAggiungi: (v: VoceCalcolata) => void;
}) {
  return (
    <>
      <div className="quad-scelte">
        <div className="mini-campo">
          <label htmlFor="q-cls">CLS</label>
          <select id="q-cls" className="input" value={sel.cls} onChange={(e) => onCambia({ cls: e.target.value })}>
            <option value="">— nessuno —</option>
            {Object.keys(CLS).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-acc">Acciaio</label>
          <select id="q-acc" className="input" value={sel.acciaio} onChange={(e) => onCambia({ acciaio: e.target.value })}>
            <option value="">— nessuno —</option>
            {SIGLE_ACCIAIO.map((s) => (
              <option key={s} value={s}>
                {s} — {ACCIAI[s].famiglia}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-prof">Profilo</label>
          <select
            id="q-prof"
            className="input"
            value={sel.profiloTipo}
            onChange={(e) => onCambia({ profiloTipo: e.target.value as TipoProfilo, profiloTaglia: '' })}
          >
            {TIPI_PROFILO.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-prof-t">Taglia</label>
          <select
            id="q-prof-t"
            className="input"
            value={sel.profiloTaglia}
            onChange={(e) => onCambia({ profiloTaglia: e.target.value })}
          >
            <option value="">— nessuna —</option>
            {taglieDisponibili(sel.profiloTipo).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-fi">Ferro ⌀</label>
          <select id="q-fi" className="input" value={sel.barraFi} onChange={(e) => onCambia({ barraFi: e.target.value })}>
            {DIAMETRI.map((d) => (
              <option key={d} value={d}>
                ⌀{d}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-fi-n">n. ferri</label>
          <input
            id="q-fi-n"
            className="input"
            value={sel.barraN}
            placeholder="—"
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => onCambia({ barraN: e.target.value })}
          />
        </div>
        <div className="mini-campo">
          <label htmlFor="q-m">Bullone M</label>
          <select id="q-m" className="input" value={sel.bulloneM} onChange={(e) => onCambia({ bulloneM: e.target.value })}>
            {TAGLIE_BULLONE.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="q-m-n">n. bulloni</label>
          <input
            id="q-m-n"
            className="input"
            value={sel.bulloneN}
            placeholder="—"
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => onCambia({ bulloneN: e.target.value })}
          />
        </div>
      </div>

      {derivate.length > 0 ? (
        <div className="quad-chips">
          {derivate.map((v) => (
            <button
              key={v.id}
              type="button"
              className="quad-chip"
              draggable
              onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'valore', fonte: v.id })}
              title={`${v.nota} — trascina o tocca per metterla nel quaderno`}
              onClick={() => onAggiungi(v)}
            >
              <span className="n">{v.nome}</span>
              <strong>{formatta(v.valore)}</strong>
              {v.umEffettiva && <span className="um">{v.umEffettiva}</span>}
            </button>
          ))}
        </div>
      ) : (
        <p className="note" style={{ margin: 0 }}>
          Nessuna scelta fatta: scegli una classe di calcestruzzo, un acciaio o un profilo e qui
          compaiono resistenze di progetto, aree e inerzie, da tirare nel quaderno o da richiamare
          per nome nelle formule.
        </p>
      )}
    </>
  );
}

/**
 * Che cosa è successo quando una formula preimpostata è entrata nel foglio:
 * quante grandezze si è portata dietro, quali nomi restano da spiegare. Serve
 * a non far sembrare magia una riga che è comparsa da sola.
 */
function messaggioCorredo(c: Corredo): string {
  const pezzi: string[] = [];
  const nuove = c.grandezze.map((g) => g.nome);
  if (nuove.length) pezzi.push(`aggiunt${nuove.length === 1 ? 'a' : 'e'} ${nuove.join(', ')} alle variabili`);
  const righe = c.blocchi.length;
  if (righe) pezzi.push(`${righe} ${righe === 1 ? 'riga messa' : 'righe messe'} sul foglio`);
  if (c.senzaUnita.length) pezzi.push(`${c.senzaUnita.join(', ')} ${c.senzaUnita.length === 1 ? 'è senza unità' : 'sono senza unità'}`);
  if (c.daInventare.length) pezzi.push(`manca ancora ${c.daInventare.join(', ')}: dimmi cos’è`);
  if (!pezzi.length) return 'Formula aggiunta: le variabili che le servono ci sono già';
  return `Formula aggiunta — ${pezzi.join('; ')}`;
}

/* ─────────────────────────── la scheda ─────────────────────────── */

export default function Quaderno() {
  const { state, dispatch } = useStore();
  const q = state.quaderno;
  const calc = state.calcolatrice;
  const aiuto = state.ui.allDetails.quaderno;

  const [toast, setToast] = useState('');
  const [apriUnita, setApriUnita] = useState(false);
  const [nuovaUnita, setNuovaUnita] = useState('');
  const [modificaFormule, setModificaFormule] = useState(false);
  /** La matita in fondo alle variabili: aperta, mostra l'anagrafica di tutte. */
  const [modificaVariabili, setModificaVariabili] = useState(false);
  const [nuovaPre, setNuovaPre] = useState({ nome: '', espressione: '', um: '', nota: '' });
  /** Ultimo campo di formula toccato: è lì che scrive il tastierino. */
  const ultimoCampo = useRef<HTMLInputElement | null>(null);
  /** Blocco appena aggiunto: nasce con il cursore già dentro, si scrive e via. */
  const [daScrivere, setDaScrivere] = useState('');
  /**
   * La riga sotto il cursore (o con il focus dentro): è quella su cui si posa
   * il pannello dei comandi. Uno solo per tutto il foglio, non uno per riga.
   */
  const [rigaAttiva, setRigaAttiva] = useState('');
  /**
   * L'ultima riga toccata: è il punto in cui la barra infila quello che si
   * aggiunge. Non è quella sotto il cursore — se no il posto cambierebbe a
   * ogni movimento del mouse mentre si va a premere il pulsante.
   */
  const [rigaScelta, setRigaScelta] = useState('');
  /** La riga di cui è aperto l'appunto: uno per volta, come il pannello. */
  const [appuntoAperto, setAppuntoAperto] = useState('');
  const foglioRef = useRef<HTMLDivElement>(null);
  const pannelloRef = useRef<HTMLDivElement>(null);
  const [posPannello, setPosPannello] = useState<{ left: number; top: number } | null>(null);
  /**
   * I nomi che l'ultima formula richiamava e che non si sanno da nessuna
   * parte: si mostrano sotto la barra dei comandi, con l'unità da scrivere.
   * Non è un errore da chiudere, è la domanda «questa cos'è?» — resta lì
   * finché non le si dà una risposta o non la si scaccia.
   */
  const [daInventare, setDaInventare] = useState<{ nome: string; um: string }[]>([]);

  const setQ = (patch: Partial<typeof q>) => dispatch({ type: 'quaderno', patch });
  const setCalc = (patch: Partial<typeof calc>) => dispatch({ type: 'calcolatrice', patch });

  const flash = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(''), 2400);
  };

  /* ── i numeri: le grandezze del pannello e i blocchi del foglio ── */

  // le grandezze che nascono dalle scelte di libreria stanno in testa alla
  // sequenza, così ogni formula più in basso le vede
  const daLibreria = useMemo(() => vociDaSelezioni(calc.selezioni), [calc.selezioni]);
  const generate = useMemo(
    () => ricalcola([...daLibreria, ...calc.voci], calc.unita),
    [daLibreria, calc.voci, calc.unita],
  );
  const derivate = generate.slice(0, daLibreria.length);
  const voci = generate.slice(daLibreria.length);
  // gli import vengono dalle altre schede: si rifanno quando cambia lo stato
  const importi = useMemo(() => importiDaSchede(state), [state]);

  const calcolati = useMemo(
    () =>
      ricalcolaQuaderno(q.blocchi, {
        voci: generate,
        preimpostate: calc.preimpostate,
        importi,
        elenco: calc.unita,
      }),
    [q.blocchi, generate, calc.preimpostate, calc.unita, importi],
  );

  /* ── comporre il quaderno ── */

  /**
   * Il posto in cui la barra infila quello che si aggiunge: **subito dopo la
   * riga toccata per ultima**. È il posto in cui si sta scrivendo, ed è il
   * motivo per cui il «+» su ogni riga non serve più.
   */
  const dopoLaScelta = () => {
    const i = q.blocchi.findIndex((b) => b.id === rigaScelta);
    return i < 0 ? undefined : i + 1;
  };

  /** Mette un blocco al posto `dove` (in coda se non lo si dice). */
  const aggiungi = (b: BloccoQuaderno, dove?: number) => {
    const i = dove == null ? q.blocchi.length : Math.max(0, Math.min(q.blocchi.length, dove));
    setQ({ blocchi: [...q.blocchi.slice(0, i), b, ...q.blocchi.slice(i)] });
    setRigaScelta(b.id);
  };
  /**
   * Una formula nuova: entra subito dopo la riga su cui si sta scrivendo e
   * nasce con il cursore dentro. Se il posto non va bene la si sposta —
   * trascinandola per la sua presa, o con Alt+↑ / Alt+↓.
   */
  const aggiungiFormula = (dove?: number) => {
    const b = nuovoBlocco('formula');
    aggiungi(b, dove);
    setDaScrivere(b.id);
  };

  /**
   * Una formula preimpostata entra **con il suo corredo**: le grandezze che
   * nomina e che il foglio non ha ancora arrivano prima di lei, e quelle che
   * mancano anche dal pannello si aggiungono da sé — con l'unità di misura del
   * catalogo, perché è quella che fa tornare i conti quando si mescolano kN/m,
   * metri e MPa.
   *
   * Quello che il catalogo non conosce non si inventa: il nome finisce nella
   * riga dei suggerimenti, dove si scrive cos'è e in che unità si misura.
   */
  const aggiungiOperazione = (fonte: string, dove?: number) => {
    const blocco = nuovoBlocco('operazione', { fonte });
    const pre = calc.preimpostate.find((p) => p.id === fonte);
    if (!pre) return aggiungi(blocco, dove);

    const c = corredoFormula(pre.espressione, {
      voci: [...daLibreria, ...calc.voci],
      blocchi: calcolati,
      catalogo: CATALOGO,
    });

    if (c.grandezze.length) setCalc({ voci: [...calc.voci, ...c.grandezze] });
    const i = dove == null ? q.blocchi.length : Math.max(0, Math.min(q.blocchi.length, dove));
    setQ({ blocchi: [...q.blocchi.slice(0, i), ...c.blocchi, blocco, ...q.blocchi.slice(i)] });
    setDaInventare(c.daInventare.map((nome) => ({ nome, um: '' })));
    flash(messaggioCorredo(c));
  };

  /**
   * Una grandezza che il catalogo non aveva: la si battezza qui, con la sua
   * unità, ed entra fra quelle da compilare. La riga si posa sul foglio subito
   * prima del primo passaggio che la nomina — è lì che serve leggerla.
   */
  const inventaGrandezza = (nome: string, um: string) => {
    const id = `calc-${Date.now()}-${nome}`;
    setCalc({
      voci: [...calc.voci, { id, nome, espressione: '', nota: '', um: um.trim(), tipo: 'compilabile' }],
    });
    const dove = calcolati.findIndex((b) => !b.pieno && nomiRichiesti(b.espressione).includes(nome));
    aggiungi(nuovoBlocco('valore', { fonte: id }), dove < 0 ? undefined : dove);
    setDaInventare((v) => v.filter((x) => x.nome !== nome));
  };

  const aggiornaBlocco = (id: string, patch: Partial<BloccoQuaderno>) =>
    setQ({ blocchi: q.blocchi.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const eliminaBlocco = (id: string) => {
    setQ({ blocchi: q.blocchi.filter((b) => b.id !== id) });
    if (rigaAttiva === id) setRigaAttiva('');
    if (rigaScelta === id) setRigaScelta('');
  };

  /**
   * Sposta un blocco al posto `dove`, contato sul foglio di adesso: è il
   * riordino, quello che serve quando ci si accorge che la sezione andava
   * calcolata prima della tensione.
   */
  const spostaBlocco = (id: string, dove: number) => {
    const da = q.blocchi.findIndex((b) => b.id === id);
    if (da < 0) return;
    const senza = q.blocchi.filter((b) => b.id !== id);
    const meta = Math.max(0, Math.min(senza.length, dove > da ? dove - 1 : dove));
    if (meta === da) return;
    setQ({ blocchi: [...senza.slice(0, meta), q.blocchi[da], ...senza.slice(meta)] });
  };

  /** Un passo avanti o indietro: il riordino da tastiera (Alt+↑ / Alt+↓). */
  const scorri = (id: string, verso: -1 | 1) => {
    const da = q.blocchi.findIndex((b) => b.id === id);
    if (da < 0) return;
    const a = da + verso;
    if (a < 0 || a >= q.blocchi.length) return;
    const nuovi = [...q.blocchi];
    [nuovi[da], nuovi[a]] = [nuovi[a], nuovi[da]];
    setQ({ blocchi: nuovi });
  };

  /**
   * Qualcosa è caduto sul foglio: una grandezza o una formula dal pannello, un
   * blocco che sta cambiando posto, o un'immagine da fuori. `dove` è il posto
   * in cui si è lasciato: in coda quando è la zona di arrivo in fondo.
   */
  const onDrop = (e: DragEvent, dove?: number) => {
    const d = leggiTrascinato(e);
    if (d) {
      e.preventDefault();
      e.stopPropagation();
      if (d.sposta) spostaBlocco(d.sposta, dove ?? q.blocchi.length);
      else if (d.tipo === 'operazione') aggiungiOperazione(d.fonte, dove);
      else aggiungi(nuovoBlocco(d.tipo, { fonte: d.fonte }), dove);
      return;
    }
    const file = immagineDa(e.dataTransfer);
    if (file) {
      e.preventDefault();
      e.stopPropagation();
      void leggiImmagine(file).then((img) => aggiungi(nuovoBlocco('immagine', { img }), dove));
    }
  };

  /** Uno schema incollato con Ctrl+V sul foglio diventa un blocco da sé. */
  const onPaste = (e: React.ClipboardEvent) => {
    const file = immagineDa(e.clipboardData);
    if (!file) return;
    e.preventDefault();
    void leggiImmagine(file).then((img) => aggiungi(nuovoBlocco('immagine', { img })));
  };

  /* ── grandezze del pannello ── */

  const setVoci = (v: VoceCalcolo[]) => setCalc({ voci: v });
  const aggiornaVoce = (id: string, patch: Partial<VoceCalcolo>) =>
    setVoci(calc.voci.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const aggiungiGrandezza = (base?: Partial<Omit<VoceCalcolo, 'id'>>) => {
    const id = `calc-${Date.now()}`;
    setVoci([...calc.voci, { id, nome: '', espressione: '', nota: '', um: '', tipo: 'compilabile', ...base }]);
    if (!base?.nome) dispatch({ type: 'toggleExp', id: `quad-${id}` });
  };

  /** Le variabili del pannello: l'elenco, non i valori — quelli stanno sul foglio. */
  const compilabili = voci.filter((v) => (v.tipo ?? 'operazione') === 'compilabile');
  /** Le fonti che hanno già una riga sul foglio: la pastiglia lo dice con la spunta. */
  const fontiSulFoglio = new Set(q.blocchi.filter((b) => b.tipo === 'valore').map((b) => b.fonte));

  const nomiUsati = new Set(generate.map((v) => v.nome.trim()));
  const proposte = CATALOGO.filter((g) => !nomiUsati.has(g.nome));

  /* ── formule preimpostate ── */

  const setPre = (p: Preimpostata[]) => setCalc({ preimpostate: p });
  const aggiornaPre = (id: string, patch: Partial<Preimpostata>) =>
    setPre(calc.preimpostate.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const aggiungiPre = () => {
    if (!nuovaPre.espressione.trim()) return;
    setPre([
      ...calc.preimpostate,
      {
        id: `pre-${Date.now()}`,
        nome: nuovaPre.nome.trim(),
        espressione: nuovaPre.espressione.trim(),
        nota: nuovaPre.nota.trim(),
        um: nuovaPre.um.trim(),
      },
    ]);
    setNuovaPre({ nome: '', espressione: '', um: '', nota: '' });
  };

  /* ── unità proposte ── */

  const setUnita = (u: string[]) => setCalc({ unita: normalizzaElenco(u) });

  /* ── tastierino: scrive nel campo formula toccato per ultimo ── */

  const inserisci = (testo: string) => {
    const el = ultimoCampo.current;
    if (!el) {
      flash('Tocca prima la formula in cui scrivere');
      return;
    }
    const src = el.value;
    const a = el.selectionStart ?? src.length;
    const b = el.selectionEnd ?? src.length;
    const nuova = src.slice(0, a) + testo + src.slice(b);
    const id = el.dataset.blocco;
    const voce = el.dataset.voce;
    if (id) aggiornaBlocco(id, { espressione: nuova });
    else if (voce) aggiornaVoce(voce, { espressione: nuova });
    requestAnimationFrame(() => {
      el.focus();
      const p = a + testo.length;
      el.setSelectionRange(p, p);
    });
  };

  /* ── le tre uscite ── */

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(documentoTesto(state));
      flash('Foglio copiato: incollalo dove vuoi');
    } catch {
      flash('Copia non riuscita: consenti l’accesso agli appunti');
    }
  };

  /** Anche la stampa esce come un «Salva con nome»: nome e cartella si scelgono. */
  const scarica = async () => {
    const esito = await salvaConNome({
      nome: `${nomeFile(state)}.html`,
      tipo: 'text/html;charset=utf-8',
      descrizione: 'Documento da stampare',
      estensioni: ['.html'],
      contenuto: documentoHtml(state),
    });
    if (esito === 'annullato') return flash('Salvataggio annullato');
    flash('File HTML salvato: si apre con qualunque browser');
  };

  /**
   * Le **linee del foglio**: i blocchi in fila, spezzati dove qualcuno ha
   * chiesto di andare a capo. Dentro una linea le righe vanno a capo da sé
   * quando lo spazio finisce; fra una linea e l'altra ci va invece quello che
   * ha deciso chi scrive — la fine di un gruppo di passaggi.
   */
  const linee = useMemo(() => {
    const out: { da: number; blocchi: BloccoCalcolato[] }[] = [];
    let corrente: BloccoCalcolato[] = [];
    let da = 0;
    calcolati.forEach((b, i) => {
      corrente.push(b);
      if (b.blocco.acapo) {
        out.push({ da, blocchi: corrente });
        corrente = [];
        da = i + 1;
      }
    });
    if (corrente.length) out.push({ da, blocchi: corrente });
    return out;
  }, [calcolati]);

  /* ── il pannello di riga: uno solo, che si posa dove serve ── */

  /** Il blocco sotto il pannello, se c'è ancora: cancellarlo lo fa sparire. */
  const attivo = calcolati.find((b) => b.blocco.id === rigaAttiva);
  /**
   * Una riga già scritta si può riprendere in mano: diventa una formula
   * scritta qui, con lo stesso nome e la stessa espressione. Si stacca dalla
   * sua fonte — è il prezzo per poterla correggere.
   */
  const rendiModificabile = (b: BloccoCalcolato) =>
    aggiornaBlocco(b.blocco.id, {
      tipo: 'formula',
      nome: b.nome,
      espressione: b.espressione,
      um: b.blocco.um || b.umFonte,
      appunto: b.blocco.appunto || b.nota,
    });
  const modificabile = !!attivo && !attivo.pieno && attivo.blocco.tipo !== 'formula' && !!attivo.espressione.trim();

  /** La riga sotto il cursore, o quella che ha il focus dentro: è la stessa cosa. */
  const suRiga = (e: React.MouseEvent | React.FocusEvent, scegli: boolean) => {
    const riga = (e.target as HTMLElement).closest?.('[data-riga]') as HTMLElement | null;
    const id = riga?.dataset.riga;
    if (!id) return;
    setRigaAttiva(id);
    if (scegli) setRigaScelta(id);
  };

  /**
   * Dove si posa il pannello: **a destra della riga** se ci sta prima della
   * riga che le sta accanto; se no si alza sopra il suo bordo destro, nello
   * spazio fra una riga e l'altra. Non deve mai coprire quello che è scritto.
   */
  useLayoutEffect(() => {
    const foglio = foglioRef.current;
    const pannello = pannelloRef.current;
    if (!foglio || !pannello || !attivo) return setPosPannello(null);
    const riga = foglio.querySelector<HTMLElement>(`[data-riga="${CSS.escape(rigaAttiva)}"]`);
    if (!riga) return setPosPannello(null);
    const r = riga.getBoundingClientRect();
    const f = foglio.getBoundingClientRect();
    const pan = pannello.getBoundingClientRect();
    const dopo = (riga.nextElementSibling as HTMLElement | null)?.getBoundingClientRect();
    const libero = (dopo ? dopo.left : f.right - 12) - r.right;
    const dentro = libero >= pan.width + 12;
    setPosPannello({
      left: dentro ? r.right - f.left + 6 : Math.max(0, r.right - pan.width - f.left),
      top: dentro ? r.top - f.top - 1 : r.top - f.top - pan.height + 3,
    });
  }, [rigaAttiva, attivo, calcolati, modificabile]);

  const p = state.progetto;
  const capitoliDentro = new Set(q.blocchi.filter((b) => b.tipo === 'capitolo').map((b) => b.fonte));

  return (
    <div className="quad">
      <datalist id="quad-elenco-unita">
        {calc.unita.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <ComandiScheda>
        {/* quello che si aggiunge al foglio si sceglie qui, sulla cornice: la
            carta è il documento, e un documento non porta i propri pulsanti.
            Quello che si aggiunge entra **dopo la riga toccata per ultima** */}
        <button
          type="button"
          className="btn btn-secondary"
          title="Una nota a piena riga, dopo la riga su cui stai scrivendo"
          onClick={() => aggiungi(nuovoBlocco('nota'), dopoLaScelta())}
        >
          <NotePencil size={14} />
          Nota
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          title="Una riga di calcolo, dopo la riga su cui stai scrivendo — da una riga, Ctrl+Tab"
          onClick={() => aggiungiFormula(dopoLaScelta())}
        >
          <PencilSimple size={14} />
          Formula
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          title="Uno schema da incollare o da trascinare"
          onClick={() => aggiungi(nuovoBlocco('immagine'), dopoLaScelta())}
        >
          <ImageIcon size={14} />
          Schema
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          title="Un capitolo: il titolo di quello che comincia da qui in poi"
          onClick={() => aggiungi(nuovoBlocco('linea'), dopoLaScelta())}
        >
          <Minus size={14} weight="bold" />
          Capitolo
        </button>
        <span className="tab-toolbar-sep" aria-hidden="true" />
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={q.quadretti}
          title="Sfondo a quadretti, come la carta da calcolo (non viene stampato)"
          onClick={() => setQ({ quadretti: !q.quadretti })}
        >
          <GridNine size={14} />
          Quadretti
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={apriUnita}
          title="Cambia le unità di misura proposte"
          onClick={() => setApriUnita((v) => !v)}
        >
          <Ruler size={14} />
          Unità
        </button>
        <button type="button" className="btn btn-secondary" title="Copia il foglio come testo" onClick={copia}>
          <ClipboardText size={14} />
          Copia testo
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          title="Salva con nome un file HTML autonomo, leggibile senza questa app"
          onClick={() => void scarica()}
        >
          <DownloadSimple size={14} />
          Salva HTML
        </button>
        <button
          type="button"
          className="btn btn-primary"
          title="Stampa il foglio — dalla stessa finestra si salva in PDF"
          onClick={() => window.print()}
        >
          <Printer size={14} />
          Stampa / PDF
        </button>
      </ComandiScheda>

      {apriUnita && (
        <section className="panel quad-unita">
          <div className="panel-body" style={{ paddingTop: 12 }}>
            <div className="section-title">Unità di misura proposte</div>
            <p className="note" style={{ marginTop: 0 }}>
              Sono quelle che il quaderno propone per leggere i risultati: cambiando l’unità di un
              blocco il <strong>numero si converte</strong> — 0,8 MPa diventano 8,16 kg/cmq. Il
              prodotto e il rapporto fra grandezze con nome ricavano l’unità da soli, e i valori
              girano in unità base (m, N), così mescolare cm, MPa e cm⁴ nella stessa formula non
              sbaglia i conti. Un numero scritto a mano dentro una <strong>somma</strong> si legge
              nell’unità dell’altro addendo — con qd in kN/mq, <code>qd-500</code> toglie 500
              kN/mq — mentre nel prodotto resta un coefficiente (<code>1,5·q</code>). Attenzione:
              qui il <strong>kg è un kgf</strong> (1 kg = 9,80665 N), come in kg/cmq e kg/mc.
            </p>
            <div className="calc-unita-aggiungi">
              <input
                className="input"
                value={nuovaUnita}
                placeholder="kg/cmq"
                aria-label="Nuova unità di misura"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setNuovaUnita(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (!nuovaUnita.trim()) return;
                  setUnita([...calc.unita, nuovaUnita.trim()]);
                  setNuovaUnita('');
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={!nuovaUnita.trim()}
                onClick={() => {
                  setUnita([...calc.unita, nuovaUnita.trim()]);
                  setNuovaUnita('');
                }}
              >
                <Plus size={14} />
                Aggiungi
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                title="Torna all’elenco di serie"
                onClick={() => setUnita(UNITA_DEFAULT)}
              >
                Ripristina
              </button>
            </div>
            <div className="calc-unita-elenco">
              {calc.unita.map((u) => (
                <span className="calc-unita-chip" key={u}>
                  {u}
                  <button type="button" title={`Togli ${u}`} onClick={() => setUnita(calc.unita.filter((x) => x !== u))}>
                    <X size={11} weight="bold" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {daInventare.length > 0 && (
        <div className="quad-suggerimenti" role="status">
          <p>
            La formula richiama <strong>{daInventare.map((v) => v.nome).join(', ')}</strong>, che non
            {daInventare.length === 1 ? ' è' : ' sono'} fra le variabili e non
            {daInventare.length === 1 ? ' sta' : ' stanno'} nel catalogo. Scrivi l’unità di misura e
            {daInventare.length === 1 ? ' la aggiungo' : ' le aggiungo'}: senza, il numero esce senza scala.
          </p>
          <div className="quad-suggerimenti-righe">
            {daInventare.map((v) => (
              <div className="quad-suggerimento" key={v.nome}>
                <span className="n">
                  <Nome nome={v.nome} />
                </span>
                <input
                  className="input"
                  value={v.um}
                  list="quad-elenco-unita"
                  placeholder="unità (kN/m, m, MPa…)"
                  aria-label={`Unità di misura di ${v.nome}`}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) =>
                    setDaInventare((prima) =>
                      prima.map((x) => (x.nome === v.nome ? { ...x, um: e.target.value } : x)),
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    inventaGrandezza(v.nome, v.um);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-icon"
                  title={`Aggiungi ${v.nome} alle variabili`}
                  onClick={() => inventaGrandezza(v.nome, v.um)}
                >
                  <Plus size={13} weight="bold" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="quad-suggerimenti-chiudi"
            title="Lascia perdere: la formula resta com’è"
            onClick={() => setDaInventare([])}
          >
            <X size={12} weight="bold" />
          </button>
        </div>
      )}

      <div className="quad-corpo">
        {/* ─────────────── il foglio ─────────────── */}
        <div className="quad-area" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e)} onPaste={onPaste}>
          <div
            className={`quad-foglio${q.quadretti ? ' is-quadretti' : ''}`}
            id="foglio-esportazione"
            ref={foglioRef}
            /* i comandi di riga si delegano al foglio: il pannello è uno solo e
               si sposta, invece di essere ripetuto su ogni riga */
            onMouseOver={(e) => suRiga(e, false)}
            onFocus={(e) => suRiga(e, true)}
            onMouseLeave={() => setRigaAttiva('')}
            /* dove non c'è il passaggio del mouse — un dito su un telefono —
               il pannello se ne va quando il foglio perde il cursore */
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setRigaAttiva('');
            }}
          >
            <header className="quad-testa">
              <div className="quad-titolo">{p.nome}</div>
              <div className="quad-data">{oggi()}</div>
            </header>

            <CampoTesto
              className="quad-intestazione"
              value={q.intestazione}
              placeholder="Oggetto del calcolo — scrivi qui la premessa (facoltativa)"
              aria-label="Riga di premessa del foglio"
              onChange={(v) => setQ({ intestazione: v })}
            />

            {calcolati.length > 0 && (
              <div className="quad-foglio-righe">
                {linee.map((linea) => (
                  <div className="quad-blocchi" key={linea.blocchi[0].blocco.id}>
                    {linea.blocchi.map((b, j) => {
                      const i = linea.da + j;
                      return (
                        <BloccoCard
                          key={b.blocco.id}
                          b={b}
                          campoRef={ultimoCampo}
                          scrivi={b.blocco.id === daScrivere}
                          attiva={b.blocco.id === rigaAttiva}
                          notaAperta={b.blocco.id === appuntoAperto}
                          onChiudiNota={() => setAppuntoAperto('')}
                          onScritto={() => setDaScrivere('')}
                          onAggiorna={(patch) => aggiornaBlocco(b.blocco.id, patch)}
                          onFonte={(patch) => aggiornaVoce(b.blocco.fonte, patch)}
                          fonteEditabile={calc.voci.some((v) => v.id === b.blocco.fonte)}
                          onScorri={(verso) => scorri(b.blocco.id, verso)}
                          onACapo={() => aggiornaBlocco(b.blocco.id, { acapo: !b.blocco.acapo })}
                          onInserisci={() => aggiungiFormula(i + 1)}
                          onDropPrima={(e) => onDrop(e, i)}
                          capitolo={
                            b.blocco.tipo === 'capitolo'
                              ? blocchiCapitolo(state, b.blocco.fonte as CapitoloId)
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* ── il pannello di riga: uno solo, si posa sulla riga sotto il
                   cursore. Presa per spostare, appunto, cestino — e la matita
                   solo dove c'è una formula da riprendere in mano ── */}
            <div
              className={`quad-pannello-riga${attivo && posPannello ? ' is-visibile' : ''}`}
              ref={pannelloRef}
              style={posPannello ?? undefined}
              aria-hidden={!attivo}
            >
              <span
                className="maniglia"
                draggable
                title="Trascina per spostare la riga: lasciala sulla riga davanti alla quale deve stare"
                onDragStart={(e) => {
                  if (!attivo) return;
                  iniziaTrascinamento(e, {
                    tipo: attivo.blocco.tipo,
                    fonte: attivo.blocco.fonte,
                    sposta: attivo.blocco.id,
                  });
                }}
              >
                <DotsSixVertical size={14} weight="bold" />
              </span>
              <button
                type="button"
                className={attivo?.blocco.appunto || appuntoAperto === rigaAttiva ? 'is-acceso' : undefined}
                aria-expanded={appuntoAperto === rigaAttiva}
                title={attivo?.blocco.appunto ? `Appunto: ${attivo.blocco.appunto}` : 'Scrivi un appunto su questa riga'}
                onClick={() => setAppuntoAperto((v) => (v === rigaAttiva ? '' : rigaAttiva))}
              >
                <Info size={13} weight={attivo?.blocco.appunto ? 'fill' : 'regular'} />
              </button>
              {modificabile && attivo && (
                <button
                  type="button"
                  title="Riprendi in mano la formula: la riga si stacca dalla sua fonte e diventa scrivibile qui"
                  onClick={() => rendiModificabile(attivo)}
                >
                  <PencilSimple size={13} />
                </button>
              )}
              <button
                type="button"
                className="chiudi"
                title="Togli la riga dal quaderno"
                onClick={() => rigaAttiva && eliminaBlocco(rigaAttiva)}
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            <div className="quad-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e)}>
              {calcolati.length === 0
                ? 'Quaderno bianco. Trascina qui una grandezza, una formula preimpostata, un valore da un’altra scheda o un capitolo — resta collegato e si aggiorna da sé. Puoi anche incollare uno screenshot con Ctrl+V.'
                : 'Trascina qui il prossimo passaggio — si aggiunge in coda. Per metterlo prima, lascialo sopra il blocco davanti al quale deve stare.'}
            </div>

            <CampoTesto
              className="quad-nota-foglio"
              value={q.nota}
              placeholder="Nota a piè di foglio (facoltativa)"
              aria-label="Nota a piè di foglio"
              onChange={(v) => setQ({ nota: v })}
            />

            <footer className="quad-piede">
              Documento di predimensionamento: i valori vanno confermati dal calcolo esecutivo.
            </footer>
          </div>
        </div>

        {/* ─────────────── il pannello ─────────────── */}
        <aside className="quad-panel" aria-label="Grandezze e operazioni da mettere nel quaderno">
          {aiuto && (
            <p className="note" style={{ margin: '0 0 4px' }}>
              Tutto quello che sta qui si trascina nel foglio (o si tocca) e ci resta{' '}
              <strong>collegato</strong>: il calcolo si scrive sul foglio, e il foglio si ricalcola
              da solo.
            </p>
          )}

          <Sezione
            id="q-compilare"
            titolo="VARIABILI"
            hint={`${compilabili.length}`}
          >
            {aiuto && (
              <p className="note" style={{ margin: '0 0 6px' }}>
                Qui c’è solo l’<strong>elenco</strong>: come si chiama una variabile e in che unità
                si misura. Il valore si scrive sul foglio — tocca una pastiglia e la riga si posa
                lì, con la sua cella da riempire. La matita in fondo apre nome, unità e nota di
                tutte.
              </p>
            )}
            <div className="quad-chips is-variabili">
              {compilabili.map((v) => (
                <PastigliaVariabile
                  key={v.id}
                  v={v}
                  dentro={fontiSulFoglio.has(v.id)}
                  onAggiungi={() => aggiungi(nuovoBlocco('valore', { fonte: v.id }))}
                />
              ))}
              {compilabili.length === 0 && (
                <span className="note">Nessuna variabile: prendine una qui sotto, o falla tu con «nuova».</span>
              )}
            </div>
            <div className="quad-chips is-catalogo">
              {proposte
                .filter((g) => g.tipo !== 'fissa')
                .map((g) => (
                  <button
                    key={g.nome}
                    type="button"
                    className="quad-chip is-piu"
                    title={`Aggiungi ${g.nome} — ${g.nota}`}
                    onClick={() => aggiungiGrandezza({ ...g })}
                  >
                    <Plus size={10} weight="bold" />
                    <Nome nome={g.nome} />
                  </button>
                ))}
              <button
                type="button"
                className="quad-chip is-piu"
                title="Aggiungi una variabile tua"
                onClick={() => aggiungiGrandezza({ tipo: 'compilabile' })}
              >
                <Plus size={10} weight="bold" />
                nuova
              </button>
            </div>

            {/* una matita sola, in fondo: apre l'anagrafica di tutte le
                variabili invece di una matita per riga */}
            <div className="quad-formule-barra">
              <button
                type="button"
                className={`btn ${modificaVariabili ? 'btn-primary' : 'btn-secondary'}`}
                aria-pressed={modificaVariabili}
                disabled={compilabili.length === 0}
                title="Nome, unità di misura e nota di tutte le variabili"
                onClick={() => setModificaVariabili((v) => !v)}
              >
                {modificaVariabili ? <Check size={13} /> : <PencilSimple size={13} />}
                {modificaVariabili ? 'Fine' : 'Edita'}
              </button>
            </div>

            {modificaVariabili && (
              <div className="quad-modifiche">
                {compilabili.map((v) => (
                  <CampiGrandezza
                    key={v.id}
                    v={v}
                    elenco={calc.unita}
                    onAggiorna={(patch) => aggiornaVoce(v.id, patch)}
                    onElimina={() => setVoci(calc.voci.filter((x) => x.id !== v.id))}
                  />
                ))}
              </div>
            )}
          </Sezione>

          <Sezione id="q-fisse" titolo="Costanti" hint={`${voci.filter((v) => (v.tipo ?? 'operazione') === 'fissa').length}`}>
            <div className="quad-griglia">
              {voci
                .filter((v) => (v.tipo ?? 'operazione') === 'fissa')
                .map((v) => (
                  <RigaGrandezza
                    key={v.id}
                    v={v}
                    elenco={calc.unita}
                    aperta={!!state.ui.exp[`quad-${v.id}`]}
                    onApri={() => dispatch({ type: 'toggleExp', id: `quad-${v.id}` })}
                    onAggiorna={(patch) => aggiornaVoce(v.id, patch)}
                    onElimina={() => setVoci(calc.voci.filter((x) => x.id !== v.id))}
                    onAggiungi={() => aggiungi(nuovoBlocco('valore', { fonte: v.id }))}
                  />
                ))}
            </div>
            <div className="quad-chips is-catalogo">
              {proposte
                .filter((g) => g.tipo === 'fissa')
                .map((g) => (
                  <button
                    key={g.nome}
                    type="button"
                    className="quad-chip is-piu"
                    title={`Aggiungi ${g.nome} — ${g.nota}`}
                    onClick={() => aggiungiGrandezza({ ...g })}
                  >
                    <Plus size={10} weight="bold" />
                    <Nome nome={g.nome} />
                  </button>
                ))}
              <button
                type="button"
                className="quad-chip is-piu"
                title="Aggiungi una costante tua"
                onClick={() => aggiungiGrandezza({ tipo: 'fissa' })}
              >
                <Plus size={10} weight="bold" />
                nuova
              </button>
            </div>
          </Sezione>

          <Sezione id="q-libreria" titolo="Da libreria" hint={`${derivate.length}`}>
            <ScelteLibreria
              sel={calc.selezioni}
              derivate={derivate}
              onCambia={(patch) => setCalc({ selezioni: { ...calc.selezioni, ...patch } })}
              onAggiungi={(v) => aggiungi(nuovoBlocco('valore', { fonte: v.id }))}
            />
          </Sezione>

          <Sezione id="q-formule" titolo="Operazioni preimpostate" hint={`${calc.preimpostate.length}`}>
            <div className="quad-formule">
              {calc.preimpostate.map((f) => (
                <div key={f.id} className="quad-formula">
                  <button
                    type="button"
                    className="quad-formula-usa"
                    draggable
                    onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'operazione', fonte: f.id })}
                    title={`${f.nota || 'formula'} — trascina nel quaderno o tocca per aggiungerla, con le grandezze che le servono`}
                    onClick={() => aggiungiOperazione(f.id)}
                  >
                    <span className="t">
                      <Nome nome={f.nome || '—'} />
                      {f.um && <span className="u">({f.um})</span>}
                    </span>
                    <span className="x">{f.espressione}</span>
                  </button>
                  {modificaFormule && (
                    <div className="quad-formula-modifica">
                      <input
                        className="input"
                        value={f.nome}
                        aria-label="Nome del risultato"
                        placeholder="M"
                        onChange={(e) => aggiornaPre(f.id, { nome: e.target.value })}
                      />
                      <input
                        className="input"
                        value={f.espressione}
                        aria-label="Formula"
                        placeholder="q*l^2/8"
                        onChange={(e) => aggiornaPre(f.id, { espressione: e.target.value })}
                      />
                      <input
                        className="input"
                        value={f.um}
                        list="quad-elenco-unita"
                        aria-label="Unità"
                        placeholder="kNm"
                        onChange={(e) => aggiornaPre(f.id, { um: e.target.value })}
                      />
                      <input
                        className="input"
                        value={f.nota}
                        aria-label="Nota"
                        placeholder="momento in mezzeria"
                        onChange={(e) => aggiornaPre(f.id, { nota: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        title="Elimina la formula"
                        onClick={() => setPre(calc.preimpostate.filter((x) => x.id !== f.id))}
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="quad-formule-barra">
              <button
                type="button"
                className={`btn ${modificaFormule ? 'btn-primary' : 'btn-secondary'}`}
                aria-pressed={modificaFormule}
                onClick={() => setModificaFormule((v) => !v)}
              >
                {modificaFormule ? <Check size={13} /> : <PencilSimple size={13} />}
                {modificaFormule ? 'Fine' : 'Edita'}
              </button>
              {calc.preimpostate.length === 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => setPre(PREIMPOSTATE_DEFAULT)}>
                  <Plus size={13} />
                  Formule di serie
                </button>
              )}
            </div>

            {modificaFormule && (
              <div className="quad-formula-modifica is-nuova">
                <input
                  className="input"
                  value={nuovaPre.nome}
                  aria-label="Nome del risultato"
                  placeholder="σ"
                  onChange={(e) => setNuovaPre({ ...nuovaPre, nome: e.target.value })}
                />
                <input
                  className="input"
                  value={nuovaPre.espressione}
                  aria-label="Formula"
                  placeholder="M/W"
                  onChange={(e) => setNuovaPre({ ...nuovaPre, espressione: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      aggiungiPre();
                    }
                  }}
                />
                <input
                  className="input"
                  value={nuovaPre.um}
                  list="quad-elenco-unita"
                  aria-label="Unità"
                  placeholder="MPa"
                  onChange={(e) => setNuovaPre({ ...nuovaPre, um: e.target.value })}
                />
                <input
                  className="input"
                  value={nuovaPre.nota}
                  aria-label="Nota"
                  placeholder="tensione di flessione"
                  onChange={(e) => setNuovaPre({ ...nuovaPre, nota: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-icon"
                  disabled={!nuovaPre.espressione.trim()}
                  title="Aggiungi la formula"
                  onClick={aggiungiPre}
                >
                  <Plus size={13} />
                </button>
              </div>
            )}
          </Sezione>

          <Sezione id="q-import" titolo="Import rapido da altre schede" hint={`${importi.length}`}>
            <div className="quad-import">
              {importi.map((im) => (
                <button
                  key={im.id}
                  type="button"
                  className="quad-import-riga"
                  draggable
                  onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'import', fonte: im.id })}
                  title={`${im.etichetta} da ${im.scheda} — resta collegato`}
                  onClick={() => aggiungi(nuovoBlocco('import', { fonte: im.id }))}
                >
                  <span className="n">{im.etichetta}</span>
                  <span className="v">
                    {im.testo ?? (
                      <>
                        <strong>{formatta(im.valore)}</strong> {im.um}
                      </>
                    )}
                  </span>
                  <span className="s">↩ {im.scheda}</span>
                </button>
              ))}
            </div>
          </Sezione>

          <Sezione id="q-capitoli" titolo="Capitoli da altre schede" hint={`${capitoliDentro.size} sul foglio`}>
            <p className="note" style={{ margin: '0 0 6px' }}>
              Un capitolo intero, come lo scriveva la vecchia scheda Esporta: entra nel foglio dove lo
              metti e si aggiorna con la sua scheda.
            </p>
            <div className="quad-chips">
              {CAPITOLI.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`quad-chip${capitoliDentro.has(c.id) ? ' is-dentro' : ''}`}
                  draggable
                  onDragStart={(e) => iniziaTrascinamento(e, { tipo: 'capitolo', fonte: c.id })}
                  title={`Porta il capitolo ${c.titolo} nel foglio`}
                  onClick={() => aggiungi(nuovoBlocco('capitolo', { fonte: c.id }))}
                >
                  {capitoliDentro.has(c.id) ? <Check size={10} weight="bold" /> : <Plus size={10} weight="bold" />}
                  {c.titolo}
                </button>
              ))}
            </div>
          </Sezione>

          <Sezione id="q-tastierino" titolo="Tastierino">
            <p className="note" style={{ margin: '0 0 6px' }}>
              Scrive nella formula toccata per ultima: comodo su cellulare, dove la γ e la ^ non ci sono.
            </p>
            <div className="quad-tasti">
              {TASTI.map((k) => (
                <button
                  key={k.t}
                  type="button"
                  className={`calc-tasto${k.classe ? ` ${k.classe}` : ''}`}
                  title={k.titolo}
                  onClick={() => inserisci(k.ins ?? k.t)}
                >
                  {k.t === '⌫' ? <Backspace size={16} /> : k.t}
                </button>
              ))}
            </div>
          </Sezione>
        </aside>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── un blocco sul foglio ─────────────────────── */

const TASTI: { t: string; ins?: string; classe?: string; titolo?: string }[] = [
  { t: '7', ins: '7' },
  { t: '8', ins: '8' },
  { t: '9', ins: '9' },
  { t: '÷', ins: '/', classe: 'is-op' },
  { t: '4', ins: '4' },
  { t: '5', ins: '5' },
  { t: '6', ins: '6' },
  { t: '×', ins: '*', classe: 'is-op' },
  { t: '1', ins: '1' },
  { t: '2', ins: '2' },
  { t: '3', ins: '3' },
  { t: '−', ins: '-', classe: 'is-op' },
  { t: '0', ins: '0' },
  { t: ',', ins: ',' },
  { t: '(', ins: '(' },
  { t: '+', ins: '+', classe: 'is-op' },
  { t: '√', ins: 'sqrt(' },
  { t: 'x²', ins: '^2' },
  { t: ')', ins: ')' },
  { t: '^', ins: '^' },
  { t: 'π', ins: 'pi' },
  { t: 'γ', ins: 'γ', titolo: 'Iniziale dei pesi di volume: γC, γS, γT' },
  { t: ';', ins: ';', titolo: 'Separatore degli argomenti: min(3;5)' },
  { t: 'ans', ins: 'ans', titolo: 'Ultimo risultato' },
];

/**
 * Un blocco sul foglio. I blocchi di calcolo mostrano la riga come la si
 * scriverebbe a mano — `nome = formula = risultato unità` — con l'unità che si
 * può cambiare: il numero si converte, il valore che gira nelle formule no.
 */
function BloccoCard({
  b,
  campoRef,
  scrivi,
  attiva,
  notaAperta,
  onChiudiNota,
  onScritto,
  onAggiorna,
  onFonte,
  fonteEditabile,
  onScorri,
  onACapo,
  onInserisci,
  onDropPrima,
  capitolo,
}: {
  b: BloccoCalcolato;
  campoRef: { current: HTMLInputElement | null };
  /** true = è appena nato: il cursore va qui dentro. */
  scrivi: boolean;
  /** true = è la riga sotto il cursore: quella su cui sta il pannello. */
  attiva: boolean;
  /** true = l'appunto di questa riga è aperto in scrittura. */
  notaAperta: boolean;
  onChiudiNota: () => void;
  onScritto: () => void;
  onAggiorna: (patch: Partial<BloccoQuaderno>) => void;
  /**
   * Scrive nella variabile del pannello a cui il blocco è collegato: è così
   * che una riga `b = …` si compila **sul foglio**, dove la si legge, invece
   * che nell'elenco a destra.
   */
  onFonte: (patch: Partial<VoceCalcolo>) => void;
  /** true = la fonte è una variabile del pannello, quindi si scrive da qui. */
  fonteEditabile: boolean;
  /** Un passo indietro (−1) o avanti (+1) nella sequenza del foglio. */
  onScorri: (verso: -1 | 1) => void;
  /** Chiude la linea del foglio dopo questa riga, o la riapre. */
  onACapo: () => void;
  /** Una formula nuova subito dopo questo blocco. */
  onInserisci: () => void;
  /** Qualcosa lasciato su questo blocco: entra *prima* di lui. */
  onDropPrima: (e: DragEvent) => void;
  /** Blocchi di relazione, per i blocchi capitolo. */
  capitolo?: { titolo: string; righe: string[] }[];
}) {
  const bl = b.blocco;
  const fileRef = useRef<HTMLInputElement>(null);
  /** Il campo del nome: è lì che si mette il cursore su un blocco nuovo. */
  const nomeRef = useRef<HTMLInputElement | null>(null);
  /** Il campo della formula: ci si arriva col Tab, subito dopo il nome. */
  const esprRef = useRef<HTMLInputElement | null>(null);
  const [bersaglio, setBersaglio] = useState(false);
  // il semaforo dei rapporti di verifica: colora il numero, non l'intero blocco
  const livello = livelloEsito(b);

  // una riga si scrive nell'ordine in cui si legge: prima come si chiama il
  // risultato, poi come lo si calcola — il Tab porta dal nome alla formula
  useEffect(() => {
    if (!scrivi) return;
    (nomeRef.current ?? esprRef.current)?.focus();
    onScritto();
  }, [scrivi, onScritto]);

  /**
   * Le scorciatoie della riga: **Ctrl+Tab** infila una formula subito dopo —
   * si scrive un passaggio e si va al successivo senza staccare le mani —
   * **Alt+↑ / Alt+↓** la spostano di un posto, e **shift+invio** chiude qui la
   * linea del foglio: quello che viene dopo comincia sulla linea sotto, anche
   * se a destra ci sarebbe ancora posto. Premuto di nuovo, la riapre.
   *
   * Dentro una nota o un commento shift+invio resta quello che è dappertutto —
   * un a capo nel testo — e non arriva fin qui.
   */
  const tasti = (e: React.KeyboardEvent) => {
    if (e.metaKey) return;
    if (
      e.shiftKey &&
      !e.ctrlKey &&
      !e.altKey &&
      e.key === 'Enter' &&
      (e.target as HTMLElement).tagName !== 'TEXTAREA'
    ) {
      e.preventDefault();
      e.stopPropagation();
      onACapo();
    } else if (e.ctrlKey && !e.altKey && e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      onInserisci();
    } else if (e.altKey && !e.ctrlKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      e.stopPropagation();
      onScorri(e.key === 'ArrowDown' ? 1 : -1);
    }
  };

  /**
   * La riga definisce una grandezza invece di calcolarla: quello che c'è
   * scritto è un numero e basta, senza nessuna operazione. Allora il secondo
   * uguale non serve — `b = 0,30 m`, non `b = 0,30 = 0,30 m` — e resta solo
   * l'unità con cui il numero va letto. Appena si scrive un'operazione la riga
   * torna una formula e il risultato ricompare a destra.
   */
  const definizione = !b.pieno && !haOperazioni(bl.tipo === 'formula' ? bl.espressione : b.espressione);
  /**
   * La riga è collegata a una variabile del pannello: il valore si scrive
   * **qui**, dove lo si legge, e va a finire nella variabile. Un numero
   * scritto a mano si riconosce dalla sottolineatura ocra — è il dato di
   * partenza, quello su cui si possono mettere le mani; quello calcolato è
   * inchiostro pieno e non si tocca.
   */
  const compilabile = bl.tipo === 'valore' && fonteEditabile;

  const incolla = (dati: DataTransfer | null) => {
    const f = immagineDa(dati);
    if (f) void leggiImmagine(f).then((img) => onAggiorna({ img }));
  };

  return (
    <div
      className={`quad-blocco${b.pieno && bl.tipo !== 'immagine' ? ' is-pieno' : ''}${
        bl.tipo === 'immagine' ? ' is-immagine' : ''
      }${bl.tipo === 'linea' ? ' is-linea' : ''}${attiva ? ' is-attiva' : ''}${
        bersaglio ? ' is-bersaglio' : ''
      }`}
      data-riga={bl.id}
      style={bl.tipo === 'immagine' ? ({ '--larghezza': `${bl.larghezza || 100}%` } as CSSProperties) : undefined}
      tabIndex={-1}
      onKeyDown={tasti}
      onDragOver={(e) => {
        e.preventDefault();
        setBersaglio(true);
      }}
      onDragLeave={() => setBersaglio(false)}
      onDrop={(e) => {
        setBersaglio(false);
        onDropPrima(e);
      }}
    >
      {/* ── nota: una barretta a margine e il testo, nessuna scatola ── */}
      {bl.tipo === 'nota' && (
        <div className="quad-nota-box">
          <CampoTesto
            className="quad-nota"
            value={bl.testo}
            placeholder="Scrivi una nota…"
            aria-label="Nota"
            onChange={(testo) => onAggiorna({ testo })}
          />
        </div>
      )}

      {/* ── il capitolo: un segno, il titolo e una regola che sfuma ── */}
      {bl.tipo === 'linea' && (
        <div className="quad-divisore">
          <input
            className="quad-divisore-titolo"
            value={bl.testo}
            size={misuraCampo(bl.testo, 18)}
            placeholder="Titolo del capitolo"
            aria-label="Titolo del capitolo"
            onKeyDown={tastiCampo}
            onChange={(e) => onAggiorna({ testo: e.target.value })}
          />
        </div>
      )}

      {/* ── screenshot ── */}
      {bl.tipo === 'immagine' && (
        <div
          className="quad-img"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            // un'immagine cade qui dentro e prende il posto di questa; un
            // blocco che sta cambiando posto, invece, deve arrivare al foglio
            const f = immagineDa(e.dataTransfer);
            if (!f) return;
            e.preventDefault();
            e.stopPropagation();
            incolla(e.dataTransfer);
          }}
          onPaste={(e) => {
            e.stopPropagation();
            incolla(e.clipboardData);
          }}
        >
          {bl.img ? (
            <>
              <SchemaRidimensionabile
                img={bl.img}
                didascalia={bl.testo}
                larghezza={bl.larghezza}
                onLarghezza={(larghezza) => onAggiorna({ larghezza })}
              />
              {/* sotto lo schema resta la sola didascalia: la misura si prende
                  dal bordo destro e si tira, e a togliere lo schema ci pensa
                  la × del pannello di riga — due modi per la stessa cosa sono
                  uno di troppo su un foglio */}
              <div className="quad-img-azioni">
                <input
                  className="input quad-img-didascalia"
                  value={bl.testo}
                  placeholder="Didascalia (facoltativa)"
                  aria-label="Didascalia dello schema"
                  onKeyDown={tastiCampo}
                  onChange={(e) => onAggiorna({ testo: e.target.value })}
                />
              </div>
            </>
          ) : (
            <button type="button" className="quad-img-vuota" onClick={() => fileRef.current?.click()}>
              <ImageIcon size={22} />
              <strong>Trascina qui uno schema o un disegno</strong>
              <span>oppure incollalo con Ctrl+V, o tocca per sceglierlo</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leggiImmagine(f).then((img) => onAggiorna({ img }));
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* ── capitolo ripreso da un'altra scheda ── */}
      {bl.tipo === 'capitolo' && (
        <div className="quad-cap">
          <h2>{titoloCapitolo(bl.fonte)}</h2>
          {(capitolo ?? []).map((s) => (
            <div className="quad-cap-blocco" key={s.titolo}>
              <h3>{s.titolo}</h3>
              <ul>
                {s.righe.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── riga di calcolo: nome, formula e risultato sulla stessa riga ── */}
      {!b.pieno && (
        <div className="quad-calcolo">
          <div className="quad-linea">
            {bl.tipo === 'formula' ? (
              <>
                <input
                  className="input quad-in-nome"
                  value={bl.nome}
                  size={misuraCampo(bl.nome, 1)}
                  placeholder="σ"
                  aria-label="Nome del risultato"
                  autoComplete="off"
                  spellCheck={false}
                  ref={(el) => {
                    nomeRef.current = el;
                  }}
                  onKeyDown={tastiCampo}
                  onChange={(e) => onAggiorna({ nome: e.target.value })}
                />
                <span className="uguale">=</span>
                <input
                  /* un numero battuto a mano è un dato di partenza: prende
                     l'ocra sottolineato, come la penna su un foglio. Appena
                     ci si scrive un'operazione torna inchiostro: è un calcolo */
                  className={`input quad-in-espr${definizione && bl.espressione.trim() ? ' is-dato' : ''}${
                    b.errore ? ' is-error' : ''
                  }`}
                  value={bl.espressione}
                  size={misuraCampo(bl.espressione, 16)}
                  placeholder="scrivi la formula…"
                  aria-label="Formula"
                  autoComplete="off"
                  spellCheck={false}
                  data-blocco={bl.id}
                  ref={(el) => {
                    esprRef.current = el;
                    if (el && document.activeElement === el) campoRef.current = el;
                  }}
                  onFocus={(e) => {
                    campoRef.current = e.currentTarget;
                  }}
                  onKeyDown={tastiCampo}
                  onChange={(e) => onAggiorna({ espressione: e.target.value })}
                />
              </>
            ) : compilabile ? (
              <>
                <span className="nome">
                  <Nome nome={b.nome || '—'} />
                </span>
                <span className="uguale">=</span>
                <input
                  className={`input quad-in-valore${b.errore ? ' is-error' : ''}`}
                  value={b.espressione}
                  size={misuraCampo(b.espressione, 4)}
                  placeholder="—"
                  inputMode="decimal"
                  aria-label={`Valore di ${b.nome || 'variabile'}`}
                  autoComplete="off"
                  spellCheck={false}
                  data-voce={bl.fonte}
                  ref={(el) => {
                    esprRef.current = el;
                    if (el && document.activeElement === el) campoRef.current = el;
                  }}
                  onFocus={(e) => {
                    campoRef.current = e.currentTarget;
                  }}
                  onKeyDown={tastiCampo}
                  onChange={(e) => onFonte({ espressione: e.target.value })}
                />
              </>
            ) : (
              <>
                {b.nome && (
                  <span className="nome">
                    <Nome nome={b.nome} />
                  </span>
                )}
                {b.espressione && !definizione && (
                  <>
                    <span className="uguale">=</span>
                    <span className="espr" title={b.espressione}>
                      {b.espressione}
                    </span>
                  </>
                )}
              </>
            )}

            <span className={`quad-esito${livello ? ` is-${livello}` : ''}`}>
              {b.errore ? (
                <span className="quad-errore" title={b.errore}>
                  <WarningCircle size={12} /> {b.errore}
                </span>
              ) : compilabile && definizione ? (
                // il numero lo si sta scrivendo nella cella qui accanto — anche
                // quando è ancora vuota: «manca b» davanti al campo di b era il
                // modo peggiore di dire «scrivilo»
                <UnitaBlocco b={b} onAggiorna={(patch) => onFonte({ um: patch.um ?? '' })} />
              ) : b.mancanti.length ? (
                <span className="quad-manca">manca {b.mancanti.join(', ')}</span>
              ) : b.testo ? (
                <strong>{b.testo}</strong>
              ) : definizione && bl.tipo === 'formula' ? (
                // il numero è già nel campo qui accanto: si mostra solo l'unità
                <UnitaBlocco b={b} onAggiorna={onAggiorna} />
              ) : (
                <>
                  <span className="uguale">=</span>
                  <strong title={livello ? SEMAFORO[livello] : undefined}>{formattaIn(b.valore, b.um)}</strong>
                  <UnitaBlocco b={b} onAggiorna={onAggiorna} />
                </>
              )}
              {/* da dove viene il numero: un import si cambia nella sua scheda,
                  non qui — e a rileggere il foglio si vede subito quale */}
              {b.provenienza && bl.tipo === 'import' && (
                <span className="quad-fonte" title={`Ripreso dalla scheda ${b.provenienza}: si cambia lì`}>
                  ↩ {b.provenienza}
                </span>
              )}
            </span>
          </div>

          {b.nomeIgnorato && (
            <div className="quad-avviso">
              Il nome {b.nome} è già usato più su: questo blocco si calcola, ma per le formule più in
              basso {b.nome} resta il primo.
            </div>
          )}
          {b.nota && !b.errore && <div className="quad-nota-riga">{b.nota}</div>}
        </div>
      )}

      {/* il commento della grandezza: **sotto** la formula, in grigio e più
          piccolo. Si scrive con la ⓘ del pannello, si legge sempre — anche
          nella stampa, che è il posto in cui serve davvero */}
      {notaAperta ? (
        <CampoTesto
          className="quad-appunto"
          value={bl.appunto}
          autoFocus
          placeholder="Che cos'è, da dove viene il dato, che ipotesi si è fatta…"
          aria-label="Commento della riga"
          onChange={(appunto) => onAggiorna({ appunto })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onChiudiNota();
          }}
          onBlur={onChiudiNota}
        />
      ) : (
        bl.appunto.trim() && <div className="quad-appunto-letto">{bl.appunto}</div>
      )}
    </div>
  );
}

/**
 * Il selettore dell'unità di un blocco: le sole unità con cui quel risultato si
 * può leggere, più «auto». Cambiandola il numero si converte — è il punto in
 * cui «lo voglio in kg/cmq» diventa un numero diverso.
 *
 * Un dato scritto a mano (un numero, non un'operazione) non si converte: lì
 * l'unità dice in che unità è scritto il numero, e si scrive a mano.
 */
function UnitaBlocco({
  b,
  onAggiorna,
}: {
  b: BloccoCalcolato;
  onAggiorna: (patch: Partial<BloccoQuaderno>) => void;
}) {
  if (b.dato || b.umAmmesse.length === 0) {
    return (
      <input
        className="input quad-um-libera"
        value={b.blocco.um || b.um}
        list="quad-elenco-unita"
        placeholder="unità"
        aria-label="Unità del valore"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onAggiorna({ um: e.target.value })}
      />
    );
  }
  const scelta = b.blocco.um.trim();
  return (
    <select
      className="input quad-um"
      value={scelta && b.umAmmesse.includes(scelta) ? scelta : ''}
      aria-label="Unità con cui leggere il risultato"
      title={`Unità con cui leggere il risultato: cambiala e il numero si converte${
        b.umFonte ? ` — di serie ${b.umFonte}, dalla formula` : b.umAuto ? ` — di serie ${b.umAuto}, ricavata dall’operazione` : ''
      }`}
      onChange={(e) => onAggiorna({ um: e.target.value })}
    >
      {/* la prima voce è l'unità di serie: quella della formula, o quella
          ricavata dall'operazione. Il resto sono i modi di leggere lo stesso
          valore — sceglierne uno converte il numero. */}
      <option value="">{b.umFonte || b.umAuto || 'auto'}</option>
      {b.umAmmesse.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

/**
 * Uno schema sul foglio, con la sua misura. Uno screenshot arriva grande come
 * capita, ma su una relazione la dimensione è una scelta: si prende il bordo e
 * si tira, come in un documento di testo. La larghezza è in percentuale del
 * foglio — così due schemi stretti stanno affiancati sulla stessa riga, e la
 * misura vale anche nell'HTML esportato e nella stampa.
 */
function SchemaRidimensionabile({
  img,
  didascalia,
  larghezza,
  onLarghezza,
}: {
  img: string;
  didascalia: string;
  /** Larghezza in percentuale del foglio: la mostra la quota mentre si tira. */
  larghezza: number;
  onLarghezza: (v: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [tira, setTira] = useState(false);
  const perc = larghezza || 100;

  /**
   * Da dove sta il dito alla percentuale di **foglio** occupata: la misura si
   * prende sulla riga delle figure, non sullo schema — se no si misurerebbe
   * su una larghezza che sta cambiando mentre la si tira. Ed è la percentuale
   * giusta anche nel file esportato, dove il riferimento è la pagina.
   */
  const misura = (clientX: number) => {
    const el = box.current;
    if (!el) return;
    const riferimento = el.closest('.quad-blocchi') ?? el.parentElement;
    const r = riferimento?.getBoundingClientRect();
    if (!r || r.width <= 0) return;
    onLarghezza(larghezzaValida(((clientX - r.left) / r.width) * 100));
  };

  return (
    <div className="quad-img-box" ref={box}>
      <div className={`quad-img-figura${tira ? ' is-tira' : ''}`}>
        <img src={img} alt={didascalia || 'schema'} draggable={false} />
        <span
          className="quad-img-maniglia"
          title="Trascina per ridimensionare lo schema"
          aria-hidden="true"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            setTira(true);
          }}
          onPointerMove={(e) => {
            if (tira) misura(e.clientX);
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setTira(false);
          }}
          onPointerCancel={() => setTira(false)}
        />
        {tira && <span className="quad-img-quota">{perc}%</span>}
      </div>
    </div>
  );
}
