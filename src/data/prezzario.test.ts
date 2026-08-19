import { describe, expect, it } from 'vitest';
import { PREZZARI, VOCI_COSTO_DEFAULT } from './prezzario';

describe('voci di costo di serie', () => {
  it('sono le dieci lavorazioni previste, tutte con codice e prezzo del prezzario', () => {
    expect(VOCI_COSTO_DEFAULT).toHaveLength(10);
    for (const v of VOCI_COSTO_DEFAULT) {
      // un prezzo senza codice non è verificabile: è il caso che questo test esclude
      expect(v.codice, v.descrizione).toMatch(/^\d{2}\.\d\.[A-Z]{2}\d\.\d{2}\.[A-Z]$/);
      expect(Number(v.prezzo), v.codice).toBeGreaterThan(0);
      expect(v.um.trim()).not.toBe('');
      expect(v.descrizione.trim()).not.toBe('');
    }
  });

  it('non ripete un codice su due righe', () => {
    const codici = VOCI_COSTO_DEFAULT.map((v) => v.codice);
    expect(new Set(codici).size).toBe(codici.length);
  });

  it('scinde il getto dai casseri: la voce del c.a. è quella che li esclude', () => {
    // 16.5.EQ4.01 include la casseratura, 16.5.EQ4.03 no. Siccome i casseri
    // hanno una riga loro (20.2.RI1.01), qui ci deve stare la seconda.
    const getto = VOCI_COSTO_DEFAULT.find((v) => v.codice.startsWith('16.5.EQ4'));
    expect(getto?.codice).toBe('16.5.EQ4.03.B');
    expect(VOCI_COSTO_DEFAULT.some((v) => v.codice.startsWith('20.2.RI1.01'))).toBe(true);
  });
});

describe('prezzari di riferimento', () => {
  it('sono tre link https validi', () => {
    expect(PREZZARI).toHaveLength(3);
    for (const p of PREZZARI) {
      expect(() => new URL(p.url)).not.toThrow();
      expect(new URL(p.url).protocol).toBe('https:');
      expect(p.sigla.trim()).not.toBe('');
    }
  });
});
