import { useRef, useState } from 'react';
import {
  Triangle,
  DownloadSimple,
  UploadSimple,
  CloudArrowUp,
  CloudSun,
  ChartLine,
  SealCheck,
  CurrencyEur,
  FunctionIcon,
  ClipboardText,
  CheckCircle,
} from '@phosphor-icons/react';
import { useStore, type TabId } from './state/store';
import { migra } from './state/store';
import { testoRelazione, esitiVerifiche } from './calc/relazione';
import { SlotProvider } from './components/ComandiScheda';
import Azioni from './tabs/Azioni';
import Sollecitazioni from './tabs/Sollecitazioni';
import Verifiche from './tabs/Verifiche';
import Costi from './tabs/Costi';

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
          {/* finché Microsoft Graph non è collegato, il salvataggio in cloud
              non è l'azione principale: l'accento resta su Esporta JSON */}
          <button
            type="button"
            className="btn btn-secondary"
            disabled
            title="Salvataggio su OneDrive in arrivo — per ora usa Esporta JSON"
          >
            <CloudArrowUp size={14} />
            <span>OneDrive</span>
          </button>
          <button type="button" className="btn btn-primary" title="Esporta JSON" onClick={esporta}>
            <DownloadSimple size={14} />
            <span>Esporta JSON</span>
          </button>
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
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => dispatch({ type: 'toggleAllDetails', tab: state.tab })}
              >
                <FunctionIcon size={14} />
                {state.ui.allDetails[state.tab] ? 'Chiudi dettagli' : 'Mostra formule'}
              </button>
              <button type="button" className="btn btn-primary" onClick={copia}>
                <ClipboardText size={14} />
                Copia per relazione
              </button>
            </div>
          </div>

          <SlotProvider value={slot}>
            {state.tab === 'azioni' && <Azioni />}
            {state.tab === 'sollecitazioni' && <Sollecitazioni />}
            {state.tab === 'verifiche' && <Verifiche />}
            {state.tab === 'costi' && <Costi />}
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
