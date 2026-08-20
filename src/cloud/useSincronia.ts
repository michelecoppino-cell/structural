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
import { fondiLibrerie, leggiLibreria, libreriaVuota, perditeIngiustificate, stessoContenuto } from './libreria';

/** Cosa contiene la libreria dopo l'ultimo giro riuscito. */
export interface Conteggio {
  normative: number;
  unita: number;
  preimpostate: number;
  grandezze: number;
}

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

/**
 * Vecchia casa della fotografia di sincronizzazione, quando stava per conto
 * suo. Ora vive dentro lo stato (`AppState.libreriaBase`), insieme alla
 * libreria che descrive: separati, i due potevano sopravvivere l'uno
 * all'altro, e una fotografia rimasta orfana di una libreria azzerata fa
 * cancellare da OneDrive voci che nessuno aveva cancellato. La chiave vecchia
 * si butta via una volta sola, per non lasciare in giro un dato che non è più
 * la verità di nessuno.
 */
const CHIAVE_BASE_VECCHIA = 'structural:libreria-base';

function buttaBaseVecchia(): void {
  try {
    localStorage.removeItem(CHIAVE_BASE_VECCHIA);
  } catch {
    // niente da togliere
  }
}

/** Ritardo fra l'ultima modifica alla libreria e la scrittura su OneDrive. */
const RITARDO = 4000;

export function useSincronia() {
  const { state, dispatch } = useStore();
  const [stato, setStato] = useState<StatoSincronia>(SINCRONIA_CONFIGURATA ? 'scollegata' : 'spenta');
  const [utente, setUtente] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<string>('');
  // Cosa ha detto Microsoft, parola per parola. Il pannello lo mostra invece di
  // tenerselo nella console: questa app si usa anche dal telefono, dove una
  // console non c'è, ed è lì che serve sapere se è un permesso mancante o
  // davvero la rete.
  const [dettaglio, setDettaglio] = useState<string>('');
  // Quante voci ci sono nella libreria dopo il giro. Sembra un dettaglio
  // estetico e non lo è: è la sola cosa che, da un dispositivo, distingue
  // «l'altro dispositivo non ha ancora scritto» da «sto guardando il OneDrive
  // di un altro account». Senza, quel dubbio si risolve solo indovinando.
  const [conteggio, setConteggio] = useState<Conteggio | null>(null);

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
      const base = grezzo ? statoApp.current.libreriaBase : null;
      const fusa = fondiLibrerie(locale, remoto, base);

      setDettaglio('');
      // libreria e fotografia in un solo passaggio, prima di scrivere: se la
      // scrittura fallisce, la fotografia resta quella di prima e il giro
      // successivo riprova da capo invece di credere a una sincronizzazione
      // mai avvenuta
      // Ultimo controllo prima di scrivere: nessuna voce deve sparire dal file
      // senza che qualcuno l'abbia cancellata davvero. Se ne trova una, il
      // giro si ferma e lo dice, invece di consegnare a OneDrive una libreria
      // monca che il dispositivo successivo prenderebbe per buona.
      const perse = perditeIngiustificate(remoto, fusa, base);
      if (perse.length) {
        throw new Error(
          `Sincronizzazione fermata per non perdere ${perse.length} ${perse.length === 1 ? 'voce' : 'voci'} (${perse.slice(0, 3).join(', ')}${perse.length > 3 ? '…' : ''}). Il file su OneDrive non è stato toccato.`,
        );
      }

      if (!grezzo || !stessoContenuto(fusa, remoto)) {
        await scriviJson(FILE_LIBRERIA, fusa);
      }
      dispatch({ type: 'libreria', lib: fusa, base: fusa });
      buttaBaseVecchia();
      setConteggio({
        normative: fusa.normative.length,
        unita: fusa.unita.length,
        preimpostate: fusa.preimpostate.length,
        grandezze: fusa.grandezze.length,
      });
      sincronizzata.current = JSON.stringify([fusa.normative, fusa.unita, fusa.preimpostate, fusa.grandezze]);
      setUltimo(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
      setStato('in-pari');
    } catch (e) {
      setStato(e instanceof ServeAccesso ? 'scaduta' : 'errore');
      setDettaglio(e instanceof Error ? e.message : String(e));
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
  // le grandezze entrano qui dalla stessa porta da cui escono verso OneDrive:
  // `estraiLibreria` toglie i valori delle compilabili, così scrivere la base
  // della trave non fa partire un giro di sincronizzazione per un numero che
  // sul file non ci va comunque
  const libreriaOra = JSON.stringify([
    state.normative,
    state.calcolatrice.unita,
    state.calcolatrice.preimpostate,
    estraiLibreria(state).grandezze,
  ]);
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
    // la fotografia se ne va con l'account: al prossimo collegamento non c'è
    // una storia comune da arbitrare, e sommare è l'unica scelta che non
    // perde nulla
    dispatch({ type: 'libreria', lib: estraiLibreria(statoApp.current), base: null });
    buttaBaseVecchia();
  }, [dispatch]);

  return { stato, utente, ultimo, dettaglio, conteggio, sincronizza, collega, scollega };
}
