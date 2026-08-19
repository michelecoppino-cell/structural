import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowUp,
  ArrowDown,
  BookOpenText,
  CaretDown,
  CaretRight,
  Check,
  FolderOpen,
  FolderSimple,
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
import {
  SENZA_CATEGORIA,
  categorie,
  livelloCapitolo,
  nomeCategoria,
  urlSicuro,
  type CapitoloIndice,
  type LinkUtente,
} from '../data/normative';

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
  mostraCategoria,
  onChange,
  onRemove,
  onSposta,
}: {
  voce: LinkUtente;
  modifica: boolean;
  ricerca: boolean;
  /** Primo e ultimo della sua categoria, non dell'elenco filtrato dalla ricerca. */
  primo: boolean;
  ultimo: boolean;
  /** Scrive da che scaffale viene: serve nella ricerca, che pesca ovunque. */
  mostraCategoria: boolean;
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
                {mostraCategoria && (
                  <span className="norma-categoria-segno">
                    <FolderSimple size={11} /> {nomeCategoria(voce)}
                  </span>
                )}
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
                {mostraCategoria && (
                  <span className="norma-categoria-segno">
                    <FolderSimple size={11} /> {nomeCategoria(voce)}
                  </span>
                )}
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
            {/* la categoria è un campo come gli altri: si scrive il nome di uno
                scaffale che c'è già (l'elenco lo propone) o uno nuovo, che
                nasce nel momento in cui il primo documento ci finisce dentro */}
            <input
              className="input norma-campo-categoria"
              value={voce.categoria}
              list="norma-elenco-categorie"
              placeholder="Categoria — Eurocodici, Capitolati…"
              aria-label="Categoria del documento"
              onChange={(e) => onChange({ categoria: e.target.value })}
            />
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

/* ─────────────────────────── uno scaffale della libreria ─────────────────────────── */

/**
 * La copertina di una categoria: quello che si vede aprendo la libreria.
 * Dice come si chiama lo scaffale, quanti documenti ci stanno e le sigle dei
 * primi — perché «Eurocodici (4)» da solo non basta a ricordarsi che dentro
 * c'è proprio quello che si sta cercando.
 */
function CopertinaCategoria({
  nome,
  orfana,
  voci,
  onApri,
}: {
  nome: string;
  orfana: boolean;
  voci: LinkUtente[];
  onApri: () => void;
}) {
  const sigle = voci.map((v) => v.sigla || v.titolo || v.url).filter(Boolean);
  const mostrate = sigle.slice(0, 4);
  return (
    <button type="button" className={`norma-cat${orfana ? ' is-orfana' : ''}`} onClick={onApri}>
      <span className="norma-cat-testa">
        <FolderSimple size={18} weight="fill" />
        <span className="norma-cat-nome">{nome}</span>
        <span className="norma-cat-conta">
          {voci.length} {voci.length === 1 ? 'documento' : 'documenti'}
        </span>
      </span>
      <span className="norma-cat-sigle">
        {mostrate.join(' · ')}
        {sigle.length > mostrate.length ? ` · +${sigle.length - mostrate.length}` : ''}
      </span>
    </button>
  );
}

/* ─────────────────────────── scheda ─────────────────────────── */

/**
 * La libreria delle norme, a due livelli: aprendola si vedono le **categorie**
 * — gli scaffali, con quanti documenti hanno dentro — e si entra in quella che
 * serve. Con venti documenti in fila non si trovava più niente; con gli
 * scaffali si va dritti dove si sa che sta la norma.
 *
 * Le due scorciatoie che saltano il livello:
 *  - la **ricerca** pesca in tutta la libreria, categorie comprese: quando si
 *    cerca «taglio» non importa su che scaffale sta;
 *  - una libreria con una **sola** categoria non ha niente da smistare, e si
 *    apre già sui documenti.
 */
export default function Normativa({ sincronia }: { sincronia: ReturnType<typeof useSincronia> }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [modifica, setModifica] = useState(false);
  const [apertaCat, setApertaCat] = useState<string | null>(null);
  const [nuovaCat, setNuovaCat] = useState('');
  const ricerca = q.trim().length > 0;

  const gruppi = useMemo(() => categorie(state.normative), [state.normative]);

  /**
   * La categoria aperta: quella scelta, se esiste ancora — l'ultimo documento
   * può essere stato spostato altrove o cancellato, e restare dentro uno
   * scaffale vuoto non ha senso — oppure l'unica che c'è.
   */
  const cat = (apertaCat && gruppi.find((g) => g.nome === apertaCat)?.nome) || (gruppi.length === 1 ? gruppi[0].nome : null);
  const dentro = ricerca || !!cat;

  const documenti = useMemo(() => {
    if (ricerca) return filtraDocumenti(state.normative, q);
    const gruppo = gruppi.find((g) => g.nome === cat);
    return gruppo ? gruppo.voci : [];
  }, [state.normative, gruppi, cat, q, ricerca]);

  /** I documenti che stanno sullo stesso scaffale di questo: l'ordine è lì. */
  const vicini = (v: LinkUtente) => gruppi.find((g) => g.nome === nomeCategoria(v))?.voci ?? [];

  const setVoci = (v: LinkUtente[]) => dispatch({ type: 'normative', voci: v });
  const aggiornaDoc = (id: string, patch: Partial<LinkUtente>) =>
    setVoci(state.normative.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const rimuoviDoc = (id: string) => setVoci(state.normative.filter((v) => v.id !== id));
  /**
   * Sposta un documento di un posto **dentro la sua categoria**: l'ordine si
   * legge scaffale per scaffale, e scavalcare un documento di un altro
   * scaffale non vorrebbe dire niente. Lo scambio avviene comunque
   * sull'elenco vero — è quello l'ordine che si salva.
   */
  const spostaDoc = (id: string, verso: -1 | 1) => {
    const voce = state.normative.find((v) => v.id === id);
    if (!voce) return;
    const gruppo = vicini(voce);
    const posto = gruppo.findIndex((v) => v.id === id) + verso;
    const vicino = gruppo[posto];
    if (!vicino) return;
    const da = state.normative.findIndex((v) => v.id === id);
    const a = state.normative.findIndex((v) => v.id === vicino.id);
    const nuove = [...state.normative];
    [nuove[da], nuove[a]] = [nuove[a], nuove[da]];
    setVoci(nuove);
  };
  /** Un documento nuovo nasce sullo scaffale che si sta guardando. */
  const aggiungiDoc = (categoria = cat && cat !== SENZA_CATEGORIA ? cat : '') =>
    setVoci([
      ...state.normative,
      { id: `norma-${Date.now()}`, sigla: '', titolo: '', url: '', categoria, capitoli: [] },
    ]);
  /** Una categoria nuova nasce con dentro il primo documento da compilare. */
  const aggiungiCategoria = () => {
    const nome = nuovaCat.trim();
    if (!nome) return;
    aggiungiDoc(nome);
    setNuovaCat('');
    setApertaCat(nome);
  };
  /** Rinominare uno scaffale è riscrivere l'etichetta su tutto quello che c'è dentro. */
  const rinominaCategoria = (vecchio: string, nuovo: string) => {
    setVoci(state.normative.map((v) => (nomeCategoria(v) === vecchio ? { ...v, categoria: nuovo } : v)));
    setApertaCat(nuovo.trim() ? nuovo : SENZA_CATEGORIA);
  };

  const gruppoAperto = gruppi.find((g) => g.nome === cat);
  const soloUna = gruppi.length === 1;

  return (
    <div className="stack">
      {/* i nomi degli scaffali che ci sono già: il campo categoria li propone */}
      <datalist id="norma-elenco-categorie">
        {gruppi.filter((g) => !g.orfana).map((g) => (
          <option key={g.nome} value={g.nome} />
        ))}
      </datalist>

      <ComandiScheda>
        {cat && !ricerca && !soloUna && (
          <button type="button" className="btn btn-secondary" onClick={() => setApertaCat(null)}>
            <ArrowLeft size={14} />
            Categorie
          </button>
        )}
        <div className="norma-ricerca">
          <MagnifyingGlass size={14} />
          <input
            className="input"
            type="search"
            value={q}
            placeholder="Cerca capitolo, argomento o simbolo (taglio, neve, VRd, C8.5…)"
            aria-label="Cerca in tutta la libreria delle norme"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {ricerca && (
          <span className="calc-conteggio">
            {documenti.length} {documenti.length === 1 ? 'documento' : 'documenti'} in tutta la libreria
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

      {/* ── primo livello: gli scaffali ── */}
      {!dentro && (
        gruppi.length === 0 ? (
          <p className="note">
            Nessuna norma in libreria: con «Edita» aggiungi i documenti che usi — NTC, Circolare, CNR, Eurocodici,
            capitolati — con il loro indirizzo e, se vuoi, l’indice dei capitoli. Ogni documento sta su una
            categoria, e le categorie sono quello che vedi aprendo la libreria.
          </p>
        ) : (
          <div className="norma-categorie">
            {gruppi.map((g) => (
              <CopertinaCategoria
                key={g.nome}
                nome={g.nome}
                orfana={g.orfana}
                voci={g.voci}
                onApri={() => setApertaCat(g.nome)}
              />
            ))}
          </div>
        )
      )}

      {/* ── secondo livello: i documenti dello scaffale aperto (o la ricerca) ── */}
      {dentro && !ricerca && gruppoAperto && (
        <div className="norma-cat-aperta">
          <FolderOpen size={16} weight="fill" />
          {modifica && !gruppoAperto.orfana ? (
            <input
              className="input norma-cat-rinomina"
              value={gruppoAperto.nome}
              aria-label="Nome della categoria"
              onChange={(e) => rinominaCategoria(gruppoAperto.nome, e.target.value)}
            />
          ) : (
            <h2>{gruppoAperto.nome}</h2>
          )}
          <span className="calc-conteggio">
            {gruppoAperto.voci.length} {gruppoAperto.voci.length === 1 ? 'documento' : 'documenti'}
          </span>
        </div>
      )}

      {dentro &&
        (documenti.length === 0 ? (
          <p className="note">Nessun documento corrisponde alla ricerca.</p>
        ) : (
          documenti.map((v) => {
            const gruppo = vicini(v);
            return (
              <DocumentoPanel
                key={v.id}
                voce={v}
                modifica={modifica}
                ricerca={ricerca}
                primo={gruppo[0]?.id === v.id}
                ultimo={gruppo[gruppo.length - 1]?.id === v.id}
                mostraCategoria={ricerca}
                onChange={(patch) => aggiornaDoc(v.id, patch)}
                onRemove={() => rimuoviDoc(v.id)}
                onSposta={(verso) => spostaDoc(v.id, verso)}
              />
            );
          })
        ))}

      {modifica && !ricerca && (
        <div className="norma-aggiunte">
          {dentro ? (
            <button type="button" className="btn btn-secondary" onClick={() => aggiungiDoc()}>
              <Plus size={14} />
              Aggiungi documento{cat && cat !== SENZA_CATEGORIA ? ` in «${cat}»` : ''}
            </button>
          ) : (
            <>
              <input
                className="input norma-campo-categoria"
                value={nuovaCat}
                placeholder="Nome della nuova categoria"
                aria-label="Nome della nuova categoria"
                onChange={(e) => setNuovaCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    aggiungiCategoria();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" disabled={!nuovaCat.trim()} onClick={aggiungiCategoria}>
                <Plus size={14} />
                Aggiungi categoria
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => aggiungiDoc('')}>
                <Plus size={14} />
                Documento senza categoria
              </button>
            </>
          )}
        </div>
      )}

      <PannelloSincronia sincronia={sincronia} />

      <p className="note">
        Ogni documento è tuo: categoria, sigla, titolo, indirizzo, indice dei capitoli e l’ordine in cui stanno — le
        frecce di «Edita» lo cambiano quando vuoi — restano dopo «Svuota tutto» e, se colleghi OneDrive, si
        ritrovano su tutti i dispositivi. Le categorie sono gli scaffali della libreria: si aprono per vedere che
        cosa c’è dentro, e ne nasce una nuova appena scrivi il suo nome nel campo «Categoria» di un documento. Chi
        non ne ha una finisce in «{SENZA_CATEGORIA}». L’indice si scrive da «Edita»: aiuta a ritrovare in fretta la
        pagina quando riapri il documento, ma non porta a nessun link — la pagina va cercata a mano una volta
        aperto. Con un indirizzo di OneDrive, «Testo completo» prova prima ad aprire l’app desktop, se è installata,
        e se non risponde apre il documento sul web.
      </p>
    </div>
  );
}
