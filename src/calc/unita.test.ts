import { describe, it, expect } from 'vitest';
import {
  UNITA_DEFAULT,
  leggiUnita,
  normalizzaElenco,
  scriviUnita,
  ugualiDim,
  unitaInElenco,
} from './unita';
import { ricalcola, valutaConUnita, type VoceCalcolo } from './calcolatrice';

describe('lettura delle unità', () => {
  it('scompone le abbreviazioni di uso corrente', () => {
    expect(leggiUnita('m')).toEqual({ m: 1 });
    expect(leggiUnita('mq')).toEqual({ m: 2 });
    expect(leggiUnita('mc')).toEqual({ m: 3 });
    expect(leggiUnita('kg/mc')).toEqual({ kg: 1, m: -3 });
    expect(leggiUnita('kN/cmq')).toEqual({ kN: 1, cm: -2 });
  });

  it('il metro lineare è un metro, MPa è N/mmq', () => {
    expect(ugualiDim(leggiUnita('ml'), leggiUnita('m'))).toBe(true);
    expect(ugualiDim(leggiUnita('MPa'), leggiUnita('N/mmq'))).toBe(true);
  });

  it('accetta esponenti scritti in tutti i modi', () => {
    expect(leggiUnita('m^2')).toEqual({ m: 2 });
    expect(leggiUnita('m²')).toEqual({ m: 2 });
    expect(leggiUnita('kN·m')).toEqual({ kN: 1, m: 1 });
    expect(leggiUnita('kNm')).toEqual({ kN: 1, m: 1 });
  });

  it('un simbolo sconosciuto vale per sé stesso', () => {
    expect(leggiUnita('pz')).toEqual({ pz: 1 });
    expect(leggiUnita('€/mq')).toEqual({ '€': 1, m: -2 });
  });
});

describe('scrittura delle unità', () => {
  it('preferisce la scrittura che sta in elenco', () => {
    expect(scriviUnita({ m: 2 })).toBe('mq');
    expect(scriviUnita({ kN: 1, m: -3 })).toBe('kN/mc');
    expect(scriviUnita({ N: 1, mm: -2 })).toBe('MPa');
    expect(scriviUnita({})).toBe('');
  });

  it('senza corrispondenze compone i simboli', () => {
    expect(scriviUnita({ pz: 1, m: -1 })).toBe('pz/m');
    expect(scriviUnita({ m: -1 })).toBe('1/m');
  });

  it('rispetta l’elenco che le viene dato', () => {
    expect(scriviUnita({ N: 1, mm: -2 }, ['N/mmq'])).toBe('N/mmq');
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
  });

  it('l’elenco si ripulisce da vuoti e doppioni', () => {
    expect(normalizzaElenco(['m', ' m ', '', 'mq'])).toEqual(['m', 'mq']);
  });
});

describe('unità ricavata dall’operazione', () => {
  const u = (src: string, unita: Record<string, string>, vars: Record<string, number>) => {
    const dim: Record<string, ReturnType<typeof leggiUnita>> = {};
    for (const [k, v] of Object.entries(unita)) dim[k] = leggiUnita(v);
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
    expect(r[4].umEffettiva).toBe('kN/m');
    expect(r[4].valore).toBeCloseTo(3.75, 9);
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
});
