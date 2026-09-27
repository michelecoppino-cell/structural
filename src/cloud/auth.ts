/**
 * Accesso Microsoft: la porta d'ingresso dell'app e la chiave di OneDrive.
 *
 * Come nella mente-digitale, senza un account collegato l'app non si apre: il
 * primo schermo è «Accedi con Microsoft» (vedi `Cancello`). Ognuno entra con il
 * **proprio** account — il sito è pubblico, i dati no: senza il tuo account
 * Microsoft il tuo OneDrive non è raggiungibile da qui.
 *
 * Il token non passa da nessun server: il browser parla direttamente con
 * Microsoft e con Graph.
 */
import { InteractionRequiredAuthError, PublicClientApplication, type AccountInfo } from '@azure/msal-browser';
import { CLIENT_ID, REDIRECT_URI, SCOPES } from './config';

/** L'accesso è configurabile: senza client id l'app gira in locale e basta. */
export const SINCRONIA_CONFIGURATA = !!CLIENT_ID;

let msal: PublicClientApplication | null = null;
let avvio: Promise<PublicClientApplication> | null = null;

export function initAuth(): Promise<PublicClientApplication> {
  // Una sola istanza: in StrictMode l'effetto parte due volte, e due
  // PublicClientApplication sullo stesso clientId sono due cache che si
  // sovrascrivono a vicenda — è uno dei modi in cui una sessione valida
  // sembra sparire da sola.
  if (!avvio) {
    avvio = (async () => {
      const app = new PublicClientApplication({
        auth: { clientId: CLIENT_ID, authority: 'https://login.microsoftonline.com/common', redirectUri: REDIRECT_URI },
        // la cache in localStorage è ciò che fa sopravvivere l'accesso alla
        // chiusura della scheda: in sessionStorage andrebbe rifatto ogni volta,
        // e su un'app che si apre dall'icona del telefono è ogni volta davvero
        cache: { cacheLocation: 'localStorage' },
        // i 10 secondi di default per l'iframe nascosto del rinnovo silenzioso
        // sono tarati su un desktop: in rete mobile scadono prima che Microsoft
        // risponda, e un timeout viene poi scambiato per «serve il login»
        system: { iframeBridgeTimeout: 20_000 },
      });
      await app.initialize();
      try {
        await app.handleRedirectPromise();
      } catch (e) {
        console.error('Ritorno dal login Microsoft non riuscito', e);
      }
      msal = app;
      return app;
    })();
  }
  return avvio;
}

export function account(): AccountInfo | null {
  return msal?.getAllAccounts()[0] ?? null;
}

/** Porta su Microsoft: da chiamare solo da un clic dell'utente. */
export async function login(): Promise<void> {
  const app = await initAuth();
  await app.loginRedirect({ scopes: SCOPES });
}

/**
 * Stacca l'account da questo dispositivo. Non tocca il file su OneDrive e non
 * revoca il consenso — quello si toglie da account.microsoft.com, sezione
 * privacy → app e servizi: vale la pena dirlo, perché «esci» in un'app non
 * significa mai «l'app non può più entrare».
 */
export async function logout(): Promise<void> {
  const app = await initAuth();
  const acc = account();
  if (acc) await app.clearCache({ account: acc });
  for (const fn of alCambioAccount) fn();
}

const alCambioAccount = new Set<() => void>();

/**
 * Avvisa quando l'account se ne va da questo dispositivo: il cancello
 * d'ingresso si richiude subito, senza aspettare di ricaricare la pagina.
 */
export function suCambioAccount(fn: () => void): () => void {
  alCambioAccount.add(fn);
  return () => alCambioAccount.delete(fn);
}

/**
 * Access token per Graph. Rinnova in silenzio finché Microsoft lo permette;
 * quando non basta più, lancia — e chi chiama mostra il bottone «Riconnetti»
 * invece di scaraventare l'utente su Microsoft nel mezzo di un calcolo.
 */
export async function token(): Promise<string> {
  const app = await initAuth();
  const acc = account();
  if (!acc) throw new ServeAccesso();
  try {
    const r = await app.acquireTokenSilent({ scopes: SCOPES, account: acc });
    return r.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) throw new ServeAccesso();
    throw e;
  }
}

/** L'accesso è scaduto: serve un clic dell'utente, non un redirect a sorpresa. */
export class ServeAccesso extends Error {
  constructor() {
    super('Accesso Microsoft scaduto');
    this.name = 'ServeAccesso';
  }
}
