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
  Books,
  NotebookIcon,
  Trash,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useStore, type TabId } from './state/store';
import { migra, svuotaMemoria } from './state/store';
import { testoRelazione, esitiVerifiche } from './calc/relazione';
import { SlotProvider } from './components/ComandiScheda';
import { useSincronia } from './cloud/useSincronia';
import Azioni from './tabs/Azioni';
import Sollecitazioni from './tabs/Sollecitazioni';
import Verifiche from './tabs/Verifiche';
import Costi from './tabs/Costi';
import Quaderno from './tabs/Quaderno';
import Libreria from './tabs/Libreria';

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
    id: 'quaderno',
    label: 'Quaderno',
    icon: <NotebookIcon size={17} />,
    sub: 'Foglio di calcolo libero: formule, unità che si convertono, schemi — e da qui esce la stampa',
  },
  {
    id: 'normativa',
    label: 'Libreria',
    icon: <Books size={17} />,
    sub: 'Norme: NTC2018 e Circolare 2019 · Utili: armature, profili, bulloni',
  },
];

export default function App() {
  const { state, dispatch } = useStore();
  const sincronia = useSincronia();
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

  /**
   * Riparte da foglio bianco: butta via il salvataggio automatico — quello che
   * all'apertura ripropone i campi già compilati — e riporta tutte le schede ai
   * valori di partenza. È l'unica cosa dell'app che perde dati, quindi chiede
   * conferma e ricorda che il progetto si può salvare prima con «Esporta JSON».
   *
   * Quello che **non** perde è la libreria personale: le norme aggiunte a mano,
   * le unità e le formule preimpostate non appartengono alla commessa, e
   * riscriverle a ogni foglio bianco era il motivo per cui non si finiva mai di
   * riscriverle. Se ne occupa il reducer, che le riporta dentro dopo il reset.
   */
  const svuota = () => {
    const ok = window.confirm(
      'Svuotare tutto?\n\nSi cancella il salvataggio automatico e tutte le schede tornano ai valori iniziali: azioni, sollecitazioni, verifiche, computo e quaderno.\n\nRestano la tua libreria personale — norme aggiunte a mano, unità di misura e formule preimpostate — che non è roba di commessa.\n\nL’operazione non si può annullare — per conservare il lavoro, annulla e usa prima «Esporta JSON».',
    );
    if (!ok) return;
    svuotaMemoria();
    dispatch({ type: 'reset' });
    flash('Tutto svuotato: si riparte da zero');
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

  /**
   * Schede che stanno in una schermata sola, senza scroll di pagina: le
   * Sollecitazioni per il grafico, il Quaderno perché il foglio e il pannello
   * scorrono per conto loro, come su due scrivanie accostate.
   */
  const fit = state.tab === 'sollecitazioni' || state.tab === 'quaderno';

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
          {(sincronia.stato === 'in-pari' || sincronia.stato === 'in-corso' || sincronia.stato === 'errore') && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={sincronia.stato === 'in-corso'}
              onClick={() => void sincronia.sincronizza()}
            >
              <ArrowsClockwise size={14} />
              <span>Sincronizza ora</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-svuota"
            title="Cancella il salvataggio automatico e riporta tutte le schede ai valori iniziali"
            onClick={svuota}
          >
            <Trash size={14} />
            <span>Svuota tutto</span>
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
            {state.tab === 'quaderno' && <Quaderno />}
            {state.tab === 'normativa' && <Libreria sincronia={sincronia} />}
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
