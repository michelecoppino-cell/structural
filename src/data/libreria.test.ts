import { describe, it, expect } from 'vitest';
import { TABELLA_ARMATURE, areaBarre, mandrinoPiega, pesoBarra, raggioPiega } from './armature';
import { BULLONI, TAGLIE_BULLONE } from './bulloni';
import { SPAZI_CHIAVI, spaziChiave } from './chiavi';
import { DISTANZE_FORI, distanzaMinima } from './distanze-fori';
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

describe('spazi di manovra per le chiavi', () => {
  it('l’interasse è sempre più largo della distanza dall’ostacolo', () => {
    for (const r of SPAZI_CHIAVI) {
      expect(r.g, r.vite).toBeGreaterThan(r.f);
      expect(r.k, r.vite).toBeGreaterThan(r.h);
    }
  });

  it('la poligonale chiede meno posto della forchetta', () => {
    for (const r of SPAZI_CHIAVI) {
      expect(r.h, r.vite).toBeLessThan(r.f);
      expect(r.k, r.vite).toBeLessThan(r.g);
    }
  });

  it('le taglie crescono e l’apertura di chiave con loro', () => {
    const S = SPAZI_CHIAVI.map((r) => r.S);
    expect(S).toEqual([...S].sort((a, b) => a - b));
    expect(spaziChiave('M20')?.f).toBe(31.5);
    expect(spaziChiave('M13')).toBeUndefined();
  });

  it('l’apertura strutturale è più grande di quella ISO 4014 del profilario', () => {
    for (const r of SPAZI_CHIAVI) {
      const iso = BULLONI[r.vite];
      if (iso) expect(r.S, r.vite).toBeGreaterThan(iso.chiave);
    }
  });
});

describe('distanze e interassi dei fori', () => {
  it('i minimi sono quelli di NTC2018 §4.2.8.1', () => {
    // ⌀20 con foro d0 = 22 mm: e1 ≥ 26.4 mm, p1 ≥ 48.4 mm, p2 ≥ 52.8 mm
    expect(distanzaMinima('e1', 22)).toBeCloseTo(26.4, 6);
    expect(distanzaMinima('p1', 22)).toBeCloseTo(48.4, 6);
    expect(distanzaMinima('p2', 22)).toBeCloseTo(52.8, 6);
    expect(distanzaMinima('p1,i', 22)).toBeUndefined();
  });

  it('ogni riga ha simbolo, descrizione e i tre massimi', () => {
    for (const r of DISTANZE_FORI) {
      expect(r.sigla).not.toHaveLength(0);
      expect(r.descrizione).not.toHaveLength(0);
      expect(r.maxEsposte, r.sigla).not.toHaveLength(0);
      expect(r.maxNonEsposte, r.sigla).not.toHaveLength(0);
      expect(r.maxCorten, r.sigla).not.toHaveLength(0);
    }
  });

  it('l’interasse minimo è più largo della distanza minima dal bordo', () => {
    expect(distanzaMinima('p1', 22)!).toBeGreaterThan(distanzaMinima('e1', 22)!);
    expect(distanzaMinima('p2', 22)!).toBeGreaterThan(distanzaMinima('e2', 22)!);
  });
});
