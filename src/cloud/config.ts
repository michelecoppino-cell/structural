/**
 * Configurazione dell'accesso Microsoft.
 *
 * **Non c'è nessun segreto qui dentro**, e non ce ne può essere: l'app è un
 * sito statico, tutto quello che serve a farla funzionare arriva nel browser di
 * chi la apre. Per questo si usa il flusso *authorization code con PKCE* per
 * client pubblici, dove al posto di una password dell'applicazione c'è una
 * prova monouso generata dal browser stesso. Il `clientId` è un identificativo
 * pubblico: da solo non apre niente, perché Microsoft rimanda il token solo
 * agli indirizzi registrati nell'app su Azure.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Come si registra l'app (una volta sola, cinque minuti):
 *
 *  1. portal.azure.com → *Microsoft Entra ID* → *Registrazioni app* → *Nuova
 *     registrazione*;
 *  2. nome «Strutturale»; tipi di account supportati: **Account personali
 *     Microsoft e account aziendali** (`common`);
 *  3. *Redirect URI* → piattaforma **Single-page application (SPA)** → l'URL
 *     del sito con la barra finale (es. `https://strutturale.pages.dev/`).
 *     Aggiungi anche `http://localhost:5173/` per lavorarci in locale.
 *     Non scegliere «Web»: quella piattaforma pretende un segreto;
 *  4. *API permissions* → Microsoft Graph → *Delegated* → `Files.ReadWrite`
 *     e `offline_access`. Nessun permesso *Application*, nessun consenso da
 *     amministratore: l'app agisce sempre e solo per conto di chi ha fatto
 *     l'accesso;
 *  5. copia l'*ID applicazione (client)* e incollalo qui sotto.
 *
 * Finché `CLIENT_ID` resta vuoto l'app funziona esattamente come prima —
 * tutto in locale — e il pannello di sincronizzazione dice cosa manca.
 */
export const CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID ?? '';

/** Torna esattamente qui dopo il login: dev'essere uno dei Redirect URI SPA. */
export const REDIRECT_URI = `${window.location.origin}/`;

/**
 * I permessi chiesti, e nient'altro.
 *
 *  - `Files.ReadWrite` — lettura e scrittura del OneDrive personale: serve a
 *    tenere il file della libreria e a raggiungere i PDF delle normative che
 *    stanno sparsi nelle tue cartelle;
 *  - `offline_access` — è lo scope che fa rilasciare il *refresh token*, cioè
 *    la differenza fra «l'accesso dura un'ora» e «l'accesso dura finché non lo
 *    revochi».
 *
 * Niente posta, niente calendario, niente rubrica: se un giorno servissero, si
 * aggiungono qui e Microsoft chiederà un consenso nuovo.
 */
export const SCOPES = ['offline_access', 'Files.ReadWrite'];

/** Cartella dei file dell'app dentro il OneDrive personale. */
export const CARTELLA = 'strutturale';

/** Il file unico della libreria personale. */
export const FILE_LIBRERIA = 'strutturale-libreria.json';
