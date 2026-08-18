import { describe, expect, it } from 'vitest';
import {
  fondiLibrerie,
  leggiLibreria,
  libreriaVuota,
  perditeIngiustificate,
  stessoContenuto,
  type Libreria,
} from './libreria';

const norma = (id: string, sigla = id) => ({ id, sigla, titolo: '', url: `https://esempio.it/${id}`, capitoli: [] });

function lib(patch: Partial<Libreria>): Libreria {
  return { ...libreriaVuota(), ...patch };
}

describe('lettura del file su OneDrive', () => {
  it('tiene solo le voci con un indirizzo http(s)', () => {
    const l = leggiLibreria({
      normative: [
        norma('a'),
        { id: 'b', sigla: 'B', titolo: '', url: 'javascript:alert(1)' },
        { id: 'c', sigla: 'C', titolo: '' },
      ],
    });
    expect(l.normative.map((n) => n.id)).toEqual(['a']);
  });

  it('regge un file vuoto, corrotto o di un’altro formato', () => {
    expect(leggiLibreria(null).normative).toEqual([]);
    expect(leggiLibreria({ normative: 'niente', unita: 3 }).unita).toEqual([]);
  });
});

describe('fusione a tre vie', () => {
  it('senza base somma le due parti, senza perdere niente', () => {
    const out = fondiLibrerie(lib({ normative: [norma('a')] }), lib({ normative: [norma('b')] }), null);
    expect(out.normative.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('porta qui le voci aggiunte sull’altro dispositivo', () => {
    const base = lib({ normative: [norma('a')] });
    const out = fondiLibrerie(base, lib({ normative: [norma('a'), norma('b')] }), base);
    expect(out.normative.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('non fa tornare una voce cancellata qui', () => {
    const base = lib({ normative: [norma('a'), norma('b')] });
    const out = fondiLibrerie(lib({ normative: [norma('a')] }), base, base);
    expect(out.normative.map((n) => n.id)).toEqual(['a']);
  });

  it('toglie anche qui una voce cancellata sull’altro dispositivo', () => {
    const base = lib({ normative: [norma('a'), norma('b')] });
    const out = fondiLibrerie(base, lib({ normative: [norma('a')] }), base);
    expect(out.normative.map((n) => n.id)).toEqual(['a']);
  });

  it('sulla stessa voce modificata da entrambe le parti vince questo dispositivo', () => {
    const base = lib({ normative: [norma('a', 'vecchia')] });
    const out = fondiLibrerie(
      lib({ normative: [norma('a', 'qui')] }),
      lib({ normative: [norma('a', 'altrove')] }),
      base,
    );
    expect(out.normative).toEqual([norma('a', 'qui')]);
  });

  it('vale anche per le unità, che sono stringhe e non oggetti', () => {
    const base = lib({ unita: ['kN', 'm'] });
    const out = fondiLibrerie(lib({ unita: ['kN'] }), lib({ unita: ['kN', 'm', 'kNm'] }), base);
    expect(out.unita).toEqual(['kN', 'kNm']);
  });

  it('la data di scrittura non conta nel confronto del contenuto', () => {
    const a = lib({ normative: [norma('a')], aggiornato: '2026-01-01T00:00:00.000Z' });
    const b = lib({ normative: [norma('a')], aggiornato: '2026-08-18T00:00:00.000Z' });
    expect(stessoContenuto(a, b)).toBe(true);
  });
});

describe('rete di protezione prima di scrivere', () => {
  it('una cancellazione vera non è una perdita', () => {
    const base = lib({ normative: [norma('a'), norma('b')] });
    const fusa = lib({ normative: [norma('a')] });   // «b» cancellata sul dispositivo
    expect(perditeIngiustificate(base, fusa, base)).toEqual([]);
  });

  it('una voce che sparisce senza essere stata cancellata viene segnalata', () => {
    const remoto = lib({ normative: [norma('a'), norma('b')] });
    const fusa = lib({ normative: [norma('a')] });
    // nessuna fotografia: nessuno può aver cancellato «b», quindi è un guasto
    expect(perditeIngiustificate(remoto, fusa, null)).toEqual(['b']);
  });

  it('vale anche per unità e formule', () => {
    const remoto = lib({ unita: ['kN', 'kNm'], preimpostate: [{ id: 'p1', nome: 'M', espressione: 'q*l', nota: '', um: '' }] });
    expect(perditeIngiustificate(remoto, libreriaVuota(), null)).toEqual(['kN', 'kNm', 'M']);
  });

  it('il caso che è costato le norme: remoto pieno, locale vuoto, nessuna fotografia', () => {
    const remoto = lib({ normative: [norma('a'), norma('b')], unita: ['kN'] });
    const fusa = fondiLibrerie(libreriaVuota(), remoto, null);
    // la fusione somma, quindi non perde niente — e la rete lo conferma
    expect(fusa.normative.map((n) => n.id)).toEqual(['a', 'b']);
    expect(perditeIngiustificate(remoto, fusa, null)).toEqual([]);
  });
});
