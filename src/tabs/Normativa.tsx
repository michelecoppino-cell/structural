import { useMemo, useState } from 'react';
import { ArrowSquareOut, BookOpenText, MagnifyingGlass } from '@phosphor-icons/react';
import { ComandiScheda } from '../components/ComandiScheda';
import { DOCUMENTI, INDICE, linkVoce, type Documento, type VoceNorma } from '../data/normative';

const normalizza = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function filtra(voci: VoceNorma[], q: string): VoceNorma[] {
  const chiavi = normalizza(q).split(/\s+/).filter(Boolean);
  if (!chiavi.length) return voci;
  return voci.filter((v) => {
    const testo = normalizza(`${v.codice} ${v.titolo} ${v.tag ?? ''}`);
    return chiavi.every((k) => testo.includes(k));
  });
}

function Gruppo({ doc, voci }: { doc: Documento; voci: VoceNorma[] }) {
  return (
    <section className="panel">
      <div className="panel-body" style={{ paddingTop: 12 }}>
        <div className="norma-testa">
          <div>
            <div className="norma-sigla">
              <BookOpenText size={15} />
              {doc.sigla}
            </div>
            <div className="norma-titolo">{doc.titolo}</div>
            <div className="norma-estremi">{doc.estremi}</div>
            {doc.nota && <div className="norma-estremi">{doc.nota}</div>}
          </div>
          <a className="btn btn-secondary" href={doc.url} target="_blank" rel="noopener noreferrer">
            <ArrowSquareOut size={14} />
            Apri il documento
          </a>
        </div>

        {voci.length === 0 ? (
          <p className="note" style={{ marginTop: 10 }}>
            Nessun capitolo di questo documento corrisponde alla ricerca.
          </p>
        ) : (
          <ul className="norma-indice">
            {voci.map((v) => (
              <li key={`${v.doc}-${v.codice}`}>
                <a
                  className="norma-voce"
                  href={linkVoce(v, doc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={
                    v.pagina
                      ? `Apre ${doc.sigla} a pagina ${v.pagina}`
                      : `Apre ${doc.sigla} — capitolo ${v.codice}`
                  }
                >
                  <span className="codice">{v.codice}</span>
                  <span className="titolo">{v.titolo}</span>
                  {v.pagina && <span className="pagina">pag. {v.pagina}</span>}
                  <ArrowSquareOut size={13} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function Normativa() {
  const [q, setQ] = useState('');

  const gruppi = useMemo(
    () => DOCUMENTI.map((doc) => ({ doc, voci: filtra(INDICE.filter((v) => v.doc === doc.id), q) })),
    [q],
  );
  const trovate = gruppi.reduce((s, g) => s + g.voci.length, 0);

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
        <span className="calc-conteggio">
          {trovate} {trovate === 1 ? 'voce' : 'voci'}
        </span>
      </ComandiScheda>

      {gruppi.map((g) => (
        <Gruppo key={g.doc.id} doc={g.doc} voci={g.voci} />
      ))}

      <p className="note">
        L’indice è parte del sito, non del progetto: resta uguale per tutte le commesse e non entra
        nell’Esporta JSON. Nuove norme e nuovi capitoli si aggiungono in{' '}
        <code>src/data/normative.ts</code>; indicando la pagina del PDF il link apre la norma
        direttamente su quel capitolo.
      </p>
    </div>
  );
}
