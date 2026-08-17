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
import {
  PREIMPOSTATE_DEFAULT,
  RINOMINATE,
  SELEZIONI_DEFAULT,
  VOCI_DEFAULT,
  normalizzaVoci,
  rinominaInEspressione,
  svuotaCompilabili,
  type Preimpostata,
  type Selezioni,
  type VoceCalcolo,
} from '../calc/calcolatrice';
import { UNITA_DEFAULT, normalizzaElenco } from '../calc/unita';
import { normalizzaBlocchi, nuovoBlocco, type BloccoQuaderno } from '../calc/quaderno';
import type { LinkUtente } from '../data/normative';

export type TabId = 'azioni' | 'sollecitazioni' | 'verifiche' | 'costi' | 'quaderno' | 'normativa';
/** Capitoli di altre schede che si possono tirare dentro il quaderno. */
export type CapitoloId = 'azioni' | 'sollecitazioni' | 'verifiche' | 'calcolatrice' | 'costi';
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
  calcolatrice: StatoCalcolatrice;
  quaderno: StatoQuaderno;
  /** Norme e link aggiunti a mano nella scheda Normativa. */
  normative: LinkUtente[];
  ui: {
    open: Record<string, boolean>;
    exp: Record<string, boolean>;
    allDetails: Record<TabId, boolean>;
    /** Verifica visibile nella scheda Verifiche (una per volta). */
    verifica: string;
  };
}

export interface StatoCalcolatrice {
  /** Espressione in corso di scrittura. */
  espressione: string;
  /** Nome, nota e unità con cui verrà salvata l'operazione. */
  nome: string;
  nota: string;
  um: string;
  /** Operazioni salvate, in ordine: ognuna vede le variabili delle precedenti. */
  voci: VoceCalcolo[];
  /** Formule pronte all'uso, scritte sui nomi delle grandezze qui sopra. */
  preimpostate: Preimpostata[];
  /** Id delle formule preimpostate scelte: sono quelle che vanno nel riepilogo. */
  preScelte: string[];
  /** Unità di misura proposte: si scrivono a mano ma devono stare qui dentro. */
  unita: string[];
  /** Scelte a tendina (CLS, acciaio, ferro, bullone) da cui nascono le fisse. */
  selezioni: Selezioni;
  /** Tastierino a video: su cellulare c'è sempre, su desktop è a richiesta. */
  tastierino: boolean;
}

/**
 * Il foglio del Quaderno: i blocchi in ordine, più le due righe libere in
 * testa e a piè di pagina. I capitoli ripresi dalle altre schede non sono più
 * una spunta a parte — sono blocchi come gli altri, e stanno dove li si mette.
 */
export interface StatoQuaderno {
  /** Blocchi del foglio, nell'ordine in cui sono stati aggiunti. */
  blocchi: BloccoQuaderno[];
  /** Riga di testo libera in testa al foglio (oggetto, riferimento, data). */
  intestazione: string;
  /** Nota a piè di foglio, scritta a mano. */
  nota: string;
  /** Sfondo a quadretti del foglio, come la carta da calcolo. */
  quadretti: boolean;
}

export const SCHEMA_VERSION = 7;

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
  calcolatrice: {
    espressione: '',
    nome: '',
    nota: '',
    um: '',
    voci: VOCI_DEFAULT,
    preimpostate: PREIMPOSTATE_DEFAULT,
    preScelte: [],
    unita: UNITA_DEFAULT,
    selezioni: SELEZIONI_DEFAULT,
    tastierino: false,
  },
  // il quaderno parte bianco: quello che ci va dentro lo si tira dal pannello
  quaderno: {
    blocchi: [],
    intestazione: '',
    nota: '',
    quadretti: true,
  },
  normative: [],
  ui: {
    open: {
      sisma: true,
      vari: true,
      'soll-risultati': true,
      'soll-inerzia': true,
      // le sezioni del pannello del quaderno: aperte di serie, si chiudono a mano
      'q-compilare': true,
      'q-fisse': true,
      'q-libreria': true,
      'q-formule': true,
      'q-import': true,
      'q-capitoli': true,
      'q-tastierino': false,
    },
    exp: {},
    allDetails: {
      azioni: false,
      sollecitazioni: false,
      verifiche: false,
      costi: false,
      quaderno: false,
      normativa: false,
    },
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
  | { type: 'calcolatrice'; patch: Partial<StatoCalcolatrice> }
  | { type: 'quaderno'; patch: Partial<StatoQuaderno> }
  | { type: 'normative'; voci: LinkUtente[] }
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
    case 'calcolatrice':
      return { ...state, calcolatrice: { ...state.calcolatrice, ...action.patch } };
    case 'quaderno':
      return { ...state, quaderno: { ...state.quaderno, ...action.patch } };
    case 'normative':
      return { ...state, normative: action.voci };
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
  // Lo stato di apertura dei pannelli è parte del layout, non dei dati: se il
  // salvataggio viene da una versione precedente si riparte dai default nuovi.
  const aperture = raw.schemaVersion === SCHEMA_VERSION ? raw.ui?.open : undefined;
  return {
    schemaVersion: SCHEMA_VERSION,
    progetto: { ...base.progetto, ...raw.progetto },
    tab: TAB_VALIDE.find((t) => t === raw.tab) ?? tabRinominata(raw.tab) ?? base.tab,
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
    calcolatrice: {
      ...base.calcolatrice,
      ...raw.calcolatrice,
      // le operazioni salvate sono dati di commessa: si tengono tutte quelle
      // del file, comprese le liste vuote (l'utente può averle cancellate)
      voci: raw.calcolatrice
        ? normalizzaVoci(Array.isArray(raw.calcolatrice.voci) ? raw.calcolatrice.voci : [])
        : base.calcolatrice.voci,
      // anche le formule preimpostate sono dati di commessa: si tengono quelle
      // del file, comprese le liste vuote; i file di prima non ne hanno e
      // ripartono da quelle di serie
      preimpostate: Array.isArray(raw.calcolatrice?.preimpostate)
        ? raw.calcolatrice.preimpostate.map((v, i) => ({
            id: v?.id || `pre-${i}`,
            nome: v?.nome ?? '',
            // anche le formule salvate parlano dei γ con il nome vecchio
            espressione: rinominaInEspressione(v?.espressione ?? '', RINOMINATE),
            nota: v?.nota ?? '',
            um: v?.um ?? '',
          }))
        : base.calcolatrice.preimpostate,
      // le formule scelte sono dati di commessa: si tengono quelle del file,
      // liste vuote comprese; i file di prima non ne hanno e partono da nessuna
      preScelte: Array.isArray(raw.calcolatrice?.preScelte)
        ? raw.calcolatrice.preScelte.filter((id): id is string => typeof id === 'string')
        : [],
      // l'elenco delle unità è una preferenza: se il file non ne porta uno
      // valido si riparte da quello di serie
      unita: normalizzaElenco(
        Array.isArray(raw.calcolatrice?.unita) && raw.calcolatrice.unita.length
          ? raw.calcolatrice.unita
          : base.calcolatrice.unita,
      ),
      // le scelte a tendina sono dati di commessa: i file di prima non le
      // hanno e ripartono da quelle di serie
      selezioni: { ...base.calcolatrice.selezioni, ...raw.calcolatrice?.selezioni },
    },
    quaderno: quadernoMigrato(raw, base.quaderno),
    normative: (Array.isArray(raw.normative) ? raw.normative : []).flatMap((v, i) =>
      v?.url
        ? [{ id: v.id || `norma-${i}`, sigla: v.sigla ?? '', titolo: v.titolo ?? '', url: v.url }]
        : [],
    ),
    ui: {
      ...base.ui,
      ...raw.ui,
      open: { ...base.ui.open, ...aperture },
      allDetails: { ...base.ui.allDetails, ...raw.ui?.allDetails },
      verifica: raw.ui?.verifica || base.ui.verifica,
    },
  };
}

const CHIAVE = 'structural:stato';

const TAB_VALIDE: TabId[] = ['azioni', 'sollecitazioni', 'verifiche', 'costi', 'quaderno', 'normativa'];

/**
 * Schede di ieri: la Calcolatrice e l'Esporta sono diventate il Quaderno, e
 * chi arriva da un salvataggio, da un segnalibro o da una scorciatoia
 * dell'app installata deve trovarsi lì, non sulla prima scheda.
 */
const TAB_RINOMINATE: Record<string, TabId> = { calcolatrice: 'quaderno', esporta: 'quaderno' };

function tabRinominata(id: string | undefined): TabId | undefined {
  return id ? TAB_RINOMINATE[id] : undefined;
}

/**
 * Il quaderno di un salvataggio precedente. I file di prima non hanno blocchi:
 * portano le spunte della vecchia scheda Esporta, e quelle diventano i primi
 * blocchi del foglio — così un progetto riaperto esporta ancora i suoi
 * capitoli, nell'ordine in cui li mostrava l'app.
 */
function quadernoMigrato(raw: Partial<AppState>, base: StatoQuaderno): StatoQuaderno {
  const q = raw.quaderno;
  const vecchia = (raw as { esportazione?: { capitoli?: Record<string, boolean>; intestazione?: string; nota?: string; quadretti?: boolean } })
    .esportazione;

  if (q) {
    return {
      blocchi: normalizzaBlocchi(Array.isArray(q.blocchi) ? q.blocchi : []),
      intestazione: q.intestazione ?? '',
      nota: q.nota ?? '',
      quadretti: q.quadretti ?? base.quadretti,
    };
  }

  const spunte = vecchia?.capitoli ?? {};
  const blocchi = CAPITOLI_ORDINE.filter((id) => spunte[id]).map((id) => nuovoBlocco('capitolo', { fonte: id }));
  return {
    blocchi,
    intestazione: vecchia?.intestazione ?? '',
    nota: vecchia?.nota ?? '',
    quadretti: vecchia?.quadretti ?? base.quadretti,
  };
}

/** Ordine in cui i capitoli compaiono nell'app: lo usa anche la migrazione. */
const CAPITOLI_ORDINE: CapitoloId[] = ['azioni', 'sollecitazioni', 'verifiche', 'calcolatrice', 'costi'];

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
