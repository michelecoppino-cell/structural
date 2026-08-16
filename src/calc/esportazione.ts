/**
 * Foglio di esportazione: gli stessi capitoli che si vedono a schermo, messi
 * in un documento che si legge anche senza questa app.
 *
 * Due formati, per due usi diversi:
 *  - **testo semplice**, da incollare in OneNote o in una mail;
 *  - **HTML autonomo**, un unico file con lo stile dentro: si apre con
 *    qualunque browser, si stampa in PDF e si può reimportare in Word.
 *
 * L'export JSON del progetto resta quello che era: serve a *riaprire* il
 * lavoro, non a leggerlo. Questo serve a leggerlo.
 */

import type { AppState, CapitoloId } from '../state/store';
import { CAPITOLI, capitoli, intestazione, testoBlocchi, type Capitolo } from './relazione';

/** I capitoli spuntati, nell'ordine dell'app. */
export function capitoliScelti(state: AppState): Capitolo[] {
  const scelti = CAPITOLI.filter((c) => state.esportazione.capitoli[c.id]).map((c) => c.id as CapitoloId);
  return capitoli(state, scelti);
}

/** Nome del file, senza estensione: commessa e revisione, come si archivia. */
export function nomeFile(state: AppState): string {
  const p = state.progetto;
  const grezzo = `${p.commessa || 'commessa'}-${p.nome || 'relazione'}-rev${p.revisione || '0'}`;
  return grezzo.replace(/[^\p{L}\p{N}_.-]+/gu, '-').replace(/-+/g, '-');
}

/** Data di oggi in forma italiana, per il piede del foglio. */
export function oggi(): string {
  return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Versione testuale: capitoli in fila, come il «Copia» ma su più schede. */
export function documentoTesto(state: AppState): string {
  const e = state.esportazione;
  const righe = [
    ...intestazione(state, 'RELAZIONE DI CALCOLO'),
    ...(e.intestazione.trim() ? [e.intestazione.trim(), ''] : []),
    ...capitoliScelti(state).flatMap((c) => [
      c.titolo.toUpperCase(),
      ''.padEnd(c.titolo.length, '─'),
      ...testoBlocchi(c.blocchi),
      '',
    ]),
    ...(e.nota.trim() ? [e.nota.trim(), ''] : []),
    `${oggi()} — documento generato dal predimensionatore NTC2018`,
  ];
  return righe.join('\n');
}

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Documento HTML completo: stile dentro il file, nessuna risorsa esterna,
 * formato pagina A4 già impostato per la stampa in PDF.
 */
export function documentoHtml(state: AppState): string {
  const p = state.progetto;
  const e = state.esportazione;
  const titolo = `${p.nome} — ${p.commessa}`;

  const corpo = capitoliScelti(state)
    .map(
      (c) => `  <section class="cap">
    <h2>${escape(c.titolo)}</h2>
${c.blocchi
  .map(
    (b) => `    <div class="blocco">
      <h3>${escape(b.titolo)}</h3>
      <ul>
${b.righe.map((r) => `        <li>${escape(r)}</li>`).join('\n')}
      </ul>
    </div>`,
  )
  .join('\n')}
  </section>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(titolo)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  :root { color-scheme: light; }
  body {
    margin: 0 auto; padding: 24px; max-width: 190mm;
    font: 12px/1.5 "Segoe UI", system-ui, sans-serif; color: #14181f; background: #fff;
  }
  header { border-bottom: 2px solid #14181f; padding-bottom: 8px; margin-bottom: 16px; }
  h1 { font-size: 17px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #55606f; }
  .premessa { margin: 12px 0; font-size: 12px; }
  h2 {
    font-size: 13px; margin: 18px 0 8px; padding-bottom: 3px;
    border-bottom: 1px solid #c8ced8; text-transform: uppercase; letter-spacing: 0.06em;
  }
  h3 { font-size: 12px; margin: 10px 0 4px; color: #2b3644; }
  ul { margin: 0 0 6px; padding-left: 18px; }
  li { margin: 1px 0; font-family: "Cascadia Mono", Consolas, monospace; font-size: 11px; }
  .cap { break-inside: auto; page-break-inside: auto; }
  .blocco { break-inside: avoid; page-break-inside: avoid; }
  footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #c8ced8; font-size: 10.5px; color: #55606f; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<header>
  <h1>${escape(p.nome)}</h1>
  <div class="meta">Commessa ${escape(p.commessa)} · ${escape(p.localita)} · NTC2018 (DM 17/01/2018) · rev. ${escape(
    p.revisione,
  )} · ${oggi()}</div>
</header>
${e.intestazione.trim() ? `<p class="premessa">${escape(e.intestazione.trim())}</p>` : ''}
${corpo || '  <p>Nessun capitolo selezionato.</p>'}
<footer>
${e.nota.trim() ? `  <p>${escape(e.nota.trim())}</p>` : ''}
  <p>Documento di predimensionamento: i valori vanno confermati dal calcolo esecutivo.</p>
</footer>
</body>
</html>
`;
}
