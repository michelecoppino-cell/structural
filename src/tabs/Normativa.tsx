import { useMemo, useState } from 'react';
import { ArrowSquareOut, BookOpenText, CaretDown, CaretRight, MagnifyingGlass, Plus, Trash } from '@phosphor-icons/react';
import { useStore } from '../state/store';
import PannelloSincronia from '../cloud/PannelloSincronia';
import { ComandiScheda } from '../components/ComandiScheda';
import {
  CAPITOLI,
  DOCUMENTI,
  linkCapitolo,
  linkVoce,
  livello,
  urlSicuro,
  type Capitolo,
  type Documento,
  type LinkUtente,
  type VoceNorma,
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
 * Filtro della ricerca: un capitolo resta se corrisponde lui (e allora tiene
 * tutti i suoi paragrafi) oppure se corrisponde qualche paragrafo.
 */
function filtra(capitoli: Capitolo[], q: string): Capitolo[] {
  const chiavi = normalizza(q).split(/\s+/).filter(Boolean);
  if (!chiavi.length) return capitoli;
  return capitoli
    .map((c) => {
      if (corrisponde(`${c.etichetta} ${c.titolo} ${c.tag ?? ''}`, chiavi)) return c;
      const voci = c.voci.filter((v) => corrisponde(`${v.codice} ${v.titolo} ${v.tag ?? ''}`, chiavi));
      return voci.length ? { ...c, voci } : null;
    })
    .filter((c): c is Capitolo => c !== null);
}

/* ─────────────────────────── paragrafo ─────────────────────────── */

function Voce({ voce, cap, doc }: { voce: VoceNorma; cap: Capitolo; doc: Documento }) {
  // il rientro cresce con la profondità del numero: 4.1 → 4.1.2 → 4.1.2.3.5.2;
  // il passo del rientro è un token CSS, più stretto su cellulare
  const rientro = { '--liv': Math.max(0, livello(voce.codice) - 1) } as React.CSSProperties;
  return (
    <li>
      <a
        className="norma-voce"
        style={rientro}
        href={linkVoce(voce, cap, doc)}
        target="_blank"
        rel="noopener noreferrer"
        title={
          voce.pagina
            ? `Apre il PDF del ${cap.etichetta} a pagina ${voce.pagina}`
            : `Apre il PDF del ${cap.etichetta} di ${doc.sigla}`
        }
      >
        <span className="codice">{voce.codice}</span>
        <span className="titolo">{voce.titolo}</span>
        {voce.pagina && <span className="pagina">pag. {voce.pagina}</span>}
        <ArrowSquareOut size={13} />
      </a>
    </li>
  );
}

/* ─────────────────────────── capitolo ─────────────────────────── */

function CapitoloRiga({
  cap,
  doc,
  forzaAperto,
}: {
  cap: Capitolo;
  doc: Documento;
  /** Durante una ricerca i capitoli trovati si aprono da soli. */
  forzaAperto: boolean;
}) {
  const { state, dispatch } = useStore();
  const id = `norma:${doc.id}:${cap.n}`;
  const aperto = forzaAperto || !!state.ui.open[id];
  const vuoto = cap.voci.length === 0;
  const destinazione = cap.url
    ? `Apre la pagina del ${cap.etichetta} — ${doc.sigla}`
    : `Apre il PDF del ${cap.etichetta} — ${doc.sigla}`;

  return (
    <li className="norma-cap">
      <div className="norma-cap-riga">
        {/* un capitolo senza paragrafi indicizzati non ha niente da aprire:
            tutta la riga diventa il link al capitolo */}
        {vuoto ? (
          <a
            className="norma-cap-testa"
            href={linkCapitolo(cap, doc)}
            target="_blank"
            rel="noopener noreferrer"
            title={destinazione}
          >
            <span className="caret" />
            <span className="codice">{cap.etichetta}</span>
            <span className="titolo">{cap.titolo}</span>
          </a>
        ) : (
          <button
            type="button"
            className="norma-cap-testa"
            aria-expanded={aperto}
            title={aperto ? 'Chiudi i paragrafi' : 'Mostra i paragrafi'}
            onClick={() => dispatch({ type: 'toggleOpen', id })}
          >
            <span className="caret">{aperto ? <CaretDown size={13} /> : <CaretRight size={13} />}</span>
            <span className="codice">{cap.etichetta}</span>
            <span className="titolo">{cap.titolo}</span>
            <span className="conta">{cap.voci.length}</span>
          </button>
        )}
        <a
          className="norma-cap-link"
          href={linkCapitolo(cap, doc)}
          target="_blank"
          rel="noopener noreferrer"
          title={destinazione}
        >
          <ArrowSquareOut size={14} />
        </a>
      </div>

      {aperto && !vuoto && (
        <ul className="norma-voci">
          {cap.voci.map((v) => (
            <Voce key={v.codice} voce={v} cap={cap} doc={doc} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ─────────────────────────── documento ─────────────────────────── */

function DocumentoPanel({
  doc,
  capitoli,
  ricerca,
}: {
  doc: Documento;
  capitoli: Capitolo[];
  ricerca: boolean;
}) {
  const { state, dispatch } = useStore();
  const id = `norma:${doc.id}`;
  // di default si vede solo il titolo della norma; una ricerca apre tutto
  const aperto = ricerca || !!state.ui.open[id];

  return (
    <section className="panel">
      <div className="panel-body" style={{ paddingTop: 12 }}>
        <div className="norma-testa">
          <button
            type="button"
            className="norma-doc-testa"
            aria-expanded={aperto}
            aria-controls={`${id}-corpo`}
            onClick={() => dispatch({ type: 'toggleOpen', id })}
          >
            <span className="caret">{aperto ? <CaretDown size={14} /> : <CaretRight size={14} />}</span>
            {/* solo sigla e titolo: gli estremi di pubblicazione e i conteggi
                riempivano la testata senza aggiungere niente all'uso */}
            <span>
              <span className="norma-sigla">
                <BookOpenText size={15} />
                {doc.sigla}
              </span>
              <span className="norma-titolo" title={doc.estremi}>
                {doc.titolo}
              </span>
            </span>
          </button>
          <a className="btn btn-secondary" href={doc.pdf} target="_blank" rel="noopener noreferrer">
            <ArrowSquareOut size={14} />
            Testo completo
          </a>
        </div>

        {aperto &&
          (capitoli.length === 0 ? (
            <p className="note">Nessun capitolo di questo documento corrisponde alla ricerca.</p>
          ) : (
            <ul className="norma-capitoli" id={`${id}-corpo`}>
              {capitoli.map((c) => (
                <CapitoloRiga key={c.n} cap={c} doc={doc} forzaAperto={ricerca} />
              ))}
            </ul>
          ))}
      </div>
    </section>
  );
}

/* ─────────────────── norme e link aggiunti a mano ─────────────────── */


function Aggiunte({ voci, ricerca }: { voci: LinkUtente[]; ricerca: boolean }) {
  const { state, dispatch } = useStore();
  const [apri, setApri] = useState(false);
  const [bozza, setBozza] = useState({ sigla: '', titolo: '', url: '' });

  const setVoci = (v: LinkUtente[]) => dispatch({ type: 'normative', voci: v });

  // urlSicuro completa lo schema mancante e scarta tutto ciò che non è http(s)
  const url = urlSicuro(bozza.url) ?? '';
  const urlValido = !!url && /^https?:\/\/[^\s]+\.[^\s]+/i.test(url);
  const pronto = !!bozza.sigla.trim() && urlValido;

  const aggiungi = () => {
    if (!pronto) return;
    setVoci([
      ...state.normative,
      {
        id: `norma-${Date.now()}`,
        sigla: bozza.sigla.trim(),
        titolo: bozza.titolo.trim(),
        url,
      },
    ]);
    setBozza({ sigla: '', titolo: '', url: '' });
  };

  return (
    <section className="panel">
      <div className="panel-body" style={{ paddingTop: 12 }}>
        <div className="norma-testa">
          <span>
            <span className="norma-sigla">
              <BookOpenText size={15} />
              Aggiunte a mano
            </span>
            <span className="norma-titolo">
              Norme, linee guida e link tuoi — restano anche dopo «Svuota tutto» e vanno su OneDrive
            </span>
          </span>
          <button
            type="button"
            className="btn btn-primary"
            aria-expanded={apri}
            onClick={() => setApri((v) => !v)}
          >
            <Plus size={14} />
            Aggiungi
          </button>
        </div>

        {apri && (
          <div className="norma-aggiungi">
            <div className="mini-campo">
              <label htmlFor="na-sigla">Sigla</label>
              <input
                id="na-sigla"
                className="input"
                value={bozza.sigla}
                placeholder="CNR-DT 207"
                autoComplete="off"
                onChange={(e) => setBozza({ ...bozza, sigla: e.target.value })}
              />
            </div>
            <div className="mini-campo norma-campo-titolo">
              <label htmlFor="na-titolo">Titolo</label>
              <input
                id="na-titolo"
                className="input"
                value={bozza.titolo}
                placeholder="Istruzioni per la valutazione delle azioni del vento"
                autoComplete="off"
                onChange={(e) => setBozza({ ...bozza, titolo: e.target.value })}
              />
            </div>
            <div className="mini-campo norma-campo-url">
              <label htmlFor="na-url">Indirizzo</label>
              <input
                id="na-url"
                className={`input${bozza.url.trim() && !urlValido ? ' is-error' : ''}`}
                value={bozza.url}
                placeholder="https://…"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setBozza({ ...bozza, url: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    aggiungi();
                  }
                }}
              />
            </div>
            <button type="button" className="btn btn-primary norma-btn-aggiungi" disabled={!pronto} onClick={aggiungi}>
              <Plus size={14} />
              Aggiungi all’elenco
            </button>
          </div>
        )}

        {apri && bozza.url.trim() && !urlValido && (
          <div className="field-error">L’indirizzo non sembra valido: serve un link tipo «https://…».</div>
        )}

        {voci.length === 0 ? (
          <p className="note" style={{ marginTop: 10 }}>
            {ricerca
              ? 'Nessuna voce aggiunta a mano corrisponde alla ricerca.'
              : 'Nessuna voce aggiunta a mano: con «Aggiungi» metti qui le norme che usi e che non sono nell’indice — CNR, Eurocodici, circolari regionali, capitolati.'}
          </p>
        ) : (
          <ul className="norma-capitoli">
            {voci.map((v) => (
              <li className="norma-cap" key={v.id}>
                <div className="norma-cap-riga">
                  <a
                    className="norma-cap-testa"
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={v.url}
                  >
                    <span className="caret" />
                    <span className="codice">{v.sigla}</span>
                    <span className="titolo">{v.titolo || v.url}</span>
                  </a>
                  <a
                    className="norma-cap-link"
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Apri ${v.sigla}`}
                  >
                    <ArrowSquareOut size={14} />
                  </a>
                  <button
                    type="button"
                    className="norma-cap-link"
                    title={`Togli ${v.sigla} dall’elenco`}
                    onClick={() => setVoci(state.normative.filter((x) => x.id !== v.id))}
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── scheda ─────────────────────────── */

export default function Normativa() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const ricerca = q.trim().length > 0;

  const aggiunte = useMemo(() => {
    const chiavi = normalizza(q).split(/\s+/).filter(Boolean);
    if (!chiavi.length) return state.normative;
    return state.normative.filter((v) => corrisponde(`${v.sigla} ${v.titolo} ${v.url}`, chiavi));
  }, [state.normative, q]);

  const gruppi = useMemo(
    () =>
      DOCUMENTI.map((doc) => ({
        doc,
        capitoli: filtra(
          CAPITOLI.filter((c) => c.doc === doc.id),
          q,
        ),
      })),
    [q],
  );
  const trovate = gruppi.reduce((s, g) => s + g.capitoli.length, 0);

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
            aria-label="Cerca nell’indice della normativa"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {ricerca && (
          <span className="calc-conteggio">
            {trovate} {trovate === 1 ? 'capitolo' : 'capitoli'}
          </span>
        )}
      </ComandiScheda>

      {gruppi.map((g) => (
        <DocumentoPanel key={g.doc.id} doc={g.doc} capitoli={g.capitoli} ricerca={ricerca} />
      ))}

      <Aggiunte voci={aggiunte} ricerca={ricerca} />

      <PannelloSincronia />

      <p className="note">
        I link aprono la norma <strong>capitolo per capitolo</strong> su studiopetrillo.com: il
        capitolo va alla sua pagina, i paragrafi al PDF del capitolo (sulla pagina indicata, dove è
        segnata). L’indice di NTC e Circolare è parte del sito e resta uguale per tutte le commesse;
        le voci di «Aggiunte a mano» invece sono tue: restano dopo «Svuota tutto» e, se colleghi
        OneDrive, si ritrovano su tutti i dispositivi.
      </p>
    </div>
  );
}
