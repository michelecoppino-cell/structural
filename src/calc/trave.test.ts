import { describe, it, expect } from 'vitest';
import { risolviTrave, type SchemaId } from './trave';

/**
 * Riscontro contro le soluzioni in forma chiusa della tabella
 * "Soluzioni di travi elementari variamente caricate" (PDF in repository).
 */

const L = 6;
const q = 10;
const EJ = 25000;
const P = 40;

const close = (a: number, b: number, tol = 1e-3) => expect(a).toBeCloseTo(b, tol > 1e-3 ? 1 : 2);

function udl(schema: SchemaId) {
  return risolviTrave({ schema, L, q, EJ, n: 400 });
}

function point(schema: SchemaId, a = L / 2) {
  return risolviTrave({ schema, L, q: 0, P: [{ P, a }], EJ, n: 400 });
}

describe('carico uniformemente distribuito q', () => {
  it('appoggio — appoggio', () => {
    const r = udl('appoggio-appoggio');
    close(r.reazioni.A.R, (q * L) / 2);
    close(r.reazioni.B.R, (q * L) / 2);
    close(r.reazioni.A.M, 0);
    close(r.Mmax, (q * L * L) / 8);
    close(r.fmax.val, (5 * q * L ** 4) / (384 * EJ));
    close(r.fmax.x, L / 2);
  });

  it('mensola', () => {
    const r = udl('mensola');
    close(r.reazioni.A.R, q * L);
    close(r.reazioni.A.M, -(q * L * L) / 2);
    close(r.Mmin, -(q * L * L) / 2);
    close(r.fmax.val, (q * L ** 4) / (8 * EJ));
  });

  it('doppio incastro — MA = MB = ql²/12', () => {
    const r = udl('incastro-incastro');
    close(r.reazioni.A.R, (q * L) / 2);
    close(r.reazioni.B.R, (q * L) / 2);
    close(r.reazioni.A.M, -(q * L * L) / 12);
    close(r.reazioni.B.M, -(q * L * L) / 12);
    close(r.Mmax, (q * L * L) / 24);
    close(r.fmax.val, (q * L ** 4) / (384 * EJ));
  });

  it('incastro — cerniera: VA = 5/8 ql, VB = 3/8 ql, MA = ql²/8', () => {
    const r = udl('incastro-cerniera');
    close(r.reazioni.A.R, (5 * q * L) / 8);
    close(r.reazioni.B.R, (3 * q * L) / 8);
    close(r.reazioni.A.M, -(q * L * L) / 8);
    close(r.Mmax, (9 * q * L * L) / 128);
    close(r.fmax.val, (q * L ** 4) / (185 * EJ), 1e-2);
  });

  it('incastro — doppio pendolo: VA = ql, MA = ql²/3, MB = ql²/6', () => {
    const r = udl('incastro-pendolo');
    close(r.reazioni.A.R, q * L);
    close(r.reazioni.B.R, 0);
    close(r.reazioni.A.M, -(q * L * L) / 3);
    close(r.reazioni.B.M, (q * L * L) / 6);
    close(r.fmax.val, (q * L ** 4) / (24 * EJ));
  });
});

describe('carico concentrato P in mezzeria', () => {
  it('appoggio — appoggio: M = Pl/4', () => {
    const r = point('appoggio-appoggio');
    close(r.reazioni.A.R, P / 2);
    close(r.Mmax, (P * L) / 4);
    close(r.fmax.val, (P * L ** 3) / (48 * EJ));
  });

  it('mensola con P in punta: MA = Pl', () => {
    const r = point('mensola', L);
    close(r.reazioni.A.R, P);
    close(r.reazioni.A.M, -P * L);
    close(r.fmax.val, (P * L ** 3) / (3 * EJ));
  });

  it('doppio incastro: MA = MB = Pl/8', () => {
    const r = point('incastro-incastro');
    close(r.reazioni.A.R, P / 2);
    close(r.reazioni.A.M, -(P * L) / 8);
    close(r.Mmax, (P * L) / 8);
    close(r.fmax.val, (P * L ** 3) / (192 * EJ));
  });

  it('incastro — cerniera: VA = 11/16 P, VB = 5/16 P, MA = 3/16 Pl', () => {
    const r = point('incastro-cerniera');
    close(r.reazioni.A.R, (11 * P) / 16);
    close(r.reazioni.B.R, (5 * P) / 16);
    close(r.reazioni.A.M, -(3 * P * L) / 16);
  });

  it('incastro — doppio pendolo: VA = P, MA = 3/8 Pl, MB = Pl/8', () => {
    const r = point('incastro-pendolo');
    close(r.reazioni.A.R, P);
    close(r.reazioni.A.M, -(3 * P * L) / 8);
    close(r.reazioni.B.M, (P * L) / 8);
  });
});

describe('robustezza', () => {
  it('non produce NaN con luce o rigidezza nulle', () => {
    const r = risolviTrave({ schema: 'appoggio-appoggio', L: 0, q: 0, EJ: 0 });
    expect(Number.isFinite(r.Mmax)).toBe(true);
    expect(r.punti.every((p) => Number.isFinite(p.M) && Number.isFinite(p.v))).toBe(true);
  });

  it('il taglio si annulla in corrispondenza del momento massimo (app–app)', () => {
    const r = udl('appoggio-appoggio');
    const atMax = r.punti.find((p) => Math.abs(p.x - r.MmaxAbs.x) < 1e-9)!;
    expect(Math.abs(atMax.V)).toBeLessThan(0.2);
  });
});
