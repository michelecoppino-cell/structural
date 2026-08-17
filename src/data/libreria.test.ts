import { describe, it, expect } from 'vitest';
import { TABELLA_ARMATURE, areaBarre, mandrinoPiega, pesoBarra, raggioPiega } from './armature';
import { BULLONI, TAGLIE_BULLONE } from './bulloni';
import { ACCIAI, CLS, fctkCLS, fctmCLS } from './materiali';

describe('tabella armature', () => {
  it('il peso al metro è quello dell’acciaio', () => {
    // ⌀12: 113.1 mm² · 7850 kg/m³ = 0.888 kg/m, il valore da prontuario
    expect(pesoBarra(12)).toBeCloseTo(0.888, 3);
    expect(pesoBarra(20)).toBeCloseTo(2.466, 3);
  });

  it('il mandrino è 4⌀ fino a ⌀16 e 7⌀ oltre, il raggio ne è la metà', () => {
    expect(mandrinoPiega(12)).toBe(48);
    expect(mandrinoPiega(16)).toBe(64);
    expect(mandrinoPiega(18)).toBe(126);
    expect(raggioPiega(20)).toBe(70);
  });

  it('copre tutti i diametri commerciali senza buchi', () => {
    expect(TABELLA_ARMATURE.length).toBeGreaterThan(10);
    expect(TABELLA_ARMATURE.every((r) => r.area > 0 && r.peso > 0)).toBe(true);
  });

  it('l’area di n barre è n volte quella della singola', () => {
    expect(areaBarre(16, 4)).toBeCloseTo(4 * 201.1, 3);
  });
});

describe('profilario bulloni', () => {
  it('l’area lorda è quella del gambo e la resistente è minore', () => {
    for (const m of TAGLIE_BULLONE) {
      const b = BULLONI[m];
      expect(b.A).toBeCloseTo((Math.PI * b.d ** 2) / 4, 0);
      expect(b.Ares).toBeLessThan(b.A);
      expect(b.d0).toBeGreaterThan(b.d);
    }
  });

  it('le taglie sono in ordine crescente di diametro', () => {
    const d = TAGLIE_BULLONE.map((m) => BULLONI[m].d);
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });
});

describe('materiali della libreria', () => {
  it('fctm segue la formula di normativa e fctk ne è il 70%', () => {
    expect(fctmCLS(25)).toBeCloseTo(2.565, 3);
    expect(fctkCLS(25)).toBeCloseTo(0.7 * fctmCLS(25), 6);
  });

  it('ogni acciaio ha ftk ≥ fyk e γ positivi', () => {
    for (const [sigla, a] of Object.entries(ACCIAI)) {
      expect(a.ftk, sigla).toBeGreaterThanOrEqual(a.fyk);
      expect(a.gammaY, sigla).toBeGreaterThan(1);
      expect(a.gammaU, sigla).toBeGreaterThan(1);
    }
  });

  it('le classi di calcestruzzo hanno Rck > fck', () => {
    for (const [sigla, c] of Object.entries(CLS)) expect(c.rck, sigla).toBeGreaterThan(c.fck);
  });
});
