import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Backspace,
  BookmarkSimple,
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
  type Preimpostata,
  type VoceCalcolo,
} from '../calc/calcolatrice';
import { UNITA_DEFAULT, normalizzaElenco, scriviUnita, unitaInElenco } from '../calc/unita';

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
  { t: 'γ', ins: 'γ', titolo: 'Iniziale dei pesi di volume: γCLS, γACC, γTERRA' },
  { t: ';', ins: ';', titolo: 'Separatore degli argomenti: min(3;5)' },
  { t: 'ans', ins: 'ans', classe: 'is-largo', titolo: 'Ultimo risultato' },
  { t: 'C', azione: 'canc', classe: 'is-canc' },
  { t: '⌫', azione: 'backspace', classe: 'is-canc' },
];

/** Un valore scritto come numero e basta: la pastiglia non ripete il risultato. */
const SOLO_NUMERO = /^[+-]?[\d\s.,]+$/;

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

export default function Calcolatrice() {
  const { state, dispatch } = useStore();
  const calc = state.calcolatrice;
  const input = useRef<HTMLInputElement>(null);
  const [apriUnita, setApriUnita] = useState(false);
  const [nuovaUnita, setNuovaUnita] = useState('');
  const [nuovaPre, setNuovaPre] = useState({ nome: '', espressione: '', um: '', nota: '' });

  const voci = useMemo(() => ricalcola(calc.voci, calc.unita), [calc.voci, calc.unita]);
  const vars = useMemo(() => variabili(voci), [voci]);
  const unitaVars = useMemo(() => unitaVariabili(voci), [voci]);
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
  const aggiungiGrandezza = (base?: Omit<VoceCalcolo, 'id'>) => {
    const id = `calc-${Date.now()}`;
    setVoci([...calc.voci, { id, nome: '', espressione: '', nota: '', um: '', ...base }]);
    if (!base) dispatch({ type: 'toggleExp', id: `calc-${id}` });
  };

  const nomiUsati = new Set(voci.map((v) => v.nome.trim()));
  const catalogo = GRANDEZZE_CATALOGO.filter((g) => !nomiUsati.has(g.nome));
  const mancantiDefault = VOCI_DEFAULT.filter((g) => !nomiUsati.has(g.nome));

  const nomeGiaUsato = voci.some((v) => v.nomeValido && v.nome.trim() === calc.nome.trim());
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
          {voci.length} {voci.length === 1 ? 'operazione salvata' : 'operazioni salvate'}
        </span>
      </ComandiScheda>

      {apriUnita && (
        <section className="panel">
          <div className="panel-body" style={{ paddingTop: 12 }}>
            <div className="section-title">Unità di misura proposte</div>
            <p className="note" style={{ marginTop: 0 }}>
              Sono le uniche ammesse nei campi «Unità»: scrivendo compaiono come suggerimento e quello
              che non è in elenco viene segnato come errore. Il prodotto e il rapporto fra operazioni
              con nome ricavano l’unità da soli — <code>b*h</code> in m dà mq, <code>b*h*γCLS</code>{' '}
              con γCLS in kN/mc dà kN/m.
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

          <p className="note calc-aiuto">
            Operatori <code>+ − × ÷ ^</code>, parentesi, <code>%</code> come «per cento», virgola o punto
            decimale, argomenti separati da <code>;</code>. Funzioni:{' '}
            {Object.keys(FUNZIONI).join(', ')} — trigonometria in <strong>gradi</strong>. Nelle espressioni
            puoi usare i nomi delle grandezze qui sotto, <code>ans</code> (ultimo risultato), <code>pi</code> ed{' '}
            <code>e</code>.
          </p>
        </div>
      </section>

      {/* ─────────────── grandezze e operazioni salvate ─────────────── */}

      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="section-title">Grandezze e operazioni</div>
          <p className="note" style={{ marginTop: 0 }}>
            Il valore si scrive dentro la pastiglia; toccando il nome si aprono nome, unità e nota. Ogni
            riga vede solo quelle che la precedono, così correggere una grandezza a monte aggiorna da solo
            tutto quello che ne discende.
          </p>

          {voci.length > 0 && (
            <ul className="calc-griglia">
              {voci.map((v, i) => {
                const aperta = !!state.ui.exp[`calc-${v.id}`];
                const numerica = SOLO_NUMERO.test(v.espressione.trim());
                return (
                  <li
                    key={v.id}
                    className={`calc-gr${v.errore ? ' is-errore' : ''}${aperta ? ' is-aperta' : ''}`}
                  >
                    <button
                      type="button"
                      className="calc-gr-nome"
                      aria-expanded={aperta}
                      title={v.nota.trim() || 'Nome, unità e nota'}
                      onClick={() => dispatch({ type: 'toggleExp', id: `calc-${v.id}` })}
                    >
                      {v.nome.trim() ? v.nome.trim() : <span className="calc-senza-nome">n. {i + 1}</span>}
                    </button>

                    <input
                      className={`input calc-gr-valore${v.errore ? ' is-error' : ''}`}
                      value={v.espressione}
                      placeholder="—"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      aria-label={`Valore di ${v.nome.trim() || `operazione ${i + 1}`}`}
                      onChange={(e) => aggiorna(v.id, { espressione: e.target.value })}
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
                          {v.umEffettiva && (
                            <span className={`um${v.um.trim() ? '' : ' is-auto'}`}>{v.umEffettiva}</span>
                          )}
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
                            onChange={(e) => aggiorna(v.id, { nome: e.target.value })}
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
                            onChange={(e) => aggiorna(v.id, { espressione: e.target.value })}
                          />
                        </div>
                        <CampoUnita
                          id={`u-${v.id}`}
                          label="Unità"
                          value={v.um}
                          auto={v.umCalcolata}
                          elenco={calc.unita}
                          onChange={(um) => aggiorna(v.id, { um })}
                        />
                        <div className="mini-campo calc-campo-nota">
                          <label htmlFor={`t-${v.id}`}>Nota</label>
                          <input
                            id={`t-${v.id}`}
                            className="input"
                            value={v.nota}
                            autoComplete="off"
                            onChange={(e) => aggiorna(v.id, { nota: e.target.value })}
                          />
                        </div>
                        <div className="calc-voce-azioni">
                          {v.nomeValido && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              title={`Usa ${v.nome.trim()} nell’espressione`}
                              onClick={() => inserisci(v.nome.trim())}
                            >
                              <Copy size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            title="Sposta su"
                            disabled={i === 0}
                            onClick={() => sposta(v.id, -1)}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            title="Sposta giù"
                            disabled={i === voci.length - 1}
                            onClick={() => sposta(v.id, 1)}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            title="Elimina"
                            onClick={() => setVoci(calc.voci.filter((x) => x.id !== v.id))}
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* quali grandezze tenere lo decide chi calcola: qui si aggiungono
              quelle di serie che mancano, quelle del catalogo e una vuota */}
          <div className="calc-catalogo">
            {[...mancantiDefault, ...catalogo].map((g) => (
              <button
                type="button"
                key={g.nome}
                className="calc-catalogo-chip"
                title={`Aggiungi ${g.nome} — ${g.nota}${g.espressione ? ` (${g.espressione} ${g.um})` : ''}`}
                onClick={() => aggiungiGrandezza({ nome: g.nome, espressione: g.espressione, nota: g.nota, um: g.um })}
              >
                <Plus size={11} weight="bold" />
                {g.nome}
              </button>
            ))}
            <button
              type="button"
              className="calc-catalogo-chip is-vuota"
              title="Aggiungi una grandezza tua, con nome e unità da scrivere"
              onClick={() => aggiungiGrandezza()}
            >
              <Plus size={11} weight="bold" />
              nuova
            </button>
          </div>

          {voci.length > 0 && (
            <p className="note" style={{ marginTop: 10 }}>
              Le grandezze viaggiano con il progetto: sono nell’Esporta JSON e nel Copia. Riga estesa:{' '}
              <code>{testoVoce(voci[0])}</code>
            </p>
          )}
        </div>
      </section>

      {/* ─────────────── operazioni preimpostate ─────────────── */}

      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="section-title">Operazioni preimpostate</div>
          <p className="note" style={{ marginTop: 0 }}>
            Formule scritte una volta sui nomi delle grandezze qui sopra — <code>q*l^2/8</code>,{' '}
            <code>b*h^2/6</code>. Quando le grandezze che servono sono tutte compilate la formula si
            accende e al tocco fa il calcolo: finisce nel display con nome e unità, pronta da salvare.
          </p>

          {preimpostate.length > 0 && (
            <ul className="calc-preset-lista">
              {preimpostate.map((p) => {
                const aperta = !!state.ui.exp[`pre-${p.id}`];
                const pronta = !!p.esito?.ok;
                return (
                  <li key={p.id} className={`calc-preset${pronta ? ' is-pronta' : ''}`}>
                    <button
                      type="button"
                      className="calc-preset-usa"
                      disabled={!pronta}
                      title={
                        pronta
                          ? 'Calcola e porta la formula nel display'
                          : `Mancano: ${p.mancanti.join(', ') || 'un’espressione valida'}`
                      }
                      onClick={() => usaPre(p)}
                    >
                      <span className="calc-preset-nome">{p.nome.trim() || '—'}</span>
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
                        aria-expanded={aperta}
                        title="Modifica la formula"
                        onClick={() => dispatch({ type: 'toggleExp', id: `pre-${p.id}` })}
                      >
                        <PencilSimple size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        title="Elimina la formula"
                        onClick={() => setPre(calc.preimpostate.filter((x) => x.id !== p.id))}
                      >
                        <Trash size={13} />
                      </button>
                    </div>

                    {aperta && (
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

                    {p.nota.trim() && !aperta && <span className="calc-preset-nota">{p.nota.trim()}</span>}
                  </li>
                );
              })}
            </ul>
          )}

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

          {calc.preimpostate.length === 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 10 }}
              title="Rimette le formule di serie: momenti, taglio, area, modulo di resistenza, peso proprio"
              onClick={() => setPre(PREIMPOSTATE_DEFAULT)}
            >
              <Plus size={14} />
              Rimetti le formule di serie
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
