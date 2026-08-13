/**
 * Rigenera `src/data/comuni.ts` — elenco dei comuni italiani con regione,
 * provincia, classificazione sismica e coordinate.
 *
 * Sorgenti (entrambe pubbliche, scaricate al volo):
 *
 *  1. Classificazione sismica dei comuni italiani (zona 1÷4), aggiornamento
 *     2024 del Dipartimento della Protezione Civile — OPCM 3519/2006.
 *     Mirror: github.com/ferdi2005/zonasismica (classificazione2024.csv).
 *  2. Coordinate del municipio di ogni comune (WGS84, EPSG:4326), da
 *     github.com/opendatasicilia/comuni-italiani (dati/coordinate.csv),
 *     costruite sui dati ISTAT.
 *
 * Uso:
 *   node scripts/genera-comuni.mjs
 *
 * Il file generato è committato in repository: lo script serve solo quando
 * esce un aggiornamento della classificazione o dell'elenco ISTAT.
 */

import { writeFileSync } from 'node:fs';
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
