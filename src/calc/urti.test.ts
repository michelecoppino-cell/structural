import { describe, it, expect } from 'vitest';
import { AZIONI_DEFAULT, calcolaAzioni, calcolaUrto } from './azioni';
import { URTI } from '../data/ntc2018';

const con = (patch: Partial<typeof AZIONI_DEFAULT>) => calcolaUrto({ ...AZIONI_DEFAULT, ...patch });

describe('urti di veicoli — §3.6.3.3', () => {
  it('prende dalla tabella le forze equivalenti dello scenario scelto', () => {
    const r = con({ urtoScenario: 'Autostrade e strade extraurbane principali' });
    expect(r.Fdx).toBe(1000);
    expect(r.Fdy).toBe(500);
    expect(r.h).toBe(1.25);
  });

  it('con uno scenario sconosciuto ricade su quello urbano invece di rompersi', () => {
    const r = con({ urtoScenario: 'via di casa mia' });
    expect(r.scenario).toBe('Strade urbane di quartiere e locali');
    expect(r.Fdx).toBe(URTI['Strade urbane di quartiere e locali'].Fdx);
  });

  it('massa, velocità e quota scritte a mano vincono su quelle di tabella', () => {
    const r = con({ urtoMassa: '12', urtoVelocita: '36', urtoQuota: '0.9' });
    expect(r.m).toBe(12);
    expect(r.v).toBe(36);
    expect(r.h).toBe(0.9);
  });

  it('urto duro: F = v·√(k·m), δ = v·√(m/k), Ec = ½·m·v²', () => {
    // 10 t a 36 km/h (10 m/s) contro k = 100 kN/m
    const r = con({ urtoMassa: '10', urtoVelocita: '36', urtoRigidezza: '100' });
    expect(r.Ec).toBeCloseTo(500, 6); // 0.5 · 10 t · 100 (m/s)² = 500 kJ
    expect(r.Fcalc).toBeCloseTo(10 * Math.sqrt(100 * 10), 6); // ≈ 316 kN
    expect(r.delta).toBeCloseTo(10 * Math.sqrt(10 / 100), 6); // ≈ 3.16 m
    // l'energia si ritrova nel lavoro della forza: Ec = ½·F·δ
    expect(0.5 * r.Fcalc * r.delta).toBeCloseTo(r.Ec, 6);
  });

  it('di serie la forza di progetto resta quella tabellare, anche se l’urto duro dà di più', () => {
    const r = con({
      urtoScenario: 'Cortili e autorimesse — autovetture ≤ 30 kN',
      urtoMassa: '10',
      urtoVelocita: '36',
      urtoRigidezza: '100',
    });
    // la forza di tabella è statica equivalente: più bassa non è un errore
    expect(r.Fcalc).toBeGreaterThan(r.Fdx);
    expect(r.Fd).toBe(r.Fdx);
    expect(r.avviso).toBe('');
  });

  it('chiedere la forza dall’energia senza i dati per calcolarla lo dice', () => {
    const r = con({ urtoRigidezza: '', urtoDaEnergia: true });
    expect(r.Fd).toBe(r.Fdx);
    expect(r.avviso).not.toBe('');
  });

  it('chiedendo la forza dall’energia, quella entra nel momento alla base', () => {
    const r = con({
      urtoMassa: '10',
      urtoVelocita: '36',
      urtoRigidezza: '100',
      urtoQuota: '1',
      urtoDaEnergia: true,
    });
    expect(r.Fd).toBeCloseTo(r.Fcalc, 6);
    expect(r.Mbase).toBeCloseTo(r.Fcalc, 6);
    expect(r.avviso).toBe('');
  });

  it('senza rigidezza il confronto energetico non inventa numeri', () => {
    const r = con({ urtoRigidezza: '' });
    expect(r.Fcalc).toBe(0);
    expect(r.delta).toBe(0);
    expect(r.Fd).toBe(r.Fdx);
  });

  it('entra nei risultati della scheda Azioni', () => {
    expect(calcolaAzioni(AZIONI_DEFAULT).urti.Fdx).toBe(500);
  });
});
