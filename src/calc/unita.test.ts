import { describe, it, expect } from 'vitest';
import {
  UNITA_DEFAULT,
  componiUnita,
  converti,
  daBase,
  dimUnita,
  fattoreUnita,
  inBase,
  leggiUnita,
  normalizzaElenco,
  scriviUnita,
  ugualiDim,
  unitaCompatibili,
  unitaInElenco,
} from './unita';
import { ricalcola, valutaConUnita, type VoceCalcolo } from './calcolatrice';

describe('lettura delle unità', () => {
  it('scompone le abbreviazioni di uso corrente sui simboli base', () => {
    expect(dimUnita('m')).toEqual({ m: 1 });
    expect(dimUnita('mq')).toEqual({ m: 2 });
    expect(dimUnita('mc')).toEqual({ m: 3 });
    expect(dimUnita('kN')).toEqual({ N: 1 });
    expect(dimUnita('kg/mc')).toEqual({ N: 1, m: -3 });
    expect(dimUnita('kN/cmq')).toEqual({ N: 1, m: -2 });
  });

  it('ogni unità porta la sua scala', () => {
    expect(fattoreUnita('m')).toBe(1);
    expect(fattoreUnita('cm')).toBeCloseTo(0.01, 12);
    expect(fattoreUnita('cmq')).toBeCloseTo(1e-4, 15);
    expect(fattoreUnita('kN')).toBe(1000);
    expect(fattoreUnita('MPa')).toBe(1e6);
    // il kg dei tecnici è un kgf: 1 kg/cmq sono 98066,5 N/mq
    expect(fattoreUnita('kg')).toBeCloseTo(9.80665, 9);
    expect(fattoreUnita('kg/cmq')).toBeCloseTo(98066.5, 6);
  });

  it('il metro lineare è un metro, MPa è N/mmq', () => {
    expect(ugualiDim(dimUnita('ml'), dimUnita('m'))).toBe(true);
    expect(leggiUnita('MPa')).toEqual(leggiUnita('N/mmq'));
  });

  it('unità con la stessa forma ma scala diversa restano distinte', () => {
    expect(ugualiDim(dimUnita('MPa'), dimUnita('kg/cmq'))).toBe(true);
    expect(fattoreUnita('MPa')).not.toBe(fattoreUnita('kg/cmq'));
  });

  it('accetta esponenti scritti in tutti i modi', () => {
    expect(dimUnita('m^2')).toEqual({ m: 2 });
    expect(dimUnita('m²')).toEqual({ m: 2 });
    expect(dimUnita('kN·m')).toEqual({ N: 1, m: 1 });
    expect(dimUnita('kNm')).toEqual({ N: 1, m: 1 });
    expect(dimUnita('cm^4')).toEqual({ m: 4 });
    expect(fattoreUnita('cm^4')).toBeCloseTo(1e-8, 18);
  });

  it('un simbolo sconosciuto vale per sé stesso, con scala 1', () => {
    expect(leggiUnita('pz')).toEqual({ dim: { pz: 1 }, fattore: 1 });
    expect(dimUnita('€/mq')).toEqual({ '€': 1, m: -2 });
  });
});

describe('conversione dei valori', () => {
  it('porta un numero da un’unità all’altra', () => {
    expect(converti(1, 'm', 'cm')).toBeCloseTo(100, 9);
    expect(converti(1000, 'mm', 'm')).toBeCloseTo(1, 9);
    expect(converti(1, 'mq', 'cmq')).toBeCloseTo(1e4, 6);
    expect(converti(25, 'kN/mc', 'kg/mc')).toBeCloseTo(2549.29, 2);
    expect(converti(31.25, 'kNm', 'Nmm')).toBeCloseTo(31.25e6, 3);
  });

  it('la tensione si legge in MPa o in kg/cmq: cambia il numero', () => {
    // è il caso di partenza: 0,8 MPa scritti in kg/cmq fanno 8,16
    expect(converti(0.8, 'MPa', 'kg/cmq')).toBeCloseTo(8.158, 3);
    expect(converti(8.158, 'kg/cmq', 'MPa')).toBeCloseTo(0.8, 3);
    expect(converti(0.8, 'MPa', 'kN/mq')).toBeCloseTo(800, 6);
  });

  it('fra forme diverse non converte niente', () => {
    expect(converti(1, 'kNm', 'm')).toBe(null);
    expect(converti(1, 'kN', 'kg/cmq')).toBe(null);
  });

  it('andata e ritorno dalle unità base', () => {
    expect(inBase(30, 'cm')).toBeCloseTo(0.3, 12);
    expect(daBase(0.3, 'cm')).toBeCloseTo(30, 9);
    expect(inBase(90, 'kN')).toBe(90000);
    expect(daBase(90000, 'kN')).toBe(90);
  });

  it('elenca le unità con cui si può leggere una forma', () => {
    expect(unitaCompatibili(dimUnita('MPa'), UNITA_DEFAULT)).toContain('kg/cmq');
    expect(unitaCompatibili(dimUnita('MPa'), UNITA_DEFAULT)).toContain('kN/mq');
    expect(unitaCompatibili(dimUnita('kN'), UNITA_DEFAULT)).toEqual(['N', 'daN', 'kN', 'kg', 't']);
    expect(unitaCompatibili(dimUnita('kNm'), ['m', 'kN'])).toEqual([]);
  });
});

describe('scrittura delle unità', () => {
  it('sceglie l’unità con cui si legge di solito', () => {
    expect(scriviUnita({ m: 2 })).toBe('mq');
    expect(scriviUnita({ N: 1, m: -3 })).toBe('kN/mc');
    expect(scriviUnita({ N: 1 })).toBe('kN');
    expect(scriviUnita({ N: 1, m: 1 })).toBe('kNm');
    expect(scriviUnita({})).toBe('');
  });

  it('con un valore fuori scala cerca il multiplo leggibile', () => {
    // area di 4 ⌀16: 8·10⁻⁴ mq non si legge, 804 mmq sì
    expect(scriviUnita({ m: 2 }, UNITA_DEFAULT, 8.044e-4)).toBe('mmq');
    // ma un'area di sezione resta in mq
    expect(scriviUnita({ m: 2 }, UNITA_DEFAULT, 0.15)).toBe('mq');
    // una lunghezza normale resta in metri: l'unità non salta a ogni cifra
    expect(scriviUnita({ m: 1 }, UNITA_DEFAULT, 0.3)).toBe('m');
  });

  it('senza corrispondenze compone i simboli', () => {
    expect(scriviUnita({ pz: 1, m: -1 })).toBe('pz/m');
    expect(scriviUnita({ m: -1 })).toBe('1/m');
    expect(componiUnita({ N: 1, m: -2 })).toBe('N/mq');
  });

  it('rispetta l’elenco che le viene dato', () => {
    expect(scriviUnita({ N: 1, m: -2 }, ['N/mmq'])).toBe('N/mmq');
    expect(scriviUnita({ N: 1 }, ['kg', 't'])).toBe('kg');
  });
});

describe('controllo rispetto all’elenco', () => {
  it('passa quello che è in elenco, anche scritto in un altro modo', () => {
    expect(unitaInElenco('kN/mq', UNITA_DEFAULT)).toBe(true);
    expect(unitaInElenco('kN/m^2', UNITA_DEFAULT)).toBe(true);
    expect(unitaInElenco('', UNITA_DEFAULT)).toBe(true);
  });

  it('segnala quello che in elenco non c’è', () => {
    expect(unitaInElenco('kg/anno', UNITA_DEFAULT)).toBe(false);
    expect(unitaInElenco('pz', UNITA_DEFAULT)).toBe(false);
    expect(unitaInElenco('pz', ['pz'])).toBe(true);
    // stessa forma non basta: un multiplo che non è in elenco va segnalato
    expect(unitaInElenco('GPa', ['MPa'])).toBe(false);
  });

  it('l’elenco si ripulisce da vuoti e doppioni', () => {
    expect(normalizzaElenco(['m', ' m ', '', 'mq'])).toEqual(['m', 'mq']);
  });
});

describe('unità ricavata dall’operazione', () => {
  const u = (src: string, unita: Record<string, string>, vars: Record<string, number>) => {
    const dim: Record<string, ReturnType<typeof dimUnita>> = {};
    for (const [k, v] of Object.entries(unita)) dim[k] = dimUnita(v);
    const e = valutaConUnita(src, vars, dim);
    return e.ok && e.dim ? scriviUnita(e.dim) : null;
  };

  it('il prodotto fra nomi compone l’unità', () => {
    expect(u('b*h', { b: 'm', h: 'm' }, { b: 3, h: 4 })).toBe('mq');
    expect(u('b*l*h', { b: 'm', l: 'm', h: 'm' }, { b: 1, l: 2, h: 3 })).toBe('mc');
    expect(u('V*gCLS', { V: 'mc', gCLS: 'kN/mc' }, { V: 2, gCLS: 25 })).toBe('kN');
    expect(u('A*gTERRA*h', { A: 'mq', gTERRA: 'kN/mc', h: 'm' }, { A: 2, gTERRA: 18, h: 3 })).toBe('kN');
  });

  it('il rapporto e le potenze seguono le stesse regole', () => {
    expect(u('N/A', { N: 'kN', A: 'mq' }, { N: 10, A: 2 })).toBe('kN/mq');
    expect(u('b^2', { b: 'm' }, { b: 3 })).toBe('mq');
    expect(u('sqrt(A)', { A: 'mq' }, { A: 16 })).toBe('m');
  });

  it('i numeri puri non sporcano l’unità', () => {
    expect(u('2*b*1,5', { b: 'm' }, { b: 3 })).toBe('m');
    expect(u('b*20%', { b: 'm' }, { b: 3 })).toBe('m');
    expect(u('max(b;h)', { b: 'm', h: 'm' }, { b: 3, h: 4 })).toBe('m');
    expect(u('round(b;2)', { b: 'm' }, { b: 3.333 })).toBe('m');
  });

  it('una somma fra unità diverse non dà un’unità', () => {
    expect(u('b+F', { b: 'm', F: 'kN' }, { b: 3, F: 4 })).toBe(null);
    expect(u('b+2', { b: 'm' }, { b: 3 })).toBe('m');
  });

  it('senza unità in ingresso non se ne inventa', () => {
    expect(u('3*4', {}, {})).toBe('');
  });
});

describe('unità nella sequenza salvata', () => {
  const voce = (nome: string, espressione: string, um = ''): VoceCalcolo => ({
    id: nome,
    nome,
    espressione,
    nota: '',
    um,
  });

  it('l’unità calcolata passa alle operazioni successive', () => {
    const r = ricalcola([
      voce('b', '0,3', 'm'),
      voce('h', '0,5', 'm'),
      voce('gCLS', '25', 'kN/mc'),
      voce('A', 'b*h'),
      voce('peso', 'A*gCLS'),
    ]);
    expect(r[3].umCalcolata).toBe('mq');
    expect(r[3].valore).toBeCloseTo(0.15, 9);
    expect(r[4].umEffettiva).toBe('kN/m');
    expect(r[4].valore).toBeCloseTo(3.75, 9);
    // dentro le formule il valore è in unità base: N/m, non kN/m
    expect(r[4].valoreBase).toBeCloseTo(3750, 6);
  });

  it('le unità si possono mescolare: i conti tornano comunque', () => {
    // la stessa trave con la base in cm e il peso di volume in kg/mc
    const r = ricalcola([
      voce('b', '30', 'cm'),
      voce('h', '0,5', 'm'),
      voce('gCLS', '2500', 'kg/mc'),
      voce('peso', 'b*h*gCLS', 'kN/m'),
    ]);
    expect(r[3].valore).toBeCloseTo(3.677, 2);
    expect(r[3].umEffettiva).toBe('kN/m');
  });

  it('cambiare l’unità del risultato converte il numero', () => {
    const sigma = (um: string) =>
      ricalcola([voce('F', '80', 'kN'), voce('A', '0,1', 'mq'), voce('σ', 'F/A', um)])[2];
    expect(sigma('MPa').valore).toBeCloseTo(0.8, 9);
    expect(sigma('kg/cmq').valore).toBeCloseTo(8.158, 3);
    expect(sigma('kN/mq').valore).toBeCloseTo(800, 9);
    // il valore che gira nelle formule non cambia: cambia solo come si legge
    expect(sigma('MPa').valoreBase).toBeCloseTo(800000, 6);
    expect(sigma('kg/cmq').valoreBase).toBeCloseTo(800000, 6);
  });

  it('un’unità di forma sbagliata si segnala e non converte', () => {
    const r = ricalcola([voce('F', '80', 'kN'), voce('A', '0,1', 'mq'), voce('σ', 'F/A', 'kNm')]);
    expect(r[2].umIncompatibile).toBe(true);
    // resta quella calcolata, così il numero non racconta bugie
    expect(r[2].umEffettiva).toBe('kN/mq');
    expect(r[2].valore).toBeCloseTo(800, 9);
  });

  it('l’unità scritta a mano vince su quella calcolata', () => {
    const r = ricalcola([voce('b', '2', 'm'), voce('h', '3', 'm'), voce('A', 'b*h', 'mq')]);
    expect(r[2].umEffettiva).toBe('mq');
    expect(r[2].um).toBe('mq');
  });

  it('un’unità fuori elenco viene segnata', () => {
    const r = ricalcola([voce('a', '1', 'kg/anno')]);
    expect(r[0].umFuoriElenco).toBe(true);
    expect(ricalcola([voce('a', '1', 'kg')])[0].umFuoriElenco).toBe(false);
  });

  it('una voce vuota non è un errore: è ancora da compilare', () => {
    const r = ricalcola([voce('b', ''), voce('a', '2')]);
    expect(r[0].errore).toBe('');
    expect(Number.isNaN(r[0].valore)).toBe(true);
    expect(r[1].valore).toBe(2);
  });

  it('la freccia esce giusta mescolando kN/m, m, MPa e cm⁴', () => {
    const r = ricalcola([
      voce('q', '10', 'kN/m'),
      voce('l', '5', 'm'),
      voce('E', '210000', 'MPa'),
      voce('J', '10000', 'cm^4'),
      voce('f', '5*q*l^4/(384*E*J)', 'mm'),
    ]);
    // 5·10·5⁴/(384·210·10⁶·10⁻⁴) = 0,00388 m = 3,88 mm
    expect(r[4].errore).toBe('');
    expect(r[4].valore).toBeCloseTo(3.88, 2);
    expect(r[4].umEffettiva).toBe('mm');
  });
});
