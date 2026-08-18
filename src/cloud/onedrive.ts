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
 * `null` significa **una cosa sola**: il file non esiste ancora (404). Ogni
 * altro intoppo — metadati storti, scarico fallito, JSON illeggibile — è un
 * errore che viene lanciato, e ferma il giro.
 *
 * La distinzione sembra pedante e invece è tutto. Chi chiama usa `null` per
 * dire «su OneDrive non c'è ancora niente», e da lì scrive la libreria locale
 * sopra: se un guasto di lettura si travestisse da file assente, ogni
 * dispositivo che sincronizza cancellerebbe il lavoro dell'altro credendo di
 * inaugurare il file. È esattamente il modo in cui sono sparite delle norme.
 *
 * La lettura è in due passi. `GET …:/content` non restituisce il file: manda
 * un **302** all'host di storage (`*.files.1drv.com` e parenti), e `fetch` lo
 * segue da sé — comodo finché funziona, indistinguibile da un guasto su Graph
 * quando qualcosa lo blocca. Chiedendo prima i metadati, l'indirizzo di
 * storage arriva come dato e il secondo scarico è una chiamata a un indirizzo
 * che conosciamo e che l'errore può nominare.
 */
export async function leggiJson(file: string): Promise<unknown | null> {
  // Niente `$select` qui: `@microsoft.graph.downloadUrl` è una proprietà
  // annotata, e Graph la omette dalla risposta quando c'è una $select — anche
  // se la si nomina dentro la $select stessa. Chiedere l'elemento intero
  // costa qualche riga di JSON in più ed è l'unico modo di riceverla.
  const meta = await chiama(`/me/drive/root:/${CARTELLA}/${file}`);
  if (meta.status === 404) return null;
  if (!meta.ok) throw await erroreDa(meta);

  const info = (await meta.json()) as Record<string, unknown>;
  const scarico = info['@microsoft.graph.downloadUrl'];

  // Se l'indirizzo non c'è (Graph cambia idea, un giorno, su come lo espone)
  // si ripiega sulla strada vecchia invece di dare il file per assente.
  const r = typeof scarico === 'string' && scarico
    ? await fetchEsterno(scarico)
    : await chiama(`/me/drive/root:/${CARTELLA}/${file}:/content`);
  if (!r.ok) throw await erroreDa(r);

  const testo = await r.text();
  // Un file davvero vuoto (zero byte) è l'unico caso in cui «niente contenuto»
  // è una risposta onesta: succede se una scrittura è stata interrotta prima
  // di scrivere il primo byte.
  if (!testo.trim()) return null;
  try {
    return JSON.parse(testo);
  } catch {
    // JSON illeggibile: NON si finge che il file non esista, o la libreria
    // buona verrebbe sovrascritta al primo giro. Si ferma tutto e lo si dice.
    throw new Error(
      `Il file ${file} su OneDrive non è JSON leggibile: la sincronizzazione si ferma per non sovrascriverlo.`,
    );
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
