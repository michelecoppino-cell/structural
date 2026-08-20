import { describe, expect, it } from 'vitest';
import {
  STATO_INIZIALE,
  applicaLibreria,
  estraiLibreria,
  inputVerifiche,
  migra,
  reducer,
  type AppState,
} from './store';

const NORMA = {
  id: 'n1',
  sigla: 'CNR-DT 207',
  titolo: 'Azioni del vento',
  url: 'https://esempio.it/207',
  categoria: 'Vento',
  capitoli: [],
};

describe('«Svuota tutto»', () => {
  it('azzera la commessa ma lascia stare la libreria personale', () => {
    const con = applicaLibreria(
      { ...STATO_INIZIALE, progetto: { ...STATO_INIZIALE.progetto, nome: 'Capannone' } },
      {
        schemaVersion: 4,
        aggiornato: '',
        normative: [NORMA],
        unita: ['kN', 'kNm'],
        preimpostate: [{ id: 'p1', nome: 'peso', espressione: 'b*h', nota: '', um: 'kN' }],
        grandezze: [{ id: 'g1', nome: 'q', espressione: '', nota: 'carico', um: 'kN/m', tipo: 'compilabile' }],
      },
    );

    const dopo = reducer(con, { type: 'reset' });

    // la commessa è tornata al foglio bianco…
    expect(dopo.progetto.nome).toBe(STATO_INIZIALE.progetto.nome);
    // …e la libreria è ancora tutta lì
    expect(dopo.normative).toEqual([NORMA]);
    expect(dopo.calcolatrice.unita).toEqual(['kN', 'kNm']);
    expect(dopo.calcolatrice.preimpostate.map((p) => p.id)).toEqual(['p1']);
    expect(dopo.calcolatrice.voci.map((v) => v.nome)).toEqual(['q']);
  });
});

describe('import di un progetto', () => {
  it('scarta gli indirizzi che non sono http(s)', () => {
    const stato = migra({
      normative: [NORMA, { id: 'n2', sigla: 'X', titolo: '', url: 'javascript:alert(1)', categoria: '', capitoli: [] }],
    });
    expect(stato.normative.map((n) => n.id)).toEqual(['n1']);
  });

  it('dà un codice di prezzario vuoto alle voci di costo salvate prima che il campo esistesse', () => {
    const stato = migra({
      // di proposito senza `codice`: è la forma dei file salvati prima del campo
      costi: [
        { id: 'c1', categoria: 'Strutture', descrizione: 'Cls', um: 'm³', quantita: '10', prezzo: '175.00' },
      ] as unknown as AppState['costi'],
    });
    expect(stato.costi).toEqual([
      { id: 'c1', categoria: 'Strutture', codice: '', descrizione: 'Cls', um: 'm³', quantita: '10', prezzo: '175.00' },
    ]);
  });

  it('tiene il codice di prezzario quando il file ce l\'ha', () => {
    const stato = migra({
      costi: [
        {
          id: 'c1',
          categoria: 'Scavi',
          codice: '11.6.CP1.01',
          descrizione: 'Sbancamento',
          um: 'm³',
          quantita: '350',
          prezzo: '9.50',
        },
      ],
    });
    expect(stato.costi[0].codice).toBe('11.6.CP1.01');
  });
});

describe('la fotografia di sincronizzazione vive con la libreria', () => {
  const LIB = { schemaVersion: 4, aggiornato: '', normative: [NORMA], unita: ['kN'], preimpostate: [], grandezze: [] };

  it('si aggiornano nello stesso passaggio', () => {
    const dopo = reducer(STATO_INIZIALE, { type: 'libreria', lib: LIB, base: LIB });
    expect(dopo.normative).toEqual([NORMA]);
    expect(dopo.libreriaBase).toEqual(LIB);
  });

  it('«Svuota tutto» le lascia stare entrambe', () => {
    const con = reducer(STATO_INIZIALE, { type: 'libreria', lib: LIB, base: LIB });
    const dopo = reducer(con, { type: 'reset' });
    expect(dopo.normative).toEqual([NORMA]);
    expect(dopo.libreriaBase).toEqual(LIB);
  });

  /**
   * Il guasto vero, quello che è costato le due norme: la fotografia stava in
   * una chiave di localStorage per conto suo ed è sopravvissuta a uno stato
   * azzerato. Al giro dopo raccontava «queste voci c'erano e ora non ci sono
   * più», e la fusione le cancellava da OneDrive — cioè anche dall'altro
   * dispositivo, dove nessuno le aveva toccate. Uno stato salvato che non
   * porta la fotografia non deve inventarsene una: senza, la fusione somma.
   */
  it('un salvataggio senza fotografia non se ne inventa una', () => {
    expect(migra({ normative: [NORMA] }).libreriaBase).toBeNull();
  });
});

describe('le grandezze nella libreria', () => {
  const lib = (grandezze: AppState['calcolatrice']['voci']) => ({
    schemaVersion: 4,
    aggiornato: '',
    normative: [],
    unita: ['kN'],
    preimpostate: [],
    grandezze,
  });

  it('la libreria porta l’elenco, non i numeri della commessa', () => {
    const stato: AppState = {
      ...STATO_INIZIALE,
      calcolatrice: {
        ...STATO_INIZIALE.calcolatrice,
        voci: [
          { id: 'v-b', nome: 'b', espressione: '0,30', nota: 'base', um: 'm', tipo: 'compilabile' },
          { id: 'v-gc', nome: 'γC', espressione: '25', nota: 'cls', um: 'kN/mc', tipo: 'fissa' },
        ],
      },
    };
    const fuori = estraiLibreria(stato).grandezze;
    // la base della trave è di questa trave: sul file va il nome, non il numero
    expect(fuori[0]).toMatchObject({ nome: 'b', um: 'm', espressione: '' });
    // il peso di volume invece il numero se lo tiene: è lo stesso ovunque
    expect(fuori[1]).toMatchObject({ nome: 'γC', espressione: '25' });
  });

  it('applicarla non svuota quello che si sta scrivendo', () => {
    const stato: AppState = {
      ...STATO_INIZIALE,
      calcolatrice: {
        ...STATO_INIZIALE.calcolatrice,
        voci: [{ id: 'v-b', nome: 'b', espressione: '0,30', nota: 'base', um: 'm', tipo: 'compilabile' }],
      },
    };
    const dopo = applicaLibreria(
      stato,
      lib([{ id: 'v-b', nome: 'b', espressione: '', nota: 'base', um: 'cm', tipo: 'compilabile' }]),
    );
    // l'unità arriva da OneDrive, il valore resta quello scritto qui
    expect(dopo.calcolatrice.voci).toEqual([
      { id: 'v-b', nome: 'b', espressione: '0,30', nota: 'base', um: 'cm', tipo: 'compilabile' },
    ]);
  });

  it('un file vecchio, senza grandezze, lascia stare quelle che ci sono', () => {
    const dopo = applicaLibreria(STATO_INIZIALE, lib([]));
    expect(dopo.calcolatrice.voci).toEqual(STATO_INIZIALE.calcolatrice.voci);
  });
});

describe('estrai e applica', () => {
  it('fanno il giro completo senza perdere niente', () => {
    const lib = { schemaVersion: 4, aggiornato: '', normative: [NORMA], unita: ['kN'], preimpostate: [], grandezze: [] };
    expect(estraiLibreria(applicaLibreria(STATO_INIZIALE, lib))).toMatchObject({
      normative: [NORMA],
      unita: ['kN'],
      preimpostate: [],
    });
  });
});

describe('collegamento del VEd alle Sollecitazioni', () => {
  it('vale anche per la sezione in acciaio, non solo per il calcestruzzo', () => {
    const stato: AppState = {
      ...STATO_INIZIALE,
      verifiche: {
        ...STATO_INIZIALE.verifiche,
        collegaSollecitazioni: true,
        acciaio: { ...STATO_INIZIALE.verifiche.acciaio, VEd: '999' },
      },
    };
    const collegato = inputVerifiche(stato, 42.4);
    expect(collegato.acciaio.VEd).toBe('42.4');
    expect(collegato.taglioNonArmato.VEd).toBe('42.4');

    // scollegato resta il numero scritto a mano
    const libero = inputVerifiche(
      { ...stato, verifiche: { ...stato.verifiche, collegaSollecitazioni: false } },
      42.4,
    );
    expect(libero.acciaio.VEd).toBe('999');
  });
});

describe('migrazione di un progetto senza i dati di stabilità', () => {
  it('riempie la scheda con i valori di serie', () => {
    const vecchio = migra({
      schemaVersion: 7,
      verifiche: { ...STATO_INIZIALE.verifiche, stabilita: undefined },
    } as unknown as Partial<AppState>);
    expect(vecchio.verifiche.stabilita).toEqual(STATO_INIZIALE.verifiche.stabilita);
  });
});
