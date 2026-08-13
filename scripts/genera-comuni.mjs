/**
 * Rigenera i due file di dati dei comuni:
 *
 *  - `src/data/comuni.ts`           regione, provincia, zona sismica, coordinate;
 *  - `src/data/parametri-sismici.ts` ag, F0 e TC* del sito per i 9 periodi di
 *    ritorno del reticolo, già interpolati sul comune.
 *
 * I due file vanno rigenerati insieme: il secondo è indicizzato sulla posizione
 * del comune nel primo.
 *
 * Sorgenti:
 *
 *  1. Classificazione sismica dei comuni italiani (zona 1÷4), aggiornamento
 *     2024 del Dipartimento della Protezione Civile — OPCM 3519/2006.
 *     Mirror: github.com/ferdi2005/zonasismica (classificazione2024.csv).
 *  2. Coordinate del municipio di ogni comune (WGS84, EPSG:4326), da
 *     github.com/opendatasicilia/comuni-italiani (dati/coordinate.csv),
 *     costruite sui dati ISTAT.
 *  3. `dati/spettri2008.csv` — reticolo di riferimento dell'Allegato B alle
 *     NTC (10751 nodi, ag/F0/TC* per TR 30÷2475 anni), in repository.
 *
 * Uso:
 *   node scripts/genera-comuni.mjs
 *
 * I file generati sono committati: lo script serve solo quando esce un
 * aggiornamento della classificazione, dell'elenco ISTAT o del reticolo.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FONTE_ZONE =
  'https://raw.githubusercontent.com/ferdi2005/zonasismica/master/classificazione2024.csv';
const FONTE_COORD =
  'https://raw.githubusercontent.com/opendatasicilia/comuni-italiani/main/dati/coordinate.csv';

/**
 * Comuni nati da fusioni recenti e non ancora presenti nel file delle
 * coordinate: si usa la sede del comune principale di origine (dati ISTAT 2018).
 */
const COORD_SUPPLETIVE = {
  'Moransengo-Tonengo': [45.1152, 8.0249], // ex Moransengo
  'Bardello con Malgesso e Bregano': [45.835, 8.6982], // ex Bardello
  'Uggiate con Ronago': [45.8233, 8.9617], // ex Uggiate-Trevano
  Sassofeltrio: [43.8924, 12.5093],
};

/** Riquadro che racchiude il territorio nazionale, isole comprese. */
const LIMITI = { lat: [35, 47.5], lon: [6, 19] };

/**
 * Nel file delle coordinate una decina di record ha il separatore decimale
 * perduto (es. 16196 invece di 16.196): si riporta il valore nell'intervallo
 * corretto dividendo per potenze di 10, e si scarta tutto ciò che non torna.
 */
const risana = (valore, tipo) => {
  const [min, max] = LIMITI[tipo];
  let v = valore;
  for (let i = 0; i < 6 && v > max; i++) v /= 10;
  if (!(v >= min && v <= max)) throw new Error(`${tipo} fuori dall'Italia: ${valore}`);
  return v;
};

const scarica = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.text()).replace(/^﻿/, '');
};

/** CSV senza virgolette: basta lo split sul separatore. */
const righe = (testo, sep) =>
  testo
    .split(/\r?\n/)
    .filter((r) => r.trim())
    .map((r) => r.split(sep));

const [zoneCsv, coordCsv] = await Promise.all([scarica(FONTE_ZONE), scarica(FONTE_COORD)]);

// ── coordinate: pro_com_t,lat,long ────────────────────────────────────────
const coord = new Map();
let risanate = 0;
for (const [istat, lat, lon] of righe(coordCsv, ',').slice(1)) {
  const punto = [risana(Number(lat), 'lat'), risana(Number(lon), 'lon')];
  if (punto[0] !== Number(lat) || punto[1] !== Number(lon)) risanate++;
  coord.set(Number(istat), punto);
}

// ── zone: REGIONE;PROV_CITTA_METROPOLITANA;SIGLA_PROV;COMUNE;COD_ISTAT;ZONA ─
const comuni = [];
for (const [regione, provincia, sigla, comune, istat, zona] of righe(zoneCsv, ';').slice(1)) {
  const xy = coord.get(Number(istat)) ?? COORD_SUPPLETIVE[comune];
  if (!xy) throw new Error(`coordinate mancanti per ${comune} (${sigla})`);
  comuni.push({
    regione,
    provincia,
    sigla,
    nome: comune,
    zona: zona.trim(),
    lat: Number(xy[0].toFixed(4)),
    lon: Number(xy[1].toFixed(4)),
  });
}

const collator = new Intl.Collator('it');
comuni.sort(
  (a, b) =>
    collator.compare(a.regione, b.regione) ||
    collator.compare(a.provincia, b.provincia) ||
    collator.compare(a.nome, b.nome),
);

// ── impacchettamento ──────────────────────────────────────────────────────
// «#Regione», «@SIGLA|Provincia», «Comune|zona|lat|lon»
const linee = [];
let regioneCorrente = '';
let provinciaCorrente = '';
for (const c of comuni) {
  if (c.regione !== regioneCorrente) {
    linee.push(`#${c.regione}`);
    regioneCorrente = c.regione;
    provinciaCorrente = '';
  }
  if (c.provincia !== provinciaCorrente) {
    linee.push(`@${c.sigla}|${c.provincia}`);
    provinciaCorrente = c.provincia;
  }
  linee.push(`${c.nome}|${c.zona}|${c.lat}|${c.lon}`);
}

const province = new Set(comuni.map((c) => `${c.regione}/${c.sigla}`));
const regioni = new Set(comuni.map((c) => c.regione));

const intestazione = `/**
 * Comuni italiani con classificazione sismica e coordinate.
 *
 * FILE GENERATO — non modificare a mano: \`node scripts/genera-comuni.mjs\`.
 *
 * Sorgenti:
 *  - classificazione sismica (zona 1÷4) — Dipartimento della Protezione Civile,
 *    aggiornamento 2024 (OPCM 3519/2006);
 *  - coordinate del municipio (WGS84) — elenco ISTAT dei comuni.
 *
 * ${comuni.length} comuni · ${province.size} province · ${regioni.size} regioni.
 *
 * I dati sono impacchettati in una stringa e letti una volta sola all'avvio:
 * «#Regione», «@SIGLA|Provincia», «Comune|zona|lat|lon».
 */

/** Zona sismica canonica: 1 = pericolosità più alta, 4 = più bassa. */
export type ZonaSismica = 1 | 2 | 3 | 4;

export interface Comune {
  nome: string;
  /** Nome esteso della provincia o città metropolitana. */
  provincia: string;
  sigla: string;
  regione: string;
  /** Zona sismica canonica (1÷4). */
  zona: ZonaSismica;
  /** Etichetta pubblicata dalla Regione: può avere sottozone ("2A", "3S"). */
  zonaLabel: string;
  lat: number;
  lon: number;
  /** Posizione in COMUNI: è la chiave dei parametri sismici del sito. */
  indice: number;
}

const DATI = \`
${linee.join('\n')}\`;

/** Da "2A", "3S", "2B-3A" alla zona canonica (la più severa fra quelle citate). */
function zonaCanonica(label: string): ZonaSismica {
  const numeri = label.match(/[1-4]/g)?.map(Number) ?? [4];
  return Math.min(...numeri) as ZonaSismica;
}

function leggi(): Comune[] {
  const out: Comune[] = [];
  let regione = '';
  let provincia = '';
  let sigla = '';
  for (const riga of DATI.split('\\n')) {
    if (!riga) continue;
    if (riga[0] === '#') {
      regione = riga.slice(1);
    } else if (riga[0] === '@') {
      const [s, nome] = riga.slice(1).split('|');
      sigla = s;
      provincia = nome;
    } else {
      const [nome, zonaLabel, lat, lon] = riga.split('|');
      out.push({
        nome,
        provincia,
        sigla,
        regione,
        zona: zonaCanonica(zonaLabel),
        zonaLabel,
        lat: +lat,
        lon: +lon,
        indice: out.length,
      });
    }
  }
  return out;
}

/** Tutti i comuni, ordinati per regione, provincia e nome. */
export const COMUNI: Comune[] = leggi();

/** Regioni in ordine alfabetico. */
export const REGIONI: string[] = [...new Set(COMUNI.map((c) => c.regione))];

/** Province (sigla + nome esteso) di una regione, in ordine alfabetico. */
export function provinceDi(regione: string): { sigla: string; nome: string }[] {
  const viste = new Map<string, string>();
  for (const c of COMUNI) if (c.regione === regione) viste.set(c.sigla, c.provincia);
  return [...viste].map(([sigla, nome]) => ({ sigla, nome }));
}

/** Comuni di una provincia, in ordine alfabetico. */
export function comuniDi(regione: string, sigla: string): Comune[] {
  return COMUNI.filter((c) => c.regione === regione && c.sigla === sigla);
}

/** Comune per regione + sigla provincia + nome; undefined se non esiste. */
export function trovaComune(regione: string, sigla: string, nome: string): Comune | undefined {
  return COMUNI.find((c) => c.regione === regione && c.sigla === sigla && c.nome === nome);
}
`;

const qui = dirname(fileURLToPath(import.meta.url));
const destinazione = join(qui, '..', 'src', 'data', 'comuni.ts');
writeFileSync(destinazione, intestazione, 'utf8');

console.log(
  `${destinazione}: ${comuni.length} comuni, ${province.size} province, ${regioni.size} regioni ` +
    `(${(Buffer.byteLength(intestazione) / 1024).toFixed(0)} kB, ${risanate} coordinate risanate)`,
);

/* ── parametri sismici del sito, dal reticolo dell'Allegato B ───────────── */

const TR = [30, 50, 72, 101, 140, 201, 475, 975, 2475];

// il file ha due righe di intestazione: OBJECTID, ID, LON, LAT e poi
// ag, F0, Tc per ciascuno dei 9 periodi di ritorno. ag è in g/10.
const reticolo = righe(readFileSync(join(qui, '..', 'dati', 'spettri2008.csv'), 'utf8'), ',')
  .slice(2)
  .filter((r) => r.length >= 31 && r[0].trim())
  .map((r) => r.map((v) => Number(v.replace(/"/g, ''))));

if (reticolo.length !== 10751) throw new Error(`reticolo: attesi 10751 nodi, trovati ${reticolo.length}`);

const nodoLon = Float64Array.from(reticolo, (r) => r[2]);
const nodoLat = Float64Array.from(reticolo, (r) => r[3]);
const nodoVal = reticolo.map((r) => r.slice(4, 31));

const GRADI_KM = 111.19;

/**
 * Parametri nel sito: media pesata con 1/d sui 4 nodi più vicini del reticolo
 * (NTC2018, All. A). Le coordinate dei comuni sono WGS84 e quelle del reticolo
 * ED50: lo scarto fra i due datum è di un centinaio di metri, trascurabile
 * rispetto al passo della maglia (circa 5 km).
 */
function interpolaSito(lat, lon) {
  const cos = Math.cos((lat * Math.PI) / 180);
  // ricerca dei 4 nodi più vicini, senza ordinare tutto il reticolo
  const migliori = [];
  for (let i = 0; i < nodoLat.length; i++) {
    const dx = (nodoLon[i] - lon) * cos;
    const dy = nodoLat[i] - lat;
    const d2 = dx * dx + dy * dy;
    if (migliori.length < 4) {
      migliori.push([d2, i]);
      migliori.sort((a, b) => a[0] - b[0]);
    } else if (d2 < migliori[3][0]) {
      migliori[3] = [d2, i];
      migliori.sort((a, b) => a[0] - b[0]);
    }
  }

  const out = new Array(27).fill(0);
  let pesi = 0;
  for (const [d2, i] of migliori) {
    const peso = 1 / Math.max(Math.sqrt(d2) * GRADI_KM, 1e-9);
    pesi += peso;
    for (let j = 0; j < 27; j++) out[j] += nodoVal[i][j] * peso;
  }
  return out.map((v) => v / pesi);
}

const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
const b36 = (n) => {
  let v = Math.abs(n) === n ? n : n; // già intero
  if (v === 0) return '0';
  let s = '';
  while (v > 0) {
    s = B36[v % 36] + s;
    v = Math.floor(v / 36);
  }
  return s;
};
/** interi con segno → naturali, per non sprecare un carattere sul meno */
const zigzag = (n) => (n >= 0 ? 2 * n : -2 * n - 1);

// una riga per comune: 9 ag, 9 F0, 9 TC*, ciascun gruppo per differenze
// successive (i valori crescono con TR, così restano numeri piccoli).
// Quantizzazione alla terza cifra decimale, la stessa con cui i parametri
// sono pubblicati: ag in millesimi di g, F0 in millesimi, TC* in millesimi di s.
const righeSismiche = comuni.map((c) => {
  const p = interpolaSito(c.lat, c.lon);
  const pezzi = [];
  for (let base = 0; base < 3; base++) {
    let prec = 0;
    for (let t = 0; t < 9; t++) {
      const grezzo = p[3 * t + base];
      const q = Math.round(base === 0 ? grezzo * 100 : grezzo * 1000);
      pezzi.push(b36(zigzag(q - prec)));
      prec = q;
    }
  }
  return pezzi.join(',');
});

const sorgenteSismica = `/**
 * Parametri sismici di sito dei comuni italiani — NTC2018 §3.2, All. A e B.
 *
 * FILE GENERATO — non modificare a mano: \`node scripts/genera-comuni.mjs\`.
 *
 * Per ogni comune di \`COMUNI\` (stesso ordine, chiave = \`Comune.indice\`) sono
 * riportati ag, F0 e TC* per i ${TR.length} periodi di ritorno del reticolo di
 * riferimento, ottenuti dalla media pesata con 1/d sui 4 nodi più vicini
 * (${reticolo.length} nodi dell'Allegato B, file \`dati/spettri2008.csv\`).
 *
 * Impacchettamento: una riga per comune, 9 valori di ag + 9 di F0 + 9 di TC*,
 * ogni gruppo per differenze successive, in base 36 con segno a zigzag.
 * Quantizzazione: ag in millesimi di g, F0 in millesimi, TC* in millesimi di
 * secondo — la stessa precisione con cui i parametri sono pubblicati.
 */

/** Periodi di ritorno tabellati nel reticolo, in anni. */
export const TR_RETICOLO = [${TR.join(', ')}] as const;

export interface ParametriSito {
  /** ag/g per ciascun TR di TR_RETICOLO. */
  ag: number[];
  /** F0 per ciascun TR di TR_RETICOLO. */
  F0: number[];
  /** TC* in secondi per ciascun TR di TR_RETICOLO. */
  TCstar: number[];
}

const DATI = \`
${righeSismiche.join('\n')}\`;

let righe: string[] | null = null;

function decodifica(riga: string): ParametriSito {
  const t = riga.split(',');
  const gruppo = (base: number, scala: number) => {
    const out: number[] = [];
    let v = 0;
    for (let i = 0; i < 9; i++) {
      const z = parseInt(t[base * 9 + i], 36);
      v += z % 2 === 0 ? z / 2 : -(z + 1) / 2;
      out.push(v / scala);
    }
    return out;
  };
  return { ag: gruppo(0, 1000), F0: gruppo(1, 1000), TCstar: gruppo(2, 1000) };
}

/**
 * Parametri del comune di indice dato; \`undefined\` se l'indice non esiste.
 * La stringa è divisa in righe alla prima chiamata, poi si decodifica solo la
 * riga che serve.
 */
export function parametriSito(indice: number): ParametriSito | undefined {
  righe ??= DATI.split('\\n').filter(Boolean);
  const riga = righe[indice];
  return riga ? decodifica(riga) : undefined;
}
`;

const destSismica = join(qui, '..', 'src', 'data', 'parametri-sismici.ts');
writeFileSync(destSismica, sorgenteSismica, 'utf8');

console.log(
  `${destSismica}: ${righeSismiche.length} comuni × ${TR.length} periodi di ritorno ` +
    `(${(Buffer.byteLength(sorgenteSismica) / 1024).toFixed(0)} kB)`,
);
