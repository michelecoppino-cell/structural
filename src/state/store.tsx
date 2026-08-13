import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { AZIONI_DEFAULT, type InputAzioni } from '../calc/azioni';
import { SOLLECITAZIONI_DEFAULT, type InputSollecitazioni } from '../calc/sollecitazioni';
import {
  TAGLIO_ARMATO_DEFAULT,
  TAGLIO_NON_ARMATO_DEFAULT,
  type InputTaglioArmato,
  type InputTaglioNonArmato,
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
    /** VEd delle verifiche allineato al taglio calcolato in Sollecitazioni. */
    collegaSollecitazioni: boolean;
  };
  costi: VoceCosto[];
  ui: {
    open: Record<string, boolean>;
    exp: Record<string, boolean>;
    allDetails: Record<TabId, boolean>;
  };
}

export const SCHEMA_VERSION = 1;

export const STATO_INIZIALE: AppState = {
  schemaVersion: SCHEMA_VERSION,
  progetto: {
    nome: 'Nuova commessa',
    commessa: `${new Date().getFullYear()}-001`,
    localita: "L'Aquila (AQ)",
    revisione: '0',
  },
  tab: 'azioni',
  azioni: AZIONI_DEFAULT,
  sollecitazioni: SOLLECITAZIONI_DEFAULT,
  verifiche: {
    materiale: 'cls',
    taglioNonArmato: TAGLIO_NON_ARMATO_DEFAULT,
    taglioArmato: TAGLIO_ARMATO_DEFAULT,
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
    open: { sisma: true, vari: true, taglio_non_armato: true },
    exp: {},
    allDetails: { azioni: false, sollecitazioni: false, verifiche: false, costi: false },
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
  | { type: 'costi'; voci: VoceCosto[] }
  | { type: 'toggleOpen'; id: string }
  | { type: 'toggleExp'; id: string }
  | { type: 'toggleAllDetails'; tab: TabId }
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
    },
    costi: Array.isArray(raw.costi) && raw.costi.length ? raw.costi : base.costi,
    ui: { ...base.ui, ...raw.ui },
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, statoIniziale);

  useEffect(() => {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(state));
    } catch {
      // quota esaurita o modalità privata: la persistenza è best effort
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore va usato dentro <StoreProvider>');
  return ctx;
}
