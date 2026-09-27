/**
 * Il disegno di una scheda: i blocchi di `markdown.ts` diventano React.
 *
 * Niente `dangerouslySetInnerHTML`: il testo di una scheda arriva anche da
 * fuori (un altro editor, Claude dal connettore), e qui dentro resta testo.
 * I link passano da `urlSicuro`, come quelli della Libreria.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowSquareOut,
  BookOpenText,
  Calculator,
  Check,
  ImageBroken,
  NotebookIcon,
  Warning,
  Info,
  Lightbulb,
} from '@phosphor-icons/react';
import { useStore } from '../state/store';
import { urlSicuro } from '../data/normative';
import { formattaIn, haOperazioni } from '../calc/calcolatrice';
import { nuovoBlocco } from '../calc/quaderno';
import { apriLink } from '../cloud/apriLink';
import { calcolaBlocco, leggiCalcolo } from './calcolo';
import { indirizzoImmagine } from './immagini';
import type { Blocco, Inline, VoceElenco } from './markdown';
import type { Destinazione } from './schede';

export interface ContestoScheda {
  risolvi: (bersaglio: string) => Destinazione;
  apriScheda: (percorso: string) => void;
  /** Spunta una casella; assente = scheda in sola lettura (anteprima). */
  onCasella?: (n: number) => void;
  /** Titolo della scheda: diventa il capitolo del Quaderno quando ci si porta un calcolo. */
  titolo: string;
}

/* ─────────────────────────── immagini ─────────────────────────── */

/**
 * Un'immagine della Base: un file privato su OneDrive, che si scarica con
 * l'accesso e si mostra da un indirizzo `blob:`. Un'immagine presa dal web
 * invece resta un link: la pagina non carica niente da host che non conosce
 * (la CSP lo vieta, ed è giusto così — un'immagine esterna in un appunto è
 * anche un modo di sapere quando lo si apre).
 */
export function Immagine({ src, alt, figura }: { src: string; alt: string; figura?: boolean }) {
  const esterna = /^https?:\/\//i.test(src);
  const [url, setUrl] = useState('');
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    if (esterna) return;
    let vivo = true;
    setErrore(false);
    indirizzoImmagine(src).then(
      (u) => vivo && setUrl(u),
      () => vivo && setErrore(true),
    );
    return () => {
      vivo = false;
    };
  }, [src, esterna]);

  if (esterna) {
    const sicuro = urlSicuro(src);
    return sicuro ? (
      <a className="link-esterno" href={sicuro} target="_blank" rel="noopener noreferrer">
        {alt || 'immagine sul web'}
        <ArrowSquareOut size={11} />
      </a>
    ) : null;
  }
  if (errore) {
    return (
      <span className="base-img-assente" title={src}>
        <ImageBroken size={14} />
        {alt || src.replace(/^.*\//, '')} — non raggiungibile
      </span>
    );
  }
  const img = url ? (
    <img
      className={figura ? 'base-img is-figura' : 'base-img'}
      src={url}
      alt={alt}
      title="Apri a grandezza piena"
      onClick={() => window.open(url, '_blank', 'noopener')}
    />
  ) : (
    <span className="base-img-attesa">{alt || 'immagine'}…</span>
  );
  if (!figura) return img;
  return (
    <figure className="base-figura">
      {img}
      {alt && <figcaption>{alt}</figcaption>}
    </figure>
  );
}

/* ─────────────────────────── in linea ─────────────────────────── */

function Collegamento({ bersaglio, etichetta, ctx }: { bersaglio: string; etichetta: string; ctx: ContestoScheda }) {
  const d = ctx.risolvi(bersaglio);
  if (d.tipo === 'scheda') {
    return (
      <button type="button" className="base-wiki" onClick={() => ctx.apriScheda(d.scheda.percorso)}>
        {etichetta}
      </button>
    );
  }
  if (d.tipo === 'norma') {
    const dove = [d.norma.titolo || d.norma.sigla, d.pagina && `p. ${d.pagina}`].filter(Boolean).join(' — ');
    return (
      <button type="button" className="base-wiki is-norma" title={`Apri ${dove}`} onClick={() => apriLink(d.norma.url)}>
        <BookOpenText size={12} />
        {etichetta}
        {d.pagina && <span className="base-wiki-pagina">p. {d.pagina}</span>}
      </button>
    );
  }
  return (
    <span className="base-wiki is-vuoto" title="Nessuna scheda con questo titolo e nessuna norma della Libreria con questa sigla">
      {etichetta}
    </span>
  );
}

export function InlineR({ c, ctx }: { c: Inline[]; ctx: ContestoScheda }) {
  return (
    <>
      {c.map((x, k) => {
        switch (x.t) {
          case 'testo':
            return <span key={k}>{x.v}</span>;
          case 'codice':
            return <code key={k}>{x.v}</code>;
          case 'grassetto':
            return (
              <strong key={k}>
                <InlineR c={x.c} ctx={ctx} />
              </strong>
            );
          case 'corsivo':
            return (
              <em key={k}>
                <InlineR c={x.c} ctx={ctx} />
              </em>
            );
          case 'barrato':
            return (
              <s key={k}>
                <InlineR c={x.c} ctx={ctx} />
              </s>
            );
          case 'acapo':
            return <br key={k} />;
          case 'immagine':
            return <Immagine key={k} src={x.src} alt={x.alt} />;
          case 'wiki':
            return <Collegamento key={k} bersaglio={x.bersaglio} etichetta={x.etichetta} ctx={ctx} />;
          case 'link': {
            const url = urlSicuro(x.url);
            if (!url) return <InlineR key={k} c={x.c} ctx={ctx} />;
            return (
              <a key={k} className="link-esterno" href={url} target="_blank" rel="noopener noreferrer">
                <InlineR c={x.c} ctx={ctx} />
                <ArrowSquareOut size={11} />
              </a>
            );
          }
        }
      })}
    </>
  );
}

/* ─────────────────────────── calcolo ─────────────────────────── */

function BloccoCalcolo({ testo, ctx }: { testo: string; ctx: ContestoScheda }) {
  const { state, dispatch } = useStore();
  const righe = useMemo(() => calcolaBlocco(testo, state.calcolatrice.unita), [testo, state.calcolatrice.unita]);
  const [portato, setPortato] = useState(false);

  /**
   * Il blocco finisce in fondo al Quaderno così com'è: un capitolo con il
   * titolo della scheda, e ogni riga una formula del foglio — con la nota
   * che diventa l'appunto del passaggio. Da lì si cambia un dato e il resto
   * segue, come in ogni foglio.
   */
  const portaNelQuaderno = () => {
    const nuovi = [
      nuovoBlocco('linea', { testo: ctx.titolo }),
      ...leggiCalcolo(testo).map((r) =>
        r.t === 'titoletto'
          ? nuovoBlocco('nota', { testo: r.testo })
          : nuovoBlocco('formula', {
              nome: r.voce.nome,
              espressione: r.voce.espressione,
              um: r.voce.um,
              appunto: r.voce.nota,
            }),
      ),
    ];
    dispatch({ type: 'quaderno', patch: { blocchi: [...state.quaderno.blocchi, ...nuovi] } });
    setPortato(true);
  };

  return (
    <div className="base-calcolo">
      <div className="base-calcolo-testa">
        <Calculator size={13} />
        <span>Calcolo</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={portaNelQuaderno} disabled={portato}>
          {portato ? <Check size={13} /> : <NotebookIcon size={13} />}
          {portato ? 'Nel Quaderno' : 'Porta nel Quaderno'}
        </button>
      </div>
      <table className="base-calcolo-righe">
        <tbody>
          {righe.map((r, k) =>
            r.t === 'titoletto' ? (
              <tr key={k} className="titoletto">
                <td colSpan={3}>{r.testo}</td>
              </tr>
            ) : (
              <tr key={k} className={r.voce.errore ? 'is-errore' : undefined}>
                <td className="nome">{r.voce.nome}</td>
                <td className="formula">
                  {r.voce.nome && '= '}
                  {haOperazioni(r.voce.espressione) && <span className="espr">{r.voce.espressione} = </span>}
                  {r.voce.errore ? (
                    <span className="errore">{r.voce.errore}</span>
                  ) : (
                    <span className="valore">
                      {formattaIn(r.voce.valore, r.voce.umEffettiva)}
                      {r.voce.umEffettiva && ` ${r.voce.umEffettiva}`}
                    </span>
                  )}
                </td>
                <td className="nota">{r.voce.nota}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────── blocchi ─────────────────────────── */

const ICONE_RIQUADRO: Record<string, React.ReactNode> = {
  attenzione: <Warning size={14} />,
  warning: <Warning size={14} />,
  pericolo: <Warning size={14} />,
  sintesi: <Lightbulb size={14} />,
  tip: <Lightbulb size={14} />,
  suggerimento: <Lightbulb size={14} />,
};

function Voce({ v, ctx }: { v: VoceElenco; ctx: ContestoScheda }) {
  if (v.casella === null) {
    return (
      <li>
        <InlineR c={v.contenuto} ctx={ctx} />
        {v.figli.length > 0 && <Blocchi blocchi={v.figli} ctx={ctx} />}
      </li>
    );
  }
  return (
    <li className={`base-casella${v.casella ? ' is-fatta' : ''}`}>
      <label>
        <input
          type="checkbox"
          checked={v.casella}
          disabled={!ctx.onCasella}
          onChange={() => ctx.onCasella?.(v.indiceCasella)}
        />
        <span>
          <InlineR c={v.contenuto} ctx={ctx} />
        </span>
      </label>
      {v.figli.length > 0 && <Blocchi blocchi={v.figli} ctx={ctx} />}
    </li>
  );
}

function BloccoR({ b, ctx }: { b: Blocco; ctx: ContestoScheda }) {
  switch (b.t) {
    case 'titolo': {
      const Tag = `h${Math.min(6, b.livello + 1)}` as 'h2';
      return (
        <Tag className={`base-h base-h${b.livello}`}>
          <InlineR c={b.c} ctx={ctx} />
        </Tag>
      );
    }
    case 'paragrafo':
      return (
        <p>
          <InlineR c={b.c} ctx={ctx} />
        </p>
      );
    case 'linea':
      return <hr className="rule" />;
    case 'figura':
      return <Immagine src={b.src} alt={b.alt} figura />;
    case 'codice':
      if (b.lingua === 'calcolo') return <BloccoCalcolo testo={b.testo} ctx={ctx} />;
      return (
        <pre className="base-codice">
          <code>{b.testo}</code>
        </pre>
      );
    case 'citazione':
      return (
        <blockquote className="base-citazione">
          <Blocchi blocchi={b.figli} ctx={ctx} />
        </blockquote>
      );
    case 'riquadro':
      return (
        <aside className="base-riquadro" data-tipo={b.tipo}>
          <div className="base-riquadro-testa">
            {ICONE_RIQUADRO[b.tipo] ?? <Info size={14} />}
            {b.titolo.length ? <InlineR c={b.titolo} ctx={ctx} /> : <span className="tipo">{b.tipo}</span>}
          </div>
          {b.figli.length > 0 && <Blocchi blocchi={b.figli} ctx={ctx} />}
        </aside>
      );
    case 'tabella': {
      const allinea = (k: number) =>
        b.allineamenti[k] === 'dx' ? 'right' : b.allineamenti[k] === 'centro' ? 'center' : undefined;
      return (
        <div className="table-scroll">
          <table className="table base-tabella">
            <thead>
              <tr>
                {b.intestazioni.map((c, k) => (
                  <th key={k} style={{ textAlign: allinea(k) }}>
                    <InlineR c={c} ctx={ctx} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.righe.map((riga, i) => (
                <tr key={i}>
                  {b.intestazioni.map((_, k) => (
                    <td key={k} style={{ textAlign: allinea(k) }}>
                      <InlineR c={riga[k] ?? []} ctx={ctx} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'elenco': {
      const voci = b.voci.map((v, k) => <Voce key={k} v={v} ctx={ctx} />);
      const compito = b.voci.every((v) => v.casella !== null) ? ' base-compiti' : '';
      return b.ordinato ? (
        <ol className={`base-elenco${compito}`} start={b.inizio}>
          {voci}
        </ol>
      ) : (
        <ul className={`base-elenco${compito}`}>{voci}</ul>
      );
    }
  }
}

export function Blocchi({ blocchi, ctx }: { blocchi: Blocco[]; ctx: ContestoScheda }) {
  return (
    <>
      {blocchi.map((b, k) => (
        <BloccoR key={k} b={b} ctx={ctx} />
      ))}
    </>
  );
}
