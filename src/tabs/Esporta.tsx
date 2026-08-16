import { useState } from 'react';
import { ClipboardText, DownloadSimple, GridNine, Printer } from '@phosphor-icons/react';
import { useStore, type CapitoloId } from '../state/store';
import { ComandiScheda } from '../components/ComandiScheda';
import { CAPITOLI } from '../calc/relazione';
import { capitoliScelti, documentoHtml, documentoTesto, nomeFile, oggi } from '../calc/esportazione';

/**
 * Scheda Esportazione — un foglio A4 vuoto su cui si tira dentro quello che
 * serve: si spuntano i capitoli e il foglio si riempie solo di quelli, così
 * non si esporta tutto il progetto quando se ne è compilata una riga.
 *
 * Da qui escono tre cose, tutte leggibili senza questa app: la stampa (o il
 * PDF, dalla stessa finestra di stampa), il testo da incollare in OneNote e
 * un file HTML autonomo che si riapre con qualunque browser.
 */
export default function Esporta() {
  const { state, dispatch } = useStore();
  const e = state.esportazione;
  const [toast, setToast] = useState('');
  const set = (patch: Partial<typeof e>) => dispatch({ type: 'esportazione', patch });

  const scelti = capitoliScelti(state);
  const p = state.progetto;

  const spunta = (id: CapitoloId) =>
    set({ capitoli: { ...e.capitoli, [id]: !e.capitoli[id] } });

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(documentoTesto(state));
      setToast('Foglio copiato: incollalo dove vuoi');
    } catch {
      setToast('Copia non riuscita: consenti l’accesso agli appunti');
    }
    window.setTimeout(() => setToast(''), 2400);
  };

  const scarica = () => {
    const blob = new Blob([documentoHtml(state)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeFile(state)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('File HTML scaricato: si apre con qualunque browser');
    window.setTimeout(() => setToast(''), 2400);
  };

  return (
    <div className="stack">
      <ComandiScheda>
        <div className="esp-spunte" role="group" aria-label="Capitoli da portare nel foglio">
          {CAPITOLI.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip-toggle"
              aria-pressed={!!e.capitoli[c.id]}
              title={`${e.capitoli[c.id] ? 'Togli' : 'Porta'} ${c.titolo} nel foglio`}
              onClick={() => spunta(c.id)}
            >
              {c.titolo}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={e.quadretti}
          title="Sfondo a quadretti, come la carta da calcolo (non viene stampato)"
          onClick={() => set({ quadretti: !e.quadretti })}
        >
          <GridNine size={14} />
          Quadretti
        </button>
        <button type="button" className="btn btn-secondary" title="Copia il foglio come testo" onClick={copia}>
          <ClipboardText size={14} />
          Copia testo
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          title="Scarica un file HTML autonomo, leggibile senza questa app"
          onClick={scarica}
        >
          <DownloadSimple size={14} />
          Scarica HTML
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

      <div className="esp-area">
        <div className={`foglio${e.quadretti ? ' is-quadretti' : ''}`} id="foglio-esportazione">
          <header className="foglio-testa">
            <div>
              <div className="foglio-titolo">{p.nome}</div>
              <div className="foglio-meta">
                Commessa {p.commessa} · {p.localita} · NTC2018 (DM 17/01/2018) · rev. {p.revisione}
              </div>
            </div>
            <div className="foglio-data">{oggi()}</div>
          </header>

          <input
            className="foglio-intestazione"
            value={e.intestazione}
            placeholder="Oggetto del calcolo — scrivi qui una riga di premessa (facoltativa)"
            aria-label="Riga di premessa del foglio"
            onChange={(ev) => set({ intestazione: ev.target.value })}
          />

          {scelti.length === 0 && (
            <p className="foglio-vuoto">
              Foglio vuoto. Spunta qui sopra i capitoli da portare dentro: entra solo quello che scegli.
            </p>
          )}

          {scelti.map((c) => (
            <section className="foglio-cap" key={c.id}>
              <h2>{c.titolo}</h2>
              {c.blocchi.map((b) => (
                <div className="foglio-blocco" key={b.titolo}>
                  <h3>{b.titolo}</h3>
                  <ul>
                    {b.righe.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}

          <textarea
            className="foglio-nota"
            value={e.nota}
            rows={2}
            placeholder="Nota a piè di foglio (facoltativa)"
            aria-label="Nota a piè di foglio"
            onChange={(ev) => set({ nota: ev.target.value })}
          />

          <footer className="foglio-piede">
            Documento di predimensionamento: i valori vanno confermati dal calcolo esecutivo.
          </footer>
        </div>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
