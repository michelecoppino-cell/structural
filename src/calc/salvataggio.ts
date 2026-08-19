/**
 * Salvare un file dal browser, chiedendo **dove** e **come chiamarlo**.
 *
 * Un `<a download>` non chiede niente: il file cade nella cartella dei
 * download con il nome che gli ha dato il programma, e chi lavora per
 * commesse se lo ritrova fuori dalla cartella della commessa, con il nome
 * sbagliato, da spostare e rinominare a mano ogni volta.
 *
 * Dove il browser lo consente (Chrome, Edge — API File System Access) si apre
 * il vero «Salva con nome» del sistema: si sceglie la cartella, si corregge il
 * nome, e la seconda volta la finestra si riapre dov'era. Dove non c'è
 * (Firefox, Safari) si chiede almeno il nome e si torna al download classico:
 * la cartella la decide il browser, ma il nome no.
 */

/** Esito del salvataggio: serve solo a decidere che cosa dire all'utente. */
export type EsitoSalvataggio = 'salvato' | 'scaricato' | 'annullato';

interface OpzioniSalva {
  /** Nome proposto, estensione compresa: `commessa-rev0.json`. */
  nome: string;
  /** Tipo MIME del contenuto. */
  tipo: string;
  /** Che cosa sono i file di questo tipo, per il filtro della finestra. */
  descrizione: string;
  /** Estensioni ammesse, con il punto: `['.json']`. */
  estensioni: string[];
  contenuto: string;
}

/** La finestra di sistema, dove c'è: si dichiara qui perché è ancora fuori dai tipi standard. */
type ConSalvataggio = Window & {
  showSaveFilePicker?: (o: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    createWritable: () => Promise<{ write: (d: BlobPart) => Promise<void>; close: () => Promise<void> }>;
  }>;
};

/**
 * Ripulisce un nome scritto a mano: via i caratteri che i sistemi non
 * accettano nei nomi di file, e l'estensione giusta se manca.
 */
export function nomeConEstensione(nome: string, estensione: string): string {
  const pulito = nome.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/^\.+/, '').trim();
  const base = pulito || 'progetto';
  return base.toLowerCase().endsWith(estensione.toLowerCase()) ? base : `${base}${estensione}`;
}

/** Scarica il file com'era prima: nome deciso qui, cartella decisa dal browser. */
function scarica(nome: string, tipo: string, contenuto: string): void {
  const url = URL.createObjectURL(new Blob([contenuto], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Salva chiedendo nome e posto. Torna `annullato` se l'utente chiude la
 * finestra — non è un errore, è un ripensamento, e non va segnalato come
 * guasto.
 */
export async function salvaConNome({
  nome,
  tipo,
  descrizione,
  estensioni,
  contenuto,
}: OpzioniSalva): Promise<EsitoSalvataggio> {
  const picker = (window as ConSalvataggio).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker.call(window, {
        suggestedName: nome,
        types: [{ description: descrizione, accept: { [tipo]: estensioni } }],
      });
      const stream = await handle.createWritable();
      await stream.write(new Blob([contenuto], { type: tipo }));
      await stream.close();
      return 'salvato';
    } catch (e) {
      // l'utente ha chiuso la finestra: non si scarica niente di nascosto
      if (e instanceof DOMException && e.name === 'AbortError') return 'annullato';
      // qualunque altro intoppo (permessi, contesto non sicuro): si ripiega
    }
  }

  const scelto = window.prompt('Salva con nome — come si chiama il file?', nome);
  if (scelto === null) return 'annullato';
  scarica(nomeConEstensione(scelto, estensioni[0] ?? ''), tipo, contenuto);
  return 'scaricato';
}
