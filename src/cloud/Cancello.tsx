/**
 * Il cancello d'ingresso: senza un account Microsoft collegato l'app non si
 * apre, come nella mente-digitale. Dentro ci sono la libreria personale e la
 * Base tecnica, e il posto giusto per chiedere chi sei è la porta, non la
 * singola scheda.
 *
 * Una volta entrati l'accesso resta (la cache MSAL sta in `localStorage`), e
 * il cancello non si ripresenta nemmeno senza rete: per aprire l'app basta
 * l'account in cache, il token serve solo quando si parla con OneDrive. Se il
 * token scade a metà lavoro, l'app resta aperta e lo dice il pannello di
 * sincronizzazione, con il suo «Collega OneDrive»: niente redirect a sorpresa.
 *
 * Senza client id (`SINCRONIA_CONFIGURATA` falso, cioè una build di prova) il
 * cancello non c'è: non ci sarebbe modo di passarlo.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Triangle } from '@phosphor-icons/react';
import { SINCRONIA_CONFIGURATA, account, initAuth, login, suCambioAccount } from './auth';

type Stato = 'avvio' | 'fuori' | 'dentro';

export default function Cancello({ children }: { children: ReactNode }) {
  const [stato, setStato] = useState<Stato>(SINCRONIA_CONFIGURATA ? 'avvio' : 'dentro');
  const [errore, setErrore] = useState('');
  const [inUscita, setInUscita] = useState(false);

  useEffect(() => {
    if (!SINCRONIA_CONFIGURATA) return;
    let vivo = true;
    initAuth()
      .then(() => vivo && setStato(account() ? 'dentro' : 'fuori'))
      .catch((e) => {
        console.error('Avvio accesso Microsoft', e);
        if (!vivo) return;
        setErrore(e instanceof Error ? e.message : String(e));
        setStato('fuori');
      });
    const via = suCambioAccount(() => setStato(account() ? 'dentro' : 'fuori'));
    return () => {
      vivo = false;
      via();
    };
  }, []);

  if (stato === 'dentro') return <>{children}</>;
  if (stato === 'avvio') return null;

  const entra = async () => {
    setErrore('');
    setInUscita(true);
    try {
      await login();
    } catch (e) {
      console.error('Login Microsoft', e);
      setErrore(e instanceof Error ? e.message : String(e));
      setInUscita(false);
    }
  };

  return (
    <div className="cancello">
      <div className="cancello-card">
        <span className="brand-mark cancello-marchio">
          <Triangle size={18} />
        </span>
        <h1 className="cancello-titolo">Strutturale</h1>
        <p className="cancello-desc">
          Accedi con il tuo account Microsoft per aprire l’app: libreria personale e Base tecnica
          stanno sul tuo OneDrive.
        </p>
        <button type="button" className="btn btn-primary cancello-btn" disabled={inUscita} onClick={() => void entra()}>
          <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          {inUscita ? 'Vado su Microsoft…' : 'Accedi con Microsoft'}
        </button>
        {!!errore && (
          <p className="field-error">
            Microsoft ha risposto: <code>{errore}</code>
          </p>
        )}
        <p className="cancello-nota">
          Il browser parla direttamente con Microsoft: nessun server in mezzo. L’accesso resta su
          questo dispositivo finché non scolleghi.
        </p>
      </div>
    </div>
  );
}
