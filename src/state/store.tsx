/**
 * Lo stato dell'app dentro React: il provider, il salvataggio automatico in
 * localStorage e i due hook. Le regole — com'è fatto un progetto, la
 * migrazione, i calcoli — stanno in `stato.ts`, che non dipende da React.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { calcola, migra, reducer, STATO_INIZIALE, TAB_VALIDE, tabRinominata } from './stato';
import type { Action, AppState, Calcoli, TabId } from './stato';
import { svuotaCompilabili } from '../calc/calcolatrice';

export * from './stato';

/** Chiave del salvataggio automatico in localStorage. */
export const CHIAVE = 'structural:stato';

/**
 * Butta via il salvataggio automatico: è quello che ripropone i campi già
 * compilati all'apertura successiva. Va usato insieme all'azione `reset`, che
 * riporta lo stato in memoria a quello di partenza — cancellare solo il
 * salvataggio non basta, perché la seduta in corso lo riscriverebbe subito.
 */
export function svuotaMemoria(): void {
  try {
    localStorage.removeItem(CHIAVE);
  } catch {
    // storage non disponibile: non c'era niente da cancellare
  }
}

/** Scheda chiesta da `?scheda=…` — le scorciatoie dell'app installata. */
function tabDaUrl(): TabId | undefined {
  try {
    const q = new URLSearchParams(window.location.search).get('scheda');
    return TAB_VALIDE.find((t) => t === q) ?? tabRinominata(q ?? undefined);
  } catch {
    return undefined;
  }
}

function statoIniziale(): AppState {
  const richiesta = tabDaUrl();
  try {
    const salvato = localStorage.getItem(CHIAVE);
    if (salvato) {
      const ripreso = migra(JSON.parse(salvato));
      // le grandezze compilabili valgono per la seduta: si riapre con la
      // colonna di sinistra pulita, mentre i γ e le operazioni restano
      const stato: AppState = {
        ...ripreso,
        calcolatrice: { ...ripreso.calcolatrice, voci: svuotaCompilabili(ripreso.calcolatrice.voci) },
      };
      return richiesta ? { ...stato, tab: richiesta } : stato;
    }
  } catch {
    // storage non disponibile o JSON corrotto: si riparte dai default
  }
  return richiesta ? { ...STATO_INIZIALE, tab: richiesta } : STATO_INIZIALE;
}

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

const CalcoliContext = createContext<Calcoli | null>(null);

/** Ritardo di scrittura su localStorage: una sola serializzazione per pausa. */
const RITARDO_SALVATAGGIO = 300;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, statoIniziale);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(CHIAVE, JSON.stringify(state));
      } catch {
        // quota esaurita o modalità privata: la persistenza è best effort
      }
    }, RITARDO_SALVATAGGIO);
    return () => window.clearTimeout(id);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  // Si ricalcola solo quando cambiano i dati che entrano nei conti: aprire un
  // pannello o cambiare scheda non risolve daccapo la trave. Le formule stanno
  // in `calcola`, la stessa che usa chi apre il progetto fuori dall'app.
  const calcoli = useMemo<Calcoli>(
    () => calcola(state),
    [state.azioni, state.sollecitazioni, state.verifiche],
  );

  return (
    <StoreContext.Provider value={value}>
      <CalcoliContext.Provider value={calcoli}>{children}</CalcoliContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore va usato dentro <StoreProvider>');
  return ctx;
}

export function useCalcoli() {
  const ctx = useContext(CalcoliContext);
  if (!ctx) throw new Error('useCalcoli va usato dentro <StoreProvider>');
  return ctx;
}

