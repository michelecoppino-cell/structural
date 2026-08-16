import { useRef, useState } from 'react';
import {
  Triangle,
  DownloadSimple,
  UploadSimple,
  CloudSun,
  ChartLine,
  SealCheck,
  CurrencyEur,
  Info,
  ClipboardText,
  CheckCircle,
  Calculator,
  Books,
  FileText,
} from '@phosphor-icons/react';
import { useStore, type TabId } from './state/store';
import { migra } from './state/store';
import { testoRelazione, esitiVerifiche } from './calc/relazione';
import { SlotProvider } from './components/ComandiScheda';
import Azioni from './tabs/Azioni';
import Sollecitazioni from './tabs/Sollecitazioni';
import Verifiche from './tabs/Verifiche';
import Costi from './tabs/Costi';
import Calcolatrice from './tabs/Calcolatrice';
import Normativa from './tabs/Normativa';
import Esporta from './tabs/Esporta';

const TABS: { id: TabId; label: string; icon: React.ReactNode; sub: string }[] = [
  { id: 'azioni', label: 'Azioni', icon: <CloudSun size={17} />, sub: '5 gruppi · NTC2018 cap. 3' },
  {
    id: 'sollecitazioni',
    label: 'Sollecitazioni',
    icon: <ChartLine size={17} />,
    sub: 'Schema statico e diagrammi M/V/deformata',
  },
  {
    id: 'verifiche',
    label: 'Verifiche',
    icon: <SealCheck size={17} />,
    sub: 'Calcestruzzo · Acciaio · Legno · Muratura',
  },
  { id: 'costi', label: 'Stime costi', icon: <CurrencyEur size={17} />, sub: 'Computo sintetico e incidenze' },
  {
    id: 'calcolatrice',
    label: 'Calcolatrice',
    icon: <Calculator size={17} />,
    sub: 'Calcoli in sequenza, con nome e nota',
  },
  {
    id: 'normativa',
    label: 'Normativa',
    icon: <Books size={17} />,
    sub: 'NTC2018, Circolare 2019 e indice dei capitoli',
  },
  {
    id: 'esporta',
    label: 'Esporta',
    icon: <FileText size={17} />,
    sub: 'Foglio A4 con i soli capitoli spuntati — stampa, PDF, testo',
  },
];

export default function App() {
  const { state, dispatch } = useStore();
  const [toast, setToast] = useState('');
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const esiti = esitiVerifiche(state);
  const ko = esiti.filter((e) => !e.ok);

  const flash = (t: string) => {
    setToast(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), 2200);
  };

  const esporta = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.progetto.commessa || 'commessa'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Progetto esportato in JSON');
  };

  const importa = async (file: File) => {
    try {
      const stato = migra(JSON.parse(await file.text()));
      dispatch({ type: 'carica', stato });
      flash('Progetto importato');
    } catch {
      flash('File JSON non valido');
    }
  };

  const copia = async () => {
    const txt = testoRelazione(state, state.tab);
    try {
      await navigator.clipboard.writeText(txt);
      flash(`Blocco relazione copiato (${txt.split('\n').length} righe)`);
    } catch {
      flash('Copia non riuscita: consenti l’accesso agli appunti');
    }
  };

  /** La scheda Sollecitazioni sta in una schermata sola: niente scroll di pagina. */
  const fit = state.tab === 'sollecitazioni';

  return (
    <div className={`app${fit ? ' is-fit' : ''}`}>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <Triangle size={14} />
          </span>
          <div style={{ minWidth: 0 }}>
            <input
              className="brand-title"
              value={state.progetto.nome}
              aria-label="Nome della commessa"
              onChange={(e) => dispatch({ type: 'progetto', patch: { nome: e.target.value } })}
            />
            <div className="brand-meta">
              {state.progetto.commessa} · {state.progetto.localita} · NTC2018 · rev. {state.progetto.revisione}
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            title="Importa JSON"
            onClick={() => fileRef.current?.click()}
          >
            <UploadSimple size={14} />
            <span>Importa JSON</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importa(f);
              e.target.value = '';
            }}
          />
          <button type="button" className="btn btn-secondary" title="Esporta JSON" onClick={esporta}>
            <DownloadSimple size={14} />
            <span>Esporta JSON</span>
          </button>

          {/* comandi della scheda: stanno quassù per non rubare altezza al
              contenuto, che su cellulare è tutto quello che c'è */}
          {state.tab !== 'normativa' && (
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              aria-pressed={state.ui.allDetails[state.tab]}
              aria-label={state.ui.allDetails[state.tab] ? 'Chiudi le formule' : 'Mostra le formule'}
              title={
                state.ui.allDetails[state.tab]
                  ? 'Chiudi le spiegazioni'
                  : 'Mostra formule, spiegazioni e riferimenti di tutta la scheda'
              }
              onClick={() => dispatch({ type: 'toggleAllDetails', tab: state.tab })}
            >
              <Info size={15} weight={state.ui.allDetails[state.tab] ? 'fill' : 'regular'} />
            </button>
          )}
          {state.tab !== 'normativa' && (
            <button
              type="button"
              className="btn btn-primary btn-copia"
              title="Copia il blocco di testo della scheda, pronto per la relazione"
              onClick={copia}
            >
              <ClipboardText size={14} />
              <span>Copia</span>
            </button>
          )}
        </div>
      </header>

      <div className="app-body">
        <nav className="side-nav" aria-label="Sezioni del progetto">
          <div className="nav-group-label">Progetto</div>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="nav-item"
              title={`${t.label} — ${t.sub}`}
              aria-current={state.tab === t.id ? 'page' : undefined}
              onClick={() => dispatch({ type: 'tab', tab: t.id })}
            >
              {t.icon}
              <span className="label">{t.label}</span>
              {t.id === 'verifiche' && (
                <span className={`nav-badge ${ko.length === 0 ? 'is-ok' : ''}`}>
                  {ko.length === 0 ? '✓' : ko.length}
                </span>
              )}
            </button>
          ))}
          <div className="nav-foot" title={ko.map((e) => e.label).join(', ')}>
            {ko.length === 0 ? (
              <>
                <span className="ok-item">Tutte le verifiche soddisfatte</span>
                <span className="dettaglio">{esiti.length} su {esiti.length}</span>
              </>
            ) : (
              <>
                Non soddisfatte
                <span className="dettaglio">
                  {ko.map((e) => (
                    <span className="ko-item" key={e.label}>
                      {e.label}
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>
        </nav>

        <main className={`app-main${fit ? ' is-fit' : ''}`}>
          <div className="tab-toolbar">
            <div className="toolbar-slot" ref={setSlot} />
          </div>

          <SlotProvider value={slot}>
            {state.tab === 'azioni' && <Azioni />}
            {state.tab === 'sollecitazioni' && <Sollecitazioni />}
            {state.tab === 'verifiche' && <Verifiche />}
            {state.tab === 'costi' && <Costi />}
            {state.tab === 'calcolatrice' && <Calcolatrice />}
            {state.tab === 'normativa' && <Normativa />}
            {state.tab === 'esporta' && <Esporta />}
          </SlotProvider>
        </main>
      </div>

      <nav className="bottom-bar" aria-label="Sezioni del progetto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="bottom-item"
            aria-current={state.tab === t.id ? 'page' : undefined}
            onClick={() => dispatch({ type: 'tab', tab: t.id })}
          >
            {t.icon}
            <span className="label">{t.label}</span>
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status">
          <span className="icona">
            <CheckCircle size={14} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
