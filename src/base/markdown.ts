/**
 * Il Markdown delle schede, letto in blocchi.
 *
 * Non è un Markdown completo, ed è voluto: è quello che si scrive davvero in
 * un appunto tecnico — titoli, paragrafi, elenchi anche annidati, caselle da
 * spuntare, tabelle, citazioni e riquadri (`> [!attenzione]`), codice — più le
 * due cose che fanno della Base qualcosa di diverso da un blocco note:
 *
 *  - i blocchi ` ```calcolo `, che si calcolano con il motore del Quaderno;
 *  - i `[[collegamenti]]`, verso un'altra scheda o verso una norma della
 *    Libreria.
 *
 * Il risultato è un albero di dati, non HTML: lo disegna React, e così nessun
 * testo di una scheda può diventare codice nella pagina.
 */

export type Inline =
  | { t: 'testo'; v: string }
  | { t: 'codice'; v: string }
  | { t: 'grassetto'; c: Inline[] }
  | { t: 'corsivo'; c: Inline[] }
  | { t: 'barrato'; c: Inline[] }
  | { t: 'link'; url: string; c: Inline[] }
  | { t: 'wiki'; bersaglio: string; etichetta: string }
  | { t: 'immagine'; src: string; alt: string }
  | { t: 'acapo' };

export interface VoceElenco {
  contenuto: Inline[];
  /** `null` = voce normale; `true`/`false` = casella spuntata o no. */
  casella: boolean | null;
  /** Numero d'ordine della casella nel testo, per spuntarla: -1 se non è una casella. */
  indiceCasella: number;
  figli: Blocco[];
}

export type Blocco =
  | { t: 'titolo'; livello: number; c: Inline[] }
  | { t: 'paragrafo'; c: Inline[] }
  /** Un'immagine da sola sulla sua riga: si disegna larga, con la didascalia sotto. */
  | { t: 'figura'; src: string; alt: string }
  | { t: 'elenco'; ordinato: boolean; inizio: number; voci: VoceElenco[] }
  | { t: 'codice'; lingua: string; testo: string }
  | { t: 'citazione'; figli: Blocco[] }
  | { t: 'riquadro'; tipo: string; titolo: Inline[]; figli: Blocco[] }
  | { t: 'tabella'; intestazioni: Inline[][]; allineamenti: ('' | 'sx' | 'centro' | 'dx')[]; righe: Inline[][][] }
  | { t: 'linea' };

/* ─────────────────────────── in linea ─────────────────────────── */

/**
 * Il testo di una riga, con i suoi segni: `codice`, **grassetto**, *corsivo*,
 * ~~barrato~~, [link](url), [[collegamento|etichetta]] e gli indirizzi nudi.
 * Un segno che non si chiude resta testo, come a scriverlo a mano.
 */
export function inline(s: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const svuota = () => {
    if (buf) out.push({ t: 'testo', v: buf });
    buf = '';
  };

  let i = 0;
  while (i < s.length) {
    const c = s[i];

    // un carattere protetto dalla barra rovescia resta com'è
    if (c === '\\' && i + 1 < s.length && /[\\`*_~[\]()#!|>-]/.test(s[i + 1])) {
      buf += s[i + 1];
      i += 2;
      continue;
    }

    if (c === '`') {
      const fine = s.indexOf('`', i + 1);
      if (fine > i) {
        svuota();
        out.push({ t: 'codice', v: s.slice(i + 1, fine) });
        i = fine + 1;
        continue;
      }
    }

    // un'immagine: `![didascalia](percorso)`, o come la scrive Obsidian `![[file.png]]`
    if (s.startsWith('![[', i)) {
      const fine = s.indexOf(']]', i + 3);
      const dentro = fine > i ? s.slice(i + 3, fine) : '';
      const [file, alt] = dentro.split('|');
      if (fine > i && RE_FILE_IMMAGINE.test(file.trim())) {
        svuota();
        out.push({ t: 'immagine', src: percorsoImmagine(file.trim()), alt: (alt ?? '').trim() });
        i = fine + 2;
        continue;
      }
    }
    if (c === '!' && s[i + 1] === '[') {
      const chiusa = cercaChiusura(s, i + 1, '[', ']');
      if (chiusa > 0 && s[chiusa + 1] === '(') {
        const fineUrl = s.indexOf(')', chiusa + 2);
        if (fineUrl > 0) {
          svuota();
          const src = s.slice(chiusa + 2, fineUrl).trim().replace(/^<|>$/g, '');
          out.push({ t: 'immagine', src: percorsoImmagine(src), alt: s.slice(i + 2, chiusa) });
          i = fineUrl + 1;
          continue;
        }
      }
    }

    if (s.startsWith('[[', i)) {
      const fine = s.indexOf(']]', i + 2);
      if (fine > i) {
        const dentro = s.slice(i + 2, fine);
        const [bersaglio, etichetta] = dentro.split('|');
        svuota();
        out.push({ t: 'wiki', bersaglio: bersaglio.trim(), etichetta: (etichetta ?? bersaglio).trim() });
        i = fine + 2;
        continue;
      }
    }

    if (c === '[') {
      const chiusa = cercaChiusura(s, i, '[', ']');
      if (chiusa > 0 && s[chiusa + 1] === '(') {
        const fineUrl = s.indexOf(')', chiusa + 2);
        if (fineUrl > 0) {
          svuota();
          out.push({ t: 'link', url: s.slice(chiusa + 2, fineUrl).trim(), c: inline(s.slice(i + 1, chiusa)) });
          i = fineUrl + 1;
          continue;
        }
      }
    }

    if (s.startsWith('**', i) || s.startsWith('__', i)) {
      const segno = s.slice(i, i + 2);
      const fine = s.indexOf(segno, i + 2);
      if (fine > i + 2) {
        svuota();
        out.push({ t: 'grassetto', c: inline(s.slice(i + 2, fine)) });
        i = fine + 2;
        continue;
      }
    }

    if (s.startsWith('~~', i)) {
      const fine = s.indexOf('~~', i + 2);
      if (fine > i + 2) {
        svuota();
        out.push({ t: 'barrato', c: inline(s.slice(i + 2, fine)) });
        i = fine + 2;
        continue;
      }
    }

    // un solo asterisco o trattino basso: corsivo — ma non dentro una parola
    // per il trattino basso (`nome_variabile` resta com'è), e non se segue uno
    // spazio (`2 * 3` è una moltiplicazione)
    if ((c === '*' || c === '_') && s[i + 1] && s[i + 1] !== ' ' && s[i + 1] !== c) {
      const primaParola = c === '_' && i > 0 && /[\p{L}\p{N}]/u.test(s[i - 1]);
      if (!primaParola) {
        let fine = i + 1;
        while ((fine = s.indexOf(c, fine)) > 0) {
          if (s[fine - 1] !== ' ' && s[fine + 1] !== c) break;
          fine++;
        }
        if (fine > i + 1 && !(c === '_' && /[\p{L}\p{N}]/u.test(s[fine + 1] ?? ''))) {
          svuota();
          out.push({ t: 'corsivo', c: inline(s.slice(i + 1, fine)) });
          i = fine + 1;
          continue;
        }
      }
    }

    if ((c === 'h' || c === 'H') && /^https?:\/\//i.test(s.slice(i, i + 8))) {
      const m = /^https?:\/\/[^\s<>)]+/i.exec(s.slice(i));
      if (m) {
        const url = m[0].replace(/[.,;:!?]+$/, '');
        svuota();
        out.push({ t: 'link', url, c: [{ t: 'testo', v: url }] });
        i += url.length;
        continue;
      }
    }

    buf += c;
    i++;
  }
  svuota();
  return out;
}

const RE_FILE_IMMAGINE = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

/**
 * Dove sta un'immagine, rispetto alla cartella della Base. Un nome di file
 * nudo (`grafico.png`, come lo scrive Obsidian) sta negli allegati; un
 * indirizzo web resta com'è; `./` in testa non conta.
 */
export function percorsoImmagine(src: string): string {
  const s = src.trim();
  if (/^https?:\/\//i.test(s)) return s;
  let decodificato = s;
  try {
    decodificato = decodeURI(s); // `grafico%20taglio.png`, come lo scrivono gli editor
  } catch {
    // un % che non è una codifica: il nome resta com'è
  }
  const pulito = decodificato.replace(/^\.\//, '').replace(/^\/+/, '');
  return pulito.includes('/') ? pulito : `_allegati/${pulito}`;
}

/** La parentesi che chiude quella in `da`, tenendo conto di quelle annidate. */
function cercaChiusura(s: string, da: number, apre: string, chiude: string): number {
  let livello = 0;
  for (let i = da; i < s.length; i++) {
    if (s[i] === apre) livello++;
    else if (s[i] === chiude && --livello === 0) return i;
  }
  return -1;
}

/** Le righe di un paragrafo: un a capo con due spazi (o `\`) in coda va a capo davvero. */
function inlineRighe(righe: string[]): Inline[] {
  const out: Inline[] = [];
  righe.forEach((r, k) => {
    const forzato = / {2,}$|\\$/.test(r);
    const pulita = r.replace(/\\$/, '').trim();
    out.push(...inline(pulita));
    if (k < righe.length - 1) out.push(forzato ? { t: 'acapo' } : { t: 'testo', v: ' ' });
  });
  return out;
}

/* ─────────────────────────── a blocchi ─────────────────────────── */

const RE_TITOLO = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_LINEA = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;
const RE_RECINTO = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)?.*$/;
const RE_VOCE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const RE_CITAZIONE = /^ {0,3}>\s?(.*)$/;
const RE_SEPARATORE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/** Un contatore condiviso: le caselle si numerano nell'ordine del testo intero. */
interface Contatore {
  caselle: number;
}

/** Il testo di una scheda in blocchi. */
export function blocchi(testo: string): Blocco[] {
  return leggiBlocchi(testo.replace(/\r\n?/g, '\n').split('\n'), { caselle: 0 });
}

const larghezzaRientro = (s: string) => s.replace(/\t/g, '    ').length;

function leggiBlocchi(righe: string[], conta: Contatore): Blocco[] {
  const out: Blocco[] = [];
  let i = 0;

  while (i < righe.length) {
    const riga = righe[i];

    if (!riga.trim()) {
      i++;
      continue;
    }

    const recinto = RE_RECINTO.exec(riga);
    if (recinto) {
      const segno = recinto[1];
      const lingua = (recinto[2] ?? '').toLowerCase();
      const dentro: string[] = [];
      i++;
      while (i < righe.length && !righe[i].trim().startsWith(segno)) dentro.push(righe[i++]);
      i++; // la chiusura (o la fine del testo, se manca)
      out.push({ t: 'codice', lingua, testo: dentro.join('\n') });
      continue;
    }

    const titolo = RE_TITOLO.exec(riga);
    if (titolo) {
      out.push({ t: 'titolo', livello: titolo[1].length, c: inline(titolo[2]) });
      i++;
      continue;
    }

    if (RE_LINEA.test(riga)) {
      out.push({ t: 'linea' });
      i++;
      continue;
    }

    if (RE_CITAZIONE.test(riga)) {
      const dentro: string[] = [];
      while (i < righe.length && RE_CITAZIONE.test(righe[i])) dentro.push(RE_CITAZIONE.exec(righe[i++])![1]);
      const riquadro = /^\[!([\p{L}\p{N}_-]+)\][+-]?\s*(.*)$/u.exec(dentro[0] ?? '');
      if (riquadro) {
        out.push({
          t: 'riquadro',
          tipo: riquadro[1].toLowerCase(),
          titolo: inline(riquadro[2]),
          figli: leggiBlocchi(dentro.slice(1), conta),
        });
      } else {
        out.push({ t: 'citazione', figli: leggiBlocchi(dentro, conta) });
      }
      continue;
    }

    if (riga.includes('|') && i + 1 < righe.length && RE_SEPARATORE.test(righe[i + 1])) {
      const intestazioni = celle(riga).map(inline);
      const allineamenti = celle(righe[i + 1]).map((c) => {
        const sx = c.startsWith(':');
        const dx = c.endsWith(':');
        return sx && dx ? 'centro' : dx ? 'dx' : sx ? 'sx' : '';
      }) as ('' | 'sx' | 'centro' | 'dx')[];
      i += 2;
      const righeTabella: Inline[][][] = [];
      while (i < righe.length && righe[i].trim() && righe[i].includes('|')) {
        righeTabella.push(celle(righe[i++]).map(inline));
      }
      out.push({ t: 'tabella', intestazioni, allineamenti, righe: righeTabella });
      continue;
    }

    if (RE_VOCE.test(riga)) {
      const [elenco, dopo] = leggiElenco(righe, i, conta);
      out.push(elenco);
      i = dopo;
      continue;
    }

    // paragrafo: fino a una riga vuota o all'inizio di un altro blocco
    const para: string[] = [];
    while (
      i < righe.length &&
      righe[i].trim() &&
      !RE_TITOLO.test(righe[i]) &&
      !RE_RECINTO.test(righe[i]) &&
      !RE_CITAZIONE.test(righe[i]) &&
      !RE_LINEA.test(righe[i]) &&
      !(para.length && RE_VOCE.test(righe[i]))
    ) {
      para.push(righe[i++]);
    }
    if (!para.length) para.push(righe[i++]); // una riga che nessuno ha voluto: resta testo
    const c = inlineRighe(para);
    const sola = c.filter((x) => !(x.t === 'testo' && !x.v.trim()));
    if (sola.length === 1 && sola[0].t === 'immagine') out.push({ t: 'figura', src: sola[0].src, alt: sola[0].alt });
    else out.push({ t: 'paragrafo', c });
  }
  return out;
}

/** Le celle di una riga di tabella, senza i bordi esterni. */
function celle(riga: string): string[] {
  let r = riga.trim();
  if (r.startsWith('|')) r = r.slice(1);
  if (r.endsWith('|') && !r.endsWith('\\|')) r = r.slice(0, -1);
  const out: string[] = [];
  let buf = '';
  for (let k = 0; k < r.length; k++) {
    if (r[k] === '\\' && r[k + 1] === '|') {
      buf += '|';
      k++;
    } else if (r[k] === '|') {
      out.push(buf.trim());
      buf = '';
    } else buf += r[k];
  }
  out.push(buf.trim());
  return out;
}

/**
 * Un elenco, con le voci annidate: una riga più rientrata della voce che la
 * precede le appartiene — un sotto-elenco, o il seguito del suo testo.
 */
function leggiElenco(righe: string[], da: number, conta: Contatore): [Blocco, number] {
  const prima = RE_VOCE.exec(righe[da])!;
  const rientro = larghezzaRientro(prima[1]);
  const ordinato = /\d/.test(prima[2]);
  const voci: VoceElenco[] = [];
  let i = da;

  while (i < righe.length) {
    const m = RE_VOCE.exec(righe[i]);
    if (!m || larghezzaRientro(m[1]) !== rientro || /\d/.test(m[2]) !== ordinato) break;

    let testo = m[3];
    let casella: boolean | null = null;
    let indiceCasella = -1;
    const c = /^\[([ xX])\]\s+(.*)$/.exec(testo) ?? /^\[([ xX])\]$/.exec(testo);
    if (c) {
      casella = c[1] !== ' ';
      indiceCasella = conta.caselle++;
      testo = c[2] ?? '';
    }
    i++;

    // il seguito della voce: righe più rientrate, o righe vuote fra di loro
    const seguito: string[] = [];
    const testoVoce: string[] = [testo];
    while (i < righe.length) {
      const r = righe[i];
      if (!r.trim()) {
        const prossima = righe.slice(i + 1).find((x) => x.trim());
        if (prossima !== undefined && larghezzaRientro(/^\s*/.exec(prossima)![0]) > rientro) {
          seguito.push('');
          i++;
          continue;
        }
        break;
      }
      const rr = larghezzaRientro(/^\s*/.exec(r)![0]);
      if (rr <= rientro) {
        // una riga non rientrata che non è una voce è il seguito pigro del testo
        if (!seguito.length && !RE_VOCE.test(r) && !RE_TITOLO.test(r) && !RE_RECINTO.test(r) && !RE_CITAZIONE.test(r)) {
          testoVoce.push(r);
          i++;
          continue;
        }
        break;
      }
      if (!seguito.length && !RE_VOCE.test(r.trim()) && !RE_RECINTO.test(r)) {
        testoVoce.push(r);
      } else {
        seguito.push(r);
      }
      i++;
    }

    // il seguito si rilegge togliendo il rientro della voce
    const taglio = Math.min(
      ...seguito.filter((x) => x.trim()).map((x) => larghezzaRientro(/^\s*/.exec(x)![0])),
    );
    const figli = seguito.length
      ? leggiBlocchi(
          seguito.map((x) => x.replace(/\t/g, '    ').slice(Number.isFinite(taglio) ? taglio : 0)),
          conta,
        )
      : [];
    voci.push({ contenuto: inlineRighe(testoVoce), casella, indiceCasella, figli });
  }

  return [{ t: 'elenco', ordinato, inizio: ordinato ? parseInt(prima[2], 10) : 1, voci }, i];
}

/** Il testo piano di una sequenza in linea: per titoli, indici e ricerche. */
export function testoPiano(c: Inline[]): string {
  return c
    .map((x) => {
      switch (x.t) {
        case 'testo':
        case 'codice':
          return x.v;
        case 'wiki':
          return x.etichetta;
        case 'immagine':
          return x.alt;
        case 'acapo':
          return ' ';
        default:
          return testoPiano(x.c);
      }
    })
    .join('');
}
