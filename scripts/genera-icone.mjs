/**
 * Genera le icone PNG dell'app installabile (PWA) a partire dalla stessa
 * geometria della favicon SVG: quadrato scuro con il triangolo ocra.
 *
 * Uso:
 *   node scripts/genera-icone.mjs
 *
 * I PNG prodotti in `public/` sono committati: lo script serve solo quando
 * cambia il marchio. Niente dipendenze — l'encoder PNG (zlib + CRC32) e il
 * disegno con antialiasing per sovracampionamento stanno qui sotto.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUBLIC = join(dirname(dirname(fileURLToPath(import.meta.url))), 'public');

const SFONDO = [0x17, 0x19, 0x23];
const ACCENTO = [0xc9, 0x93, 0x2e];

/* ─────────────────────────── encoder PNG ─────────────────────────── */

const TAVOLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TAVOLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dati) {
  const testa = Buffer.alloc(8);
  testa.writeUInt32BE(dati.length, 0);
  testa.write(tipo, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(tipo, 'ascii'), dati])), 0);
  return Buffer.concat([testa, dati, crc]);
}

/** RGBA a 8 bit, una riga per volta con filtro 0 (nessuno). */
function png(lato, rgba) {
  const righe = Buffer.alloc((lato * 4 + 1) * lato);
  for (let y = 0; y < lato; y += 1) {
    righe[y * (lato * 4 + 1)] = 0;
    rgba.copy(righe, y * (lato * 4 + 1) + 1, y * lato * 4, (y + 1) * lato * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(lato, 4);
  ihdr[8] = 8; // profondità
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(righe, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ─────────────────────────── geometria ─────────────────────────── */

const dentroRettArrotondato = (x, y, lato, r) => {
  const dx = Math.max(r - x, 0, x - (lato - r));
  const dy = Math.max(r - y, 0, y - (lato - r));
  return Math.hypot(dx, dy) <= r;
};

function distanzaSegmento(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.min(1, Math.max(0, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

/**
 * Disegna l'icona: sfondo (quadrato pieno per le maskable, arrotondato per le
 * altre) e triangolo a filo di penna, con 4×4 sottocampioni per pixel.
 */
function disegna(lato, { pieno = false, scala = 1 } = {}) {
  const rgba = Buffer.alloc(lato * lato * 4);
  const r = pieno ? 0 : lato * 0.2222;
  // vertici del triangolo, normalizzati come nella favicon (viewBox 32)
  const k = scala;
  const c = lato / 2;
  const p = ([nx, ny]) => [c + (nx - 0.5) * lato * k, c + (ny - 0.5) * lato * k];
  const [ax, ay] = p([16 / 32, 8 / 32]);
  const [bx, by] = p([25 / 32, 24 / 32]);
  const [cx, cy] = p([7 / 32, 24 / 32]);
  const penna = (lato * 2) / 32 / 2;
  const N = 4;

  for (let y = 0; y < lato; y += 1) {
    for (let x = 0; x < lato; x += 1) {
      let sfondo = 0;
      let tratto = 0;
      for (let sy = 0; sy < N; sy += 1) {
        for (let sx = 0; sx < N; sx += 1) {
          const px = x + (sx + 0.5) / N;
          const py = y + (sy + 0.5) / N;
          if (pieno || dentroRettArrotondato(px, py, lato, r)) sfondo += 1;
          const d = Math.min(
            distanzaSegmento(px, py, ax, ay, bx, by),
            distanzaSegmento(px, py, bx, by, cx, cy),
            distanzaSegmento(px, py, cx, cy, ax, ay),
          );
          if (d <= penna) tratto += 1;
        }
      }
      const aSfondo = sfondo / (N * N);
      const aTratto = (tratto / (N * N)) * aSfondo; // il tratto non esce dallo sfondo
      const alfa = aSfondo;
      const i = (y * lato + x) * 4;
      for (let ch = 0; ch < 3; ch += 1) {
        // colore = sfondo con sopra il tratto, premoltiplicato e poi diviso per α
        const v = (SFONDO[ch] * (aSfondo - aTratto) + ACCENTO[ch] * aTratto) / (alfa || 1);
        rgba[i + ch] = Math.round(v);
      }
      rgba[i + 3] = Math.round(alfa * 255);
    }
  }
  return png(lato, rgba);
}

/* ─────────────────────────── uscita ─────────────────────────── */

mkdirSync(PUBLIC, { recursive: true });

const file = [
  // taglie piccole: le usano Chrome e il sistema operativo per la scorciatoia
  // sul desktop e per la barra delle applicazioni, dove un 512 ridotto a 32
  // impasta il tratto del triangolo
  ['icon-48.png', 48, {}],
  ['icon-64.png', 64, {}],
  ['icon-96.png', 96, {}],
  ['icon-128.png', 128, {}],
  ['icon-192.png', 192, {}],
  ['icon-256.png', 256, {}],
  ['icon-512.png', 512, {}],
  // maskable: sfondo a filo e marchio dentro la zona sicura (80% centrale),
  // perché Android ritaglia l'icona con la forma del launcher
  ['icon-maskable-512.png', 512, { pieno: true, scala: 0.72 }],
  // iOS arrotonda da sé gli angoli: sfondo a filo, marchio a misura piena
  ['apple-touch-icon.png', 180, { pieno: true }],
];

for (const [nome, lato, opzioni] of file) {
  const buf = disegna(lato, opzioni);
  writeFileSync(join(PUBLIC, nome), buf);
  console.log(`${nome.padEnd(24)} ${lato}×${lato}  ${(buf.length / 1024).toFixed(1)} kB`);
}
