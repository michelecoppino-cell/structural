/**
 * Il va e vieni fra la libreria di questo dispositivo e il file su OneDrive.
 *
 * Regole che tengono in piedi la cosa:
 *
 *  - **il locale resta la verità di lavoro**. L'app funziona identica senza
 *    rete e senza accesso: OneDrive è una copia in più, non la fonte. Se la
 *    sincronizzazione fallisce non succede niente di visibile a chi calcola.
 *  - **si fonde, non si sovrascrive**. Ogni giro è leggi → fondi → riscrivi,
 *    con la fotografia dell'ultima sincronizzazione riuscita come arbitro
 *    (vedi `fondiLibrerie`). Un «scarica e sostituisci» sarebbe una riga di
 *    codice e la garanzia di perdere prima o poi il lavoro di un dispositivo.
 *  - **nessun redirect a sorpresa**. Quando l'accesso scade l'app lo dice e
 *    aspetta un clic; non porta via la pagina nel mezzo di un calcolo.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { estraiLibreria, useStore } from '../state/store';
import { ServeAccesso, SINCRONIA_CONFIGURATA, account, initAuth, login, logout } from './auth';
import { FILE_LIBRERIA } from './config';
import { leggiJson, scriviJson } from './onedrive';
import { fondiLibrerie, leggiLibreria, libreriaVuota, stessoContenuto, type Libreria } from './libreria';

export type StatoSincronia =
  /** manca il client id: l'app gira tutta in locale, come prima */
  | 'spenta'
  /** configurata, ma nessun account collegato su questo dispositivo */
  | 'scollegata'
  /** collegata e in pari */
  | 'in-pari'
  /** giro in corso */
  | 'in-corso'
  /** l'accesso Microsoft è scaduto: serve un clic */
  | 'scaduta'
  /** rete assente o Graph che risponde male: si riproverà */
  | 'errore';

/** Fotografia dell'ultima sincronizzazione riuscita: l'arbitro della fusione. */
const CHIAVE_BASE = 'structural:libreria-base';

function leggiBase(): Libreria | null {
  try {
    const raw = localStorage.getItem(CHIAVE_BASE);
    return raw ? leggiLibreria(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function scriviBase(lib: Libreria): void {
  try {
    localStorage.setItem(CHIAVE_BASE, JSON.stringify(lib));
  } catch {
    // senza base la prossima fusione somma le due parti invece di rispettare
    // le cancellazioni: peggio, ma non si perde niente
  }
}

/** Ritardo fra l'ultima modifica alla libreria e la scrittura su OneDrive. */
const RITARDO = 4000;

export function useSincronia() {
  const { state, dispatch } = useStore();
  const [stato, setStato] = useState<StatoSincronia>(SINCRONIA_CONFIGURATA ? 'scollegata' : 'spenta');
  const [utente, setUtente] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<string>('');

  // lo stato più fresco, per non lavorare su una copia vecchia dentro le
  // funzioni asincrone (il classico giro che «riporta indietro» una modifica)
  const statoApp = useRef(state);
  statoApp.current = state;

  // un giro alla volta: due fusioni in parallelo si sovrascriverebbero
  const inCorso = useRef<Promise<void> | null>(null);
  // l'ultima libreria che sappiamo essere anche su OneDrive: serve a non
  // rilanciare un giro per ogni tasto premuto
  const sincronizzata = useRef<string>('');

  const giro = useCallback(async () => {
    if (!SINCRONIA_CONFIGURATA || !account()) return;
    setStato('in-corso');
    try {
      const locale = estraiLibreria(statoApp.current);
      const grezzo = await leggiJson(FILE_LIBRERIA);
      const remoto = grezzo ? leggiLibreria(grezzo) : libreriaVuota();
      // se su OneDrive non c'è ancora niente non esiste una storia comune da
      // arbitrare: si passa `null`, e le due parti si sommano
      const base = grezzo ? leggiBase() : null;
      const fusa = fondiLibrerie(locale, remoto, base);

      if (!stessoContenuto(fusa, locale)) dispatch({ type: 'libreria', lib: fusa });
      if (!grezzo || !stessoContenuto(fusa, remoto)) await scriviJson(FILE_LIBRERIA, fusa);

      scriviBase(fusa);
      sincronizzata.current = JSON.stringify([fusa.normative, fusa.unita, fusa.preimpostate]);
      setUltimo(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
      setStato('in-pari');
    } catch (e) {
      setStato(e instanceof ServeAccesso ? 'scaduta' : 'errore');
      if (!(e instanceof ServeAccesso)) console.error('Sincronizzazione OneDrive', e);
    }
  }, [dispatch]);

  /** Un giro alla volta, chiunque lo chieda. */
  const sincronizza = useCallback(() => {
    if (!inCorso.current) inCorso.current = giro().finally(() => (inCorso.current = null));
    return inCorso.current;
  }, [giro]);

  // avvio: se c'è già un account collegato si riprende da dove si era
  useEffect(() => {
    if (!SINCRONIA_CONFIGURATA) return;
    let vivo = true;
    initAuth()
      .then(() => {
        if (!vivo) return;
        const acc = account();
        setUtente(acc?.username ?? null);
        if (acc) void sincronizza();
      })
      .catch((e) => console.error('Avvio accesso Microsoft', e));
    return () => {
      vivo = false;
    };
  }, [sincronizza]);

  // la libreria è cambiata qui: dopo una pausa, la si porta su OneDrive
  const libreriaOra = JSON.stringify([state.normative, state.calcolatrice.unita, state.calcolatrice.preimpostate]);
  useEffect(() => {
    if (!SINCRONIA_CONFIGURATA || !account()) return;
    if (!sincronizzata.current || libreriaOra === sincronizzata.current) return;
    const id = window.setTimeout(() => void sincronizza(), RITARDO);
    return () => window.clearTimeout(id);
  }, [libreriaOra, sincronizza]);

  // si rientra nell'app, o torna la rete: buon momento per un giro
  useEffect(() => {
    if (!SINCRONIA_CONFIGURATA) return;
    const alRitorno = () => {
      if (document.visibilityState === 'visible' && account()) void sincronizza();
    };
    document.addEventListener('visibilitychange', alRitorno);
    window.addEventListener('online', alRitorno);
    return () => {
      document.removeEventListener('visibilitychange', alRitorno);
      window.removeEventListener('online', alRitorno);
    };
  }, [sincronizza]);

  const collega = useCallback(async () => {
    try {
      await login();
    } catch (e) {
      console.error('Login Microsoft', e);
      setStato('errore');
    }
  }, []);

  const scollega = useCallback(async () => {
    await logout();
    setUtente(null);
    setStato('scollegata');
    // la base se ne va con l'account: al prossimo collegamento non c'è una
    // storia comune da arbitrare, e sommare è l'unica scelta che non perde nulla
    try {
      localStorage.removeItem(CHIAVE_BASE);
    } catch { /* niente da togliere */ }
  }, []);

  return { stato, utente, ultimo, sincronizza, collega, scollega };
}
