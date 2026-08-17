import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Backspace,
  BookmarkSimple,
  CaretDown,
  CaretUp,
  Check,
  Copy,
  Equals,
  Keyboard,
  PencilSimple,
  Plus,
  Ruler,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { useStore } from '../state/store';
import { ComandiScheda } from '../components/ComandiScheda';
import { Accordion } from '../components/ui';
import {
  FUNZIONI,
  GRANDEZZE_CATALOGO,
  PREIMPOSTATE_DEFAULT,
  VOCI_DEFAULT,
  formatta,
  nomeAmmesso,
  nomiMancanti,
  ricalcola,
  testoVoce,
  unitaVariabili,
  valutaConUnita,
  variabili,
  vociDaSelezioni,
  type Preimpostata,
  type Selezioni,
  type TipoVoce,
  type VoceCalcolo,
  type VoceCalcolata,
} from '../calc/calcolatrice';
import { UNITA_DEFAULT, normalizzaElenco, scriviUnita, unitaInElenco } from '../calc/unita';
import { ACCIAI, CLS, DIAMETRI, SIGLE_ACCIAIO } from '../data/materiali';
import { TAGLIE_BULLONE } from '../data/bulloni';

/** Tasti del tastierino: quattro colonne, come una calcolatrice. */
const TASTI: {
  t: string;
  ins?: string;
  azione?: 'canc' | 'backspace';
  classe?: string;
  titolo?: string;
}[] = [
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
  { t: '%', ins: '%', classe: 'is-op' },
  { t: '^', ins: '^' },
  { t: 'π', ins: 'pi' },
  // la γ dei pesi di volume: sul cellulare non la si scrive altrimenti
  { t: 'γ', ins: 'γ', titolo: 'Iniziale dei pesi di volume: γC, γS, γT — si scrivono anche gC, gS, gT' },
  { t: ';', ins: ';', titolo: 'Separatore degli argomenti: min(3;5)' },
  { t: 'ans', ins: 'ans', classe: 'is-largo', titolo: 'Ultimo risultato' },
  { t: 'C', azione: 'canc', classe: 'is-canc' },
  { t: '⌫', azione: 'backspace', classe: 'is-canc' },
];

/** Un valore scritto come numero e basta: la pastiglia non ripete il risultato. */
const SOLO_NUMERO = /^[+-]?[\d\s.,]+$/;

/** Le due colonne delle grandezze: a sinistra quelle del calcolo di oggi. */
const COLONNE: { id: Exclude<TipoVoce, 'operazione'>; titolo: string; sotto: string }[] = [
  { id: 'compilabile', titolo: 'Da compilare', sotto: 'si svuotano a ogni riapertura' },
  { id: 'fissa', titolo: 'Fisse', sotto: 'pesi di volume e costanti' },
];

/**
 * Tendina interna al pannello: l'intestazione di un blocco (le scelte di
 * libreria, una colonna di grandezze, le operazioni salvate) diventa il
 * comando che lo apre e lo chiude. Serve a tenere sott'occhio solo quello che
 * si sta usando, senza scorrere tutta la scheda.
 */
function Blocco({
  id,
  titolo,
  sotto,
  /** Comandi che restano visibili anche a blocco chiuso, in coda al titolo. */
  azioni,
  children,
}: {
  id: string;
  titolo: string;
  sotto?: string;
  azioni?: ReactNode;
  children: ReactNode;
}) {
  const { state, dispatch } = useStore();
  const aperto = !!state.ui.open[id];
  return (
    <div className={`calc-blocco${aperto ? ' is-aperto' : ''}`}>
      <div className="calc-colonna-testa">
        <button
          type="button"
          className="calc-blocco-testa"
          aria-expanded={aperto}
          aria-controls={`${id}-corpo`}
          onClick={() => dispatch({ type: 'toggleOpen', id })}
        >
          {aperto ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
          <span className="t">{titolo}</span>
          {sotto && <span className="d">{sotto}</span>}
        </button>
        {azioni}
      </div>
      {aperto && (
        <div className="calc-blocco-corpo" id={`${id}-corpo`}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Campo dell'unità di misura: si scrive a mano, ma con i suggerimenti
 * dell'elenco mentre si digita e con l'errore se quello che si è scritto in
 * elenco non c'è. Vuoto vuol dire «la calcolo io dall'operazione».
 */
function CampoUnita({
  id,
  label,
  value,
  auto,
  elenco,
  onChange,
}: {
  id: string;
  label?: string;
  value: string;
  /** Unità ricavata dall'operazione, usata come segnaposto. */
  auto: string;
  elenco: string[];
  onChange: (v: string) => void;
}) {
  const fuori = !!value.trim() && !unitaInElenco(value, elenco);
  return (
    <div className="mini-campo">
      {label && (
        <label htmlFor={id}>
          {label}
          {!value.trim() && auto && <span className="calc-um-auto">auto</span>}
        </label>
      )}
      <input
        id={id}
        className={`input${fuori ? ' is-error' : ''}`}
        value={value}
        list="calc-elenco-unita"
        placeholder={auto || 'kN/mq'}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={fuori || undefined}
        title={fuori ? 'Unità non in elenco' : auto ? `Dall’operazione: ${auto}` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * Una grandezza o un'operazione salvata: il valore si scrive dentro la
 * pastiglia, il nome apre i campi di dettaglio. È la stessa riga per le tre
 * colonne — compilabili, fisse, operazioni — perché si comportano allo stesso
 * modo: cambia solo dove stanno.
 */
function RigaVoce({
  v,
  indice,
  ultima,
  aperta,
  elenco,
  onApri,
  onAggiorna,
  onSposta,
  onElimina,
  onUsa,
}: {
  v: VoceCalcolata;
  /** Posizione nella sequenza completa: serve alle frecce di spostamento. */
  indice: number;
  ultima: boolean;
  aperta: boolean;
  elenco: string[];
  onApri: () => void;
  onAggiorna: (patch: Partial<VoceCalcolo>) => void;
  onSposta: (verso: -1 | 1) => void;
  onElimina: () => void;
  onUsa: (nome: string) => void;
}) {
  const numerica = SOLO_NUMERO.test(v.espressione.trim());
  return (
    <li className={`calc-gr${v.errore ? ' is-errore' : ''}${aperta ? ' is-aperta' : ''}`}>
      <button
        type="button"
        className="calc-gr-nome"
        aria-expanded={aperta}
        title={v.nota.trim() || 'Nome, unità e nota'}
        onClick={onApri}
      >
        {v.nome.trim() ? v.nome.trim() : <span className="calc-senza-nome">n. {indice + 1}</span>}
      </button>

      <input
        className={`input calc-gr-valore${v.errore ? ' is-error' : ''}`}
        value={v.espressione}
        placeholder="—"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        aria-label={`Valore di ${v.nome.trim() || `operazione ${indice + 1}`}`}
        onChange={(e) => onAggiorna({ espressione: e.target.value })}
      />

      <div className="calc-gr-esito">
        {v.errore ? (
          <span className="calc-voce-errore" title={v.errore}>
            <WarningCircle size={12} /> errore
          </span>
        ) : !v.espressione.trim() ? (
          <span className="calc-da-compilare">{v.umEffettiva || 'da compilare'}</span>
        ) : (
          <>
            {!numerica && <strong>{formatta(v.valore)}</strong>}
            {v.umEffettiva && <span className={`um${v.um.trim() ? '' : ' is-auto'}`}>{v.umEffettiva}</span>}
          </>
        )}
      </div>

      {aperta && (
        <div className="calc-voce-modifica">
          <div className="mini-campo">
            <label htmlFor={`n-${v.id}`}>Nome</label>
            <input
              id={`n-${v.id}`}
              className={`input${v.nome.trim() && !v.nomeValido ? ' is-error' : ''}`}
              value={v.nome}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => onAggiorna({ nome: e.target.value })}
            />
          </div>
          <div className="mini-campo calc-campo-espr">
            <label htmlFor={`x-${v.id}`}>Operazione</label>
            <input
              id={`x-${v.id}`}
              className={`input${v.errore ? ' is-error' : ''}`}
              value={v.espressione}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => onAggiorna({ espressione: e.target.value })}
            />
          </div>
          <CampoUnita
            id={`u-${v.id}`}
            label="Unità"
            value={v.um}
            auto={v.umCalcolata}
            elenco={elenco}
            onChange={(um) => onAggiorna({ um })}
          />
          <div className="mini-campo calc-campo-nota">
            <label htmlFor={`t-${v.id}`}>Nota</label>
            <input
              id={`t-${v.id}`}
              className="input"
              value={v.nota}
              autoComplete="off"
              onChange={(e) => onAggiorna({ nota: e.target.value })}
            />
          </div>
          <div className="mini-campo">
            <label htmlFor={`r-${v.id}`}>Colonna</label>
            <select
              id={`r-${v.id}`}
              className="input"
              value={v.tipo ?? 'operazione'}
              onChange={(e) => onAggiorna({ tipo: e.target.value as TipoVoce })}
            >
              <option value="compilabile">Da compilare</option>
              <option value="fissa">Fissa</option>
              <option value="operazione">Operazione</option>
            </select>
          </div>
          <div className="calc-voce-azioni">
            {v.nomeValido && (
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                title={`Usa ${v.nome.trim()} nell’espressione`}
                onClick={() => onUsa(v.nome.trim())}
              >
                <Copy size={13} />
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              title="Sposta su"
              disabled={indice === 0}
              onClick={() => onSposta(-1)}
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              title="Sposta giù"
              disabled={ultima}
              onClick={() => onSposta(1)}
            >
              <ArrowDown size={13} />
            </button>
            <button type="button" className="btn btn-secondary btn-icon" title="Elimina" onClick={onElimina}>
              <Trash size={13} />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Le scelte a tendina delle grandezze fisse: si sceglie la sigla — la classe
 * del calcestruzzo, l'acciaio, il ferro, il bullone — e le grandezze che ne
 * discendono compaiono già compilate a fianco, pronte da richiamare per nome.
 * I coefficienti parziali non si vedono: sono quelli di serie, e chi ne vuole
 * di diversi si aggiunge la sua grandezza fissa a mano.
 */
function ScelteLibreria({
  sel,
  generate,
  aiuto,
  onCambia,
  onUsa,
}: {
  sel: Selezioni;
  /** Le grandezze già calcolate dalle scelte, in ordine. */
  generate: VoceCalcolata[];
  aiuto: boolean;
  onCambia: (patch: Partial<Selezioni>) => void;
  onUsa: (nome: string) => void;
}) {
  return (
    <div className="calc-libreria">
      {aiuto && (
        <p className="note" style={{ margin: '2px 0 0' }}>
          I valori di progetto escono con i coefficienti di serie — αcc 0.85, γC 1.5, γS 1.15, γM0
          1.05, γM2 1.25 — che qui non si vedono per non riempire la scheda: per cambiarli si scrive
          la grandezza a mano fra le fisse. Lasciando vuota una quantità la sua area non compare.
        </p>
      )}

      <div className="calc-scelte">
        <div className="mini-campo">
          <label htmlFor="sel-cls">CLS</label>
          <select
            id="sel-cls"
            className="input"
            value={sel.cls}
            title="Classe di resistenza del calcestruzzo: dà fck, fcd, fctm, fctd ed Ecm"
            onChange={(e) => onCambia({ cls: e.target.value })}
          >
            <option value="">— nessuno —</option>
            {Object.keys(CLS).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mini-campo">
          <label htmlFor="sel-acciaio">Acciaio</label>
          <select
            id="sel-acciaio"
            className="input"
            value={sel.acciaio}
            title="Carpenteria, armatura o classe del bullone: dà fyd e ftd"
            onChange={(e) => onCambia({ acciaio: e.target.value })}
          >
            <option value="">— nessuno —</option>
            {SIGLE_ACCIAIO.map((s) => (
              <option key={s} value={s}>
                {s} — {ACCIAI[s].famiglia}
              </option>
            ))}
          </select>
        </div>

        <div className="mini-campo">
          <label htmlFor="sel-fi">Ferro ⌀</label>
          <select
            id="sel-fi"
            className="input"
            value={sel.barraFi}
            title="Diametro del ferro d’armatura"
            onChange={(e) => onCambia({ barraFi: e.target.value })}
          >
            {DIAMETRI.map((d) => (
              <option key={d} value={d}>
                ⌀{d}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="sel-fi-n">n. ferri</label>
          <input
            id="sel-fi-n"
            className="input"
            value={sel.barraN}
            placeholder="—"
            inputMode="numeric"
            autoComplete="off"
            title="Numero di barre: con il diametro compila Ar"
            onChange={(e) => onCambia({ barraN: e.target.value })}
          />
        </div>

        <div className="mini-campo">
          <label htmlFor="sel-m">Bullone M</label>
          <select
            id="sel-m"
            className="input"
            value={sel.bulloneM}
            title="Taglia del bullone a filettatura metrica grossa"
            onChange={(e) => onCambia({ bulloneM: e.target.value })}
          >
            {TAGLIE_BULLONE.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="mini-campo">
          <label htmlFor="sel-m-n">n. bulloni</label>
          <input
            id="sel-m-n"
            className="input"
            value={sel.bulloneN}
            placeholder="—"
            inputMode="numeric"
            autoComplete="off"
            title="Numero di bulloni: compila Ab (area resistente) e Abl (area lorda)"
            onChange={(e) => onCambia({ bulloneN: e.target.value })}
          />
        </div>
      </div>

      {generate.length > 0 ? (
        <ul className="calc-derivate">
          {generate.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                title={`${v.nota} — tocca per usare ${v.nome} nell’espressione`}
                onClick={() => onUsa(v.nome)}
              >
                <span className="n">{v.nome}</span>
                <strong>{formatta(v.valore)}</strong>
                {v.umEffettiva && <span className="um">{v.umEffettiva}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note" style={{ margin: '2px 0 0' }}>
          Nessuna scelta fatta: scegli una classe di calcestruzzo o un acciaio e qui compaiono le
          resistenze di progetto, richiamabili per nome nelle formule.
        </p>
      )}
    </div>
  );
}

export default function Calcolatrice() {
  const { state, dispatch } = useStore();
  const calc = state.calcolatrice;
  /** Le spiegazioni della scheda stanno dietro l'(i) della barra in testa. */
  const aiuto = state.ui.allDetails.calcolatrice;
  const input = useRef<HTMLInputElement>(null);
  const [apriUnita, setApriUnita] = useState(false);
  /** Modalità di modifica delle formule preimpostate: una per tutta l'area. */
  const [modifica, setModifica] = useState(false);
  const [nuovaUnita, setNuovaUnita] = useState('');
  const [nuovaPre, setNuovaPre] = useState({ nome: '', espressione: '', um: '', nota: '' });

  // le grandezze che nascono dalle scelte a tendina non stanno fra le voci
  // salvate: si ricavano dalle scelte e si mettono in testa alla sequenza, così
  // ogni formula più in basso le vede
  const generate = useMemo(() => vociDaSelezioni(calc.selezioni), [calc.selezioni]);
  const tutte = useMemo(
    () => ricalcola([...generate, ...calc.voci], calc.unita),
    [generate, calc.voci, calc.unita],
  );
  /** Le derivate dalle scelte e, a seguire, le voci scritte a mano (1:1 con `calc.voci`). */
  const derivate = tutte.slice(0, generate.length);
  const voci = tutte.slice(generate.length);
  const vars = useMemo(() => variabili(tutte), [tutte]);
  const unitaVars = useMemo(() => unitaVariabili(tutte), [tutte]);
  const anteprima = useMemo(
    () => valutaConUnita(calc.espressione, vars, unitaVars),
    [calc.espressione, vars, unitaVars],
  );
  /** Unità del risultato in corso, ricavata dai nomi che compaiono. */
  const umAuto = anteprima.ok && anteprima.dim ? scriviUnita(anteprima.dim, calc.unita) : '';
  const umFuoriElenco = !!calc.um.trim() && !unitaInElenco(calc.um, calc.unita);

  const set = (patch: Partial<typeof calc>) => dispatch({ type: 'calcolatrice', patch });
  const setVoci = (v: VoceCalcolo[]) => set({ voci: v });
  const setPre = (p: Preimpostata[]) => set({ preimpostate: p });

  /** Inserisce testo al punto del cursore, non in coda: si corregge senza riscrivere. */
  const inserisci = (testo: string) => {
    const el = input.current;
    const src = calc.espressione;
    const a = el?.selectionStart ?? src.length;
    const b = el?.selectionEnd ?? src.length;
    const nuova = src.slice(0, a) + testo + src.slice(b);
    set({ espressione: nuova });
    requestAnimationFrame(() => {
      el?.focus();
      const p = a + testo.length;
      el?.setSelectionRange(p, p);
    });
  };

  const backspace = () => {
    const el = input.current;
    const src = calc.espressione;
    const a = el?.selectionStart ?? src.length;
    const b = el?.selectionEnd ?? src.length;
    const da = a === b ? Math.max(0, a - 1) : a;
    set({ espressione: src.slice(0, da) + src.slice(b) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(da, da);
    });
  };

  const salva = () => {
    if (!calc.espressione.trim() || umFuoriElenco) return;
    setVoci([
      ...calc.voci,
      {
        id: `calc-${Date.now()}`,
        nome: calc.nome.trim(),
        espressione: calc.espressione.trim(),
        nota: calc.nota.trim(),
        um: calc.um.trim(),
      },
    ]);
    set({ espressione: '', nome: '', nota: '', um: '' });
    input.current?.focus();
  };

  const aggiorna = (id: string, patch: Partial<VoceCalcolo>) =>
    setVoci(calc.voci.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const sposta = (id: string, verso: -1 | 1) => {
    const i = calc.voci.findIndex((v) => v.id === id);
    const j = i + verso;
    if (i < 0 || j < 0 || j >= calc.voci.length) return;
    const copia = [...calc.voci];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setVoci(copia);
  };

  /** Aggiunge una grandezza (dal catalogo o vuota) e ne apre subito i campi. */
  const aggiungiGrandezza = (base?: Partial<Omit<VoceCalcolo, 'id'>>) => {
    const id = `calc-${Date.now()}`;
    setVoci([
      ...calc.voci,
      { id, nome: '', espressione: '', nota: '', um: '', tipo: 'compilabile', ...base },
    ]);
    if (!base?.nome) dispatch({ type: 'toggleExp', id: `calc-${id}` });
  };

  /** Le operazioni salvate stanno sotto le due colonne, in fila fra loro. */
  const operazioni = voci.filter((v) => (v.tipo ?? 'operazione') === 'operazione');

  /* ─── riepilogo: quello che si è messo nella scheda, tutto in un posto ─── */

  /** Grandezze con un valore scritto, quelle di libreria comprese. */
  const compilate = tutte.filter((v) => v.espressione.trim());
  /** Grandezze richiamabili per nome, anche se ancora da compilare. */
  const nominate = tutte.filter((v) => v.nomeValido);

  // grandezze proposte: quelle di serie che mancano più il catalogo, divise
  // per colonna — a sinistra si aggiungono lunghezze, a destra pesi di volume
  const nomiUsati = new Set(tutte.map((v) => v.nome.trim()));
  const proposte = [...VOCI_DEFAULT.map(({ id: _id, ...g }) => g), ...GRANDEZZE_CATALOGO].filter(
    (g) => !nomiUsati.has(g.nome),
  );
  const daAggiungere = {
    compilabili: proposte.filter((g) => g.tipo !== 'fissa'),
    fisse: proposte.filter((g) => g.tipo === 'fissa'),
  };

  const nomeGiaUsato = tutte.some((v) => v.nomeValido && v.nome.trim() === calc.nome.trim());
  const nomeErrato = !!calc.nome.trim() && (!nomeAmmesso(calc.nome) || nomeGiaUsato);

  const setUnita = (u: string[]) => set({ unita: normalizzaElenco(u) });

  const aggiungiUnita = () => {
    if (!nuovaUnita.trim()) return;
    setUnita([...calc.unita, nuovaUnita.trim()]);
    setNuovaUnita('');
  };

  /* ─── operazioni preimpostate ─── */

  /** Ogni formula con quello che le manca e, se non manca niente, il risultato. */
  const preimpostate = useMemo(
    () =>
      calc.preimpostate.map((p) => {
        const mancanti = nomiMancanti(p.espressione, vars);
        const esito = p.espressione.trim() && !mancanti.length
          ? valutaConUnita(p.espressione, vars, unitaVars)
          : null;
        const umAutoPre = esito?.ok && esito.dim ? scriviUnita(esito.dim, calc.unita) : '';
        return { ...p, mancanti, esito, umEffettiva: p.um.trim() || umAutoPre };
      }),
    [calc.preimpostate, calc.unita, vars, unitaVars],
  );

  /** Le formule scelte, nell'ordine in cui compaiono nell'elenco. */
  const scelte = preimpostate.filter((p) => calc.preScelte.includes(p.id));

  const aggiornaPre = (id: string, patch: Partial<Preimpostata>) =>
    setPre(calc.preimpostate.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  /** Eliminando la formula se ne va anche la scelta: non resterebbe niente da mostrare. */
  const eliminaPre = (id: string) =>
    set({
      preimpostate: calc.preimpostate.filter((x) => x.id !== id),
      preScelte: calc.preScelte.filter((x) => x !== id),
    });

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

  /** La formula finisce nel display già pronta: il risultato compare lì. */
  const usaPre = (p: Preimpostata) => {
    set({ espressione: p.espressione, nome: p.nome, nota: p.nota, um: p.um });
    requestAnimationFrame(() => {
      const el = input.current;
      el?.focus();
      el?.setSelectionRange(p.espressione.length, p.espressione.length);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  /**
   * Il tocco sulla formula fa due cose: la tiene fra le scelte — è quello che
   * si ritrova nel riepilogo in fondo — e, se le grandezze che le servono ci
   * sono tutte, la porta calcolata nel display. Ritoccandola la si toglie.
   */
  const scegliPre = (p: Preimpostata, pronta: boolean) => {
    const scelta = calc.preScelte.includes(p.id);
    set({
      preScelte: scelta ? calc.preScelte.filter((x) => x !== p.id) : [...calc.preScelte, p.id],
    });
    if (!scelta && pronta) usaPre(p);
  };

  /** Salva la formula fra le operazioni senza passare dal display. */
  const salvaPre = (p: Preimpostata) => {
    setVoci([
      ...calc.voci,
      { id: `calc-${Date.now()}`, nome: p.nome.trim(), espressione: p.espressione.trim(), nota: p.nota.trim(), um: p.um.trim() },
    ]);
  };

  return (
    <div className="stack">
      {/* elenco dei suggerimenti: uno solo per tutta la scheda, lo vedono sia il
          campo in scrittura sia quelli delle operazioni già salvate */}
      <datalist id="calc-elenco-unita">
        {calc.unita.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <ComandiScheda>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={calc.tastierino}
          title="Mostra il tastierino anche su desktop (su cellulare c’è sempre)"
          onClick={() => set({ tastierino: !calc.tastierino })}
        >
          <Keyboard size={14} />
          Tastierino
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
        <span className="calc-conteggio">
          {voci.filter((v) => v.espressione.trim()).length} compilate ·{' '}
          {operazioni.length} {operazioni.length === 1 ? 'operazione salvata' : 'operazioni salvate'}
        </span>
      </ComandiScheda>

      {apriUnita && (
        <section className="panel">
          <div className="panel-body" style={{ paddingTop: 12 }}>
            <div className="section-title">Unità di misura proposte</div>
            <p className="note" style={{ marginTop: 0, display: aiuto ? undefined : 'none' }}>
              Sono le uniche ammesse nei campi «Unità»: scrivendo compaiono come suggerimento e quello
              che non è in elenco viene segnato come errore. Il prodotto e il rapporto fra operazioni
              con nome ricavano l’unità da soli — <code>b*h</code> in m dà mq, <code>b*h*γC</code>{' '}
              con γC in kN/mc dà kN/m.
            </p>

            <div className="calc-unita-aggiungi">
              <input
                className="input"
                value={nuovaUnita}
                placeholder="kg/ml"
                aria-label="Nuova unità di misura"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setNuovaUnita(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    aggiungiUnita();
                  }
                }}
              />
              <button type="button" className="btn btn-primary" disabled={!nuovaUnita.trim()} onClick={aggiungiUnita}>
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
                  <button
                    type="button"
                    title={`Togli ${u} dall’elenco`}
                    onClick={() => setUnita(calc.unita.filter((x) => x !== u))}
                  >
                    <X size={11} weight="bold" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="calc-display">
            <input
              ref={input}
              className="calc-input"
              value={calc.espressione}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Espressione da calcolare"
              placeholder="es.  b*h   ·   q*l^2/8   ·   sqrt(2)*3"
              onChange={(e) => set({ espressione: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  salva();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  set({ espressione: '' });
                }
              }}
            />
            <div className={`calc-risultato${anteprima.ok ? '' : ' is-errore'}`} aria-live="polite">
              {calc.espressione.trim() === '' ? (
                <span className="calc-vuoto">Scrivi l’operazione — su PC direttamente da tastiera, Invio la salva</span>
              ) : anteprima.ok ? (
                <>
                  <Equals size={16} />
                  <strong>{formatta(anteprima.valore)}</strong>
                  {(calc.um.trim() || umAuto) && (
                    <span className={`um${calc.um.trim() ? '' : ' is-auto'}`}>
                      {calc.um.trim() || umAuto}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <WarningCircle size={15} />
                  {anteprima.errore}
                </>
              )}
            </div>
          </div>

          <div className={`calc-tastierino${calc.tastierino ? ' is-sempre' : ''}`}>
            {TASTI.map((k) => (
              <button
                key={k.t}
                type="button"
                className={`calc-tasto${k.classe ? ` ${k.classe}` : ''}`}
                title={k.titolo}
                onClick={() => {
                  if (k.azione === 'canc') set({ espressione: '' });
                  else if (k.azione === 'backspace') backspace();
                  else inserisci(k.ins ?? k.t);
                }}
              >
                {k.t === '⌫' ? <Backspace size={17} /> : k.t}
              </button>
            ))}
          </div>

          <div className="calc-salva">
            <div className="mini-campo">
              <label htmlFor="calc-nome">Nome (richiamabile)</label>
              <input
                id="calc-nome"
                className={`input${nomeErrato ? ' is-error' : ''}`}
                value={calc.nome}
                placeholder="area"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={nomeErrato || undefined}
                onChange={(e) => set({ nome: e.target.value })}
              />
            </div>
            <CampoUnita
              id="calc-um"
              label="Unità"
              value={calc.um}
              auto={umAuto}
              elenco={calc.unita}
              onChange={(v) => set({ um: v })}
            />
            <div className="mini-campo calc-campo-nota">
              <label htmlFor="calc-nota">Nota</label>
              <input
                id="calc-nota"
                className="input"
                value={calc.nota}
                placeholder="area di influenza del solaio tipo"
                autoComplete="off"
                onChange={(e) => set({ nota: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary calc-btn-salva"
              disabled={!calc.espressione.trim() || umFuoriElenco}
              title="Salva l’operazione estesa (operazione = risultato) con la sua nota"
              onClick={salva}
            >
              <BookmarkSimple size={14} />
              Salva operazione con nota
            </button>
          </div>

          {nomeErrato && (
            <div className="field-error">
              {nomeGiaUsato
                ? 'Nome già usato da un’altra operazione: il richiamo per nome resterebbe ambiguo.'
                : 'Il nome deve iniziare per lettera e contenere solo lettere, cifre o «_».'}
            </div>
          )}

          {umFuoriElenco && (
            <div className="field-error">
              «{calc.um.trim()}» non è fra le unità proposte: scegline una dall’elenco, oppure
              aggiungila con il pulsante «Unità» in testa alla scheda.
            </div>
          )}

          {aiuto && (
            <p className="note calc-aiuto">
              Operatori <code>+ − × ÷ ^</code>, parentesi, <code>%</code> come «per cento», virgola o punto
              decimale, argomenti separati da <code>;</code>. Funzioni:{' '}
              {Object.keys(FUNZIONI).join(', ')} — trigonometria in <strong>gradi</strong>. Nelle espressioni
              puoi usare i nomi delle grandezze qui sotto, <code>ans</code> (ultimo risultato), <code>pi</code> ed{' '}
              <code>e</code>.
            </p>
          )}
        </div>
      </section>

      {/* ─────────────── grandezze e operazioni salvate ─────────────── */}

      <Accordion
        id="calc-grandezze"
        title="Grandezze e operazioni"
        hint={`${compilate.length} compilate · ${operazioni.length} salvate`}
      >
        <div className="stack-sm">
          {aiuto && (
            <p className="note" style={{ marginTop: 0 }}>
              Il valore si scrive dentro la pastiglia; toccando il nome si aprono nome, unità, nota e la
              colonna in cui sta. A sinistra le grandezze <strong>da compilare</strong>, che si svuotano a
              ogni riapertura perché valgono per il calcolo di oggi; a destra quelle <strong>fisse</strong>,
              i pesi di volume, che restano compilate. La γ si può scrivere anche con la g:{' '}
              <code>gC</code> e <code>gammaC</code> sono <code>γC</code>. Ogni riga vede solo quelle che la
              precedono, così correggere una grandezza a monte aggiorna da solo tutto quello che ne
              discende.
            </p>
          )}

          <Blocco
            id="calc-libreria"
            titolo="Da libreria"
            sotto="scegli la sigla, le resistenze vengono da sé"
          >
            <ScelteLibreria
              sel={calc.selezioni}
              generate={derivate}
              aiuto={aiuto}
              onCambia={(patch) => set({ selezioni: { ...calc.selezioni, ...patch } })}
              onUsa={inserisci}
            />
          </Blocco>

          <div className="calc-colonne">
            {COLONNE.map((col) => {
              const gruppo = voci.filter((v) => (v.tipo ?? 'operazione') === col.id);
              const chips = col.id === 'fissa' ? daAggiungere.fisse : daAggiungere.compilabili;
              return (
                <div className="calc-colonna" key={col.id}>
                  <Blocco id={`calc-col-${col.id}`} titolo={col.titolo} sotto={col.sotto}>
                    {gruppo.length > 0 && (
                      <ul className="calc-griglia">
                        {gruppo.map((v) => (
                          <RigaVoce
                            key={v.id}
                            v={v}
                            indice={voci.findIndex((x) => x.id === v.id)}
                            ultima={voci[voci.length - 1]?.id === v.id}
                            aperta={!!state.ui.exp[`calc-${v.id}`]}
                            elenco={calc.unita}
                            onApri={() => dispatch({ type: 'toggleExp', id: `calc-${v.id}` })}
                            onAggiorna={(patch) => aggiorna(v.id, patch)}
                            onSposta={(verso) => sposta(v.id, verso)}
                            onElimina={() => setVoci(calc.voci.filter((x) => x.id !== v.id))}
                            onUsa={inserisci}
                          />
                        ))}
                      </ul>
                    )}
                    <div className="calc-catalogo">
                      {chips.map((g) => (
                        <button
                          type="button"
                          key={g.nome}
                          className="calc-catalogo-chip"
                          title={`Aggiungi ${g.nome} — ${g.nota}${g.espressione ? ` (${g.espressione} ${g.um})` : ''}`}
                          onClick={() => aggiungiGrandezza({ ...g })}
                        >
                          <Plus size={11} weight="bold" />
                          {g.nome}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="calc-catalogo-chip is-vuota"
                        title={`Aggiungi una grandezza tua fra quelle ${col.id === 'fissa' ? 'fisse' : 'da compilare'}`}
                        onClick={() => aggiungiGrandezza({ tipo: col.id })}
                      >
                        <Plus size={11} weight="bold" />
                        nuova
                      </button>
                    </div>
                  </Blocco>
                </div>
              );
            })}
          </div>

          {operazioni.length > 0 && (
            <Blocco id="calc-operazioni" titolo="Operazioni salvate" sotto="restano con il progetto">
              <ul className="calc-griglia">
                {operazioni.map((v) => (
                  <RigaVoce
                    key={v.id}
                    v={v}
                    indice={voci.findIndex((x) => x.id === v.id)}
                    ultima={voci[voci.length - 1]?.id === v.id}
                    aperta={!!state.ui.exp[`calc-${v.id}`]}
                    elenco={calc.unita}
                    onApri={() => dispatch({ type: 'toggleExp', id: `calc-${v.id}` })}
                    onAggiorna={(patch) => aggiorna(v.id, patch)}
                    onSposta={(verso) => sposta(v.id, verso)}
                    onElimina={() => setVoci(calc.voci.filter((x) => x.id !== v.id))}
                    onUsa={inserisci}
                  />
                ))}
              </ul>
            </Blocco>
          )}

          {aiuto && voci.length > 0 && (
            <p className="note" style={{ marginTop: 10 }}>
              Le grandezze viaggiano con il progetto: sono nell’Esporta JSON e nel Copia. Riga estesa:{' '}
              <code>{testoVoce(voci[0])}</code>
            </p>
          )}
        </div>
      </Accordion>

      {/* ─────────────── operazioni preimpostate ─────────────── */}

      <Accordion
        id="calc-preimpostate"
        title="Operazioni preimpostate"
        hint={`${scelte.length} scelte su ${preimpostate.length}`}
      >
        <div className="stack-sm">
          {aiuto && (
            <p className="note" style={{ marginTop: 0 }}>
              Formule scritte una volta sui nomi delle grandezze qui sopra — <code>q*l^2/8</code>,{' '}
              <code>b*h^2/6</code>. Quando le grandezze che servono sono tutte compilate la formula si
              accende e al tocco fa il calcolo: finisce nel display con nome e unità, pronta da salvare.
              Il tocco la segna anche fra le scelte, che si ritrovano nel riepilogo in fondo alla
              scheda; per cambiare le formule — testo, unità, nota — si entra in modifica con «Edita».
            </p>
          )}

          <div className="calc-preset-barra">
            <button
              type="button"
              className={`btn ${modifica ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={modifica}
              title="Entra ed esci dalla modalità che permette di cambiare, aggiungere ed eliminare le formule"
              onClick={() => setModifica((v) => !v)}
            >
              {modifica ? <Check size={14} /> : <PencilSimple size={14} />}
              {modifica ? 'Fine modifiche' : 'Edita'}
            </button>
            <span className="note" style={{ margin: 0 }}>
              {modifica
                ? 'Modalità modifica: cambia le formule, aggiungine di nuove, elimina quelle che non servono.'
                : 'Tocca una formula per calcolarla e tenerla fra le scelte; ritoccandola la togli.'}
            </span>
          </div>

          {preimpostate.length > 0 && (
            <ul className="calc-preset-lista">
              {preimpostate.map((p) => {
                const pronta = !!p.esito?.ok;
                const scelta = calc.preScelte.includes(p.id);
                return (
                  <li
                    key={p.id}
                    className={`calc-preset${pronta ? ' is-pronta' : ''}${scelta ? ' is-scelta' : ''}`}
                  >
                    <button
                      type="button"
                      className="calc-preset-usa"
                      aria-pressed={scelta}
                      disabled={modifica}
                      title={
                        modifica
                          ? 'In modifica la formula non si calcola: si cambia qui sotto'
                          : pronta
                            ? 'Calcola, porta la formula nel display e la tiene fra le scelte'
                            : `Tienila fra le scelte — mancano: ${p.mancanti.join(', ') || 'un’espressione valida'}`
                      }
                      onClick={() => scegliPre(p, pronta)}
                    >
                      <span className="calc-preset-nome">
                        {scelta && <Check size={11} weight="bold" />}
                        {p.nome.trim() || '—'}
                      </span>
                      <span className="calc-preset-espr">{p.espressione}</span>
                      <span className="calc-preset-esito">
                        {p.esito?.ok ? (
                          <>
                            <Equals size={13} />
                            <strong>{formatta(p.esito.valore)}</strong>
                            {p.umEffettiva && <span className="um">{p.umEffettiva}</span>}
                          </>
                        ) : p.mancanti.length ? (
                          <span className="calc-preset-mancanti">manca {p.mancanti.join(', ')}</span>
                        ) : (
                          <span className="calc-preset-mancanti">
                            {p.esito && !p.esito.ok ? p.esito.errore : 'formula da scrivere'}
                          </span>
                        )}
                      </span>
                    </button>

                    {modifica && (
                      <div className="calc-preset-azioni">
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          disabled={!pronta}
                          title="Salva subito fra le operazioni"
                          onClick={() => salvaPre(p)}
                        >
                          <BookmarkSimple size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          title="Elimina la formula"
                          onClick={() => eliminaPre(p.id)}
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    )}

                    {modifica && (
                      <div className="calc-voce-modifica">
                        <div className="mini-campo">
                          <label htmlFor={`pn-${p.id}`}>Nome</label>
                          <input
                            id={`pn-${p.id}`}
                            className="input"
                            value={p.nome}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(e) => aggiornaPre(p.id, { nome: e.target.value })}
                          />
                        </div>
                        <div className="mini-campo calc-campo-espr">
                          <label htmlFor={`pe-${p.id}`}>Formula</label>
                          <input
                            id={`pe-${p.id}`}
                            className="input"
                            value={p.espressione}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(e) => aggiornaPre(p.id, { espressione: e.target.value })}
                          />
                        </div>
                        <CampoUnita
                          id={`pu-${p.id}`}
                          label="Unità"
                          value={p.um}
                          auto={p.umEffettiva}
                          elenco={calc.unita}
                          onChange={(um) => aggiornaPre(p.id, { um })}
                        />
                        <div className="mini-campo calc-campo-nota">
                          <label htmlFor={`pt-${p.id}`}>Nota</label>
                          <input
                            id={`pt-${p.id}`}
                            className="input"
                            value={p.nota}
                            autoComplete="off"
                            onChange={(e) => aggiornaPre(p.id, { nota: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {p.nota.trim() && !modifica && (
                      <span className="calc-preset-nota">{p.nota.trim()}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {modifica && (
            <div className="calc-preset-aggiungi">
              <div className="mini-campo">
                <label htmlFor="pre-nome">Nome</label>
                <input
                  id="pre-nome"
                  className="input"
                  value={nuovaPre.nome}
                  placeholder="M"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setNuovaPre({ ...nuovaPre, nome: e.target.value })}
                />
              </div>
              <div className="mini-campo calc-campo-espr">
                <label htmlFor="pre-espr">Formula</label>
                <input
                  id="pre-espr"
                  className="input"
                  value={nuovaPre.espressione}
                  placeholder="q*l^2/8"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setNuovaPre({ ...nuovaPre, espressione: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      aggiungiPre();
                    }
                  }}
                />
              </div>
              <CampoUnita
                id="pre-um"
                label="Unità"
                value={nuovaPre.um}
                auto=""
                elenco={calc.unita}
                onChange={(um) => setNuovaPre({ ...nuovaPre, um })}
              />
              <div className="mini-campo calc-campo-nota">
                <label htmlFor="pre-nota">Nota</label>
                <input
                  id="pre-nota"
                  className="input"
                  value={nuovaPre.nota}
                  placeholder="momento in mezzeria, trave appoggiata"
                  autoComplete="off"
                  onChange={(e) => setNuovaPre({ ...nuovaPre, nota: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary calc-btn-salva"
                disabled={!nuovaPre.espressione.trim()}
                onClick={aggiungiPre}
              >
                <Plus size={14} />
                Aggiungi formula
              </button>
            </div>
          )}

          {modifica && calc.preimpostate.length === 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              title="Rimette le formule di serie: momenti, taglio, area, modulo di resistenza, peso proprio"
              onClick={() => setPre(PREIMPOSTATE_DEFAULT)}
            >
              <Plus size={14} />
              Rimetti le formule di serie
            </button>
          )}
        </div>
      </Accordion>

      {/* ─────────────── riepilogo di quello che si è messo ─────────────── */}

      <Accordion
        id="calc-riepilogo"
        title="Riepilogo"
        hint={`${compilate.length} compilate · ${nominate.length} con nome · ${scelte.length} formule`}
      >
        <div className="stack-sm">
          {aiuto && (
            <p className="note" style={{ marginTop: 0 }}>
              Quello che si è messo nella scheda, tutto in un posto: le grandezze compilate — appena si
              scrive un valore in <code>b</code> o in <code>l</code> compare qui —, quelle a cui si è dato
              un nome, richiamabili nelle formule, e le operazioni preimpostate scelte con il loro
              risultato di adesso.
            </p>
          )}

          <div className="calc-riepilogo">
            <div className="calc-riepilogo-gruppo">
              <div className="calc-colonna-testa">
                <span className="t">Compilate</span>
                <span className="d">grandezze con un valore scritto</span>
              </div>
              {compilate.length > 0 ? (
                <ul className="calc-riep-lista">
                  {compilate.map((v) => (
                    <li key={v.id} className={v.errore ? 'is-errore' : undefined}>
                      <span className="n">{v.nome.trim() || '—'}</span>
                      <span className="x">{v.espressione}</span>
                      <span className="v">
                        {v.errore ? (
                          <span className="calc-preset-mancanti">{v.errore}</span>
                        ) : (
                          <>
                            <strong>{formatta(v.valore)}</strong>
                            {v.umEffettiva && <span className="um">{v.umEffettiva}</span>}
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="note" style={{ margin: 0 }}>
                  Niente di compilato: scrivi un valore in una grandezza e compare qui.
                </p>
              )}
            </div>

            <div className="calc-riepilogo-gruppo">
              <div className="calc-colonna-testa">
                <span className="t">Con un nome</span>
                <span className="d">richiamabili nelle formule</span>
              </div>
              {nominate.length > 0 ? (
                <ul className="calc-riep-lista">
                  {nominate.map((v) => (
                    <li key={v.id}>
                      <span className="n">{v.nome.trim()}</span>
                      <span className="x">{v.nota.trim() || v.espressione}</span>
                      <span className="v">
                        {v.espressione.trim() && !v.errore ? (
                          <>
                            <strong>{formatta(v.valore)}</strong>
                            {v.umEffettiva && <span className="um">{v.umEffettiva}</span>}
                          </>
                        ) : (
                          <span className="calc-da-compilare">da compilare</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="note" style={{ margin: 0 }}>
                  Nessun nome dato: il nome si scrive toccando la pastiglia della grandezza.
                </p>
              )}
            </div>

            <div className="calc-riepilogo-gruppo">
              <div className="calc-colonna-testa">
                <span className="t">Formule scelte</span>
                <span className="d">operazioni preimpostate toccate</span>
              </div>
              {scelte.length > 0 ? (
                <ul className="calc-riep-lista">
                  {scelte.map((p) => (
                    <li key={p.id}>
                      <span className="n">{p.nome.trim() || '—'}</span>
                      <span className="x">{p.espressione}</span>
                      <span className="v">
                        {p.esito?.ok ? (
                          <>
                            <strong>{formatta(p.esito.valore)}</strong>
                            {p.umEffettiva && <span className="um">{p.umEffettiva}</span>}
                          </>
                        ) : (
                          <span className="calc-preset-mancanti">
                            {p.mancanti.length ? `manca ${p.mancanti.join(', ')}` : 'non calcolabile'}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        title="Togli dalle scelte"
                        onClick={() => set({ preScelte: calc.preScelte.filter((x) => x !== p.id) })}
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="note" style={{ margin: 0 }}>
                  Nessuna formula scelta: tocca una delle operazioni preimpostate e la ritrovi qui.
                </p>
              )}
            </div>
          </div>
        </div>
      </Accordion>
    </div>
  );
}
