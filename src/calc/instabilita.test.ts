import { describe, it, expect } from 'vitest';
import {
  CONDIZIONI_CARICO,
  INSTABILITA_LT_DEFAULT,
  coefficientiC,
  curvaLT,
  verificaInstabilitaLT,
  type InputInstabilitaLT,
} from './instabilita';
import { ACCIAIO_SEZIONE_DEFAULT, type InputAcciaioSezione } from './verifiche';
import { proprietaProfilo } from '../data/profili-acciaio';

/**
 * Il caso di riferimento è quello che il foglio
 * `Verifica_aste_acciaio_rev01.xlsm` porta come esempio: IPE 160 in S275,
 * tratto libero di 2000 mm, carico distribuito su trave appoggiata (caso 2),
 * k = kw = 1, carico sull'ala superiore (zg = +80 mm), modulo plastico,
 * γM1 = 1.05, My,Ed = 22 kNm. Il foglio ottiene Mcr = 34.95 kNm,
 * λLT = 0.9874, χLT = 0.7776, Mb,Rd = 25.23 kNm e uno sfruttamento di 0.872.
 */
const SEZ: InputAcciaioSezione = {
  ...ACCIAIO_SEZIONE_DEFAULT,
  tipoProfilo: 'IPE',
  profilo: 'IPE 160',
  acciaio: 'S275',
  MEd: '22',
};

const LT: InputInstabilitaLT = {
  ...INSTABILITA_LT_DEFAULT,
  L: '2000',
  carico: '2',
  kz: '1',
  kw: '1',
  puntoCarico: 'superiore',
  modulo: 'plastico',
};

describe('§4.2.4.1.3.2 — instabilità flesso-torsionale, caso del foglio di calcolo', () => {
  const r = verificaInstabilitaLT(SEZ, LT);

  it('prende i coefficienti C1, C2, C3 dal prospetto F.1', () => {
    expect(r.C1).toBeCloseTo(1.132, 6);
    expect(r.C2).toBeCloseTo(0.459, 6);
    expect(r.C3).toBeCloseTo(0.525, 6);
    expect(r.kUsato).toBe(1);
  });

  it('caratteristiche torsionali dal sagomario', () => {
    // It e Iw sono quelli di tabella, Iz è calcolata dalla geometria delle ali
    expect(r.It).toBeCloseTo(36000, 0); // 3.60 cm⁴
    expect(r.Iw).toBeCloseTo(3.96e9, -6); // 3960 cm⁶
    expect(r.Iz / 1e4).toBeCloseTo(68.3, 0);
  });

  it('momento critico e snellezza adimensionale', () => {
    expect(r.zg).toBe(80);
    // il foglio dà 34.95 kNm: lo scarto è tutto nell'Iz da geometria (−0.2%)
    expect(r.Mcr).toBeCloseTo(34.95, 0);
    expect(r.Mcr / 34.9456).toBeCloseTo(1, 2);
    expect(r.lambdaLT).toBeCloseTo(0.9874, 2);
  });

  it('curva a, ramo dei doppi T laminati, χLT e Mb,Rd', () => {
    expect(r.curva).toBe('a'); // IPE 160: h/b = 1.95 ≤ 2
    expect(r.alfaLT).toBe(0.21);
    expect(r.beta).toBe(0.75);
    expect(r.lambdaLT0).toBe(0.4);
    expect(r.phiLT).toBeCloseTo(0.9273, 2);
    expect(r.chiLT).toBeCloseTo(0.7776, 2);
    expect(r.MbRd).toBeCloseTo(25.23, 1);
    expect(r.esito.sfruttamento).toBeCloseTo(0.872, 2);
    expect(r.esito.ok).toBe(true);
  });

  it('senza instabilità il momento resistente sarebbe più alto', () => {
    expect(r.McRd).toBeGreaterThan(r.MbRd);
    expect(r.MbRd / r.McRd).toBeCloseTo(r.chiLT, 9);
  });
});

describe('momento critico — dipendenze fisiche', () => {
  it('cresce accorciando il tratto non trattenuto', () => {
    const corto = verificaInstabilitaLT(SEZ, { ...LT, L: '1000' });
    const lungo = verificaInstabilitaLT(SEZ, { ...LT, L: '6000' });
    expect(corto.Mcr).toBeGreaterThan(lungo.Mcr);
    expect(corto.chiLT).toBeGreaterThan(lungo.chiLT);
  });

  it('il carico sull’ala inferiore è stabilizzante, quello in alto no', () => {
    const sopra = verificaInstabilitaLT(SEZ, { ...LT, puntoCarico: 'superiore' });
    const centro = verificaInstabilitaLT(SEZ, { ...LT, puntoCarico: 'baricentro' });
    const sotto = verificaInstabilitaLT(SEZ, { ...LT, puntoCarico: 'inferiore' });
    expect(sopra.Mcr).toBeLessThan(centro.Mcr);
    expect(centro.Mcr).toBeLessThan(sotto.Mcr);
    expect(sopra.zg).toBe(80);
    expect(sotto.zg).toBe(-80);
  });

  it('il momento costante fra gli estremi è la condizione più severa', () => {
    // ψ = 1 con momenti d'estremità: C1 = 1, il minimo della tabella
    const costante = verificaInstabilitaLT(SEZ, { ...LT, carico: '1', psi: '1' });
    const doppiaCurvatura = verificaInstabilitaLT(SEZ, { ...LT, carico: '1', psi: '-1' });
    expect(costante.C1).toBe(1);
    expect(doppiaCurvatura.C1).toBeCloseTo(2.752, 6);
    expect(costante.Mcr).toBeLessThan(doppiaCurvatura.Mcr);
  });

  it('un valore di k fuori tabella viene riportato al più vicino', () => {
    const r = verificaInstabilitaLT(SEZ, { ...LT, carico: '1', psi: '0.6', kz: '0.65' });
    expect(r.kUsato).toBe(0.7);
    expect(r.psiUsato).toBe(0.5);
  });

  it('Mcr si può imporre a mano', () => {
    const r = verificaInstabilitaLT(SEZ, { ...LT, modoMcr: 'manuale', McrManuale: '23.84' });
    expect(r.Mcr).toBe(23.84);
    expect(r.McrCalcolato).toBeCloseTo(34.95, 0);
    expect(r.chiLT).toBeLessThan(0.7776);
  });
});

describe('tutti i tipi di profilo', () => {
  const casi: { tipo: InputAcciaioSezione['tipoProfilo']; taglia: string }[] = [
    { tipo: 'IPE', taglia: 'IPE 300' },
    { tipo: 'HEA', taglia: 'HEA 200' },
    { tipo: 'HEB', taglia: 'HEB 200' },
    { tipo: 'UPN', taglia: 'UPN 200' },
    { tipo: 'ANGOLARE', taglia: '100x10' },
    { tipo: 'TUBO_QUADRO', taglia: '100x5' },
    { tipo: 'TUBO_RETT', taglia: '200x100x6' },
    { tipo: 'TUBO_TONDO', taglia: '168.3x4.5' },
  ];

  it('danno tutti un risultato finito e un χLT nel campo (0, 1]', () => {
    for (const c of casi) {
      const r = verificaInstabilitaLT({ ...SEZ, tipoProfilo: c.tipo, profilo: c.taglia }, LT);
      expect(Number.isFinite(r.Mcr), c.taglia).toBe(true);
      expect(Number.isFinite(r.MbRd), c.taglia).toBe(true);
      expect(r.chiLT, c.taglia).toBeGreaterThan(0);
      expect(r.chiLT, c.taglia).toBeLessThanOrEqual(1);
    }
  });

  it('per tubo quadro e tubo tondo la verifica non è richiesta', () => {
    for (const taglia of [
      { tipo: 'TUBO_QUADRO' as const, t: '100x5' },
      { tipo: 'TUBO_TONDO' as const, t: '168.3x4.5' },
    ]) {
      const r = verificaInstabilitaLT({ ...SEZ, tipoProfilo: taglia.tipo, profilo: taglia.t }, LT);
      expect(r.richiesta, taglia.t).toBe(false);
      expect(r.chiLT, taglia.t).toBe(1);
      expect(r.MbRd, taglia.t).toBeCloseTo(r.McRd, 9);
    }
  });

  it('il tubo rettangolare in piedi sbanda, ma la torsione lo salva', () => {
    const r = verificaInstabilitaLT(
      { ...SEZ, tipoProfilo: 'TUBO_RETT', profilo: '200x100x6' },
      LT,
    );
    expect(r.richiesta).toBe(true);
    // sezione chiusa: It enorme, λLT bassissima → nessun abbattimento
    expect(r.lambdaLT).toBeLessThan(0.4);
    expect(r.chiLT).toBe(1);
  });

  it('l’angolare usa l’inerzia principale minima, non quella geometrica', () => {
    const p = proprietaProfilo('ANGOLARE', '100x10')!;
    expect(p.Imin).toBeLessThan(p.Iy * 0.5);
    const r = verificaInstabilitaLT({ ...SEZ, tipoProfilo: 'ANGOLARE', profilo: '100x10' }, LT);
    expect(r.richiesta).toBe(true);
    expect(r.Iz).toBeCloseTo(p.Imin * 1e4, 6);
    expect(r.curva).toBe('d'); // "altre sezioni", tab. 4.2.VI
  });

  it('un profilo inesistente non produce NaN', () => {
    const r = verificaInstabilitaLT({ ...SEZ, profilo: 'IPE 999' }, LT);
    expect(Number.isFinite(r.MbRd)).toBe(true);
    expect(r.MbRd).toBe(0);
  });
});

describe('curve di instabilità e tabelle', () => {
  it('i doppi T laminati stanno su a o b secondo h/b', () => {
    expect(curvaLT('IPE', 160, 82)).toBe('a'); // h/b = 1.95
    expect(curvaLT('IPE', 300, 150)).toBe('a'); // h/b = 2.00
    expect(curvaLT('IPE', 600, 220)).toBe('b'); // h/b = 2.73
    expect(curvaLT('HEB', 200, 200)).toBe('a');
    expect(curvaLT('UPN', 200, 75)).toBe('d');
    expect(curvaLT('TUBO_RETT', 200, 100)).toBe('d');
  });

  it('ogni condizione di carico ha i suoi k tabellati', () => {
    for (const c of CONDIZIONI_CARICO) {
      for (const k of c.k) {
        const r = coefficientiC(c.id, parseFloat(k), 1);
        expect(r.kUsato, `${c.id}/${k}`).toBe(parseFloat(k));
        expect(r.C1, `${c.id}/${k}`).toBeGreaterThan(0);
      }
    }
  });
});
