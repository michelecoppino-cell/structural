import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { AZIONI_DEFAULT, calcolaAzioni, type InputAzioni, type RisultatiAzioni } from '../calc/azioni';
import {
  SOLLECITAZIONI_DEFAULT,
  calcolaSollecitazioni,
  type InputSollecitazioni,
  type RisultatiSollecitazioni,
} from '../calc/sollecitazioni';
import {
  ACCIAIO_SEZIONE_DEFAULT,
  FLESSIONE_CA_DEFAULT,
  TAGLIO_ARMATO_DEFAULT,
  TAGLIO_NON_ARMATO_DEFAULT,
  verificaAcciaioSezione,
  verificaFlessioneCA,
  verificaTaglioArmato,
  verificaTaglioNonArmato,
  type InputAcciaioSezione,
  type InputFlessioneCA,
  type InputTaglioArmato,
  type InputTaglioNonArmato,
  type RisultatiAcciaioSezione,
  type RisultatiFlessioneCA,
  type RisultatiTaglioArmato,
  type RisultatiTaglioNonArmato,
} from '../calc/verifiche';

export type TabId = 'azioni' | 'sollecitazioni' | 'verifiche' | 'costi';
export type MaterialeId = 'cls' | 'acciaio' | 'legno' | 'muratura';

export interface VoceCosto {
  id: string;
  categoria: string;
  descrizione: string;
  um: string;
  quantita: string;
  prezzo: string;
}

export interface Progetto {
  nome: string;
  commessa: string;
  localita: string;
  revisione: string;
}

export interface AppState {
  /** Versione dello schema, per la migrazione dei JSON importati. */
  schemaVersion: number;
  progetto: Progetto;
  tab: TabId;
  azioni: InputAzioni;
  sollecitazioni: InputSollecitazioni;
  verifiche: {
    materiale: MaterialeId;
    taglioNonArmato: InputTaglioNonArmato;
    taglioArmato: InputTaglioArmato;
    flessioneCA: InputFlessioneCA;
    acciaio: InputAcciaioSezione;
    /** VEd delle verifiche allineato al taglio calcolato in Sollecitazioni. */
    collegaSollecitazioni: boolean;
  };
  costi: VoceCosto[];
  ui: {
    open: Record<string, boolean>;
    exp: Record<string, boolean>;
    allDetails: Record<TabId, boolean>;
    /** Verifica visibile nella scheda Verifiche (una per volta). */
    verifica: string;
  };
}

export const SCHEMA_VERSION = 1;

export const STATO_INIZIALE: AppState = {
  schemaVersion: SCHEMA_VERSION,
  progetto: {
    nome: 'Nuova commessa',
    commessa: `${new Date().getFullYear()}-001`,
    localita: `${AZIONI_DEFAULT.comune} (${AZIONI_DEFAULT.prov})`,
    revisione: '0',
  },
  tab: 'azioni',
  azioni: AZIONI_DEFAULT,
  sollecitazioni: SOLLECITAZIONI_DEFAULT,
  verifiche: {
    materiale: 'cls',
    taglioNonArmato: TAGLIO_NON_ARMATO_DEFAULT,
    taglioArmato: TAGLIO_ARMATO_DEFAULT,
    flessioneCA: FLESSIONE_CA_DEFAULT,
    acciaio: ACCIAIO_SEZIONE_DEFAULT,
    collegaSollecitazioni: true,
  },
  costi: [
    { id: 'c1', categoria: 'Strutture', descrizione: 'Cls C25/30 per fondazioni', um: 'm³', quantita: '48', prezzo: '145.00' },
    { id: 'c2', categoria: 'Strutture', descrizione: 'Acciaio B450C in barre', um: 'kg', quantita: '5200', prezzo: '1.85' },
    { id: 'c3', categoria: 'Strutture', descrizione: 'Casseforme per elevazioni', um: 'm²', quantita: '320', prezzo: '32.00' },
    { id: 'c4', categoria: 'Scavi e movimenti terra', descrizione: 'Scavo a sezione obbligata', um: 'm³', quantita: '210', prezzo: '18.50' },
    { id: 'c5', categoria: 'Opere provvisionali', descrizione: 'Ponteggio di servizio', um: 'm²', quantita: '260', prezzo: '14.00' },
  ],
  ui: {
    open: { sisma: true, vari: true, 'soll-risultati': true, 'soll-inerzia': false },
    exp: {},
    allDetails: { azioni: false, sollecitazioni: false, verifiche: false, costi: false },
    verifica: 'taglio-non-armato',
  },
};

export type Action =
  | { type: 'tab'; tab: TabId }
  | { type: 'progetto'; patch: Partial<Progetto> }
  | { type: 'azioni'; patch: Partial<InputAzioni> }
  | { type: 'sollecitazioni'; patch: Partial<InputSollecitazioni> }
  | { type: 'verifiche'; patch: Partial<AppState['verifiche']> }
  | { type: 'taglioNonArmato'; patch: Partial<InputTaglioNonArmato> }
  | { type: 'taglioArmato'; patch: Partial<InputTaglioArmato> }
  | { type: 'flessioneCA'; patch: Partial<InputFlessioneCA> }
  | { type: 'acciaioSezione'; patch: Partial<InputAcciaioSezione> }
  | { type: 'costi'; voci: VoceCosto[] }
  | { type: 'toggleOpen'; id: string }
  | { type: 'toggleExp'; id: string }
  | { type: 'toggleAllDetails'; tab: TabId }
  | { type: 'verificaAttiva'; id: string }
  | { type: 'carica'; stato: AppState }
  | { type: 'reset' };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'tab':
      return { ...state, tab: action.tab };
    case 'progetto':
      return { ...state, progetto: { ...state.progetto, ...action.patch } };
    case 'azioni':
      return { ...state, azioni: { ...state.azioni, ...action.patch } };
    case 'sollecitazioni':
      return { ...state, sollecitazioni: { ...state.sollecitazioni, ...action.patch } };
    case 'verifiche':
      return { ...state, verifiche: { ...state.verifiche, ...action.patch } };
    case 'taglioNonArmato':
      return {
        ...state,
        verifiche: {
          ...state.verifiche,
          taglioNonArmato: { ...state.verifiche.taglioNonArmato, ...action.patch },
        },
      };
    case 'taglioArmato':
      return {
        ...state,
        verifiche: {
          ...state.verifiche,
          taglioArmato: { ...state.verifiche.taglioArmato, ...action.patch },
        },
      };
    case 'flessioneCA':
      return {
        ...state,
        verifiche: {
          ...state.verifiche,
          flessioneCA: { ...state.verifiche.flessioneCA, ...action.patch },
        },
      };
    case 'acciaioSezione':
      return {
        ...state,
        verifiche: {
          ...state.verifiche,
          acciaio: { ...state.verifiche.acciaio, ...action.patch },
        },
      };
    case 'costi':
      return { ...state, costi: action.voci };
    case 'toggleOpen':
      return {
        ...state,
        ui: { ...state.ui, open: { ...state.ui.open, [action.id]: !state.ui.open[action.id] } },
      };
    case 'toggleExp':
      return {
        ...state,
        ui: { ...state.ui, exp: { ...state.ui.exp, [action.id]: !state.ui.exp[action.id] } },
      };
    case 'toggleAllDetails':
      return {
        ...state,
        ui: {
          ...state.ui,
          allDetails: { ...state.ui.allDetails, [action.tab]: !state.ui.allDetails[action.tab] },
        },
      };
    case 'verificaAttiva':
      return { ...state, ui: { ...state.ui, verifica: action.id } };
    case 'carica':
      return migra(action.stato);
    case 'reset':
      return STATO_INIZIALE;
  }
}

/**
 * Fonde uno stato importato con quello di default: i campi assenti
 * (perché salvati da una versione precedente) tornano al valore iniziale.
 */
export function migra(raw: Partial<AppState>): AppState {
  const base = STATO_INIZIALE;
  return {
    schemaVersion: SCHEMA_VERSION,
    progetto: { ...base.progetto, ...raw.progetto },
    tab: raw.tab ?? base.tab,
    azioni: { ...base.azioni, ...raw.azioni },
    sollecitazioni: {
      ...base.sollecitazioni,
      ...raw.sollecitazioni,
      attive: { ...base.sollecitazioni.attive, ...raw.sollecitazioni?.attive },
    },
    verifiche: {
      ...base.verifiche,
      ...raw.verifiche,
      taglioNonArmato: { ...base.verifiche.taglioNonArmato, ...raw.verifiche?.taglioNonArmato },
      taglioArmato: { ...base.verifiche.taglioArmato, ...raw.verifiche?.taglioArmato },
      flessioneCA: { ...base.verifiche.flessioneCA, ...raw.verifiche?.flessioneCA },
      acciaio: { ...base.verifiche.acciaio, ...raw.verifiche?.acciaio },
    },
    costi: Array.isArray(raw.costi) && raw.costi.length ? raw.costi : base.costi,
    ui: { ...base.ui, ...raw.ui, verifica: raw.ui?.verifica || base.ui.verifica },
  };
}

const CHIAVE = 'structural:stato';

function statoIniziale(): AppState {
  try {
    const salvato = localStorage.getItem(CHIAVE);
    if (salvato) return migra(JSON.parse(salvato));
  } catch {
    // storage non disponibile o JSON corrotto: si riparte dai default
  }
  return STATO_INIZIALE;
}

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

/**
 * Risultati del motore di calcolo, computati una volta sola per modifica dello
 * stato e condivisi da tutte le schede: senza questo, ogni render di App,
 * Sollecitazioni e Verifiche risolveva daccapo la trave.
 */
export interface Calcoli {
  azioni: RisultatiAzioni;
  sollecitazioni: RisultatiSollecitazioni;
  taglioNonArmato: RisultatiTaglioNonArmato;
  taglioArmato: RisultatiTaglioArmato;
  flessioneCA: RisultatiFlessioneCA;
  acciaio: RisultatiAcciaioSezione;
  /** Taglio massimo in valore assoluto dalle Sollecitazioni (kN). */
  VEdSollecitazioni: number;
}

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

  const azioni = useMemo(() => calcolaAzioni(state.azioni), [state.azioni]);
  const sollecitazioni = useMemo(
    () => calcolaSollecitazioni(state.sollecitazioni, azioni),
    [state.sollecitazioni, azioni],
  );
  const VEdSollecitazioni = Math.abs(sollecitazioni.trave.VmaxAbs.val);

  // Con il collegamento attivo il VEd è un valore derivato: si calcola qui,
  // non si salva nello stato (che conserva solo il VEd inserito a mano).
  const collega = state.verifiche.collegaSollecitazioni;
  const VEd = VEdSollecitazioni.toFixed(1);

  const taglioNonArmato = useMemo(
    () =>
      verificaTaglioNonArmato(
        collega ? { ...state.verifiche.taglioNonArmato, VEd } : state.verifiche.taglioNonArmato,
      ),
    [state.verifiche.taglioNonArmato, collega, VEd],
  );
  const taglioArmato = useMemo(
    () =>
      verificaTaglioArmato(
        collega ? { ...state.verifiche.taglioArmato, VEd } : state.verifiche.taglioArmato,
      ),
    [state.verifiche.taglioArmato, collega, VEd],
  );

  const flessioneCA = useMemo(
    () => verificaFlessioneCA(state.verifiche.flessioneCA),
    [state.verifiche.flessioneCA],
  );
  const acciaio = useMemo(
    () => verificaAcciaioSezione(state.verifiche.acciaio),
    [state.verifiche.acciaio],
  );

  const calcoli = useMemo<Calcoli>(
    () => ({
      azioni,
      sollecitazioni,
      taglioNonArmato,
      taglioArmato,
      flessioneCA,
      acciaio,
      VEdSollecitazioni,
    }),
    [azioni, sollecitazioni, taglioNonArmato, taglioArmato, flessioneCA, acciaio, VEdSollecitazioni],
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

/**
 * Input effettivi delle verifiche: con il collegamento attivo il VEd è quello
 * calcolato in Sollecitazioni, altrimenti quello scritto a mano.
 */
export function inputVerifiche(state: AppState, VEdSollecitazioni: number) {
  const VEd = VEdSollecitazioni.toFixed(1);
  const collega = state.verifiche.collegaSollecitazioni;
  return {
    taglioNonArmato: collega
      ? { ...state.verifiche.taglioNonArmato, VEd }
      : state.verifiche.taglioNonArmato,
    taglioArmato: collega ? { ...state.verifiche.taglioArmato, VEd } : state.verifiche.taglioArmato,
  };
}
