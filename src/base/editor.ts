/**
 * I pulsanti dell'editor della Base: ognuno è una trasformazione del testo e
 * della selezione, e nient'altro.
 *
 * Sono funzioni pure — testo e selezione dentro, testo e selezione fuori —
 * perché il gesto che conta è sottile: un grassetto su una parola selezionata
 * la avvolge, senza selezione mette i segni e il cursore in mezzo; un elenco su
 * tre righe selezionate le fa diventare tre voci, e un secondo tocco le
 * rimette com'erano. Scritte così, si provano senza un browser.
 */

export interface Modifica {
  testo: string;
  /** Inizio e fine della selezione dopo la modifica. */
  da: number;
  a: number;
}

/**
 * Avvolge la selezione fra due segni (`**…**`). Senza selezione mette il
 * segnaposto, selezionato, così lo si sovrascrive scrivendo. Se la selezione è
 * già avvolta da quei segni, li toglie.
 */
export function avvolgi(testo: string, da: number, a: number, prima: string, dopo: string, segnaposto: string): Modifica {
  const dentro = testo.slice(da, a);
  if (
    dentro &&
    testo.slice(da - prima.length, da) === prima &&
    testo.slice(a, a + dopo.length) === dopo
  ) {
    return {
      testo: testo.slice(0, da - prima.length) + dentro + testo.slice(a + dopo.length),
      da: da - prima.length,
      a: a - prima.length,
    };
  }
  const parola = dentro || segnaposto;
  return {
    testo: testo.slice(0, da) + prima + parola + dopo + testo.slice(a),
    da: da + prima.length,
    a: da + prima.length + parola.length,
  };
}

/** Dove comincia la riga che contiene `i`. */
const inizioRiga = (testo: string, i: number) => testo.lastIndexOf('\n', i - 1) + 1;
/** Dove finisce la riga che contiene `i`. */
const fineRiga = (testo: string, i: number) => {
  const f = testo.indexOf('\n', i);
  return f < 0 ? testo.length : f;
};

/**
 * Mette un segno in testa a ogni riga della selezione (`- `, `- [ ] `,
 * `## `). Se tutte le righe lo hanno già, lo toglie: il pulsante è un
 * interruttore. Un titolo di un altro livello si sostituisce, non si somma.
 */
export function aCapoRiga(testo: string, da: number, a: number, segno: string): Modifica {
  const inizio = inizioRiga(testo, da);
  const fine = fineRiga(testo, Math.max(da, a > da && testo[a - 1] === '\n' ? a - 1 : a));
  const righe = testo.slice(inizio, fine).split('\n');
  const eTitolo = /^#{1,6} $/.test(segno);
  const giaTutte = righe.every((r) => r.startsWith(segno) || (!r.trim() && righe.length > 1));
  const nuove = righe.map((r, k) => {
    if (!r.trim() && righe.length > 1) return r;
    if (giaTutte) return r.slice(segno.length);
    const pulita = eTitolo ? r.replace(/^#{1,6} /, '') : r;
    // un elenco numerato conta da sé
    const s = segno === '1. ' ? `${k + 1}. ` : segno;
    return s + pulita;
  });
  const blocco = nuove.join('\n');
  const nuovo = testo.slice(0, inizio) + blocco + testo.slice(fine);
  // una riga sola vuota: il cursore dopo il segno, pronto a scrivere
  if (righe.length === 1 && !giaTutte) {
    const cursore = inizio + blocco.length;
    return { testo: nuovo, da: cursore, a: cursore };
  }
  return { testo: nuovo, da: inizio, a: inizio + blocco.length };
}

/**
 * Inserisce un blocco intero (una tabella, un calcolo, un riquadro) al posto
 * della selezione, staccato da righe vuote da quello che c'è sopra e sotto —
 * attaccato a un paragrafo, un blocco Markdown non è più un blocco. Il pezzo
 * fra `‸` e `‸` (se c'è) resta selezionato, pronto da sovrascrivere.
 */
export function inserisciBlocco(testo: string, da: number, a: number, blocco: string): Modifica {
  const prima = testo.slice(0, da);
  const dopo = testo.slice(a);
  const sopra = !prima || prima.endsWith('\n\n') ? '' : prima.endsWith('\n') ? '\n' : '\n\n';
  const sotto = !dopo || dopo.startsWith('\n\n') ? '' : dopo.startsWith('\n') ? '\n' : '\n\n';
  const [p, sel, s] = blocco.includes('‸') ? blocco.split('‸') : [blocco, '', ''];
  const corpo = p + sel + (s ?? '');
  const inizio = prima.length + sopra.length;
  return {
    testo: prima + sopra + corpo + sotto + dopo,
    da: inizio + p.length,
    a: inizio + p.length + sel.length,
  };
}

/** Inserisce del testo al cursore (al posto della selezione), e ci mette il cursore dopo. */
export function inserisci(testo: string, da: number, a: number, pezzo: string): Modifica {
  const fine = da + pezzo.length;
  return { testo: testo.slice(0, da) + pezzo + testo.slice(a), da: fine, a: fine };
}

/* ─────────────────────────── i blocchi pronti ─────────────────────────── */

export const BLOCCO_TABELLA = '| ‸Colonna‸ | Colonna | Colonna |\n|---|---|---|\n|  |  |  |\n|  |  |  |';

export const BLOCCO_CALCOLO =
  '```calcolo\n# dati\n‸a = 1 [m]    # descrizione‸\n# risultato\nb = 2*a [m]\n```';

export const TIPI_RIQUADRO = [
  { tipo: 'sintesi', etichetta: 'Sintesi' },
  { tipo: 'attenzione', etichetta: 'Attenzione' },
  { tipo: 'nota', etichetta: 'Nota' },
  { tipo: 'suggerimento', etichetta: 'Suggerimento' },
] as const;

export const bloccoRiquadro = (tipo: string, titolo: string) => `> [!${tipo}] ${titolo}\n> ‸Testo‸`;

/* ─────────────────────────── immagini ─────────────────────────── */

/** La cartella degli allegati: di servizio, l'app non la legge come schede. */
export const CARTELLA_ALLEGATI = '_allegati';

/**
 * Il nome del file di un'immagine: la scheda da cui nasce, e l'ora — così due
 * incollate di fila non si pestano, e dalla cartella si capisce di chi sono.
 */
export function nomeImmagine(percorsoScheda: string, estensione: string, ora = new Date()): string {
  const radice = percorsoScheda.replace(/^.*\//, '').replace(/\.md$/i, '') || 'scheda';
  const t = ora.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const suffisso = Math.random().toString(36).slice(2, 5);
  return `${CARTELLA_ALLEGATI}/${radice}-${t}-${suffisso}.${estensione}`;
}

/** Il segno Markdown di un'immagine, su una riga sua. */
export const segnoImmagine = (percorso: string, didascalia = '') => `![${didascalia}](${percorso})`;
