import { describe, expect, it } from 'vitest';
import { STATO_INIZIALE, applicaLibreria, estraiLibreria, migra, reducer } from './store';

const NORMA = { id: 'n1', sigla: 'CNR-DT 207', titolo: 'Azioni del vento', url: 'https://esempio.it/207' };

describe('«Svuota tutto»', () => {
  it('azzera la commessa ma lascia stare la libreria personale', () => {
    const con = applicaLibreria(
      { ...STATO_INIZIALE, progetto: { ...STATO_INIZIALE.progetto, nome: 'Capannone' } },
      { schemaVersion: 1, aggiornato: '', normative: [NORMA], unita: ['kN', 'kNm'], preimpostate: [{ id: 'p1', nome: 'peso', espressione: 'b*h', nota: '', um: 'kN' }] },
    );

    const dopo = reducer(con, { type: 'reset' });

    // la commessa è tornata al foglio bianco…
    expect(dopo.progetto.nome).toBe(STATO_INIZIALE.progetto.nome);
    // …e la libreria è ancora tutta lì
    expect(dopo.normative).toEqual([NORMA]);
    expect(dopo.calcolatrice.unita).toEqual(['kN', 'kNm']);
    expect(dopo.calcolatrice.preimpostate.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('import di un progetto', () => {
  it('scarta gli indirizzi che non sono http(s)', () => {
    const stato = migra({
      normative: [NORMA, { id: 'n2', sigla: 'X', titolo: '', url: 'javascript:alert(1)' }],
    });
    expect(stato.normative.map((n) => n.id)).toEqual(['n1']);
  });
});

describe('estrai e applica', () => {
  it('fanno il giro completo senza perdere niente', () => {
    const lib = { schemaVersion: 1, aggiornato: '', normative: [NORMA], unita: ['kN'], preimpostate: [] };
    expect(estraiLibreria(applicaLibreria(STATO_INIZIALE, lib))).toMatchObject({
      normative: [NORMA],
      unita: ['kN'],
      preimpostate: [],
    });
  });
});
