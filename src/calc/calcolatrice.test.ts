import { describe, it, expect } from 'vitest';
import { formatta, nomeAmmesso, ricalcola, testoVoce, valuta, variabili, type VoceCalcolo } from './calcolatrice';

const v = (src: string, vars: Record<string, number> = {}) => {
  const e = valuta(src, vars);
  return e.ok ? e.valore : NaN;
};

describe('interprete di espressioni', () => {
  it('precedenza e parentesi', () => {
    expect(v('2+3*4')).toBe(14);
    expect(v('(2+3)*4')).toBe(20);
    expect(v('10-2-3')).toBe(5);
    expect(v('100/5/2')).toBe(10);
  });

  it('potenza associativa a destra e meno unario', () => {
    expect(v('2^3^2')).toBe(512);
    expect(v('-3^2')).toBe(-9);
    expect(v('(-3)^2')).toBe(9);
    expect(v('--5')).toBe(5);
  });

  it('virgola decimale e notazione esponenziale', () => {
    expect(v('3,5*2')).toBe(7);
    expect(v('1e3+1')).toBe(1001);
    expect(v('2,5e-1')).toBeCloseTo(0.25, 12);
  });

  it('percentuale come suffisso', () => {
    expect(v('50%')).toBe(0.5);
    expect(v('120*5%')).toBeCloseTo(6, 12);
  });

  it('prodotto implicito', () => {
    expect(v('2(3+4)')).toBe(14);
    expect(v('(1+1)(2+2)')).toBe(8);
    expect(v('2area', { area: 6 })).toBe(12);
    expect(v('2pi')).toBeCloseTo(2 * Math.PI, 12);
  });

  it('funzioni, separatore ; e trigonometria in gradi', () => {
    expect(v('sqrt(16)')).toBe(4);
    expect(v('min(3;5;2)')).toBe(2);
    expect(v('max(3;5)')).toBe(5);
    expect(v('round(3,14159;2)')).toBeCloseTo(3.14, 12);
    expect(v('tan(45)')).toBeCloseTo(1, 12);
    expect(v('cos(60)')).toBeCloseTo(0.5, 12);
    expect(v('atan(1)')).toBeCloseTo(45, 12);
  });

  it('simboli del tastierino', () => {
    expect(v('6×7')).toBe(42);
    expect(v('84÷2')).toBe(42);
    expect(v('√81')).toBe(9);
  });

  it('variabili con nome', () => {
    expect(v('base*altezza/2', { base: 3, altezza: 4 })).toBe(6);
    expect(v('ans*2', { ans: 21 })).toBe(42);
  });

  it('segnala gli errori invece di sollevare', () => {
    expect(valuta('2+')).toEqual({ ok: false, errore: expect.any(String) });
    expect(valuta('(2+3')).toMatchObject({ ok: false });
    expect(valuta('2+pippo')).toMatchObject({ ok: false, errore: 'nome sconosciuto: pippo' });
    expect(valuta('1/0')).toMatchObject({ ok: false });
    expect(valuta('2 & 3')).toMatchObject({ ok: false });
    expect(valuta('   ')).toMatchObject({ ok: false });
    expect(valuta('sqrt')).toMatchObject({ ok: false });
    expect(valuta('min(1;2;3;4;5;6;7)')).toMatchObject({ ok: false });
  });
});

describe('sequenza di operazioni salvate', () => {
  const voce = (nome: string, espressione: string, id = nome): VoceCalcolo => ({
    id,
    nome,
    espressione,
    nota: '',
    um: '',
  });

  const sequenza = [voce('area', '5*4'), voce('incidenza', '1,2'), voce('peso', 'area*incidenza')];

  it('ogni voce vede quelle che la precedono', () => {
    const r = ricalcola(sequenza);
    expect(r[0].valore).toBe(20);
    expect(r[2].valore).toBeCloseTo(24, 12);
    expect(r.every((x) => !x.errore)).toBe(true);
  });

  it('correggere un valore a monte propaga a valle', () => {
    const r = ricalcola([voce('area', '5*6'), sequenza[1], sequenza[2]]);
    expect(r[2].valore).toBeCloseTo(36, 12);
  });

  it('una voce non può usare un nome definito dopo di lei', () => {
    const r = ricalcola([voce('peso', 'area*2'), voce('area', '10')]);
    expect(r[0].errore).toContain('area');
    expect(r[1].valore).toBe(10);
  });

  it('nomi duplicati, riservati o malformati non diventano variabili', () => {
    const r = ricalcola([
      voce('area', '2', 'a1'),
      voce('area', '3', 'a2'),
      voce('pi', '3', 'a3'),
      voce('sqrt', '3', 'a4'),
      voce('2cose', '3', 'a5'),
      voce('', '7', 'a6'),
    ]);
    expect(r.map((x) => x.nomeValido)).toEqual([true, false, false, false, false, false]);
    expect(variabili(r)).toMatchObject({ area: 2 });
  });

  it('ans è l’ultimo risultato utile', () => {
    const r = ricalcola([voce('a', '2'), voce('b', '3')]);
    expect(variabili(r).ans).toBe(3);
    expect(valuta('ans+1', variabili(r))).toEqual({ ok: true, valore: 4 });
  });

  it('un errore in una voce non ferma le altre', () => {
    const r = ricalcola([voce('a', '2+'), voce('b', '3')]);
    expect(r[0].errore).not.toBe('');
    expect(r[1].valore).toBe(3);
  });
});

describe('formattazione e testo esteso', () => {
  it('numeri senza zeri inutili', () => {
    expect(formatta(20)).toBe('20');
    expect(formatta(1 / 3)).toBe('0.333333');
    expect(formatta(1234.5678)).toBe('1234.57');
    expect(formatta(NaN)).toBe('—');
    expect(formatta(1e12)).toContain('·10^');
  });

  it('nomi ammessi', () => {
    expect(nomeAmmesso('area_1')).toBe(true);
    expect(nomeAmmesso('γG')).toBe(true);
    expect(nomeAmmesso('1area')).toBe(false);
    expect(nomeAmmesso('area netta')).toBe(false);
    expect(nomeAmmesso('')).toBe(false);
  });

  it('riga estesa nome = operazione = risultato', () => {
    const [r] = ricalcola([{ id: '1', nome: 'area', espressione: '5*4', nota: 'solaio tipo', um: 'm²' }]);
    expect(testoVoce(r)).toBe('area = 5*4 = 20 m²   — solaio tipo');
  });
});
