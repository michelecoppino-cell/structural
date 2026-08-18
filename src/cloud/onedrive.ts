/**
 * Il pezzetto di Microsoft Graph che serve all'app: leggere e scrivere un file
 * JSON dentro una cartella del OneDrive personale. Niente di più.
 */
import { ServeAccesso, token } from './auth';
import { CARTELLA } from './config';

const GRAPH = 'https://graph.microsoft.com/v1.0';

/**
 * Una risposta storta di Graph, con dentro quello che Graph stesso ha detto.
 *
 * Vale la pena portarselo dietro invece di ridurre tutto a «non raggiungibile»:
 * il corpo di un errore Graph è quasi sempre già la diagnosi — `accessDenied`
 * quando manca il consenso al permesso, `itemNotFound` quando il OneDrive non
 * è mai stato creato, `quotaLimitReached` quando è pieno. Senza, dal telefono
 * non c'è modo di sapere quale delle tre sia: la console non si apre.
 */
export class ErroreGraph extends Error {
  constructor(
    readonly stato: number,
    readonly codice: string,
    dettaglio: string,
  ) {
    super(dettaglio ? `${stato} ${codice}: ${dettaglio}` : `${stato} ${codice}`);
    this.name = 'ErroreGraph';
  }
}

/** Tira fuori codice e messaggio dal corpo di un errore Graph. */
async function erroreDa(r: Response): Promise<ErroreGraph> {
  let codice = '';
  let messaggio = '';
  try {
    const corpo = (await r.json()) as { error?: { code?: string; message?: string } };
    codice = corpo?.error?.code ?? '';
    messaggio = corpo?.error?.message ?? '';
  } catch {
    // risposta senza corpo JSON: restano lo stato e poco altro
  }
  return new ErroreGraph(r.status, codice || r.statusText, messaggio);
}

async function chiama(percorso: string, init: RequestInit = {}): Promise<Response> {
  const t = await token();
  const r = await fetch(`${GRAPH}${percorso}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${t}` },
  });
  // Un 401 non è un guasto: è il token che Graph non accetta più — o perché è
  // scaduto, o perché il permesso non è mai stato concesso davvero. In
  // entrambi i casi la cura è la stessa, un accesso nuovo fatto a mano, ed è
  // quello che il pannello propone.
  if (r.status === 401) throw new ServeAccesso();
  return r;
}

let cartellaPronta: Promise<void> | null = null;

/** Crea la cartella dell'app al primo bisogno: il 409 «esiste già» è la norma. */
function creaCartella(): Promise<void> {
  if (!cartellaPronta) {
    cartellaPronta = (async () => {
      const r = await chiama('/me/drive/root/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: CARTELLA, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
      });
      if (!r.ok && r.status !== 409) {
        cartellaPronta = null; // errore vero (rete, permessi): si riproverà
        throw await erroreDa(r);
      }
    })().catch((e) => {
      cartellaPronta = null;
      throw e;
    });
  }
  return cartellaPronta;
}

/**
 * Legge un JSON dalla cartella dell'app.
 * @returns il contenuto, o `null` se il file non c'è ancora (primo avvio).
 */
export async function leggiJson(file: string): Promise<unknown | null> {
  const r = await chiama(`/me/drive/root:/${CARTELLA}/${file}:/content`);
  if (r.status === 404) return null;
  if (!r.ok) throw await erroreDa(r);
  try {
    return await r.json();
  } catch {
    // file troncato da una scrittura interrotta: meglio ripartire dal locale
    // che far fallire tutta la sincronizzazione
    return null;
  }
}

/** Scrive un JSON nella cartella dell'app, creandola se manca. */
export async function scriviJson(file: string, dati: unknown): Promise<void> {
  await creaCartella();
  const r = await chiama(`/me/drive/root:/${CARTELLA}/${file}:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dati, null, 2),
  });
  if (!r.ok) throw await erroreDa(r);
}
