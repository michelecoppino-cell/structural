import { describe, it, expect } from 'vitest';
import {
  CONDIZIONI_CARICO,
  STABILITA_DEFAULT,
  coefficientiC,
  curvaLT,
  verificaInstabilitaLT,
  verificaInstabilitaPunta,
  verificaPressoflessione,
  type InputStabilita,
} from './instabilita';
import { ACCIAIO_SEZIONE_DEFAULT, type InputAcciaioSezione } from './verifiche';
import { proprietaProfilo } from '../data/profili-acciaio';
import { betaTelaio } from './libera-inflessione';

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

const LT: InputStabilita = {
  ...STABILITA_DEFAULT,
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

/* ────────────────────── instabilità di punta e combinata ───────────────── */

/**
 * Anche qui il riscontro è il foglio, che sullo stesso IPE 160 in S275 con
 * Lyy = 4000 mm e Lzz = 2000 mm ottiene: λ1 = 86.81; asse y λ = 60.79,
 * λ̄ = 0.7002, curva a, χ = 0.8476, Nb,Rd = 446.2 kN; asse z λ = 108.70,
 * λ̄ = 1.2520, curva b, χ = 0.4507, Nb,Rd = 237.3 kN.
 */
describe('§4.2.4.1.3.1 — instabilità di punta, caso del foglio di calcolo', () => {
  const r = verificaInstabilitaPunta(SEZ, { ...LT, Ly: '4000', betaY: '1', Lz: '2000', betaZ: '1' });

  it('snellezze e raggi d’inerzia', () => {
    expect(r.lambda1).toBeCloseTo(86.815, 2);
    expect(r.y.i).toBeCloseTo(65.8, 1);
    expect(r.z.i).toBeCloseTo(18.4, 1);
    expect(r.y.lambda).toBeCloseTo(60.79, 1);
    // 108.61 contro i 108.70 del foglio: è sempre l'Iz calcolato dalla geometria
    expect(r.z.lambda).toBeCloseTo(108.7, 0);
    expect(r.y.lambdaAd).toBeCloseTo(0.7002, 2);
    expect(r.z.lambdaAd).toBeCloseTo(1.2520, 2);
  });

  it('carichi critici euleriani', () => {
    expect(r.y.Ncr).toBeCloseTo(1126, -1);
    expect(r.z.Ncr).toBeCloseTo(354, -1);
  });

  it('curve di instabilità dalla tab. 4.2.VIII', () => {
    // IPE 160: h/b = 1.95 > 1.2 e tf = 7.4 ≤ 40 mm → a attorno a y, b attorno a z
    expect(r.y.curva).toBe('a');
    expect(r.y.alfa).toBe(0.21);
    expect(r.z.curva).toBe('b');
    expect(r.z.alfa).toBe(0.34);
  });

  it('χ, resistenza e asse che governa', () => {
    expect(r.y.chi).toBeCloseTo(0.8476, 2);
    expect(r.z.chi).toBeCloseTo(0.4507, 2);
    expect(r.y.NbRd).toBeCloseTo(446.2, 0);
    expect(r.z.NbRd).toBeCloseTo(237.3, 0);
    // si sbanda dove si è più deboli
    expect(r.governa).toBe('z');
    expect(r.NbRd).toBeCloseTo(r.z.NbRd, 9);
    expect(r.NbRd).toBeLessThan(r.NcRd);
  });
});

describe('instabilità di punta — comportamento', () => {
  const base = { ...LT, Ly: '4000', betaY: '1', Lz: '2000', betaZ: '1' };

  it('accorciare l’asta o trattenerla alza la resistenza', () => {
    const corta = verificaInstabilitaPunta(SEZ, { ...base, Lz: '1000' });
    const vincolata = verificaInstabilitaPunta(SEZ, {
      ...base,
      modoZ: 'manuale',
      betaZ: '0.5',
    });
    const lunga = verificaInstabilitaPunta(SEZ, base);
    expect(corta.NbRd).toBeGreaterThan(lunga.NbRd);
    expect(vincolata.NbRd).toBeCloseTo(corta.NbRd, 6); // β = 0.5 su 2000 = 1000
  });

  it('β viene dallo schema di vincolo scelto, non da un numero sciolto', () => {
    // cerniera-cerniera è il riferimento, β = 1
    expect(verificaInstabilitaPunta(SEZ, base).z.beta).toBe(1);
    // la mensola vale 2.1 (consigliato, non il 2.0 teorico)
    const mensola = verificaInstabilitaPunta(SEZ, { ...base, modoZ: 'mensola' });
    expect(mensola.z.beta).toBe(2.1);
    expect(mensola.z.Lcr).toBeCloseTo(2.1 * 2000, 6);
    expect(mensola.NbRd).toBeLessThan(verificaInstabilitaPunta(SEZ, base).NbRd);
    // e il telaio lo calcola dalle formule di Wood
    const telaio = verificaInstabilitaPunta(SEZ, {
      ...base,
      modoZ: 'telaio-mobili',
      eta1Z: '0.5',
      eta2Z: '0.5',
    });
    expect(telaio.z.beta).toBeCloseTo(betaTelaio(0.5, 0.5, 'mobili'), 9);
    expect(telaio.z.beta).toBeGreaterThan(1);
  });

  it('segnala la snellezza oltre 200', () => {
    const filiforme = verificaInstabilitaPunta(SEZ, { ...base, Lz: '5000' });
    expect(filiforme.z.lambda).toBeGreaterThan(200);
    expect(filiforme.z.troppoSnella).toBe(true);
    expect(verificaInstabilitaPunta(SEZ, base).z.troppoSnella).toBe(false);
  });

  it('la trazione non instabilizza', () => {
    const teso = verificaInstabilitaPunta({ ...SEZ, NEd: '-500' }, base);
    expect(teso.esito.sfruttamento).toBe(0);
  });

  it('l’angolare sbanda attorno all’asse principale minimo', () => {
    const l = verificaInstabilitaPunta(
      { ...SEZ, tipoProfilo: 'ANGOLARE', profilo: '100x10' },
      base,
    );
    const p = proprietaProfilo('ANGOLARE', '100x10')!;
    expect(l.z.I).toBeCloseTo(p.Imin, 6);
    expect(l.z.I).toBeLessThan(l.y.I);
    expect(l.z.curva).toBe('b'); // angolari: curva b
  });

  it('i tubi formati a freddo stanno su una curva peggiore di quelli a caldo', () => {
    const sez = { ...SEZ, tipoProfilo: 'TUBO_QUADRO' as const, profilo: '100x5' };
    const freddo = verificaInstabilitaPunta(sez, { ...base, formatura: 'freddo' });
    const caldo = verificaInstabilitaPunta(sez, { ...base, formatura: 'caldo' });
    expect(freddo.z.curva).toBe('c');
    expect(caldo.z.curva).toBe('a');
    expect(freddo.NbRd).toBeLessThan(caldo.NbRd);
  });
});

describe('§C4.2.4.1.3.3 — verifica combinata, Metodo A', () => {
  const base = { ...LT, Ly: '4000', betaY: '1', Lz: '2000', betaZ: '1' };
  const combinata = (sez: InputAcciaioSezione, inp = base) =>
    verificaPressoflessione(sez, inp, verificaInstabilitaLT(sez, inp), verificaInstabilitaPunta(sez, inp));

  it('senza assiale coincide con la sola flesso-torsionale', () => {
    const r = combinata(SEZ);
    const lt = verificaInstabilitaLT(SEZ, base);
    expect(r.termineN).toBe(0);
    expect(r.termineMz).toBe(0);
    expect(r.amplificaY).toBe(1);
    expect(r.termineMy).toBeCloseTo(lt.esito.sfruttamento, 9);
    // è il valore che il foglio riporta per lo stesso caso
    expect(r.sfruttamento).toBeCloseTo(0.872, 2);
  });

  it('l’assiale amplifica i momenti oltre a consumare resistenza propria', () => {
    const senza = combinata({ ...SEZ, NEd: '0' });
    const con = combinata({ ...SEZ, NEd: '100' });
    expect(con.termineN).toBeGreaterThan(0);
    expect(con.amplificaY).toBeGreaterThan(1);
    // 1/(1 − 100/1126)
    expect(con.amplificaY).toBeCloseTo(1 / (1 - 100 / 1126), 2);
    expect(con.termineMy).toBeGreaterThan(senza.termineMy);
    expect(con.sfruttamento).toBeGreaterThan(senza.sfruttamento);
  });

  it('il momento attorno all’asse debole entra con il suo modulo', () => {
    const r = combinata({ ...SEZ, MEd: '0', MzEd: '3' });
    expect(r.termineMy).toBe(0);
    expect(r.Wz).toBeLessThan(r.Wy);
    // Mz,Rd = Wz·fyk/γM1, con Wz plastico perché la sezione è compatta
    expect(r.termineMz).toBeCloseTo(3 / ((r.Wz * 275) / 1.05 / 1e6), 6);
  });

  it('oltre il carico critico la verifica non ha più senso e lo dice', () => {
    // NEd = 400 kN supera Ncr,z = 354 kN: l'asta è già oltre il carico di Eulero
    const r = combinata({ ...SEZ, NEd: '400' });
    expect(r.oltreCritico).toBe(true);
    expect(r.termineN).toBeGreaterThan(1);
    expect(r.esito.ok).toBe(false);
    // con un momento attorno all'asse debole non c'è più nemmeno un numero
    const conMz = combinata({ ...SEZ, NEd: '400', MzEd: '1' });
    expect(Number.isFinite(conMz.sfruttamento)).toBe(false);
    expect(conMz.esito.ok).toBe(false);
  });

  it('la somma dei tre termini è il fattore di sfruttamento', () => {
    const r = combinata({ ...SEZ, NEd: '80', MEd: '10', MzEd: '1.5' });
    expect(r.sfruttamento).toBeCloseTo(r.termineN + r.termineMy + r.termineMz, 9);
    expect(r.esito.ok).toBe(r.sfruttamento <= 1);
  });
});

describe('classe della sezione dentro le verifiche di stabilità', () => {
  it('il modulo automatico segue la classe', () => {
    // IPE 160 in flessione è classe 1 → modulo plastico
    const auto = verificaInstabilitaLT(SEZ, { ...LT, modulo: 'automatico' });
    expect(auto.classe.classe).toBe(1);
    expect(auto.moduloUsato).toBe('plastico');
    expect(auto.Wy).toBeCloseTo(123.9 * 1000, 6);
    // e resta imponibile a mano
    const elastico = verificaInstabilitaLT(SEZ, { ...LT, modulo: 'elastico' });
    expect(elastico.moduloUsato).toBe('elastico');
    expect(elastico.Wy).toBeCloseTo(109 * 1000, 6);
    expect(elastico.MbRd).toBeLessThan(auto.MbRd);
  });

  it('una sezione snella scende al modulo elastico da sola', () => {
    // IPE 600 in compressione è classe 4: la presso-flessione lo rileva
    const sez = { ...SEZ, profilo: 'IPE 600', NEd: '200' };
    const auto = { ...LT, modulo: 'automatico' as const };
    const r = verificaPressoflessione(
      sez,
      auto,
      verificaInstabilitaLT(sez, auto),
      verificaInstabilitaPunta(sez, auto),
    );
    expect(r.classe.classe).toBe(4);
    expect(r.moduloUsato).toBe('elastico');
  });
});
