import { describe, it, expect } from 'vitest';
import { coefficienteCC, coefficienteSS, risolviSito, AG_ZONA } from './sismica';
import { calcolaAzioni, AZIONI_DEFAULT } from './azioni';
import { COMUNI, REGIONI, comuniDi, provinceDi, trovaComune } from '../data/comuni';

describe('elenco dei comuni', () => {
  it('copre tutto il territorio nazionale', () => {
    expect(COMUNI.length).toBeGreaterThan(7800);
    expect(REGIONI).toHaveLength(20);
    expect(new Set(COMUNI.map((c) => c.sigla)).size).toBe(107);
  });

  it('ogni comune ha zona sismica valida e coordinate in Italia', () => {
    for (const c of COMUNI) {
      expect(c.zona).toBeGreaterThanOrEqual(1);
      expect(c.zona).toBeLessThanOrEqual(4);
      expect(c.lat).toBeGreaterThan(35);
      expect(c.lat).toBeLessThan(47.5);
      expect(c.lon).toBeGreaterThan(6);
      expect(c.lon).toBeLessThan(19);
    }
  });

  it('la cascata regione → provincia → comune è coerente', () => {
    const province = provinceDi('Abruzzo');
    expect(province.map((p) => p.sigla).sort()).toEqual(['AQ', 'CH', 'PE', 'TE']);
    const aquilano = comuniDi('Abruzzo', 'AQ');
    expect(aquilano.length).toBe(108);
    expect(aquilano.every((c) => c.provincia === "L'Aquila")).toBe(true);
  });

  it('riporta la classificazione DPC vigente', () => {
    expect(trovaComune('Abruzzo', 'AQ', "L'Aquila")?.zona).toBe(1);
    expect(trovaComune('Lombardia', 'MI', 'Milano')?.zona).toBe(3);
    expect(trovaComune('Sardegna', 'CA', 'Cagliari')?.zona).toBe(4);
    // le sottozone regionali restano leggibili, ma pesano come la più severa
    expect(trovaComune('Lazio', 'RM', 'Roma')?.zonaLabel).toBe('2A-3A-3B');
    expect(trovaComune('Lazio', 'RM', 'Roma')?.zona).toBe(2);
  });
});

describe('§3.2 — ag del sito', () => {
  it('usa il valore da reticolo per le località tabellate', () => {
    const s = risolviSito('Abruzzo', 'AQ', "L'Aquila");
    expect(s.fonte).toBe('tabella');
    expect(s.ag).toBeCloseTo(0.261, 3);
  });

  it('per gli altri comuni assume il limite superiore della zona', () => {
    const s = risolviSito('Abruzzo', 'AQ', 'Sulmona');
    expect(s.fonte).toBe('zona');
    expect(s.ag).toBe(AG_ZONA[s.zona!]);
  });

  it('il valore inserito a mano vince su tutto', () => {
    const s = risolviSito('Abruzzo', 'AQ', "L'Aquila", 0.19);
    expect(s.fonte).toBe('manuale');
    expect(s.ag).toBe(0.19);
  });

  it('senza comune valido resta un valore prudenziale dichiarato', () => {
    const s = risolviSito('Lombardia', 'MI', 'Comune inesistente');
    expect(s.fonte).toBe('zona');
    expect(s.comune).toBeUndefined();
    expect(s.ag).toBe(AG_ZONA[3]);
  });
});

describe('Tab. 3.2.IV — amplificazione stratigrafica', () => {
  it('suolo A non amplifica', () => {
    expect(coefficienteSS('A', 0.25, 2.4)).toBe(1);
    expect(coefficienteCC('A', 0.3)).toBe(1);
  });

  it('SS dipende da ag·F0 e resta dentro i limiti di tabella', () => {
    // C: 1.70 − 0.60·F0·ag/g, limitato a 1.00 ÷ 1.50
    expect(coefficienteSS('C', 0.15, 2.4)).toBeCloseTo(1.484, 3);
    expect(coefficienteSS('C', 0.02, 2.4)).toBe(1.5); // limite superiore
    // D: 2.40 − 1.50·F0·ag/g, limitato a 0.90 ÷ 1.80
    expect(coefficienteSS('D', 0.35, 3.0)).toBe(0.9); // limite inferiore
    expect(coefficienteSS('D', 0.02, 2.4)).toBe(1.8);
    // B: 1.40 − 0.40·F0·ag/g, limitato a 1.00 ÷ 1.20
    expect(coefficienteSS('B', 0.261, 2.42)).toBeCloseTo(1.147, 3);
  });

  it('CC cresce al diminuire di TC*', () => {
    expect(coefficienteCC('C', 0.35)).toBeCloseTo(1.485, 3);
    expect(coefficienteCC('C', 0.28)).toBeGreaterThan(coefficienteCC('C', 0.35));
  });
});

describe('spettro di progetto con i default della scheda', () => {
  const r = calcolaAzioni(AZIONI_DEFAULT).sisma;

  it("parte da L'Aquila, suolo C", () => {
    expect(r.sito).toBe("L'Aquila (AQ)");
    expect(r.zona).toBe(1);
    expect(r.ag).toBeCloseTo(0.261, 3);
  });

  it('S = SS·ST e Sd = ag·S·F0/q', () => {
    expect(r.Ss).toBeCloseTo(1.321, 3); // 1.70 − 0.60·2.42·0.261
    expect(r.S).toBeCloseTo(r.Ss * r.St, 6);
    expect(r.Sd).toBeCloseTo((r.ag * r.S * r.F0) / r.q, 6);
  });

  it('periodi caratteristici — eq. 3.2.5 ÷ 3.2.7', () => {
    expect(r.TC).toBeCloseTo(r.Cc * r.TCstar, 6);
    expect(r.TB).toBeCloseTo(r.TC / 3, 6);
    expect(r.TD).toBeCloseTo(4 * r.ag + 1.6, 6);
  });

  it('VR ≥ 35 anni e TR di riferimento per lo SLV', () => {
    expect(r.VR).toBe(50);
    expect(r.TR).toBeCloseTo(475, 0);
  });
});
