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

/* ───────────────────────── file di testo della Base ───────────────────────── */
//
// La Base tecnica non è un JSON dell'app: è una cartella di file Markdown che
// si aprono anche con un altro editor (OneDrive web, Obsidian, VS Code) e che
// ci scrive anche Claude, dal connettore. Per questo le regole qui sono
// diverse da quelle della libreria: niente fusione a tre vie — un testo non si
// fonde — ma l'**ETag**: si scrive sopra solo la versione che si è letta, e se
// qualcun altro l'ha cambiata nel frattempo la scrittura si ferma e lo dice.

/** Un file di una cartella, con quello che serve a sapere se è cambiato. */
export interface FileRemoto {
  /** Percorso relativo alla cartella chiesta, con le sottocartelle (`_modelli/sintesi.md`). */
  percorso: string;
  etag: string;
  modificato: string;
  /** Indirizzo di scarico già autorizzato, se Graph l'ha dato. */
  scarico: string;
}

/** La modifica è stata fatta altrove dopo che l'avevamo letta. */
export class ModificatoAltrove extends Error {
  constructor(percorso: string) {
    super(`${percorso} è stato modificato altrove dopo l'ultima lettura: ricarica la Base prima di salvare.`);
    this.name = 'ModificatoAltrove';
  }
}

/** Il percorso Graph di un file o di una cartella dentro quella dell'app. */
const percorsoGraph = (rel: string) =>
  `/me/drive/root:/${[CARTELLA, ...rel.split('/').filter(Boolean)].map(encodeURIComponent).join('/')}`;

/**
 * I file di una cartella dentro quella dell'app, sottocartelle comprese fino a
 * `profondita` livelli. Una cartella che non esiste è una cartella vuota, non
 * un errore: la Base, la prima volta, non c'è ancora.
 */
export async function elencaFile(cartella: string, profondita = 3): Promise<FileRemoto[]> {
  const out: FileRemoto[] = [];
  const visita = async (rel: string, livello: number) => {
    let url: string | null = `${percorsoGraph(rel)}:/children?$top=200`;
    while (url) {
      const r = await chiama(url.replace('https://graph.microsoft.com/v1.0', ''));
      if (r.status === 404) return;
      if (!r.ok) throw await erroreDa(r);
      const d = (await r.json()) as { value?: Record<string, unknown>[]; '@odata.nextLink'?: string };
      for (const v of d.value ?? []) {
        const nome = String(v.name ?? '');
        const figlio = rel ? `${rel}/${nome}` : nome;
        if (v.folder) {
          if (livello < profondita) await visita(figlio, livello + 1);
        } else if (v.file) {
          out.push({
            percorso: figlio.slice(cartella.length + 1),
            etag: String(v.eTag ?? ''),
            modificato: String(v.lastModifiedDateTime ?? ''),
            scarico: String(v['@microsoft.graph.downloadUrl'] ?? ''),
          });
        }
      }
      url = d['@odata.nextLink'] ?? null;
    }
  };
  await visita(cartella, 1);
  return out;
}

/** Il contenuto di un file di testo; `scarico` evita una chiamata se c'è già. */
export async function leggiTesto(rel: string, scarico = ''): Promise<string> {
  const r = scarico ? await fetchEsterno(scarico) : await chiama(`${percorsoGraph(rel)}:/content`);
  if (!r.ok) throw await erroreDa(r);
  return r.text();
}

/** Crea le cartelle di un percorso, una per una: il 409 «esiste già» è la norma. */
async function assicuraCartelle(rel: string): Promise<void> {
  await creaCartella();
  const pezzi = rel.split('/').filter(Boolean).slice(0, -1);
  for (let k = 0; k < pezzi.length; k++) {
    const genitore = pezzi.slice(0, k).join('/');
    const r = await chiama(`${percorsoGraph(genitore)}:/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pezzi[k], folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
    });
    if (!r.ok && r.status !== 409) throw await erroreDa(r);
  }
}

/**
 * Scrive un file di testo. Con `etag` scrive solo sopra quella versione; con
 * `nuovo` solo se il file non c'è ancora — due modi di non cancellare il
 * lavoro fatto altrove. Restituisce il nuovo ETag.
 */
export async function scriviTesto(
  rel: string,
  testo: string,
  { etag, nuovo }: { etag?: string; nuovo?: boolean } = {},
): Promise<{ etag: string; modificato: string }> {
  await assicuraCartelle(rel);
  // «solo se non c'è» si dice con conflictBehavior=fail, che risponde 409: è la
  // forma documentata per un upload, e non dipende da come Graph legge un
  // If-None-Match
  const condizione: Record<string, string> = etag ? { 'If-Match': etag } : {};
  const coda = nuovo ? '?@microsoft.graph.conflictBehavior=fail' : '';
  const r = await chiama(`${percorsoGraph(rel)}:/content${coda}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...condizione },
    body: testo,
  });
  if (r.status === 412 || (nuovo && r.status === 409)) throw new ModificatoAltrove(rel);
  if (!r.ok) throw await erroreDa(r);
  const info = (await r.json()) as Record<string, unknown>;
  return { etag: String(info.eTag ?? ''), modificato: String(info.lastModifiedDateTime ?? '') };
}

/* ───────────────────────── immagini della Base ───────────────────────── */
//
// Le immagini delle schede sono file veri nella cartella degli allegati, non
// dati dentro il testo: una scheda con tre screenshot incollati in base64
// sarebbe un file da cinque mega che nessun editor apre più volentieri, e che
// si riscaricherebbe intero a ogni virgola corretta.

/** Il contenuto di un file come `Blob`, dall'indirizzo di scarico. */
export async function leggiBinario(rel: string): Promise<Blob> {
  const meta = await chiama(percorsoGraph(rel));
  if (!meta.ok) throw await erroreDa(meta);
  const info = (await meta.json()) as Record<string, unknown>;
  const scarico = info['@microsoft.graph.downloadUrl'];
  const r =
    typeof scarico === 'string' && scarico ? await fetchEsterno(scarico) : await chiama(`${percorsoGraph(rel)}:/content`);
  if (!r.ok) throw await erroreDa(r);
  return r.blob();
}

/**
 * Carica un file (sotto i 4 MB: oltre Graph vuole una sessione a pezzi, e
 * un'immagine compressa per una scheda non ci arriva). Non scrive mai sopra un
 * file che c'è già: il nome lo sceglie chi chiama, con l'ora dentro.
 */
export async function scriviBinario(rel: string, dati: Blob): Promise<void> {
  if (dati.size > 4 * 1024 * 1024) throw new Error("L'immagine supera i 4 MB anche compressa: riducila e riprova.");
  await assicuraCartelle(rel);
  const r = await chiama(`${percorsoGraph(rel)}:/content?@microsoft.graph.conflictBehavior=fail`, {
    method: 'PUT',
    headers: { 'Content-Type': dati.type || 'application/octet-stream' },
    body: dati,
  });
  if (!r.ok) throw await erroreDa(r);
}
