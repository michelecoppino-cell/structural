/**
 * Le immagini della Base: comprimerle prima di caricarle, e mostrarle dopo.
 *
 * Uno screenshot a schermo intero pesa due o tre mega in PNG. Per un grafico
 * in una scheda non serve: si riduce a 1800 px di lato al massimo e si salva
 * in WebP, che resta nitido sulle linee di un diagramma e pesa un decimo. Se
 * il risultato non è più piccolo dell'originale, si tiene l'originale.
 *
 * Per mostrarle serve l'accesso a OneDrive (sono file privati): si scaricano
 * una volta, e se ne tiene una copia nella cache del browser, così una scheda
 * già aperta si rilegge con le sue figure anche senza rete.
 */
import { leggiBinario, scriviBinario } from '../cloud/onedrive';
import { nomeImmagine } from './editor';
import { CARTELLA_BASE } from './archivio';

const LATO_MAX = 1800;
const CACHE = 'structural-base-immagini';

/** Formati che non si ricomprimono: un'animazione e un disegno vettoriale perderebbero quello che sono. */
const DA_NON_TOCCARE = /^image\/(gif|svg\+xml)$/;

const ESTENSIONI: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
};

/** Un'immagine pronta da caricare: ridotta e compressa, se ne vale la pena. */
export async function comprimi(file: Blob): Promise<Blob> {
  if (DA_NON_TOCCARE.test(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scala = Math.min(1, LATO_MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scala);
    const h = Math.round(bitmap.height * scala);
    const tela = document.createElement('canvas');
    tela.width = w;
    tela.height = h;
    const ctx = tela.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const compressa = await new Promise<Blob | null>((ok) => tela.toBlob(ok, 'image/webp', 0.9));
    // un browser che non sa scrivere WebP restituisce un PNG: va bene lo stesso
    return compressa && compressa.size < file.size ? compressa : file;
  } catch {
    return file; // un formato che il browser non sa aprire: si carica com'è
  }
}

/**
 * Carica un'immagine per una scheda e restituisce il percorso da scrivere nel
 * testo (relativo alla cartella della Base: `_allegati/…`).
 */
export async function allega(file: Blob, percorsoScheda: string): Promise<string> {
  const pronta = await comprimi(file);
  const percorso = nomeImmagine(percorsoScheda, ESTENSIONI[pronta.type] ?? 'png');
  await scriviBinario(`${CARTELLA_BASE}/${percorso}`, pronta);
  await inCache(percorso, pronta);
  indirizzi.set(percorso, Promise.resolve(URL.createObjectURL(pronta)));
  return percorso;
}

const chiaveCache = (percorso: string) => `/base-immagini/${encodeURIComponent(percorso)}`;

async function inCache(percorso: string, dati: Blob): Promise<void> {
  try {
    const c = await caches.open(CACHE);
    await c.put(chiaveCache(percorso), new Response(dati, { headers: { 'Content-Type': dati.type } }));
  } catch {
    // cache spenta (navigazione privata, contesto non sicuro): si riscaricherà
  }
}

async function daCache(percorso: string): Promise<Blob | null> {
  try {
    const c = await caches.open(CACHE);
    const r = await c.match(chiaveCache(percorso));
    return r ? await r.blob() : null;
  } catch {
    return null;
  }
}

/** Gli indirizzi `blob:` già pronti, per non riscaricare a ogni disegno. */
const indirizzi = new Map<string, Promise<string>>();

/**
 * L'indirizzo da mettere in un `<img>` per un'immagine della Base. Prima la
 * copia nel browser, poi OneDrive. Una copia vecchia è accettabile: il nome
 * di un allegato porta l'ora, e un'immagine nuova ha un nome nuovo.
 */
export function indirizzoImmagine(percorso: string): Promise<string> {
  let p = indirizzi.get(percorso);
  if (!p) {
    p = (async () => {
      const salvata = await daCache(percorso);
      if (salvata) return URL.createObjectURL(salvata);
      const dati = await leggiBinario(`${CARTELLA_BASE}/${percorso}`);
      await inCache(percorso, dati);
      return URL.createObjectURL(dati);
    })();
    p.catch(() => indirizzi.delete(percorso)); // un errore si riprova la volta dopo
    indirizzi.set(percorso, p);
  }
  return p;
}
