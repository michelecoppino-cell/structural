import { describe, it, expect } from 'vitest';
import {
  verificaTaglioNonArmato,
  verificaTaglioArmato,
  TAGLIO_NON_ARMATO_DEFAULT,
  TAGLIO_ARMATO_DEFAULT,
} from './verifiche';

/**
 * I valori attesi sono quelli prodotti dai fogli di calcolo originali con i
 * loro dati di default (sezione 1000 × 1200 mm, C32/40).
 */

describe('§4.1.2.3.5.1 — taglio senza armature trasversali', () => {
  const r = verificaTaglioNonArmato(TAGLIO_NON_ARMATO_DEFAULT);

  it('materiali e geometria', () => {
    expect(r.fck).toBe(32);
    expect(r.rck).toBe(40);
    expect(r.fcd).toBeCloseTo(18.133, 2);
    expect(r.As).toBeCloseTo(1571, 0);
  });

  it('coefficienti', () => {
    expect(r.rho1).toBeCloseTo(0.00139, 5);
    expect(r.k).toBeCloseTo(1.4207, 3);
    expect(r.vmin).toBeCloseTo(0.3353, 3);
    expect(r.sigmaCp).toBe(0);
  });

  it('resistenza governata dal minimo νmin', () => {
    expect(r.ramo).toBe('minimo');
    expect(r.VRd).toBeCloseTo(378.9, 0);
    expect(r.tauRd).toBeCloseTo(0.3157, 3);
  });

  it('ρ1 è limitato al 2%', () => {
    const denso = verificaTaglioNonArmato({ ...TAGLIO_NON_ARMATO_DEFAULT, n1: '400', phi1: '20' });
    expect(denso.rho1).toBe(0.02);
    expect(denso.rho1Eccessivo).toBe(true);
  });

  it('σcp è limitata a 0.2·fcd', () => {
    const compresso = verificaTaglioNonArmato({ ...TAGLIO_NON_ARMATO_DEFAULT, NEd: '9000' });
    expect(compresso.sigmaCp).toBeCloseTo(0.2 * r.fcd, 4);
    expect(compresso.sigmaCpLimitata).toBe(true);
  });
});

describe('§4.1.2.3.5.2 — taglio con armature trasversali', () => {
  const r = verificaTaglioArmato(TAGLIO_ARMATO_DEFAULT);

  it('altezza utile e area delle staffe', () => {
    expect(r.d).toBeCloseTo(1130, 6);
    expect(r.Asw).toBeCloseTo(628.32, 1);
  });

  it('inclinazione del puntone limitata a cotϑ = 2.5', () => {
    expect(r.omegaSw).toBeCloseTo(0.06774, 4);
    expect(r.cotThetaStar).toBeCloseTo(2.526, 2);
    expect(r.cotTheta).toBe(2.5);
    expect(r.clamp).toBe('superiore');
  });

  it('resistenze e meccanismo governante', () => {
    expect(r.VRsd).toBeCloseTo(3123, -1);
    expect(r.VRcd).toBeCloseTo(3180, -1);
    expect(r.governa).toBe('trazione (staffe)');
    expect(r.esito.ok).toBe(true);
  });

  it('minimi di normativa §4.1.6.1.1', () => {
    expect(r.AswMin).toBe(1500);
    expect(r.passoMax).toBeCloseTo(330, 6);
    expect(r.esitoPasso.ok).toBe(true);
  });

  it('αc cresce con la compressione assiale', () => {
    const compresso = verificaTaglioArmato({ ...TAGLIO_ARMATO_DEFAULT, NEd: '2000' });
    expect(compresso.alfaC).toBeGreaterThan(1);
    expect(compresso.VRcd).toBeGreaterThan(r.VRcd);
  });

  it('non produce NaN con passo nullo', () => {
    const zero = verificaTaglioArmato({ ...TAGLIO_ARMATO_DEFAULT, passo: '0' });
    expect(Number.isFinite(zero.VRd)).toBe(true);
  });
});
