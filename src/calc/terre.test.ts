import { describe, it, expect } from 'vitest';
import { AZIONI_DEFAULT, calcolaAzioni, coefficienteMO } from './azioni';

const ka = (phi: number) => Math.tan(((45 - phi / 2) * Math.PI) / 180) ** 2;

describe('coefficiente di spinta di Mononobe-Okabe', () => {
  it('senza sisma e con muro e terrapieno regolari ritrova Rankine', () => {
    for (const phi of [20, 28, 30, 35, 40]) {
      expect(coefficienteMO(phi, 0, 0, 0, 0)).toBeCloseTo(ka(phi), 9);
    }
  });

  it('cresce con l’accelerazione', () => {
    const statico = coefficienteMO(30, 0, 0, 0, 0);
    const debole = coefficienteMO(30, 5, 0, 0, 0);
    const forte = coefficienteMO(30, 12, 0, 0, 0);
    expect(debole).toBeGreaterThan(statico);
    expect(forte).toBeGreaterThan(debole);
  });

  it('cresce con l’inclinazione del terrapieno e cala con l’attrito terra-muro', () => {
    expect(coefficienteMO(30, 0, 0, 10, 0)).toBeGreaterThan(coefficienteMO(30, 0, 0, 0, 0));
    expect(coefficienteMO(30, 0, 15, 0, 0)).toBeLessThan(coefficienteMO(30, 0, 0, 0, 0));
  });

  it('non dà un numero quando φ′ − θ − β diventa negativo', () => {
    expect(Number.isFinite(coefficienteMO(20, 25, 0, 0, 0))).toBe(false);
    expect(Number.isFinite(coefficienteMO(30, 10, 0, 25, 0))).toBe(false);
  });
});

describe('spinta sismica nella scheda Azioni', () => {
  const azioni = (patch: Partial<typeof AZIONI_DEFAULT> = {}) =>
    calcolaAzioni({ ...AZIONI_DEFAULT, ...patch });

  it('kh viene da βm·S·ag/g, kv ne è la metà', () => {
    const r = azioni({ betam: '1.00' });
    expect(r.terre.sisma.amax).toBeCloseTo(r.sisma.S * r.sisma.ag, 9);
    expect(r.terre.sisma.kh).toBeCloseTo(r.terre.sisma.amax, 9);
    expect(Math.abs(r.terre.sisma.kv)).toBeCloseTo(0.5 * r.terre.sisma.kh, 9);
  });

  it('βm riduce kh in proporzione', () => {
    const pieno = azioni({ betam: '1.00' }).terre.sisma.kh;
    const ridotto = azioni({ betam: '0.38' }).terre.sisma.kh;
    expect(ridotto).toBeCloseTo(0.38 * pieno, 9);
  });

  it('kh scritto a mano vince su βm', () => {
    expect(azioni({ khManuale: '0,15' }).terre.sisma.kh).toBeCloseTo(0.15, 9);
  });

  it('la spinta sismica supera la statica e l’incremento non è mai negativo', () => {
    const r = azioni({ khManuale: '0.15' });
    expect(r.terre.sisma.Ed).toBeGreaterThan(r.terre.Sa);
    expect(r.terre.sisma.dEd).toBeGreaterThan(0);
    expect(r.terre.sisma.kae).toBeGreaterThan(r.terre.ka);
  });

  it('con kh nullo la spinta sismica coincide con quella statica', () => {
    const r = azioni({ khManuale: '0' });
    expect(r.terre.sisma.Ed).toBeCloseTo(r.terre.Sa, 6);
    expect(r.terre.sisma.dEd).toBeCloseTo(0, 6);
  });

  it('il momento somma la statica a H/3 e l’incremento a H/2', () => {
    const r = azioni({ khManuale: '0.15', H: '3.00' });
    expect(r.terre.sisma.Mtot).toBeCloseTo(r.terre.Sa * 1 + r.terre.sisma.dEd * 1.5, 6);
  });

  it('un’accelerazione che il terrapieno non regge viene segnalata', () => {
    const r = azioni({ khManuale: '0.9', phi: '25' });
    expect(Number.isFinite(r.terre.sisma.kae)).toBe(false);
    expect(r.terre.sisma.avviso).not.toBe('');
  });
});
