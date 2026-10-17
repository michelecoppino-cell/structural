/**
 * Il motore dell'app visto da fuori: quello che serve a chi apre un progetto
 * senza l'app davanti — oggi il connettore della Mente digitale, cioè una chat
 * con Claude — per leggerlo, cambiarlo e ricalcolarlo con gli **stessi numeri**
 * delle schede.
 *
 * Non ci sono formule qui dentro, e non devono nascerne: tutto passa dalle
 * funzioni che usano le schede (`calcola`, `relazione.ts`, il Quaderno). Un
 * conto rifatto qui sarebbe un secondo numero per la stessa cosa, e il giorno
 * in cui i due non tornano non si saprebbe a quale credere.
 *
 * Quello che c'è in più è la **guardia sui dati in ingresso**. Il motore è
 * scritto per un'interfaccia che offre solo scelte valide: una zona di neve
 * che non c'è diventa in silenzio quella di serie (`ZONE_NEVE[x] ?? …`), e a
 * schermo non succede mai. Da una chat succede — «zona I» invece di
 * «I — Alpina» — e il risultato sarebbe un numero giusto per un'altra zona,
 * senza un avviso. Qui ogni campo a scelta si controlla contro il suo elenco:
 * si accetta la sigla quando indica una voce sola, e altrimenti si rifiuta
 * dicendo quali ci sono.
 *
 * Si impacchetta in un file solo con `npm run motore` (`vite.motore.config.ts`):
 * niente React, niente browser, gira in Node e in un Worker.
 */

import {
  STATO_INIZIALE,
  SCHEMA_VERSION,
  calcola,
  migra,
  applicaLibreria,
  type AppState,
  type CapitoloId,
  type TabId,
} from '../state/stato';
import {
  CAPITOLI,
  blocchiCapitolo,
  esitiVerifiche,
  foglioQuaderno,
  importiDaSchede,
  quadernoCalcolato,
  sorgentiQuaderno,
  testoBlocchi,
  testoFoglio,
  testoRelazione,
} from '../calc/relazione';
import { documentoHtml, documentoTesto, nomeFile, nomeFileProgetto } from '../calc/esportazione';
import {
  formattaIn,
  nomiMancanti,
  nomiRichiesti,
  ricalcola,
  testoVoce,
  variabili,
  vociDaSelezioni,
  type VoceCalcolo,
} from '../calc/calcolatrice';
import { nuovoBlocco, ricalcolaQuaderno, testoBlocco, type BloccoQuaderno } from '../calc/quaderno';
import { leggiCalcolo } from '../base/calcolo';
import { normalizza } from '../base/schede';
import { leggiLibreria, type Libreria } from '../cloud/libreria';
import { COMUNI, type Comune } from '../data/comuni';
import { CAT, CU, ESPOSIZIONE, ST, URTI, VB0, ZONE_NEVE } from '../data/ntc2018';
import { ACCIAI, ACCIAIO_ARMATURA, ACCIAIO_STRUTTURALE, CLS } from '../data/materiali';
import { TIPI_PROFILO, taglieDisponibili, type TipoProfilo } from '../data/profili-acciaio';
import { STATI_LIMITE, SUOLI } from '../calc/sismica';
import { SCHEMI, SCHEMI_BY_ID } from '../calc/trave';
import { COMBINAZIONI } from '../calc/sollecitazioni';
import { SCHEMI_FRECCIA } from '../calc/verifiche';
import { CONDIZIONI_CARICO } from '../calc/instabilita';
import { SCHEMI_VINCOLI } from '../calc/libera-inflessione';

export { SCHEMA_VERSION, CAPITOLI, nomeFile, nomeFileProgetto, documentoHtml, documentoTesto, leggiLibreria };
export type { AppState, Libreria };

/* ───────────────────────────── aprire un progetto ───────────────────────────── */

/**
 * Un progetto da un JSON — testo o già letto — com'è uscito da «Esporta JSON»
 * o da «Salva in commessa», di qualunque versione. Passa da `migra`, la stessa
 * strada dell'«Importa» dell'app: i campi che mancano tornano a quelli di
 * serie, e i link della libreria passano da `urlSicuro`.
 */
export function apriProgetto(raw: unknown): AppState {
  let dati = raw;
  if (typeof raw === 'string') {
    try {
      dati = JSON.parse(raw.replace(/^﻿/, ''));
    } catch {
      throw new Error('Il file non è un JSON valido.');
    }
  }
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) {
    throw new Error('Il file non è un progetto del predimensionatore.');
  }
  const o = dati as Record<string, unknown>;
  // un JSON qualsiasi passerebbe da `migra` e uscirebbe come un progetto di
  // serie: senza nessuna delle chiavi di un progetto non è un progetto
  if (!['progetto', 'azioni', 'sollecitazioni', 'verifiche', 'quaderno', 'calcolatrice'].some((k) => k in o)) {
    throw new Error('Il file non è un progetto del predimensionatore: mancano progetto, azioni e verifiche.');
  }
  return migra(o as Partial<AppState>);
}

/**
 * Un progetto nuovo, con la libreria personale dentro se c'è: è quello che si
 * troverebbe nell'app dopo «Svuota tutto». Il sito di partenza è quello di
 * serie (Fagagna), e si cambia con `modifica`.
 */
export function progettoNuovo(libreria?: Libreria | null): AppState {
  const nuovo = migra(structuredClone(STATO_INIZIALE));
  return libreria ? applicaLibreria(nuovo, libreria) : nuovo;
}

/** Il JSON da scrivere: lo stesso di «Esporta JSON». */
export function jsonProgetto(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/* ─────────────────────────────── le sezioni ─────────────────────────────── */

/**
 * Le parti del progetto che si leggono e si scrivono da fuori, col percorso
 * dentro lo stato. Sono i dati in ingresso delle schede, e nient'altro: lo
 * stato dei pannelli aperti, la scheda attiva, la libreria sincronizzata non
 * sono del calcolo.
 */
const SEZIONI: Record<string, string[]> = {
  progetto: ['progetto'],
  azioni: ['azioni'],
  sollecitazioni: ['sollecitazioni'],
  'sollecitazioni.attive': ['sollecitazioni', 'attive'],
  verifiche: ['verifiche'],
  'verifiche.taglioNonArmato': ['verifiche', 'taglioNonArmato'],
  'verifiche.taglioArmato': ['verifiche', 'taglioArmato'],
  'verifiche.flessioneCA': ['verifiche', 'flessioneCA'],
  'verifiche.acciaio': ['verifiche', 'acciaio'],
  'verifiche.stabilita': ['verifiche', 'stabilita'],
  'verifiche.deformazione': ['verifiche', 'deformazione'],
  selezioni: ['calcolatrice', 'selezioni'],
  quaderno: ['quaderno'],
};

export const NOMI_SEZIONI = [...Object.keys(SEZIONI), 'grandezze'];

/** «flessioneCA» per «verifiche.flessioneCA»: il nome corto basta, se è uno solo. */
function nomeSezione(nome: string): string | null {
  if (nome in SEZIONI || nome === 'grandezze') return nome;
  const lunghi = Object.keys(SEZIONI).filter((k) => k.endsWith(`.${nome}`));
  return lunghi.length === 1 ? lunghi[0] : null;
}

const dentro = (o: unknown, percorso: string[]): Record<string, unknown> =>
  percorso.reduce<Record<string, unknown>>((acc, k) => acc[k] as Record<string, unknown>, o as Record<string, unknown>);

/** Campi scrivibili di una sezione: i valori semplici del progetto di serie. */
function campiDi(sezione: string): Record<string, string | boolean | number> {
  const base = dentro(STATO_INIZIALE, SEZIONI[sezione]);
  const out: Record<string, string | boolean | number> = {};
  for (const [k, v] of Object.entries(base)) {
    if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number') out[k] = v;
  }
  // la cartella della commessa non c'è nel progetto di serie: nasce salvando
  if (sezione === 'progetto') out.cartella = '';
  // i blocchi del quaderno si scrivono con `aggiungiAlQuaderno`, non come campo
  if (sezione === 'quaderno') delete out.quadretti;
  return out;
}

/**
 * I campi a scelta, con l'elenco delle voci ammesse. Sono le stesse tabelle
 * da cui le schede fanno le loro tendine.
 */
const chiavi = (o: object) => Object.keys(o);
const MODI_BETA = [...SCHEMI_VINCOLI.map((s) => s.id), 'telaio-fissi', 'telaio-mobili', 'manuale'];

export const OPZIONI: Record<string, Record<string, string[]>> = {
  azioni: {
    sl: STATI_LIMITE.map((s) => s.id),
    suolo: chiavi(SUOLI),
    topo: chiavi(ST),
    cu: chiavi(CU),
    zneve: chiavi(ZONE_NEVE),
    zvento: chiavi(VB0),
    espo: chiavi(ESPOSIZIONE),
    cat: chiavi(CAT),
    urtoScenario: chiavi(URTI),
  },
  sollecitazioni: {
    schema: SCHEMI.map((s) => s.id),
    orientamento: ['orizzontale', 'verticale'],
    combinazione: COMBINAZIONI.map((c) => c.id),
    sezioneMateriale: ['manuale', 'cls', 'acciaio'],
    sezioneCls: chiavi(CLS),
    sezioneTipoProfilo: TIPI_PROFILO.map((t) => t.id),
    sezioneAsse: ['forte', 'debole'],
  },
  verifiche: { materiale: ['cls', 'acciaio', 'legno', 'muratura'] },
  'verifiche.taglioNonArmato': { cls: chiavi(CLS) },
  'verifiche.taglioArmato': { cls: chiavi(CLS) },
  'verifiche.flessioneCA': { cls: chiavi(CLS), acciaio: chiavi(ACCIAIO_ARMATURA) },
  'verifiche.acciaio': { tipoProfilo: TIPI_PROFILO.map((t) => t.id), acciaio: chiavi(ACCIAIO_STRUTTURALE) },
  'verifiche.stabilita': {
    modoY: MODI_BETA,
    modoZ: MODI_BETA,
    formatura: ['caldo', 'freddo'],
    carico: CONDIZIONI_CARICO.map((c) => c.id),
    puntoCarico: ['superiore', 'baricentro', 'inferiore'],
    modulo: ['automatico', 'elastico', 'plastico'],
    modoMcr: ['automatico', 'manuale'],
  },
  'verifiche.deformazione': { schema: SCHEMI_FRECCIA.map((s) => s.id) },
  selezioni: {
    cls: ['', ...chiavi(CLS)],
    acciaio: ['', ...chiavi(ACCIAI)],
    profiloTipo: TIPI_PROFILO.map((t) => t.id),
  },
};

/**
 * La voce dell'elenco che un valore indica: uguale, uguale a meno di
 * maiuscole e accenti, o l'unica che comincia così seguita da uno spazio o da
 * un trattino («I» → «I — Alpina», «B1» → «B1 — Uffici…»). Più di una, o
 * nessuna: `null`, e chi chiama lo dice.
 */
function voceDi(valore: string, elenco: string[]): string | null {
  if (elenco.includes(valore)) return valore;
  const n = normalizza(valore);
  const uguali = elenco.filter((v) => normalizza(v) === n);
  if (uguali.length === 1) return uguali[0];
  if (!n) return null;
  const testa = elenco.filter((v) => {
    const nv = normalizza(v);
    return nv.startsWith(n) && /^[\s—–-]/.test(nv.slice(n.length));
  });
  return testa.length === 1 ? testa[0] : null;
}

/* ─────────────────────────────── i comuni ─────────────────────────────── */

/** I comuni che un nome indica: per nome intero, poi per inizio del nome. */
export function cercaComuni(nome: string, prov = '', regione = ''): Comune[] {
  const n = normalizza(nome);
  const nelPosto = COMUNI.filter(
    (c) =>
      (!prov || normalizza(c.sigla) === normalizza(prov) || normalizza(c.provincia) === normalizza(prov)) &&
      (!regione || normalizza(c.regione) === normalizza(regione)),
  );
  const esatti = nelPosto.filter((c) => normalizza(c.nome) === n);
  return esatti.length ? esatti : nelPosto.filter((c) => normalizza(c.nome).startsWith(n)).slice(0, 12);
}

const comeComune = (c: Comune) => `${c.nome} (${c.sigla}, ${c.regione})`;

/* ─────────────────────────────── modificare ─────────────────────────────── */

export interface Cambio {
  campo: string;
  prima: string;
  dopo: string;
}

export interface EsitoModifica {
  stato: AppState;
  cambi: Cambio[];
}

const comeTesto = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));

/**
 * Applica dei dati a un progetto, per sezione:
 * `{ azioni: { comune: 'Udine', suolo: 'B' }, flessioneCA: { MEd: '210' } }`.
 *
 * Tutto o niente: un campo che non esiste, una scelta che non è in elenco, un
 * comune che non si trova fermano l'intera modifica, e l'errore li elenca
 * tutti insieme — correggere uno sbaglio per volta, da una chat, vuol dire
 * cinque giri per cinque campi.
 *
 * Il comune è l'unico campo che ne trascina altri: regione e provincia si
 * trovano da lui, e la località del progetto si aggiorna come fa la scheda
 * Azioni. `grandezze` scrive il valore delle grandezze del Quaderno per nome
 * (`{ b: '0,30' }`): quelle che non ci sono nascono da compilare.
 */
export function modifica(state: AppState, dati: Record<string, unknown>): EsitoModifica {
  const stato = structuredClone(state);
  const cambi: Cambio[] = [];
  const errori: string[] = [];

  for (const [grezzo, valori] of Object.entries(dati ?? {})) {
    const sezione = nomeSezione(grezzo);
    if (!sezione) {
      errori.push(`sezione «${grezzo}» sconosciuta: ci sono ${NOMI_SEZIONI.join(', ')}`);
      continue;
    }
    if (!valori || typeof valori !== 'object' || Array.isArray(valori)) {
      errori.push(`${sezione}: serve un oggetto { campo: valore }`);
      continue;
    }
    if (sezione === 'grandezze') {
      scriviGrandezze(stato, valori as Record<string, unknown>, cambi, errori);
      continue;
    }

    const campi = campiDi(sezione);
    const opzioni = OPZIONI[sezione] ?? {};
    const obj = dentro(stato, SEZIONI[sezione]);
    const voluti = { ...(valori as Record<string, unknown>) };

    if (sezione === 'azioni' && voluti.comune !== undefined) {
      const trovati = cercaComuni(String(voluti.comune), String(voluti.prov ?? ''), String(voluti.regione ?? ''));
      if (trovati.length === 1) {
        voluti.comune = trovati[0].nome;
        voluti.prov = trovati[0].sigla;
        voluti.regione = trovati[0].regione;
      } else if (trovati.length === 0) {
        errori.push(`azioni.comune: nessun comune «${voluti.comune}»`);
        continue;
      } else {
        errori.push(
          `azioni.comune: «${voluti.comune}» può essere ${trovati.map(comeComune).join('; ')} — aggiungi «prov»`,
        );
        continue;
      }
    }

    for (const [campo, v] of Object.entries(voluti)) {
      const nome = `${sezione}.${campo}`;
      if (!(campo in campi)) {
        errori.push(`${nome}: campo sconosciuto (ci sono ${Object.keys(campi).join(', ')})`);
        continue;
      }
      const tipo = typeof campi[campo];
      let nuovo: unknown;
      if (tipo === 'boolean') {
        if (typeof v === 'boolean') nuovo = v;
        else if (v === 'true' || v === 'sì' || v === 'si') nuovo = true;
        else if (v === 'false' || v === 'no') nuovo = false;
        else {
          errori.push(`${nome}: vuole true o false`);
          continue;
        }
      } else if (tipo === 'number') {
        const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
        if (!Number.isFinite(n)) {
          errori.push(`${nome}: vuole un numero`);
          continue;
        }
        nuovo = n;
      } else {
        if (v === null || typeof v === 'object') {
          errori.push(`${nome}: vuole un testo o un numero`);
          continue;
        }
        nuovo = String(v).trim();
        const elenco = opzioni[campo];
        if (elenco) {
          const voce = voceDi(nuovo as string, elenco);
          if (voce === null) {
            errori.push(`${nome}: «${nuovo}» non è fra ${elenco.filter(Boolean).join(' | ')}`);
            continue;
          }
          nuovo = voce;
        }
      }
      if (obj[campo] !== nuovo) {
        cambi.push({ campo: nome, prima: comeTesto(obj[campo] ?? ''), dopo: comeTesto(nuovo) });
        obj[campo] = nuovo;
      }
    }

    // la località segue il comune, come nella scheda Azioni — a meno che non
    // la si scriva apposta nella stessa modifica
    if (sezione === 'azioni' && voluti.comune !== undefined && (dati.progetto as Record<string, unknown>)?.localita === undefined) {
      const localita = `${stato.azioni.comune} (${stato.azioni.prov})`;
      if (stato.progetto.localita !== localita) {
        cambi.push({ campo: 'progetto.localita', prima: stato.progetto.localita, dopo: localita });
        stato.progetto.localita = localita;
      }
    }
  }

  // le taglie dipendono dal tipo di profilo: si guardano a modifica finita,
  // quando tipo e taglia sono tutt'e due quelli nuovi
  const taglia = (tipo: TipoProfilo, valore: string, nome: string) => {
    const ammesse = taglieDisponibili(tipo);
    if (!valore || !ammesse.length) return valore;
    const voce = voceDi(valore, ammesse) ?? voceDi(`${tipo} ${valore}`, ammesse);
    if (voce === null) errori.push(`${nome}: «${valore}» non è una taglia ${tipo} (ci sono ${ammesse.join(', ')})`);
    return voce ?? valore;
  };
  if (cambi.some((c) => /^sollecitazioni\.sezione(TipoProfilo|Profilo)$/.test(c.campo))) {
    stato.sollecitazioni.sezioneProfilo = taglia(
      stato.sollecitazioni.sezioneTipoProfilo,
      stato.sollecitazioni.sezioneProfilo,
      'sollecitazioni.sezioneProfilo',
    );
  }
  if (cambi.some((c) => /^verifiche\.acciaio\.(tipoProfilo|profilo)$/.test(c.campo))) {
    stato.verifiche.acciaio.profilo = taglia(
      stato.verifiche.acciaio.tipoProfilo,
      stato.verifiche.acciaio.profilo,
      'verifiche.acciaio.profilo',
    );
  }
  if (cambi.some((c) => /^selezioni\.profilo(Tipo|Taglia)$/.test(c.campo))) {
    const s = stato.calcolatrice.selezioni;
    s.profiloTaglia = taglia(s.profiloTipo, s.profiloTaglia, 'selezioni.profiloTaglia');
  }

  if (errori.length) throw new Error(`Niente cambiato, perché:\n- ${errori.join('\n- ')}`);
  return { stato, cambi };
}

/** Il valore delle grandezze del pannello, per nome. */
function scriviGrandezze(stato: AppState, valori: Record<string, unknown>, cambi: Cambio[], errori: string[]) {
  const voci = stato.calcolatrice.voci;
  for (const [nome, v] of Object.entries(valori)) {
    if (v === null || typeof v === 'object') {
      errori.push(`grandezze.${nome}: vuole un valore o un'espressione`);
      continue;
    }
    const espressione = String(v).trim();
    const voce = voci.find((x) => x.nome.trim() === nome);
    if (voce) {
      if (voce.tipo === 'operazione') {
        errori.push(`grandezze.${nome}: è un'operazione salvata, non un dato da compilare`);
        continue;
      }
      if (voce.espressione !== espressione) {
        cambi.push({ campo: `grandezze.${nome}`, prima: voce.espressione, dopo: espressione });
        voce.espressione = espressione;
      }
    } else {
      voci.push({ id: `calc-${nome}-${voci.length}`, nome, espressione, nota: '', um: '', tipo: 'compilabile' });
      cambi.push({ campo: `grandezze.${nome}`, prima: '(non c’era)', dopo: espressione });
    }
  }
}

/* ─────────────────────────────── leggere ─────────────────────────────── */

/** I dati in ingresso di una sezione, con le voci ammesse dove è una scelta. */
export function datiSezione(state: AppState, nome: string): {
  sezione: string;
  dati: Record<string, unknown>;
  opzioni: Record<string, string[]>;
} {
  const sezione = nomeSezione(nome);
  if (!sezione) throw new Error(`Sezione «${nome}» sconosciuta: ci sono ${NOMI_SEZIONI.join(', ')}.`);
  if (sezione === 'grandezze') {
    return {
      sezione,
      dati: Object.fromEntries(grandezzeQuaderno(state).map((v) => [v.nome || v.id, v.testo])),
      opzioni: {},
    };
  }
  const obj = dentro(state, SEZIONI[sezione]);
  const campi = campiDi(sezione);
  return {
    sezione,
    dati: Object.fromEntries(Object.keys(campi).map((k) => [k, obj[k] ?? ''])),
    opzioni: OPZIONI[sezione] ?? {},
  };
}

/** Le grandezze del pannello del Quaderno, calcolate. */
export function grandezzeQuaderno(state: AppState) {
  const c = state.calcolatrice;
  return ricalcola([...vociDaSelezioni(c.selezioni), ...c.voci], c.unita).map((v) => ({
    nome: v.nome.trim(),
    id: v.id,
    tipo: v.tipo ?? '',
    valore: v.valore,
    um: v.umEffettiva,
    testo: testoVoce(v),
    errore: v.errore,
  }));
}

export interface EsitoVerifica {
  verifica: string;
  sfruttamento: number;
  ok: boolean;
}

/**
 * Gli esiti di tutte le verifiche del materiale scelto, con lo sfruttamento.
 * Le verifiche di un materiale non scelto restano fuori: i loro dati sono
 * quelli di serie, e un «non verificato» su una sezione in acciaio che nessuno
 * ha disegnato è un allarme falso.
 */
export function esiti(state: AppState): EsitoVerifica[] {
  const c = calcola(state);
  const e = (verifica: string, x: { sfruttamento: number; ok: boolean }) => ({
    verifica,
    sfruttamento: x.sfruttamento,
    ok: x.ok,
  });
  if (state.verifiche.materiale === 'cls') {
    // gli esiti del taglio vengono da `esitiVerifiche`, che conta come non
    // soddisfatta anche una verifica con dati non validi — come il badge
    const badge = Object.fromEntries(esitiVerifiche(state).map((x) => [x.label, x.ok]));
    return [
      { ...e('Taglio senza staffe', c.taglioNonArmato.esito), ok: badge['Taglio senza staffe'] },
      { ...e('Taglio con staffe', c.taglioArmato.esito), ok: badge['Taglio con staffe'] },
      { ...e('Armatura minima a taglio', c.taglioArmato.esitoAswMin), ok: badge['Armatura minima'] },
      { ...e('Passo massimo delle staffe', c.taglioArmato.esitoPasso), ok: badge['Passo massimo'] },
      e('Flessione c.a.', c.flessioneCA.esito),
    ];
  }
  if (state.verifiche.materiale === 'acciaio') {
    return [
      e('Sezione — flessione', c.acciaio.esitoFlessione),
      e('Sezione — compressione', c.acciaio.esitoCompressione),
      e('Sezione — taglio', c.acciaio.esitoTaglio),
      e('Instabilità di punta', c.instabilitaPunta.esito),
      e('Instabilità flesso-torsionale', c.instabilitaLT.esito),
      e('Pressoflessione', c.pressoflessione.esito),
      e('Deformabilità', c.deformazione.esito),
    ];
  }
  return [];
}

/** I numeri chiave che il Quaderno può importare dalle schede, già calcolati. */
export function numeriChiave(state: AppState) {
  return importiDaSchede(state).map((i) => ({
    nome: i.nome || i.etichetta,
    etichetta: i.etichetta,
    scheda: i.scheda,
    valore: i.valore,
    um: i.um,
    testo: i.testo ?? `${formattaIn(i.valore, i.um)} ${i.um}`.trim(),
  }));
}

/** Il colpo d'occhio: di che progetto si tratta, i numeri chiave e gli esiti. */
export function riepilogo(state: AppState) {
  const s = state.sollecitazioni;
  return {
    progetto: state.progetto,
    sito: `${state.azioni.comune} (${state.azioni.prov}), ${state.azioni.regione}`,
    schema: `${SCHEMI_BY_ID[s.schema]?.label ?? s.schema}, L = ${s.L} m, ${s.combinazione}`,
    materiale: state.verifiche.materiale,
    numeri: numeriChiave(state),
    esiti: esiti(state),
    quaderno: state.quaderno.blocchi.length,
  };
}

/** Il testo di un capitolo — quello del «Copia» della scheda — o del Quaderno. */
export function relazione(state: AppState, capitolo?: string): string {
  if (!capitolo || capitolo === 'quaderno') return testoRelazione(state, 'quaderno');
  const c = CAPITOLI.find((x) => x.id === capitolo || normalizza(x.titolo) === normalizza(capitolo));
  if (!c) throw new Error(`Capitolo «${capitolo}» sconosciuto: ci sono ${CAPITOLI.map((x) => x.id).join(', ')}, quaderno.`);
  // i capitoli hanno lo stesso id della loro scheda; quello delle grandezze
  // («calcolatrice») non ha più una scheda, ma `testoRelazione` lo trova lo stesso
  return testoRelazione(state, c.id as TabId);
}

/** I blocchi di un capitolo, strutturati (titolo e righe). */
export function capitolo(state: AppState, id: CapitoloId) {
  return blocchiCapitolo(state, id);
}

export { testoBlocchi, testoFoglio };

/* ─────────────────────────────── il Quaderno ─────────────────────────────── */

/** Una riga del foglio, come la si legge. */
export interface RigaFoglio {
  passo: string;
  tipo: string;
  testo: string;
  nota: string;
  /** Solo per le righe di calcolo. */
  nome?: string;
  valore?: number;
  um?: string;
  errore?: string;
  mancanti?: string[];
}

/** Il foglio del Quaderno, riga per riga, nell'ordine in cui sta. */
export function foglio(state: AppState): RigaFoglio[] {
  const calcolati = new Map(quadernoCalcolato(state).map((b) => [b.blocco.id, b]));
  return foglioQuaderno(state).map((e) => {
    if (e.tipo === 'calcolo') {
      const b = calcolati.get(e.id)!;
      return {
        passo: e.passo,
        tipo: b.blocco.tipo,
        testo: e.testo,
        nota: e.nota,
        nome: b.nome,
        valore: b.valore,
        um: b.um,
        ...(b.errore ? { errore: b.errore } : {}),
        ...(b.mancanti.length ? { mancanti: b.mancanti } : {}),
      };
    }
    if (e.tipo === 'capitolo') return { passo: '', tipo: 'capitolo', testo: e.capitolo.titolo, nota: '' };
    if (e.tipo === 'linea') return { passo: '', tipo: 'linea', testo: e.titolo, nota: '' };
    if (e.tipo === 'nota') return { passo: '', tipo: 'nota', testo: e.testo, nota: '' };
    return { passo: '', tipo: 'immagine', testo: e.didascalia || '(schema)', nota: '' };
  });
}

/**
 * Le righe scritte in una chat, come blocchi del Quaderno. La sintassi è
 * quella dei blocchi ` ```calcolo ` della Base, più una cosa:
 *  - `nome = espressione [unità] # nota` → una riga di calcolo (`formula`), e
 *    la nota diventa l'appunto della riga;
 *  - `# titolo` → la linea che apre un gruppo, con quel titolo sopra;
 *  - `> testo` → una nota a tutta riga.
 */
export function righeInBlocchi(testo: string): BloccoQuaderno[] {
  const blocchi: BloccoQuaderno[] = [];
  /** Le righe di calcolo si leggono a gruppi, fra una nota e l'altra. */
  let gruppo: string[] = [];
  const chiudi = () => {
    for (const r of leggiCalcolo(gruppo.join('\n'))) {
      blocchi.push(
        r.t === 'titoletto'
          ? nuovoBlocco('linea', { testo: r.testo })
          : nuovoBlocco('formula', {
              nome: r.voce.nome,
              espressione: r.voce.espressione,
              um: r.voce.um,
              appunto: r.voce.nota,
            }),
      );
    }
    gruppo = [];
  };
  for (const riga of testo.split(/\r?\n/)) {
    const m = /^\s*>\s?(.*)$/.exec(riga);
    if (m) {
      chiudi();
      if (m[1].trim()) blocchi.push(nuovoBlocco('nota', { testo: m[1].trim() }));
    } else gruppo.push(riga);
  }
  chiudi();
  return blocchi;
}

/**
 * I risultati delle schede (Mmax, VRd, qs…) entrano nel Quaderno come blocchi
 * «import», non come nomi sempre visibili: nell'app li si tira dal pannello e
 * poi li si usa. Da una chat si scrive direttamente `2*Mmax`, e il gesto di
 * prima lo si fa qui — un import davanti alla prima riga che ne nomina uno che
 * il foglio non ha ancora. È lo stesso foglio che si otterrebbe a mano.
 */
function conImport(state: AppState, nuovi: BloccoQuaderno[]): BloccoQuaderno[] {
  const sorgenti = sorgentiQuaderno(state);
  const noti = new Set([
    ...Object.keys(variabili(sorgenti.voci)),
    ...quadernoCalcolato(state).map((b) => b.nome).filter(Boolean),
  ]);
  const out: BloccoQuaderno[] = [];
  for (const b of nuovi) {
    if (b.tipo === 'formula') {
      for (const n of nomiRichiesti(b.espressione)) {
        if (noti.has(n)) continue;
        const im = sorgenti.importi.find((i) => i.nome === n);
        if (im) {
          out.push(nuovoBlocco('import', { fonte: im.id }));
          noti.add(n);
        }
      }
    }
    out.push(b);
    if (b.nome.trim()) noti.add(b.nome.trim());
  }
  return out;
}

/**
 * Aggiunge righe e capitoli in fondo al Quaderno. Niente di quello che c'era
 * si tocca: si scrive in coda, come si fa su un quaderno vero.
 */
export function aggiungiAlQuaderno(
  state: AppState,
  { righe = '', capitoli = [] as string[] }: { righe?: string; capitoli?: string[] },
): { stato: AppState; nuove: RigaFoglio[] } {
  const ids: CapitoloId[] = [];
  for (const c of capitoli) {
    const trovato = CAPITOLI.find((x) => x.id === c || normalizza(x.titolo) === normalizza(c));
    if (!trovato) throw new Error(`Capitolo «${c}» sconosciuto: ci sono ${CAPITOLI.map((x) => x.id).join(', ')}.`);
    ids.push(trovato.id);
  }
  const nuovi = [...conImport(state, righeInBlocchi(righe)), ...ids.map((id) => nuovoBlocco('capitolo', { fonte: id }))];
  if (!nuovi.length) throw new Error('Niente da aggiungere: servono «righe» o «capitoli».');
  const stato = structuredClone(state);
  stato.quaderno.blocchi = [...stato.quaderno.blocchi, ...nuovi];
  const quanti = foglio(state).length;
  return { stato, nuove: foglio(stato).slice(quanti) };
}

/* ─────────────────────────────── calcolo libero ─────────────────────────────── */

export interface RigaCalcolata {
  nome: string;
  espressione: string;
  valore: number;
  um: string;
  testo: string;
  nota: string;
  errore: string;
  mancanti: string[];
  /** La riga ridefinisce una grandezza che c'era già (della libreria o del progetto). */
  ridefinisce: string;
  titoletto?: string;
}

/**
 * Righe di calcolo con il motore del Quaderno, come in un blocco ` ```calcolo `
 * della Base: ogni riga vede quelle sopra, le unità si convertono da sole.
 *
 * Con un **progetto** le righe stanno in coda al suo Quaderno: vedono le
 * grandezze del pannello, i risultati delle schede (Mmax, VRd, qs…) e le
 * righe che ci sono già — è il conto che si farebbe aggiungendole lì, senza
 * scriverle. Senza progetto vedono le **costanti** della libreria personale
 * (γC, γS…), se gliela si dà; una riga che ne ridefinisce una vince lei, e la
 * risposta lo dice: un γC scritto apposta è una scelta, non uno sbaglio.
 */
export function calcolaRighe(
  testo: string,
  { stato, libreria }: { stato?: AppState | null; libreria?: Libreria | null } = {},
): RigaCalcolata[] {
  if (stato) {
    const blocchi = conImport(stato, righeInBlocchi(testo));
    const sorgenti = sorgentiQuaderno(stato);
    const prima = new Set([
      ...sorgenti.voci.filter((v) => v.nomeValido).map((v) => v.nome.trim()),
      ...sorgenti.importi.map((i) => i.nome).filter(Boolean),
      ...quadernoCalcolato(stato).filter((b) => !b.nomeIgnorato).map((b) => b.nome),
    ]);
    const tutti = ricalcolaQuaderno([...stato.quaderno.blocchi, ...blocchi], sorgenti);
    return tutti.slice(stato.quaderno.blocchi.length).map((b) => ({
      nome: b.nome,
      espressione: b.espressione,
      valore: b.valore,
      um: b.um,
      testo: b.blocco.tipo === 'formula' || b.blocco.tipo === 'import' ? testoBlocco(b) : b.blocco.testo,
      nota: b.blocco.appunto,
      errore: b.errore,
      mancanti: b.mancanti,
      ridefinisce: b.nome && prima.has(b.nome) ? b.nome : '',
      ...(b.blocco.tipo === 'linea' || b.blocco.tipo === 'nota' ? { titoletto: b.blocco.testo } : {}),
    }));
  }

  const righe = leggiCalcolo(testo);
  const proprie = righe.flatMap((r) => (r.t === 'voce' ? [r.voce] : []));
  const nomiPropri = new Set(proprie.map((v) => v.nome.trim()).filter(Boolean));
  const costanti: VoceCalcolo[] = (libreria?.grandezze ?? []).filter(
    (g) => g.tipo !== 'compilabile' && g.espressione.trim() && !nomiPropri.has(g.nome.trim()),
  );
  const ridefinite = new Set((libreria?.grandezze ?? []).map((g) => g.nome.trim()).filter((n) => nomiPropri.has(n)));
  const unita = libreria?.unita?.length ? libreria.unita : undefined;
  const calcolate = ricalcola([...costanti, ...proprie], unita).slice(costanti.length);

  let k = 0;
  const vars: Record<string, number> = {};
  return righe.map((r): RigaCalcolata => {
    if (r.t === 'titoletto') {
      return { nome: '', espressione: '', valore: NaN, um: '', testo: r.testo, nota: '', errore: '', mancanti: [], ridefinisce: '', titoletto: r.testo };
    }
    const v = calcolate[k++];
    const visti = { ...variabili(ricalcola([...costanti], unita)), ...vars };
    const riga: RigaCalcolata = {
      nome: v.nome.trim(),
      espressione: v.espressione,
      valore: v.valore,
      um: v.umEffettiva,
      testo: testoVoce({ ...v, nota: '' }),
      nota: v.nota,
      errore: v.errore,
      mancanti: v.errore ? nomiMancanti(v.espressione, visti) : [],
      ridefinisce: ridefinite.has(v.nome.trim()) ? v.nome.trim() : '',
    };
    if (v.nomeValido && Number.isFinite(v.valoreBase)) vars[v.nome.trim()] = v.valoreBase;
    return riga;
  });
}

/* ─────────────────────────────── la libreria ─────────────────────────────── */

/** La libreria personale in forma leggibile: norme, formule, grandezze, unità. */
export function riassuntoLibreria(lib: Libreria) {
  return {
    aggiornato: lib.aggiornato,
    normative: lib.normative.map((n) => ({
      sigla: n.sigla,
      titolo: n.titolo,
      url: n.url,
      categoria: n.categoria,
      capitoli: n.capitoli.map((c) => `${c.numero} ${c.titolo}${c.pagina ? ` (p. ${c.pagina})` : ''}`.trim()),
    })),
    preimpostate: lib.preimpostate.map((p) => ({
      nome: p.nome,
      formula: `${p.nome ? `${p.nome} = ` : ''}${p.espressione}${p.um ? ` [${p.um}]` : ''}`,
      nota: p.nota,
    })),
    grandezze: lib.grandezze.map((g) => ({
      nome: g.nome,
      tipo: g.tipo ?? '',
      valore: g.espressione,
      um: g.um,
      nota: g.nota,
    })),
    unita: lib.unita,
  };
}
