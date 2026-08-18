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
  const url = `${GRAPH}${percorso}`;
  let r: Response;
  try {
    r = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${t}` } });
  } catch (e) {
    // «Failed to fetch» da solo non dice niente: è la stessa frase per la rete
    // assente, per una CSP che blocca e per un redirect finito su un host non
    // autorizzato — e quest'ultimo è il caso vero più insidioso, perché
    // `…:/content` risponde con un 302 verso lo storage (`*.files.1drv.com`),
    // che è un host diverso da quello chiamato. Nominare l'indirizzo di
    // partenza fa almeno capire quale chiamata sia morta.
    throw new Error(`${e instanceof Error ? e.message : String(e)} — chiamando ${url}`);
  }
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
 *
 * In due passi invece che in uno, e la ragione è tutta pratica. La strada
 * ovvia — `GET …:/content` — non restituisce il file: restituisce un **302**
 * verso l'host di storage vero, che per un OneDrive personale è uno fra
 * `*.files.1drv.com`, `*.livefilestore.com` e parenti, e cambia da account ad
 * account. `fetch` segue il redirect da sé, il che è comodo finché tutto va
 * bene e disastroso quando qualcosa lo blocca: l'errore viene attribuito
 * all'indirizzo di partenza, e un blocco sul secondo host diventa
 * indistinguibile da un guasto sul primo.
 *
 * Chiedendo prima i metadati (`@microsoft.graph.downloadUrl`) l'indirizzo di
 * storage arriva **come dato**, e il secondo scarico è una chiamata nostra a un
 * indirizzo che conosciamo: se fallisce, l'errore lo nomina. Il costo è una
 * richiesta in più su un file che si legge una volta per sincronizzazione.
 *
 * @returns il contenuto, o `null` se il file non c'è ancora (primo avvio).
 */
export async function leggiJson(file: string): Promise<unknown | null> {
  const meta = await chiama(
    `/me/drive/root:/${CARTELLA}/${file}?$select=id,name,@microsoft.graph.downloadUrl`,
  );
  if (meta.status === 404) return null;
  if (!meta.ok) throw await erroreDa(meta);

  const info = (await meta.json()) as Record<string, unknown>;
  const scarico = info['@microsoft.graph.downloadUrl'];
  // niente indirizzo di scarico: file vuoto o appena creato, si riparte dal
  // locale invece di far fallire tutta la sincronizzazione
  if (typeof scarico !== 'string' || !scarico) return null;

  // L'indirizzo è già autenticato: aggiungerci il token sarebbe un errore
  // (l'header Authorization su quegli host fa scattare un 401).
  const r = await fetchEsterno(scarico);
  if (!r.ok) throw new ErroreGraph(r.status, 'downloadFallito', new URL(scarico).host);
  try {
    return await r.json();
  } catch {
    // file troncato da una scrittura interrotta: meglio ripartire dal locale
    return null;
  }
}

/** Come `fetch`, ma se muore dice **quale host** non ha risposto. */
async function fetchEsterno(url: string): Promise<Response> {
  try {
    return await fetch(url);
  } catch (e) {
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return url;
      }
    })();
    throw new Error(`${e instanceof Error ? e.message : String(e)} — scaricando da ${host}`);
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
