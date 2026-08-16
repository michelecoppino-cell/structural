import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Backspace,
  BookmarkSimple,
  Copy,
  Equals,
  Keyboard,
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
  VOCI_DEFAULT,
  formatta,
  nomeAmmesso,
  ricalcola,
  testoVoce,
  unitaVariabili,
  valutaConUnita,
  variabili,
  type VoceCalcolo,
} from '../calc/calcolatrice';
import { UNITA_DEFAULT, normalizzaElenco, scriviUnita, unitaInElenco } from '../calc/unita';

/** Tasti del tastierino: quattro colonne, come una calcolatrice. */
const TASTI: { t: string; ins?: string; azione?: 'canc' | 'backspace' | 'salva'; classe?: string }[] = [
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
  { t: 'C', azione: 'canc', classe: 'is-canc' },
  { t: '⌫', azione: 'backspace', classe: 'is-canc' },
];

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

  const nomeGiaUsato = voci.some((v) => v.nomeValido && v.nome.trim() === calc.nome.trim());
  const nomeErrato = !!calc.nome.trim() && (!nomeAmmesso(calc.nome) || nomeGiaUsato);

  const setUnita = (u: string[]) => set({ unita: normalizzaElenco(u) });

  const aggiungiUnita = () => {
    if (!nuovaUnita.trim()) return;
    setUnita([...calc.unita, nuovaUnita.trim()]);
    setNuovaUnita('');
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
              con nome ricavano l’unità da soli — <code>b*h</code> in m dà mq, <code>b*h*gCLS</code>{' '}
              con gCLS in kN/mc dà kN/m.
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
              placeholder="es.  base*altezza/2   ·   area*incidenza   ·   sqrt(2)*3"
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
            puoi usare i nomi delle operazioni salvate, <code>ans</code> (ultimo risultato), <code>pi</code> ed{' '}
            <code>e</code>.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-body" style={{ paddingTop: 12 }}>
          <div className="section-title">Operazioni salvate</div>

          {voci.length === 0 ? (
            <div className="placeholder">
              <div className="t">Nessuna operazione salvata</div>
              <div className="d">
                Salva i passaggi del predimensionamento con un nome — area, incidenza, carico — e riusali
                nelle operazioni successive scrivendone il nome. Le operazioni salvate viaggiano con il
                progetto: sono nell’Esporta JSON e nel Copia txt.
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 10 }}
                title="Rimette b, l, h, gCLS, gACC e gTERRA, vuote da compilare"
                onClick={() => setVoci(VOCI_DEFAULT)}
              >
                <Plus size={14} />
                Rimetti le grandezze di base
              </button>
            </div>
          ) : (
            <ul className="calc-lista">
              {voci.map((v, i) => {
                const aperta = !!state.ui.exp[`calc-${v.id}`];
                return (
                  <li key={v.id} className={`calc-voce${v.errore ? ' is-errore' : ''}`}>
                    <button
                      type="button"
                      className="calc-voce-testa"
                      aria-expanded={aperta}
                      title={aperta ? 'Mostra il risultato' : 'Mostra l’operazione'}
                      onClick={() => dispatch({ type: 'toggleExp', id: `calc-${v.id}` })}
                    >
                      <span className="calc-voce-nome">
                        {v.nome.trim() ? (
                          v.nome.trim()
                        ) : (
                          <span className="calc-senza-nome">operazione {i + 1}</span>
                        )}
                      </span>
                      <span className="calc-voce-valore">
                        {aperta && v.espressione.trim() && (
                          <span className="calc-espressione">{v.espressione} =</span>
                        )}
                        {v.errore ? (
                          <span className="calc-voce-errore">
                            <WarningCircle size={13} /> {v.errore}
                          </span>
                        ) : !v.espressione.trim() ? (
                          <span className="calc-da-compilare">da compilare</span>
                        ) : (
                          <>
                            <strong>{formatta(v.valore)}</strong>
                            {v.umEffettiva && (
                              <span className={`um${v.um.trim() ? '' : ' is-auto'}`}>{v.umEffettiva}</span>
                            )}
                          </>
                        )}
                      </span>
                      {v.nota.trim() && <span className="calc-voce-nota">{v.nota.trim()}</span>}
                    </button>

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
                        title="Elimina operazione"
                        onClick={() => setVoci(calc.voci.filter((x) => x.id !== v.id))}
                      >
                        <Trash size={13} />
                      </button>
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
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {voci.length > 0 && (
            <p className="note" style={{ marginTop: 10 }}>
              Ogni operazione vede solo quelle che la precedono: correggere un valore a monte aggiorna da
              solo tutto quello che ne discende. Riga estesa: <code>{testoVoce(voci[0])}</code>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
