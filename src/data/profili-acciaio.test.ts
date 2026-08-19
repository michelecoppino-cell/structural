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

describe('torsione, ingobbamento e moduli plastici', () => {
  it('i doppi T a sagomario prendono It e Iw dalla tabella', () => {
    const ipe = proprietaProfilo('IPE', 'IPE 160')!;
    expect(ipe.It).toBe(3.6); // cm⁴
    expect(ipe.Iw).toBe(3960); // cm⁶
    expect(ipe.Wplx).toBe(123.9); // cm³
    // la formula di parete sottile darebbe 2.8 cm⁴: i raccordi pesano un 20%,
    // ed è la ragione per cui It sta a tabella e non si calcola
    expect((2 * 82 * 7.4 ** 3 + (160 - 2 * 7.4) * 5 ** 3) / 3 / 1e4).toBeLessThan(ipe.It);
  });

  it('gli UPN fuori sagomario (50, 65) ricadono sulle formule geometriche', () => {
    const upn = proprietaProfilo('UPN', 'UPN 65')!;
    expect(upn.It).toBeGreaterThan(0);
    expect(upn.Iw).toBeGreaterThan(0);
    // un U ingobba meno di un doppio T di pari inerzia laterale
    expect(upn.Iw).toBeLessThan((upn.Iy * (65 - 7.5) ** 2) / 4 / 100);
    expect(upn.Wplx).toBeGreaterThan(upn.Wx);
  });

  it('le sezioni chiuse hanno It dalla formula di Bredt', () => {
    // tubo quadro 100×5: It = t·(b − t)³ = 5 · 95³ = 4.29e6 mm⁴
    expect(proprietaProfilo('TUBO_QUADRO', '100x5')!.It).toBeCloseTo((5 * 95 ** 3) / 1e4, 6);
    // tubo tondo: It coincide con il momento polare, cioè 2·Ix
    const tondo = proprietaProfilo('TUBO_TONDO', '168.3x4.5')!;
    expect(tondo.It).toBeCloseTo(2 * tondo.Ix, 6);
    // e nessuna delle due ingobba
    expect(tondo.Iw).toBe(0);
    // la torsione di un tubo vale ordini di grandezza più di un profilo aperto
    expect(proprietaProfilo('TUBO_QUADRO', '100x5')!.It).toBeGreaterThan(
      100 * proprietaProfilo('IPE', 'IPE 100')!.It,
    );
  });

  it('l’angolare ha l’inerzia principale minima ben sotto quella geometrica', () => {
    const l = proprietaProfilo('ANGOLARE', '100x10')!;
    // tabelle commerciali per L 100×100×10: Iξ ≈ 73 cm⁴ contro Ix = 177 cm⁴
    expect(l.Imin).toBeCloseTo(73, 0);
    expect(l.Imin).toBeLessThan(l.Ix);
    // per doppi T e tubi invece Imin è semplicemente la minore delle due
    const ipe = proprietaProfilo('IPE', 'IPE 300')!;
    expect(ipe.Imin).toBe(ipe.Iy);
  });
});
