import { describe, it, expect } from 'vitest';
import { propretaSecondoAsse, proprietaProfilo } from './profili-acciaio';

describe('asse debole dei profili', () => {
  it('il doppio T calcolato dalla geometria coincide con le tabelle', () => {
    // valori EN 10365: IPE 200 → Iy = 142 cm⁴, Wy = 28.5 cm³
    const ipe = proprietaProfilo('IPE', 'IPE 200')!;
    expect(ipe.Iy).toBeCloseTo(142, 0);
    expect(ipe.Wy).toBeCloseTo(28.5, 0);
    // HEA 200 → Iy = 1336 cm⁴
    expect(proprietaProfilo('HEA', 'HEA 200')!.Iy).toBeCloseTo(1336, -1);
  });

  it('gli UPN prendono l’asse debole dalla tabella, non dalla geometria', () => {
    const upn = proprietaProfilo('UPN', 'UPN 200')!;
    expect(upn.Iy).toBe(148);
    expect(upn.Wy).toBe(27);
  });

  it('ruotare il profilo scambia i due assi e le due dimensioni', () => {
    const p = proprietaProfilo('IPE', 'IPE 300')!;
    const ruotato = propretaSecondoAsse(p, 'debole');
    expect(ruotato.Ix).toBe(p.Iy);
    expect(ruotato.Wx).toBe(p.Wy);
    expect(ruotato.Avz).toBe(p.Avy);
    expect([ruotato.h, ruotato.b]).toEqual([p.b, p.h]);
    // sull'asse forte non cambia niente
    expect(propretaSecondoAsse(p, 'forte')).toEqual(p);
    // e ruotare un profilo simmetrico non sposta nulla
    const tondo = proprietaProfilo('TUBO_TONDO', '168.3x4.5')!;
    expect(propretaSecondoAsse(tondo, 'debole').Ix).toBeCloseTo(tondo.Ix, 9);
  });

  it('il tubo rettangolare coricato è meno rigido di quello in piedi', () => {
    const t = proprietaProfilo('TUBO_RETT', '200x100x6')!;
    expect(t.Iy).toBeLessThan(t.Ix);
    // 200x100x6 = alto 200, largo 100: Ix sui 200, Iy sui 100
    expect(t.h).toBe(200);
    expect(t.Ix).toBeCloseTo((100 * 200 ** 3 - 88 * 188 ** 3) / 12 / 1e4, 6);
    expect(t.Iy).toBeCloseTo((200 * 100 ** 3 - 188 * 88 ** 3) / 12 / 1e4, 6);
  });
});
