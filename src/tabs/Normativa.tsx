import { useMemo, useState } from 'react';
import {
  ArrowSquareOut,
  ArrowUp,
  ArrowDown,
  BookOpenText,
  CaretDown,
  CaretRight,
  Check,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { useStore } from '../state/store';
import { apriLink } from '../cloud/apriLink';
import PannelloSincronia from '../cloud/PannelloSincronia';
import type { useSincronia } from '../cloud/useSincronia';
import { ComandiScheda } from '../components/ComandiScheda';
import { livelloCapitolo, urlSicuro, type CapitoloIndice, type LinkUtente } from '../data/normative';

const normalizza = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const corrisponde = (testo: string, chiavi: string[]) => {
  const t = normalizza(testo);
  return chiavi.every((k) => t.includes(k));
};

/**
 * Filtro della ricerca: un documento resta se corrisponde lui (e allora tiene
 * tutto il suo indice) oppure se corrisponde qualche capitolo.
 */
function filtraDocumenti(voci: LinkUtente[], q: string): LinkUtente[] {
  const chiavi = normalizza(q).split(/\s+/).filter(Boolean);
  if (!chiavi.length) return voci;
  return voci.flatMap((v) => {
    if (corrisponde(`${v.sigla} ${v.titolo}`, chiavi)) return [v];
    const capitoli = v.capitoli.filter((c) => corrisponde(`${c.numero} ${c.titolo}`, chiavi));
    return capitoli.length ? [{ ...v, capitoli }] : [];
  });
}

const urlValida = (url: string) => {
  const u = urlSicuro(url) ?? '';
  return !!u && /^https?:\/\/[^\s]+\.[^\s]+/i.test(u);
};

/* ─────────────────────────── un capitolo dell'indice ─────────────────────────── */

function RigaCapitolo({ cap }: { cap: CapitoloIndice }) {
  const rientro = { '--liv': livelloCapitolo(cap.numero) } as React.CSSProperties;
  return (
    <li className="norma-voce" style={rientro}>
      <span className="codice">{cap.numero}</span>
      <span className="titolo">{cap.titolo}</span>
      {cap.pagina && <span className="pagina">p. {cap.pagina}</span>}
    </li>
  );
}

function RigaCapitoloModifica({
  cap,
  onChange,
  onRemove,
}: {
  cap: CapitoloIndice;
  onChange: (patch: Partial<CapitoloIndice>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="norma-cap">
      <div className="norma-cap-modifica">
        <input
          className="input"
          value={cap.numero}
          placeholder="2.1"
          aria-label="Numero del capitolo"
          onChange={(e) => onChange({ numero: e.target.value })}
        />
        <input
          className="input"
          value={cap.titolo}
          placeholder="Titolo del capitolo"
          aria-label="Titolo del capitolo"
          onChange={(e) => onChange({ titolo: e.target.value })}
        />
        <input
          className="input"
          value={cap.pagina}
          placeholder="p."
          aria-label="Pagina del capitolo"
          onChange={(e) => onChange({ pagina: e.target.value })}
        />
        <button type="button" className="btn btn-secondary btn-icon" title="Togli il capitolo" onClick={onRemove}>
          <Trash size={13} />
        </button>
      </div>
    </li>
  );
}

/* ─────────────────────────── un documento della libreria ─────────────────────────── */

function DocumentoPanel({
  voce,
  modifica,
  ricerca,
  primo,
  ultimo,
  onChange,
  onRemove,
  onSposta,
}: {
  voce: LinkUtente;
  modifica: boolean;
  ricerca: boolean;
  /** Primo e ultimo dell'elenco vero, non di quello filtrato dalla ricerca. */
  primo: boolean;
  ultimo: boolean;
  onChange: (patch: Partial<LinkUtente>) => void;
  onRemove: () => void;
  /** Un posto più su (−1) o più giù (+1) nell'ordine della libreria. */
  onSposta: (verso: -1 | 1) => void;
}) {
  const { state, dispatch } = useStore();
  const [nuovoCap, setNuovoCap] = useState({ numero: '', titolo: '', pagina: '' });
  const id = `norma:${voce.id}`;
  // in modifica l'indice sta sempre aperto — è lì che si scrive
  const aperto = modifica || ricerca || !!state.ui.open[id];
  const url = urlSicuro(voce.url) ?? '';
  const valida = urlValida(voce.url);

  const setCapitoli = (capitoli: CapitoloIndice[]) => onChange({ capitoli });
  const aggiornaCap = (capId: string, patch: Partial<CapitoloIndice>) =>
    setCapitoli(voce.capitoli.map((c) => (c.id === capId ? { ...c, ...patch } : c)));
  const rimuoviCap = (capId: string) => setCapitoli(voce.capitoli.filter((c) => c.id !== capId));
  const aggiungiCap = () => {
    if (!nuovoCap.numero.trim() && !nuovoCap.titolo.trim()) return;
    setCapitoli([...voce.capitoli, { id: `cap-${Date.now()}`, ...nuovoCap }]);
    setNuovoCap({ numero: '', titolo: '', pagina: '' });
  };

  return (
    <section className="panel">
      <div className="panel-body" style={{ paddingTop: 12 }}>
        <div className="norma-testa">
          {!modifica && voce.capitoli.length > 0 ? (
            <button
              type="button"
              className="norma-doc-testa"
              aria-expanded={aperto}
              aria-controls={`${id}-corpo`}
              onClick={() => dispatch({ type: 'toggleOpen', id })}
            >
              <span className="caret">{aperto ? <CaretDown size={14} /> : <CaretRight size={14} />}</span>
              <span>
                <span className="norma-sigla">
                  <BookOpenText size={15} />
                  {voce.sigla || 'Senza sigla'}
                </span>
                <span className="norma-titolo" title={voce.titolo}>
                  {voce.titolo || voce.url}
                </span>
              </span>
            </button>
          ) : (
            <span className="norma-doc-testa" style={{ cursor: 'default' }}>
              <span className="caret" />
              <span>
                <span className="norma-sigla">
                  <BookOpenText size={15} />
                  {voce.sigla || 'Senza sigla'}
                </span>
                <span className="norma-titolo" title={voce.titolo}>
                  {voce.titolo || voce.url}
                </span>
              </span>
            </span>
          )}
          <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!valida}
              title={valida ? url : 'Nessun indirizzo valido'}
              onClick={() => apriLink(url)}
            >
              <ArrowSquareOut size={14} />
              Testo completo
            </button>
            {modifica && (
              <>
                {/* l'ordine della libreria si cambia anche dopo: i documenti che
                    si aprono tutti i giorni stanno in cima */}
                <button
                  type="button"
                  className="btn btn-secondary btn-icon"
                  disabled={primo || ricerca}
                  title={ricerca ? 'Svuota la ricerca per cambiare l’ordine' : 'Spostalo più in alto'}
                  onClick={() => onSposta(-1)}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-icon"
                  disabled={ultimo || ricerca}
                  title={ricerca ? 'Svuota la ricerca per cambiare l’ordine' : 'Spostalo più in basso'}
                  onClick={() => onSposta(1)}
                >
                  <ArrowDown size={14} />
                </button>
                <button type="button" className="btn btn-secondary btn-icon" title="Togli il documento" onClick={onRemove}>
                  <Trash size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {modifica && (
          <div className="norma-doc-modifica">
            <input
              className="input"
              value={voce.sigla}
              placeholder="NTC 2018"
              aria-label="Sigla o tipo del documento"
              onChange={(e) => onChange({ sigla: e.target.value })}
            />
            <input
              className="input norma-campo-titolo"
              value={voce.titolo}
              placeholder="Norme Tecniche per le Costruzioni"
              aria-label="Titolo del documento"
              onChange={(e) => onChange({ titolo: e.target.value })}
            />
            <input
              className={`input norma-campo-url${voce.url.trim() && !valida ? ' is-error' : ''}`}
              value={voce.url}
              placeholder="Indirizzo — di preferenza il link OneDrive del PDF"
              aria-label="Indirizzo del documento"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => onChange({ url: e.target.value })}
            />
          </div>
        )}
        {modifica && voce.url.trim() && !valida && (
          <div className="field-error">L’indirizzo non sembra valido: serve un link tipo «https://…».</div>
        )}

        {aperto && (voce.capitoli.length > 0 || modifica) && (
          <ul className="norma-capitoli" id={`${id}-corpo`}>
            {voce.capitoli.map((c) =>
              modifica ? (
                <RigaCapitoloModifica key={c.id} cap={c} onChange={(patch) => aggiornaCap(c.id, patch)} onRemove={() => rimuoviCap(c.id)} />
              ) : (
                <RigaCapitolo key={c.id} cap={c} />
              ),
            )}
            {modifica && (
              <li className="norma-cap">
                <div className="norma-cap-modifica is-nuova">
                  <input
                    className="input"
                    value={nuovoCap.numero}
                    placeholder="2.1"
                    aria-label="Numero del nuovo capitolo"
                    onChange={(e) => setNuovoCap({ ...nuovoCap, numero: e.target.value })}
                  />
                  <input
                    className="input"
                    value={nuovoCap.titolo}
                    placeholder="Titolo"
                    aria-label="Titolo del nuovo capitolo"
                    onChange={(e) => setNuovoCap({ ...nuovoCap, titolo: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        aggiungiCap();
                      }
                    }}
                  />
                  <input
                    className="input"
                    value={nuovoCap.pagina}
                    placeholder="p."
                    aria-label="Pagina del nuovo capitolo"
                    onChange={(e) => setNuovoCap({ ...nuovoCap, pagina: e.target.value })}
                  />
                  <button type="button" className="btn btn-primary btn-icon" title="Aggiungi il capitolo" onClick={aggiungiCap}>
                    <Plus size={13} />
                  </button>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── scheda ─────────────────────────── */

export default function Normativa({ sincronia }: { sincronia: ReturnType<typeof useSincronia> }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [modifica, setModifica] = useState(false);
  const ricerca = q.trim().length > 0;

  const documenti = useMemo(() => filtraDocumenti(state.normative, q), [state.normative, q]);

  const setVoci = (v: LinkUtente[]) => dispatch({ type: 'normative', voci: v });
  const aggiornaDoc = (id: string, patch: Partial<LinkUtente>) =>
    setVoci(state.normative.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const rimuoviDoc = (id: string) => setVoci(state.normative.filter((v) => v.id !== id));
  /**
   * Sposta un documento di un posto nell'elenco. L'ordine della libreria è una
   * scelta come le altre — e si cambia quando serve, non solo mentre si
   * scrive: quello che si apre tutti i giorni va in cima.
   */
  const spostaDoc = (id: string, verso: -1 | 1) => {
    const da = state.normative.findIndex((v) => v.id === id);
    const a = da + verso;
    if (da < 0 || a < 0 || a >= state.normative.length) return;
    const nuove = [...state.normative];
    [nuove[da], nuove[a]] = [nuove[a], nuove[da]];
    setVoci(nuove);
  };
  const aggiungiDoc = () =>
    setVoci([...state.normative, { id: `norma-${Date.now()}`, sigla: '', titolo: '', url: '', capitoli: [] }]);

  return (
    <div className="stack">
      <ComandiScheda>
        <div className="norma-ricerca">
          <MagnifyingGlass size={14} />
          <input
            className="input"
            type="search"
            value={q}
            placeholder="Cerca capitolo, argomento o simbolo (taglio, neve, VRd, C8.5…)"
            aria-label="Cerca nella libreria delle norme"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {ricerca && (
          <span className="calc-conteggio">
            {documenti.length} {documenti.length === 1 ? 'documento' : 'documenti'}
          </span>
        )}
        <button
          type="button"
          className={`btn ${modifica ? 'btn-primary' : 'btn-secondary'}`}
          aria-pressed={modifica}
          onClick={() => setModifica((v) => !v)}
        >
          {modifica ? <Check size={14} /> : <PencilSimple size={14} />}
          {modifica ? 'Fine' : 'Edita'}
        </button>
      </ComandiScheda>

      {documenti.length === 0 ? (
        <p className="note">
          {ricerca
            ? 'Nessun documento corrisponde alla ricerca.'
            : 'Nessuna norma in libreria: con «Edita» aggiungi i documenti che usi — NTC, Circolare, CNR, Eurocodici, capitolati — con il loro indirizzo e, se vuoi, l’indice dei capitoli.'}
        </p>
      ) : (
        documenti.map((v) => (
          <DocumentoPanel
            key={v.id}
            voce={v}
            modifica={modifica}
            ricerca={ricerca}
            primo={state.normative[0]?.id === v.id}
            ultimo={state.normative[state.normative.length - 1]?.id === v.id}
            onChange={(patch) => aggiornaDoc(v.id, patch)}
            onRemove={() => rimuoviDoc(v.id)}
            onSposta={(verso) => spostaDoc(v.id, verso)}
          />
        ))
      )}

      {modifica && (
        <button type="button" className="btn btn-secondary" onClick={aggiungiDoc}>
          <Plus size={14} />
          Aggiungi documento
        </button>
      )}

      <PannelloSincronia sincronia={sincronia} />

      <p className="note">
        Ogni documento è tuo: sigla, titolo, indirizzo, indice dei capitoli e l’ordine in cui stanno — le frecce
        di «Edita» lo cambiano quando vuoi — restano dopo «Svuota tutto» e, se
        colleghi OneDrive, si ritrovano su tutti i dispositivi. L’indice si scrive da «Edita»: aiuta a ritrovare in
        fretta la pagina quando riapri il documento, ma non porta a nessun link — la pagina va cercata a mano una
        volta aperto. Con un indirizzo di OneDrive, «Testo completo» prova prima ad aprire l’app desktop, se è
        installata, e se non risponde apre il documento sul web.
      </p>
    </div>
  );
}
