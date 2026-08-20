import { describe, it, expect } from 'vitest';
import { classificaSezione, epsilon, moduloDaClasse } from './classificazione';

/**
 * I valori attesi sono le colonne "Classe EC3" del sagomario del foglio
 * `Verifica_aste_acciaio_rev01.xlsm`, che riporta la classe di ogni profilo
 * per acciaio e per tipo di sollecitazione.
 */
describe('§4.2.3 — classificazione confrontata con il sagomario del foglio', () => {
  const casi: {
    tipo: 'IPE' | 'HEA' | 'HEB' | 'UPN';
    taglia: string;
    flessione: [number, number, number];
    compressione: [number, number, number];
  }[] = [
    // [S235, S275, S355]
    { tipo: 'IPE', taglia: 'IPE 200', flessione: [1, 1, 1], compressione: [1, 1, 2] },
    { tipo: 'IPE', taglia: 'IPE 300', flessione: [1, 1, 1], compressione: [2, 2, 4] },
    { tipo: 'IPE', taglia: 'IPE 400', flessione: [1, 1, 1], compressione: [3, 3, 4] },
    { tipo: 'IPE', taglia: 'IPE 600', flessione: [1, 1, 1], compressione: [4, 4, 4] },
    { tipo: 'HEB', taglia: 'HEB 200', flessione: [1, 1, 1], compressione: [1, 1, 1] },
    { tipo: 'HEA', taglia: 'HEA 1000', flessione: [1, 1, 1], compressione: [4, 4, 4] },
    { tipo: 'UPN', taglia: 'UPN 200', flessione: [1, 1, 1], compressione: [1, 1, 1] },
  ];

  const acciai = ['S235', 'S275', 'S355'];

  it('dà le stesse classi del sagomario, in flessione e in compressione', () => {
    for (const c of casi) {
      acciai.forEach((acciaio, i) => {
        const fl = classificaSezione(c.tipo, c.taglia, acciaio, 'flessione');
        const co = classificaSezione(c.tipo, c.taglia, acciaio, 'compressione');
        expect(fl.classe, `${c.taglia} ${acciaio} flessione`).toBe(c.flessione[i]);
        expect(co.classe, `${c.taglia} ${acciaio} compressione`).toBe(c.compressione[i]);
      });
    }
  });

  it('l’anima è quella che declassa i doppi T alti in compressione', () => {
    const r = classificaSezione('IPE', 'IPE 600', 'S235', 'compressione');
    const anima = r.pareti.find((p) => p.nome === 'anima')!;
    const ala = r.pareti.find((p) => p.nome === 'ala')!;
    expect(anima.classe).toBe(4);
    expect(ala.classe).toBe(1);
    expect(r.classe4).toBe(true);
    // c è l'altezza libera fra i raccordi: 600 − 2·19 − 2·24
    expect(anima.c).toBeCloseTo(600 - 2 * 19 - 2 * 24, 6);
  });
});

describe('ε e limiti', () => {
  it('ε = √(235/fyk)', () => {
    expect(epsilon(235)).toBe(1);
    expect(epsilon(275)).toBeCloseTo(0.9244, 4);
    expect(epsilon(355)).toBeCloseTo(0.8136, 4);
  });

  it('i limiti si stringono con l’acciaio più resistente', () => {
    const s235 = classificaSezione('IPE', 'IPE 300', 'S235', 'compressione');
    const s355 = classificaSezione('IPE', 'IPE 300', 'S355', 'compressione');
    expect(s355.pareti[0].limiti[0]).toBeLessThan(s235.pareti[0].limiti[0]);
    // stessa geometria, stesso c/t: cambia solo il metro con cui si misura
    expect(s355.pareti[0].rapporto).toBeCloseTo(s235.pareti[0].rapporto, 9);
  });

  it('la flessione è più clemente della compressione, sull’anima', () => {
    const fl = classificaSezione('IPE', 'IPE 400', 'S275', 'flessione');
    const co = classificaSezione('IPE', 'IPE 400', 'S275', 'compressione');
    expect(fl.pareti[0].limiti[0]).toBeGreaterThan(co.pareti[0].limiti[0]);
    expect(fl.classe).toBeLessThan(co.classe);
  });
});

describe('tubi e angolari', () => {
  it('il tubo tondo si classifica su d/t con ε², non su c/t', () => {
    const r = classificaSezione('TUBO_TONDO', '457x10', 'S275', 'compressione');
    expect(r.pareti).toHaveLength(1);
    expect(r.pareti[0].rapporto).toBeCloseTo(45.7, 1);
    expect(r.pareti[0].limiti[0]).toBeCloseTo(50 * epsilon(275) ** 2, 4);
    expect(r.classe).toBe(2);
  });

  it('un tubo quadro sottile resta compatto, uno spesso e grande no', () => {
    expect(classificaSezione('TUBO_QUADRO', '100x5', 'S355', 'compressione').classe).toBe(1);
    expect(classificaSezione('TUBO_QUADRO', '300x10', 'S355', 'compressione').classe).toBe(2);
  });

  it('gli angolari non vanno oltre la classe 3, e possono cadere in classe 4', () => {
    const l = classificaSezione('ANGOLARE', '100x10', 'S275', 'compressione');
    expect(l.classe).toBe(3);
    expect(l.approssimata).toBe(true);
    // 20x3: h/t = 6.7, ampiamente dentro i limiti, ma resta classe 3
    expect(classificaSezione('ANGOLARE', '20x3', 'S235', 'compressione').classe).toBe(3);
    // un lato molto sottile esce dai limiti del prospetto 4.2.V
    expect(classificaSezione('ANGOLARE', '200x3', 'S355', 'compressione').classe).toBe(4);
  });

  it('un profilo inesistente è marcato in classe 4, non dichiarato compatto', () => {
    const r = classificaSezione('IPE', 'IPE 999', 'S275', 'flessione');
    expect(r.classe).toBe(4);
    expect(r.pareti).toHaveLength(0);
  });
});

describe('modulo resistente dalla classe', () => {
  it('plastico fino alla 2, elastico dalla 3', () => {
    expect(moduloDaClasse(1)).toBe('plastico');
    expect(moduloDaClasse(2)).toBe('plastico');
    expect(moduloDaClasse(3)).toBe('elastico');
    expect(moduloDaClasse(4)).toBe('elastico');
  });
});
