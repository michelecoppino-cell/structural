import { describe, it, expect } from 'vitest';
import {
  SCHEMI_VINCOLI,
  betaDaModo,
  betaTelaio,
  fattoreDistribuzione,
  modoTelaio,
  schemaVincoli,
} from './libera-inflessione';

describe('schemi di vincolo elementari', () => {
  it('hanno i β teorici della soluzione di Eulero', () => {
    const teorico = (id: string) => schemaVincoli(id)!.teorico;
    expect(teorico('cerniera-cerniera')).toBe(1);
    expect(teorico('incastro-incastro')).toBe(0.5);
    expect(teorico('incastro-cerniera')).toBe(0.7);
    expect(teorico('incastro-incastro-traslante')).toBe(1);
    expect(teorico('mensola')).toBe(2);
  });

  it('il β consigliato non è mai più favorevole del teorico', () => {
    for (const s of SCHEMI_VINCOLI) {
      expect(s.consigliato, s.id).toBeGreaterThanOrEqual(s.teorico);
    }
  });

  it('gli schemi che traslano hanno tutti β ≥ 1', () => {
    for (const s of SCHEMI_VINCOLI.filter((x) => x.traslazione)) {
      expect(s.teorico, s.id).toBeGreaterThanOrEqual(1);
    }
    // e quelli a nodi fissi non lo superano
    for (const s of SCHEMI_VINCOLI.filter((x) => !x.traslazione)) {
      expect(s.teorico, s.id).toBeLessThanOrEqual(1);
    }
  });
});

describe('fattore di distribuzione η', () => {
  it('vale 0 con travi infinitamente rigide e 1 senza travi', () => {
    expect(fattoreDistribuzione(1, Infinity)).toBe(0);
    expect(fattoreDistribuzione(1, 0)).toBe(1);
    // colonna e travi di pari rigidezza: metà per uno
    expect(fattoreDistribuzione(1, 1)).toBe(0.5);
  });

  it('con dati senza senso cade dalla parte severa, cioè η = 1', () => {
    expect(fattoreDistribuzione(-5, 2)).toBe(1);
    expect(fattoreDistribuzione(0, 0)).toBe(1);
  });
});

describe('β delle colonne di telaio — formule di Wood', () => {
  it('agli estremi ritrova i casi elementari', () => {
    // incastri perfetti: 0.5 a nodi fissi, 1.0 a nodi spostabili
    expect(betaTelaio(0, 0, 'fissi')).toBeCloseTo(0.5, 6);
    expect(betaTelaio(0, 0, 'mobili')).toBeCloseTo(1, 6);
    // cerniere: 1.0 a nodi fissi
    expect(betaTelaio(1, 1, 'fissi')).toBeCloseTo(1, 6);
  });

  it('un telaio spostabile su due cerniere è un cinematismo', () => {
    expect(betaTelaio(1, 1, 'mobili')).toBe(Infinity);
  });

  it('i nodi spostabili sono sempre più severi di quelli fissi', () => {
    for (const eta of [0, 0.2, 0.5, 0.8, 0.95]) {
      expect(betaTelaio(eta, eta, 'mobili'), `η = ${eta}`).toBeGreaterThan(
        betaTelaio(eta, eta, 'fissi'),
      );
    }
  });

  it('β cresce al crescere di η, cioè quando le travi si indeboliscono', () => {
    const fissi = [0, 0.25, 0.5, 0.75, 1].map((e) => betaTelaio(e, e, 'fissi'));
    for (let i = 1; i < fissi.length; i++) expect(fissi[i]).toBeGreaterThan(fissi[i - 1]);
    // controllo a mano su η1 = η2 = 0.5:
    //   fissi:  (1 + 0.145 − 0.06625) / (2 − 0.364 − 0.06175) = 1.07875/1.57425
    //   mobili: √[(1 − 0.2 − 0.03) / (1 − 0.8 + 0.15)] = √(0.77/0.35)
    expect(betaTelaio(0.5, 0.5, 'fissi')).toBeCloseTo(1.07875 / 1.57425, 6);
    expect(betaTelaio(0.5, 0.5, 'mobili')).toBeCloseTo(Math.sqrt(0.77 / 0.35), 6);
  });

  it('η fuori dal campo viene riportato dentro invece di dare numeri strani', () => {
    expect(betaTelaio(-1, 0.5, 'fissi')).toBeCloseTo(betaTelaio(0, 0.5, 'fissi'), 9);
    expect(betaTelaio(2, 0.5, 'fissi')).toBeCloseTo(betaTelaio(1, 0.5, 'fissi'), 9);
  });
});

describe('β dal modo scelto', () => {
  it('lo schema dà il valore consigliato, non il teorico', () => {
    expect(betaDaModo('mensola', 9, 0, 0)).toBe(2.1);
    expect(betaDaModo('incastro-incastro', 9, 0, 0)).toBe(0.65);
  });

  it('«manuale» usa il numero scritto', () => {
    expect(betaDaModo('manuale', 1.37, 0, 0)).toBe(1.37);
    // anche un id sconosciuto ricade sul numero, invece di inventarsi uno schema
    expect(betaDaModo('boh', 1.37, 0, 0)).toBe(1.37);
  });

  it('i modi telaio passano dalle formule di Wood', () => {
    expect(betaDaModo('telaio-fissi', 9, 0.3, 0.7)).toBeCloseTo(betaTelaio(0.3, 0.7, 'fissi'), 9);
    expect(betaDaModo('telaio-mobili', 9, 0.3, 0.7)).toBeCloseTo(betaTelaio(0.3, 0.7, 'mobili'), 9);
    expect(modoTelaio('telaio-fissi')).toBe(true);
    expect(modoTelaio('mensola')).toBe(false);
  });
});
