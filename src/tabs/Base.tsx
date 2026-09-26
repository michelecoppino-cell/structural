/**
 * La Base tecnica: le schede di studio, le procedure, le lezioni apprese e
 * gli appunti, come file Markdown nella cartella `strutturale/base/` del
 * OneDrive.
 *
 * Tre viste, una alla volta: l'**elenco** (ricerca e filtri, schede per area),
 * la **scheda** aperta, e la **modifica** del suo testo. Aree, tipi e stati
 * non sono scritti qui: sono quelli che si trovano nelle schede.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowsClockwise,
  Check,
  CheckSquare,
  CloudSlash,
  Eye,
  FileText,
  FolderSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import { useStore } from '../state/store';
import { ComandiScheda } from '../components/ComandiScheda';
import PannelloSincronia from '../cloud/PannelloSincronia';
import type { useSincronia } from '../cloud/useSincronia';
import { ModificatoAltrove } from '../cloud/onedrive';
import { useBase, type Base as ArchivioBase } from '../base/archivio';
import { blocchi, testoPiano } from '../base/markdown';
import { Blocchi, type ContestoScheda } from '../base/Markdown';
import { FILE_INIZIALI, SCHEDA_VUOTA } from '../base/modelli';
import {
  cerca,
  commutaCasella,
  contaCaselle,
  daModello,
  eModello,
  faccette,
  FILTRI_VUOTI,
  impostaCampo,
  leggiScheda,
  nomeDaTitolo,
  nomeFile,
  nomeLibero,
  perArea,
  rimandiA,
  risolvi,
  STATI_STUDIO,
  type Filtri,
  type Scheda,
  type ValoreMeta,
} from '../base/schede';

type Vista =
  | { tipo: 'elenco' }
  | { tipo: 'scheda'; percorso: string }
  | { tipo: 'modifica'; percorso: string; testo: string; nuova: boolean }
  | { tipo: 'nuova' };

/** I campi dell'intestazione che hanno già il loro posto: gli altri si elencano sotto il titolo. */
const CAMPI_NOTI = new Set(['titolo', 'area', 'tipo', 'stato', 'tag', 'tags', 'norme']);

const oggi = () => new Date().toISOString().slice(0, 10);

const dataBreve = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
};

const messaggio = (e: unknown) => (e instanceof Error ? e.message : String(e));

/* ─────────────────────────── elenco ─────────────────────────── */

function Filtro({
  etichetta,
  valore,
  opzioni,
  onChange,
}: {
  etichetta: string;
  valore: string;
  opzioni: { valore: string; quante: number }[];
  onChange: (v: string) => void;
}) {
  if (!opzioni.length) return null;
  return (
    <label className="base-filtro">
      <span>{etichetta}</span>
      <select className="input" value={valore} onChange={(e) => onChange(e.target.value)}>
        <option value="">tutte</option>
        {opzioni.map((o) => (
          <option key={o.valore} value={o.valore}>
            {o.valore} ({o.quante})
          </option>
        ))}
      </select>
    </label>
  );
}

function Stato({ stato }: { stato: string }) {
  if (!stato) return null;
  return (
    <span className="base-stato" data-stato={stato}>
      {stato}
    </span>
  );
}

function Elenco({
  base,
  filtri,
  setFiltri,
  apri,
}: {
  base: ArchivioBase;
  filtri: Filtri;
  setFiltri: (f: Filtri) => void;
  apri: (percorso: string) => void;
}) {
  const trovate = useMemo(() => cerca(base.schede, filtri), [base.schede, filtri]);
  const gruppi = useMemo(() => perArea(trovate), [trovate]);
  const stati = useMemo(() => faccette(base.schede, 'stato'), [base.schede]);
  const filtrato = filtri !== FILTRI_VUOTI && Object.values(filtri).some(Boolean);

  return (
    <>
      <div className="base-filtri">
        <div className="base-stati" role="group" aria-label="Stato di studio">
          {stati.map((s) => (
            <button
              key={s.valore}
              type="button"
              className="chip-toggle"
              aria-pressed={filtri.stato === s.valore}
              onClick={() => setFiltri({ ...filtri, stato: filtri.stato === s.valore ? '' : s.valore })}
            >
              {s.valore}
              <span className="val">{s.quante}</span>
            </button>
          ))}
        </div>
        <Filtro
          etichetta="Area"
          valore={filtri.area}
          opzioni={faccette(base.schede, 'area')}
          onChange={(area) => setFiltri({ ...filtri, area })}
        />
        <Filtro
          etichetta="Tipo"
          valore={filtri.tipo}
          opzioni={faccette(base.schede, 'tipo')}
          onChange={(tipo) => setFiltri({ ...filtri, tipo })}
        />
        <Filtro
          etichetta="Tag"
          valore={filtri.tag}
          opzioni={faccette(base.schede, 'tag')}
          onChange={(tag) => setFiltri({ ...filtri, tag })}
        />
        {filtrato && (
          <button type="button" className="btn btn-secondary" onClick={() => setFiltri(FILTRI_VUOTI)}>
            <X size={13} />
            Togli i filtri
          </button>
        )}
      </div>

      {trovate.length === 0 && filtrato && <p className="note">Nessuna scheda corrisponde.</p>}

      {gruppi.map((g) => (
        <section key={g.area} className="base-gruppo">
          <h2 className="base-gruppo-testa">
            <FolderSimple size={14} />
            {g.area}
            <span className="calc-conteggio">{g.voci.length}</span>
          </h2>
          <div className="base-carte">
            {g.voci.map(({ scheda: s, estratto }) => {
              const caselle = contaCaselle(s.corpo);
              return (
                <button key={s.percorso} type="button" className="base-carta" onClick={() => apri(s.percorso)}>
                  <span className="base-carta-testa">
                    <FileText size={14} />
                    <span className="titolo">{s.titolo}</span>
                  </span>
                  <span className="base-carta-meta">
                    {s.tipo && <span>{s.tipo}</span>}
                    <Stato stato={s.stato} />
                    {caselle.totali > 0 && (
                      <span className="caselle">
                        <CheckSquare size={11} /> {caselle.fatte}/{caselle.totali}
                      </span>
                    )}
                  </span>
                  {estratto && <span className="base-carta-estratto">{estratto}</span>}
                  {s.tag.length > 0 && <span className="base-carta-tag">{s.tag.map((t) => `#${t}`).join(' ')}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

/* ─────────────────────────── scheda aperta ─────────────────────────── */

function Meta({ chiave, valore }: { chiave: string; valore: ValoreMeta }) {
  const testo = Array.isArray(valore) ? valore.join(', ') : valore;
  if (!testo) return null;
  return (
    <span className="base-meta-voce">
      <span className="k">{chiave}</span>
      {testo}
    </span>
  );
}

function SchedaAperta({
  scheda,
  base,
  ctx,
  scrivibile,
  onModifica,
  onErrore,
}: {
  scheda: Scheda;
  base: ArchivioBase;
  ctx: ContestoScheda;
  /** false = OneDrive non collegato: si legge la copia, e da una copia non si scrive. */
  scrivibile: boolean;
  onModifica: () => void;
  onErrore: (m: string) => void;
}) {
  // il primo `# titolo` del testo ripete quello in testa alla scheda: si legge una volta
  const albero = useMemo(() => {
    const bb = blocchi(scheda.corpo);
    const primo = bb[0];
    return primo?.t === 'titolo' && primo.livello === 1 && testoPiano(primo.c).trim() === scheda.titolo.trim()
      ? bb.slice(1)
      : bb;
  }, [scheda.corpo, scheda.titolo]);
  const rimandi = useMemo(() => rimandiA(scheda, base.schede), [scheda, base.schede]);
  const [salvando, setSalvando] = useState(false);

  /** Ogni gesto sulla scheda letta — stato, ripasso, casella — è una scrittura sul file. */
  const scrivi = async (testo: string) => {
    setSalvando(true);
    try {
      await base.salva(scheda.percorso, testo);
    } catch (e) {
      onErrore(messaggio(e));
    } finally {
      setSalvando(false);
    }
  };

  const altri = Object.entries(scheda.meta).filter(([k]) => !CAMPI_NOTI.has(k));
  const stati = [...new Set([...STATI_STUDIO, ...(scheda.stato ? [scheda.stato] : [])])];

  return (
    <article className="panel base-scheda">
      <div className="panel-body">
        <header className="base-scheda-testa">
          <h1>{scheda.titolo}</h1>
          <div className="base-scheda-meta">
            {scheda.area && (
              <span className="base-meta-voce">
                <FolderSimple size={12} />
                {scheda.area}
              </span>
            )}
            {scheda.tipo && <Meta chiave="tipo" valore={scheda.tipo} />}
            {scheda.tag.length > 0 && <span className="base-carta-tag">{scheda.tag.map((t) => `#${t}`).join(' ')}</span>}
            {altri.map(([k, v]) => (
              <Meta key={k} chiave={k} valore={v} />
            ))}
            {scheda.modificata && <span className="calc-conteggio">modificata il {dataBreve(scheda.modificata)}</span>}
          </div>
          {scheda.norme.length > 0 && (
            <div className="base-scheda-norme">
              {scheda.norme.map((n) => (
                <Blocchi key={n} blocchi={[{ t: 'paragrafo', c: [{ t: 'wiki', bersaglio: n, etichetta: n }] }]} ctx={ctx} />
              ))}
            </div>
          )}
          {scrivibile && (
            <div className="base-scheda-comandi">
              <div className="base-stati" role="group" aria-label="Stato di studio">
                {stati.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip-toggle"
                    disabled={salvando}
                    aria-pressed={scheda.stato === s}
                    onClick={() => void scrivi(impostaCampo(scheda.testo, 'stato', s))}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={salvando}
                title="Scrive la data di oggi nel campo «ripasso»"
                onClick={() => void scrivi(impostaCampo(scheda.testo, 'ripasso', oggi()))}
              >
                <Sparkle size={14} />
                Ripassata oggi
              </button>
              <button type="button" className="btn btn-secondary" onClick={onModifica}>
                <PencilSimple size={14} />
                Modifica
              </button>
            </div>
          )}
        </header>

        <div className="base-testo">
          <Blocchi
            blocchi={albero}
            ctx={{
              ...ctx,
              onCasella: salvando || !scrivibile ? undefined : (n) => void scrivi(commutaCasella(scheda.testo, n)),
            }}
          />
        </div>

        {rimandi.length > 0 && (
          <footer className="base-rimandi">
            <span className="kicker">Ne parlano</span>
            {rimandi.map((s) => (
              <button key={s.percorso} type="button" className="base-wiki" onClick={() => ctx.apriScheda(s.percorso)}>
                {s.titolo}
              </button>
            ))}
          </footer>
        )}
        <p className="note base-percorso">strutturale/base/{scheda.percorso}</p>
      </div>
    </article>
  );
}

/* ─────────────────────────── modifica ─────────────────────────── */

function Modifica({
  vista,
  ctx,
  onTesto,
  onSalva,
  onAnnulla,
  salvando,
}: {
  vista: Extract<Vista, { tipo: 'modifica' }>;
  ctx: ContestoScheda;
  onTesto: (t: string) => void;
  onSalva: () => void;
  onAnnulla: () => void;
  salvando: boolean;
}) {
  const [anteprima, setAnteprima] = useState(false);
  const scheda = useMemo(() => leggiScheda(vista.percorso, vista.testo), [vista.percorso, vista.testo]);
  const albero = useMemo(() => blocchi(scheda.corpo), [scheda.corpo]);

  return (
    <div className="base-modifica">
      <div className="base-modifica-comandi">
        <span className="calc-conteggio">
          {vista.nuova ? 'Nuova scheda' : 'Modifica'} — strutturale/base/{vista.percorso}
        </span>
        <button
          type="button"
          className="btn btn-secondary base-solo-stretto"
          aria-pressed={anteprima}
          onClick={() => setAnteprima((v) => !v)}
        >
          {anteprima ? <PencilSimple size={14} /> : <Eye size={14} />}
          {anteprima ? 'Testo' : 'Anteprima'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onAnnulla} disabled={salvando}>
          <X size={14} />
          Annulla
        </button>
        <button type="button" className="btn btn-primary" onClick={onSalva} disabled={salvando}>
          <Check size={14} />
          {salvando ? 'Salvo…' : 'Salva'}
        </button>
      </div>
      <div className={`base-modifica-corpo${anteprima ? ' is-anteprima' : ''}`}>
        <textarea
          className="input base-editor"
          value={vista.testo}
          spellCheck
          aria-label="Testo della scheda in Markdown"
          onChange={(e) => onTesto(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              onSalva();
            }
          }}
        />
        <div className="panel base-anteprima">
          <div className="panel-body base-testo">
            <h1 className="base-anteprima-titolo">{scheda.titolo}</h1>
            <Blocchi blocchi={albero} ctx={{ ...ctx, onCasella: undefined, titolo: scheda.titolo }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function NuovaScheda({
  base,
  onCrea,
  onAnnulla,
}: {
  base: ArchivioBase;
  onCrea: (percorso: string, testo: string) => void;
  onAnnulla: () => void;
}) {
  const modelli = base.schede.filter(eModello);
  const [titolo, setTitolo] = useState('');
  const [modello, setModello] = useState(modelli[0]?.percorso ?? '');
  const [area, setArea] = useState('');
  const aree = faccette(base.schede, 'area').filter((a) => a.valore !== 'Senza area');

  const crea = () => {
    const t = titolo.trim();
    if (!t) return;
    const stampo = modelli.find((m) => m.percorso === modello)?.testo ?? SCHEDA_VUOTA;
    let testo = daModello(stampo, t);
    if (area.trim()) testo = impostaCampo(testo, 'area', area.trim());
    onCrea(nomeLibero(nomeDaTitolo(t), base.schede.map((s) => s.percorso)), testo);
  };

  return (
    <section className="panel">
      <div className="panel-body base-nuova">
        <h2>Nuova scheda</h2>
        <label>
          <span>Titolo</span>
          <input
            className="input"
            autoFocus
            value={titolo}
            placeholder="Portanza dei pali trivellati"
            onChange={(e) => setTitolo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && crea()}
          />
        </label>
        <label>
          <span>Modello</span>
          <select className="input" value={modello} onChange={(e) => setModello(e.target.value)}>
            {modelli.map((m) => (
              <option key={m.percorso} value={m.percorso}>
                {nomeFile(m.percorso)}
              </option>
            ))}
            <option value="">scheda vuota</option>
          </select>
        </label>
        <label>
          <span>Area</span>
          <input
            className="input"
            list="base-aree"
            value={area}
            placeholder="strutture, geotecnica, coordinamento…"
            onChange={(e) => setArea(e.target.value)}
          />
          <datalist id="base-aree">
            {aree.map((a) => (
              <option key={a.valore} value={a.valore} />
            ))}
          </datalist>
        </label>
        <div className="base-nuova-comandi">
          <button type="button" className="btn btn-secondary" onClick={onAnnulla}>
            Annulla
          </button>
          <button type="button" className="btn btn-primary" disabled={!titolo.trim()} onClick={crea}>
            <Plus size={14} />
            Scrivi la scheda
          </button>
        </div>
        <p className="note">
          I modelli sono i file della cartella <code>strutturale/base/_modelli/</code>: per un tipo di scheda nuovo basta
          aggiungerne uno lì, anche da un altro editor.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────── scheda ─────────────────────────── */

export default function Base({ sincronia }: { sincronia: ReturnType<typeof useSincronia> }) {
  const { state } = useStore();
  const collegato = sincronia.stato !== 'scollegata' && sincronia.stato !== 'spenta';
  const base = useBase(collegato);
  const [vista, setVista] = useState<Vista>({ tipo: 'elenco' });
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_VUOTI);
  const [avviso, setAvviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [modificata, setModificata] = useState(false);

  // una modifica in corso non si perde chiudendo la pagina per sbaglio
  useEffect(() => {
    if (!modificata) return;
    const ferma = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', ferma);
    return () => window.removeEventListener('beforeunload', ferma);
  }, [modificata]);

  const apriScheda = (percorso: string) => {
    setAvviso('');
    setVista({ tipo: 'scheda', percorso });
    document.querySelector('.app-main')?.scrollTo({ top: 0 });
  };

  const aperta = vista.tipo === 'scheda' ? base.schede.find((s) => s.percorso === vista.percorso) : undefined;

  const ctx: ContestoScheda = {
    risolvi: (b) => risolvi(b, base.schede, state.normative),
    apriScheda,
    titolo: aperta?.titolo ?? '',
  };

  const esci = () => {
    if (modificata && !window.confirm('Lasciare la modifica? Il testo non salvato si perde.')) return;
    setModificata(false);
    setVista(vista.tipo === 'modifica' && !vista.nuova ? { tipo: 'scheda', percorso: vista.percorso } : { tipo: 'elenco' });
  };

  const salvaModifica = async () => {
    if (vista.tipo !== 'modifica') return;
    setSalvando(true);
    setAvviso('');
    try {
      await base.salva(vista.percorso, vista.testo);
      setModificata(false);
      setVista({ tipo: 'scheda', percorso: vista.percorso });
    } catch (e) {
      setAvviso(
        e instanceof ModificatoAltrove
          ? `${messaggio(e)} Il tuo testo è ancora qui: copialo, annulla, e riapri la scheda aggiornata.`
          : messaggio(e),
      );
    } finally {
      setSalvando(false);
    }
  };

  /** La prima volta: i modelli e la scheda che spiega come funziona. */
  const prepara = async () => {
    setPreparando(true);
    setAvviso('');
    try {
      for (const f of FILE_INIZIALI) {
        if (base.schede.some((s) => s.percorso === f.percorso)) continue;
        await base.salva(f.percorso, f.testo).catch((e) => {
          if (!(e instanceof ModificatoAltrove)) throw e;
        });
      }
    } catch (e) {
      setAvviso(messaggio(e));
    } finally {
      setPreparando(false);
    }
  };

  const conModelli = base.schede.some(eModello);
  const vere = base.schede.filter((s) => !eModello(s));

  return (
    <div className="stack base">
      <ComandiScheda>
        {vista.tipo !== 'elenco' && (
          <button type="button" className="btn btn-secondary" onClick={esci}>
            <ArrowLeft size={14} />
            {vista.tipo === 'modifica' && !vista.nuova ? 'Scheda' : 'Base'}
          </button>
        )}
        {vista.tipo === 'elenco' && (
          <div className="norma-ricerca">
            <MagnifyingGlass size={14} />
            <input
              className="input"
              type="search"
              value={filtri.testo}
              placeholder="Cerca in tutte le schede (pali, giunti, RFI, γM0…)"
              aria-label="Cerca nella Base"
              onChange={(e) => setFiltri({ ...filtri, testo: e.target.value })}
            />
          </div>
        )}
        {vista.tipo === 'elenco' && (
          <span className="calc-conteggio">
            {vere.length} {vere.length === 1 ? 'scheda' : 'schede'}
          </span>
        )}
        {(vista.tipo === 'elenco' || vista.tipo === 'scheda') && collegato && (
          <>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              title="Rileggi la cartella su OneDrive"
              aria-label="Aggiorna la Base"
              disabled={base.stato === 'in-corso'}
              onClick={() => void base.aggiorna()}
            >
              <ArrowsClockwise size={14} />
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setVista({ tipo: 'nuova' })}>
              <Plus size={14} />
              Nuova scheda
            </button>
          </>
        )}
      </ComandiScheda>

      {avviso && (
        <p className="base-avviso" role="alert">
          {avviso}
        </p>
      )}
      {base.stato === 'errore' && <p className="base-avviso">OneDrive non ha risposto: {base.errore}. Leggi la copia di questo dispositivo.</p>}
      {base.stato === 'scaduta' && (
        <p className="base-avviso">L’accesso Microsoft è scaduto: ricollegati dal pannello OneDrive qui sotto.</p>
      )}
      {base.stato === 'in-corso' && vere.length === 0 && <p className="note">Leggo la cartella su OneDrive…</p>}

      {vista.tipo === 'elenco' && (
        <>
          {!collegato && (
            <section className="panel">
              <div className="panel-body sincronia">
                <span className="norma-sigla">
                  <CloudSlash size={15} />
                  La Base vive su OneDrive
                </span>
                <p className="note">
                  Le schede sono file Markdown nella cartella <code>strutturale/base/</code> del tuo OneDrive: collegalo qui
                  sotto per leggerle e scriverle.
                  {vere.length > 0 && ' Intanto leggi la copia rimasta su questo dispositivo.'}
                </p>
              </div>
            </section>
          )}
          {collegato && base.stato === 'pronta' && !conModelli && (
            <section className="panel">
              <div className="panel-body sincronia">
                <span className="norma-sigla">
                  <Sparkle size={15} />
                  Prepara la Base
                </span>
                <p className="note">
                  Scrive in <code>strutturale/base/</code> i modelli di partenza — sintesi, riassunto, procedura, lezione
                  appresa, disciplina — e una scheda che spiega come funziona. Poi sono file tuoi: si cambiano, se ne
                  aggiungono, si buttano.
                </p>
                <div>
                  <button type="button" className="btn btn-primary" disabled={preparando} onClick={() => void prepara()}>
                    <Sparkle size={14} />
                    {preparando ? 'Scrivo…' : 'Prepara la Base'}
                  </button>
                </div>
              </div>
            </section>
          )}
          <Elenco base={base} filtri={filtri} setFiltri={setFiltri} apri={apriScheda} />
          {(!collegato || base.stato === 'scaduta') && <PannelloSincronia sincronia={sincronia} />}
        </>
      )}

      {vista.tipo === 'scheda' &&
        (aperta ? (
          <SchedaAperta
            scheda={aperta}
            base={base}
            ctx={ctx}
            scrivibile={collegato && base.stato !== 'scaduta'}
            onErrore={setAvviso}
            onModifica={() => setVista({ tipo: 'modifica', percorso: aperta.percorso, testo: aperta.testo, nuova: false })}
          />
        ) : (
          <p className="note">Questa scheda non c’è più nella cartella: forse è stata spostata o rinominata.</p>
        ))}

      {vista.tipo === 'nuova' && (
        <NuovaScheda
          base={base}
          onAnnulla={() => setVista({ tipo: 'elenco' })}
          onCrea={(percorso, testo) => {
            setModificata(true);
            setVista({ tipo: 'modifica', percorso, testo, nuova: true });
          }}
        />
      )}

      {vista.tipo === 'modifica' && (
        <Modifica
          vista={vista}
          ctx={ctx}
          salvando={salvando}
          onTesto={(testo) => {
            setModificata(true);
            setVista({ ...vista, testo });
          }}
          onSalva={() => void salvaModifica()}
          onAnnulla={esci}
        />
      )}
    </div>
  );
}
