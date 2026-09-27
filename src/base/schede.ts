/**
 * La Base tecnica: le schede di conoscenza, cioè file Markdown su OneDrive.
 *
 * Il senso di tutta questa parte sta in una riga: **un argomento nuovo si
 * aggiunge scrivendo un file, non scrivendo codice**. Aree, tipi, stati e tag
 * non sono elenchi chiusi da nessuna parte: esistono perché qualcuno li ha
 * scritti in testa a una scheda, come le categorie della Libreria norme.
 *
 * Una scheda è un file `.md` con un'intestazione (il *frontmatter*, fra due
 * righe `---`) e sotto il testo:
 *
 * ```markdown
 * ---
 * titolo: Portanza dei pali trivellati
 * area: geotecnica
 * tipo: sintesi
 * stato: da-studiare
 * tag: [fondazioni, pali]
 * norme: [NTC 2018 §6.4.3, EC7]
 * ---
 * # Portanza dei pali trivellati
 * ...
 * ```
 *
 * Il formato è quello di Obsidian e di mezzo mondo: la cartella si apre anche
 * con un altro editor, e la Base non diventa una prigione.
 *
 * Qui dentro solo funzioni pure: leggere l'intestazione, cercare, filtrare,
 * risolvere i collegamenti. Chi legge e scrive i file è `archivio.ts`.
 */
import type { LinkUtente } from '../data/normative';

/** Un valore dell'intestazione: una parola o un elenco. */
export type ValoreMeta = string | string[];

export interface Scheda {
  /** Percorso del file dentro la cartella della Base (`pali.md`, `_modelli/sintesi.md`). */
  percorso: string;
  titolo: string;
  area: string;
  tipo: string;
  stato: string;
  tag: string[];
  norme: string[];
  /** L'intestazione intera, chiavi in minuscolo: anche i campi che l'app non conosce. */
  meta: Record<string, ValoreMeta>;
  /** Il testo senza l'intestazione. */
  corpo: string;
  /** Il file com'è, intestazione compresa: è quello che si riscrive. */
  testo: string;
  /** Ultima modifica su OneDrive (ISO), se nota. */
  modificata: string;
}

/** La sottocartella dei modelli: schede-tipo da cui nascono le altre. */
export const CARTELLA_MODELLI = '_modelli';

/** Area di chi non ne ha scritta una. */
export const SENZA_AREA = 'Senza area';

/**
 * Gli stati di studio proposti. Non sono un recinto — uno stato scritto a mano
 * vale come gli altri — ma questi tre hanno un ordine, ed è quello che serve a
 * dire «cosa mi resta da studiare».
 */
export const STATI_STUDIO = ['da-studiare', 'in-corso', 'consolidata'] as const;

/* ─────────────────────────── intestazione ─────────────────────────── */

const APERTURA = /^﻿?---[ \t]*\r?\n/;

/** Separa intestazione e corpo. Senza intestazione, tutto è corpo. */
export function separa(testo: string): { grezza: string | null; corpo: string } {
  const m = APERTURA.exec(testo);
  if (!m) return { grezza: null, corpo: testo };
  const resto = testo.slice(m[0].length);
  const chiusura = /^---[ \t]*$/m.exec(resto);
  if (!chiusura) return { grezza: null, corpo: testo };
  const grezza = resto.slice(0, chiusura.index);
  let corpo = resto.slice(chiusura.index + chiusura[0].length);
  corpo = corpo.replace(/^\r?\n/, '');
  return { grezza, corpo };
}

/** Toglie le virgolette di un valore scritto fra apici. */
function senzaVirgolette(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) {
    return t.slice(1, -1);
  }
  return t;
}

/**
 * Un commento in coda (`stato: in-corso   # da-studiare | in-corso`) si toglie,
 * ma solo se il cancelletto è staccato: `C#` o un colore `#fff` restano.
 */
function senzaCommento(s: string): string {
  const i = s.search(/\s#/);
  return i < 0 ? s : s.slice(0, i);
}

/**
 * Legge l'intestazione: il sottoinsieme di YAML che serve a una scheda — una
 * chiave per riga, valori semplici, elenchi `[a, b]` o a righe `- a`. Niente
 * di più: chi volesse oggetti annidati li scrive nel corpo.
 */
export function leggiMeta(grezza: string | null): Record<string, ValoreMeta> {
  const meta: Record<string, ValoreMeta> = {};
  if (!grezza) return meta;
  let chiaveElenco: string | null = null;
  for (const riga of grezza.split(/\r?\n/)) {
    if (!riga.trim() || riga.trim().startsWith('#')) continue;
    const voce = /^\s+-\s*(.*)$/.exec(riga) ?? /^-\s+(.*)$/.exec(riga);
    if (voce && chiaveElenco) {
      const v = senzaVirgolette(senzaCommento(voce[1]));
      if (v) (meta[chiaveElenco] as string[]).push(v);
      continue;
    }
    const m = /^([\p{L}\p{N}_-]+)\s*:\s*(.*)$/u.exec(riga);
    if (!m) continue;
    const chiave = m[1].toLowerCase();
    const valore = senzaCommento(m[2]).trim();
    if (!valore) {
      meta[chiave] = [];
      chiaveElenco = chiave;
      continue;
    }
    chiaveElenco = null;
    if (valore.startsWith('[') && valore.endsWith(']')) {
      meta[chiave] = valore
        .slice(1, -1)
        .split(',')
        .map(senzaVirgolette)
        .filter(Boolean);
    } else {
      meta[chiave] = senzaVirgolette(valore);
    }
  }
  return meta;
}

const comeTesto = (v: ValoreMeta | undefined): string => (Array.isArray(v) ? v.join(', ') : (v ?? '')).trim();
const comeElenco = (v: ValoreMeta | undefined): string[] =>
  Array.isArray(v) ? v : v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

/** Il nome del file senza cartella né estensione. */
export function nomeFile(percorso: string): string {
  return percorso.replace(/^.*\//, '').replace(/\.md$/i, '');
}

/** Il primo titolo `# …` del corpo, se c'è. */
function primoTitolo(corpo: string): string {
  let inCodice = false;
  for (const riga of corpo.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(riga)) inCodice = !inCodice;
    if (inCodice) continue;
    const m = /^#\s+(.+?)\s*#*\s*$/.exec(riga);
    if (m) return m[1];
  }
  return '';
}

/**
 * Un file diventa una scheda. Il titolo è quello dell'intestazione, o il primo
 * `# titolo` del testo, o il nome del file: una scheda scritta di corsa senza
 * intestazione è una scheda lo stesso.
 */
export function leggiScheda(percorso: string, testo: string, modificata = ''): Scheda {
  const { grezza, corpo } = separa(testo);
  const meta = leggiMeta(grezza);
  return {
    percorso,
    titolo: comeTesto(meta.titolo) || primoTitolo(corpo) || nomeFile(percorso),
    area: comeTesto(meta.area),
    tipo: comeTesto(meta.tipo),
    stato: comeTesto(meta.stato),
    tag: comeElenco(meta.tag ?? meta.tags).map((t) => t.replace(/^#/, '')),
    norme: comeElenco(meta.norme),
    meta,
    corpo,
    testo,
    modificata,
  };
}

/** Un valore com'è scritto in un'intestazione. */
function scriviValore(v: ValoreMeta): string {
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  return v;
}

/**
 * Cambia (o aggiunge) un campo dell'intestazione lasciando tutto il resto com'è
 * — ordine delle chiavi, commenti, righe che l'app non capisce. Serve a
 * cambiare lo stato di studio senza riscrivere il file a modo suo.
 */
export function impostaCampo(testo: string, chiave: string, valore: ValoreMeta): string {
  const riga = `${chiave}: ${scriviValore(valore)}`;
  const { grezza } = separa(testo);
  if (grezza === null) return `---\n${riga}\n---\n${testo}`;

  const apertura = APERTURA.exec(testo)![0];
  const righe = grezza.split(/\r?\n/);
  const i = righe.findIndex((r) => new RegExp(`^${chiave}\\s*:`, 'i').test(r));
  if (i < 0) {
    // la grezza finisce con l'a capo prima della chiusura: la riga nuova va lì
    const pulite = grezza.replace(/\r?\n$/, '');
    const nuova = pulite ? `${pulite}\n${riga}\n` : `${riga}\n`;
    return apertura + nuova + testo.slice(apertura.length + grezza.length);
  }
  // un elenco scritto a righe `- a` sotto la chiave se ne va con lei
  let fine = i + 1;
  while (fine < righe.length && /^\s+-|^-\s/.test(righe[fine])) fine++;
  righe.splice(i, fine - i, riga);
  return apertura + righe.join('\n') + testo.slice(apertura.length + grezza.length);
}

/* ─────────────────────────── nomi dei file ─────────────────────────── */

/** Minuscolo e senza accenti: è così che si confrontano nomi e ricerche. */
export function normalizza(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Il nome di file che nasce da un titolo: `Portanza dei pali` → `portanza-dei-pali.md`. */
export function nomeDaTitolo(titolo: string): string {
  const base = normalizza(titolo)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'scheda'}.md`;
}

/** Un nome libero, se quello proposto è già preso: `pali.md`, `pali-2.md`… */
export function nomeLibero(proposto: string, esistenti: Iterable<string>): string {
  const presi = new Set([...esistenti].map((p) => p.toLowerCase()));
  if (!presi.has(proposto.toLowerCase())) return proposto;
  const radice = proposto.replace(/\.md$/i, '');
  for (let n = 2; ; n++) {
    const candidato = `${radice}-${n}.md`;
    if (!presi.has(candidato.toLowerCase())) return candidato;
  }
}

/* ─────────────────────────── modelli ─────────────────────────── */

export const eModello = (s: Scheda): boolean => s.percorso.startsWith(`${CARTELLA_MODELLI}/`);

/**
 * Una scheda nuova da un modello: i segnaposto `{{titolo}}` e `{{data}}` si
 * riempiono, e l'intestazione prende il titolo scritto. Il resto del modello —
 * sezioni, domande guida, checklist — arriva com'è.
 */
export function daModello(modello: string, titolo: string, oggi = new Date()): string {
  const data = oggi.toISOString().slice(0, 10);
  const riempito = modello.replace(/\{\{\s*titolo\s*\}\}/gi, titolo).replace(/\{\{\s*data\s*\}\}/gi, data);
  const conTitolo = impostaCampo(riempito, 'titolo', titolo);
  return /^\s*creata\s*:/im.test(separa(conTitolo).grezza ?? '') ? conTitolo : impostaCampo(conTitolo, 'creata', data);
}

/* ─────────────────────────── ricerca e filtri ─────────────────────────── */

export interface Filtri {
  testo: string;
  area: string;
  tipo: string;
  stato: string;
  tag: string;
}

export const FILTRI_VUOTI: Filtri = { testo: '', area: '', tipo: '', stato: '', tag: '' };

export interface Trovata {
  scheda: Scheda;
  /** Un pezzo di testo intorno alla prima parola trovata nel corpo, se c'è. */
  estratto: string;
  punteggio: number;
}

/** Il pezzo di testo intorno a una parola, su una riga sola. */
function estrattoIntorno(corpo: string, parola: string): string {
  const piatto = corpo.replace(/\s+/g, ' ');
  const i = normalizza(piatto).indexOf(parola);
  if (i < 0) return '';
  const da = Math.max(0, i - 50);
  const a = Math.min(piatto.length, i + parola.length + 70);
  return `${da > 0 ? '…' : ''}${piatto.slice(da, a).trim()}${a < piatto.length ? '…' : ''}`;
}

/**
 * Cerca e filtra. Ogni parola della ricerca deve comparire da qualche parte —
 * titolo, area, tag, norme o testo — e il titolo pesa di più: chi cerca
 * «taglio» vuole prima la scheda che si chiama così, poi quelle che ne parlano.
 * I modelli restano fuori: non sono conoscenza, sono stampi.
 */
export function cerca(schede: Scheda[], f: Filtri): Trovata[] {
  const parole = normalizza(f.testo).split(/\s+/).filter(Boolean);
  const out: Trovata[] = [];
  for (const s of schede) {
    if (eModello(s)) continue;
    if (f.area && (s.area || SENZA_AREA) !== f.area) continue;
    if (f.tipo && s.tipo !== f.tipo) continue;
    if (f.stato && s.stato !== f.stato) continue;
    if (f.tag && !s.tag.includes(f.tag)) continue;

    let punteggio = 0;
    let estratto = '';
    let tutte = true;
    const titolo = normalizza(s.titolo);
    const etichette = normalizza([s.area, s.tipo, ...s.tag, ...s.norme].join(' '));
    const corpo = normalizza(s.corpo);
    for (const p of parole) {
      if (titolo.includes(p)) punteggio += 10;
      else if (etichette.includes(p)) punteggio += 5;
      else if (corpo.includes(p)) {
        punteggio += 1;
        if (!estratto) estratto = estrattoIntorno(s.corpo, p);
      } else {
        tutte = false;
        break;
      }
    }
    if (tutte) out.push({ scheda: s, estratto, punteggio });
  }
  return out.sort(
    (a, b) => b.punteggio - a.punteggio || a.scheda.titolo.localeCompare(b.scheda.titolo, 'it'),
  );
}

export interface Faccetta {
  valore: string;
  quante: number;
}

/** Quante schede per ogni valore di un campo: le tendine dei filtri, già contate. */
export function faccette(schede: Scheda[], campo: 'area' | 'tipo' | 'stato' | 'tag'): Faccetta[] {
  const conta = new Map<string, number>();
  for (const s of schede) {
    if (eModello(s)) continue;
    const valori = campo === 'tag' ? s.tag : [campo === 'area' ? s.area || SENZA_AREA : s[campo]];
    for (const v of valori) if (v) conta.set(v, (conta.get(v) ?? 0) + 1);
  }
  const ordine = campo === 'stato' ? (v: string) => (STATI_STUDIO as readonly string[]).indexOf(v) : () => 0;
  return [...conta]
    .map(([valore, quante]) => ({ valore, quante }))
    .sort((a, b) => {
      const oa = ordine(a.valore);
      const ob = ordine(b.valore);
      if (oa !== ob) return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
      return a.valore === SENZA_AREA ? 1 : b.valore === SENZA_AREA ? -1 : a.valore.localeCompare(b.valore, 'it');
    });
}

/** Le schede raggruppate per area, nell'ordine delle aree. */
export function perArea(trovate: Trovata[]): { area: string; voci: Trovata[] }[] {
  const gruppi = new Map<string, Trovata[]>();
  for (const t of trovate) {
    const a = t.scheda.area || SENZA_AREA;
    if (!gruppi.has(a)) gruppi.set(a, []);
    gruppi.get(a)!.push(t);
  }
  return [...gruppi]
    .map(([area, voci]) => ({ area, voci }))
    .sort((a, b) => (a.area === SENZA_AREA ? 1 : b.area === SENZA_AREA ? -1 : a.area.localeCompare(b.area, 'it')));
}

/* ─────────────────────────── collegamenti ─────────────────────────── */

export type Destinazione =
  | { tipo: 'scheda'; scheda: Scheda }
  | { tipo: 'norma'; norma: LinkUtente; resto: string; pagina: string }
  | { tipo: 'nessuna' };

const compatto = (s: string) => normalizza(s).replace(/[\s._-]+/g, '');

/**
 * Dove porta un `[[collegamento]]`. Prima si cerca una scheda — per titolo o
 * per nome di file — poi un documento della Libreria norme la cui sigla apre
 * il testo: `[[NTC 2018 §4.1.2.3]]` porta alla NTC, e se nell'indice scritto a
 * mano c'è il capitolo 4.1.2.3 dice anche a che pagina sta.
 *
 * Le sigle si confrontano senza spazi né punti: «NTC2018» e «NTC 2018» sono lo
 * stesso documento, come per chi le scrive.
 */
export function risolvi(bersaglio: string, schede: Scheda[], norme: LinkUtente[]): Destinazione {
  const cercato = normalizza(bersaglio.replace(/#.*$/, ''));
  const scheda =
    schede.find((s) => !eModello(s) && normalizza(s.titolo) === cercato) ??
    schede.find((s) => !eModello(s) && normalizza(nomeFile(s.percorso)) === cercato);
  if (scheda) return { tipo: 'scheda', scheda };

  const c = compatto(bersaglio);
  let migliore: LinkUtente | null = null;
  for (const n of norme) {
    const sigla = compatto(n.sigla);
    if (sigla && c.startsWith(sigla) && (!migliore || sigla.length > compatto(migliore.sigla).length)) migliore = n;
  }
  if (!migliore) return { tipo: 'nessuna' };

  // il resto dopo la sigla, così come è scritto: «§4.1.2.3», «C8.5»
  const resto = restoDopoSigla(bersaglio, migliore.sigla);
  const numero = /([A-Za-z]?\d+(?:\.\d+)*)/.exec(resto)?.[1] ?? '';
  const capitolo = numero ? migliore.capitoli.find((k) => compatto(k.numero) === compatto(numero)) : undefined;
  return { tipo: 'norma', norma: migliore, resto, pagina: capitolo?.pagina ?? '' };
}

/** Il testo che resta dopo la sigla, contando solo lettere e cifre. */
function restoDopoSigla(testo: string, sigla: string): string {
  const quanti = compatto(sigla).length;
  let visti = 0;
  let i = 0;
  while (i < testo.length && visti < quanti) {
    if (compatto(testo[i])) visti++;
    i++;
  }
  return testo.slice(i).trim();
}

/** I `[[collegamenti]]` di un testo, fuori dai blocchi di codice. */
export function collegamenti(corpo: string): string[] {
  const out: string[] = [];
  let inCodice = false;
  for (const riga of corpo.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(riga)) inCodice = !inCodice;
    if (inCodice) continue;
    for (const m of riga.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) out.push(m[1].trim());
  }
  return out;
}

/** Le schede che portano a questa: il «chi ne parla» in fondo a ogni scheda. */
export function rimandiA(scheda: Scheda, schede: Scheda[]): Scheda[] {
  const nomi = new Set([normalizza(scheda.titolo), normalizza(nomeFile(scheda.percorso))]);
  return schede.filter(
    (s) => s !== scheda && !eModello(s) && collegamenti(s.corpo).some((c) => nomi.has(normalizza(c.replace(/#.*$/, '')))),
  );
}

/* ─────────────────────────── caselle ─────────────────────────── */

// anche dentro una citazione o un riquadro (`> - [ ] …`): il lettore le conta
const CASELLA = /^((?:\s*>)*\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])(?=\s|$)/;

/**
 * Spunta o toglie la spunta alla n-esima casella del testo (contando da zero,
 * nell'ordine in cui compaiono, fuori dai blocchi di codice). Il resto del
 * file resta identico carattere per carattere.
 */
export function commutaCasella(testo: string, n: number): string {
  const righe = testo.split('\n');
  let inCodice = false;
  let contate = 0;
  for (let i = 0; i < righe.length; i++) {
    if (/^\s*(```|~~~)/.test(righe[i])) inCodice = !inCodice;
    if (inCodice) continue;
    const m = CASELLA.exec(righe[i]);
    if (!m) continue;
    if (contate === n) {
      const nuovo = m[2] === ' ' ? 'x' : ' ';
      righe[i] = m[1] + nuovo + m[3] + righe[i].slice(m[0].length);
      return righe.join('\n');
    }
    contate++;
  }
  return testo;
}

/** Quante caselle ci sono e quante sono spuntate. */
export function contaCaselle(testo: string): { fatte: number; totali: number } {
  let fatte = 0;
  let totali = 0;
  let inCodice = false;
  for (const riga of testo.split('\n')) {
    if (/^\s*(```|~~~)/.test(riga)) inCodice = !inCodice;
    if (inCodice) continue;
    const m = CASELLA.exec(riga);
    if (!m) continue;
    totali++;
    if (m[2] !== ' ') fatte++;
  }
  return { fatte, totali };
}
