/**
 * Il pezzetto di Microsoft Graph che serve all'app: leggere e scrivere un file
 * JSON dentro una cartella del OneDrive personale. Niente di più.
 */
import { token } from './auth';
import { CARTELLA } from './config';

const GRAPH = 'https://graph.microsoft.com/v1.0';

async function chiama(percorso: string, init: RequestInit = {}): Promise<Response> {
  const t = await token();
  return fetch(`${GRAPH}${percorso}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${t}` },
  });
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
        throw new Error(`Cartella ${CARTELLA} non creata (${r.status})`);
      }
    })();
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
  if (!r.ok) throw new Error(`Lettura di ${file} non riuscita (${r.status})`);
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
  if (!r.ok) throw new Error(`Scrittura di ${file} non riuscita (${r.status})`);
}
