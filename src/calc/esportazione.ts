/**
 * Esportazione del Quaderno: lo stesso foglio che si vede a schermo — blocchi
 * di calcolo, note, schemi e capitoli ripresi dalle altre schede, nell'ordine
 * in cui li si è messi — in un documento che si legge anche senza questa app.
 *
 * Due formati, per due usi diversi:
 *  - **testo semplice**, da incollare in OneNote o in una mail;
 *  - **HTML autonomo**, un unico file con lo stile dentro: si apre con
 *    qualunque browser, si stampa in PDF e si può reimportare in Word.
 *
 * L'export JSON del progetto resta quello che era: serve a *riaprire* il
 * lavoro, non a leggerlo. Questo serve a leggerlo.
 */

import type { AppState } from '../state/store';
import { foglioQuaderno, intestazione, testoFoglio, type Capitolo } from './relazione';

/** I capitoli tirati dentro il quaderno, nell'ordine in cui stanno sul foglio. */
export function capitoliNelFoglio(state: AppState): Capitolo[] {
  return foglioQuaderno(state).flatMap((e) => (e.tipo === 'capitolo' ? [e.capitolo] : []));
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

/** Versione testuale: il foglio del quaderno, riga per riga, nel suo ordine. */
export function documentoTesto(state: AppState): string {
  const e = state.quaderno;
  const righe = [
    ...intestazione(state, 'RELAZIONE DI CALCOLO'),
    ...(e.intestazione.trim() ? [e.intestazione.trim(), ''] : []),
    ...testoFoglio(state),
    '',
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
  const e = state.quaderno;
  const titolo = `${p.nome} — ${p.commessa}`;

  const corpo = foglioQuaderno(state)
    .map((el) => {
      if (el.tipo === 'capitolo') {
        const c = el.capitolo;
        return `  <section class="cap">
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
  </section>`;
      }
      if (el.tipo === 'nota') return `  <p class="nota">${escape(el.testo)}</p>`;
      if (el.tipo === 'immagine')
        // l'immagine è dentro il file come data URL: il documento resta un
        // file solo, che si apre offline e si allega a una mail
        return `  <figure class="schema">
    <img alt="${escape(el.didascalia || 'schema')}"${
      el.larghezza ? ` style="width:${el.larghezza}%"` : ''
    } src="${escape(el.img)}">
${el.didascalia ? `    <figcaption>${escape(el.didascalia)}</figcaption>` : ''}
  </figure>`;
      return `  <p class="calcolo${el.livello ? ` is-${el.livello}` : ''}"><span class="passo">${escape(
        el.passo,
      )}</span>${escape(el.testo)}${
        el.nota ? `<span class="nota-riga">${escape(el.nota)}</span>` : ''
      }</p>`;
    })
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
  .calcolo {
    margin: 2px 0; font-family: "Cascadia Mono", Consolas, monospace; font-size: 11.5px;
    break-inside: avoid; page-break-inside: avoid;
  }
  .passo { display: inline-block; min-width: 22px; color: #8a8f9a; }
  /* il semaforo dei rapporti di verifica, come sul foglio a schermo */
  .calcolo.is-ok { color: #1f7a45; }
  .calcolo.is-limite { color: #9a6a11; }
  .calcolo.is-fuori { color: #b3261e; font-weight: 600; }
  .nota-riga { color: #55606f; font-size: 10.5px; margin-left: 8px; }
  .nota { margin: 8px 0; font-size: 12px; }
  .schema { margin: 10px 0; break-inside: avoid; page-break-inside: avoid; }
  .schema img { max-width: 100%; border: 1px solid #c8ced8; }
  figcaption { font-size: 10.5px; color: #55606f; margin-top: 3px; }
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
${corpo || '  <p>Quaderno vuoto: non è stato portato dentro niente.</p>'}
<footer>
${e.nota.trim() ? `  <p>${escape(e.nota.trim())}</p>` : ''}
  <p>Documento di predimensionamento: i valori vanno confermati dal calcolo esecutivo.</p>
</footer>
</body>
</html>
`;
}
