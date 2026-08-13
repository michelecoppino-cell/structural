import { describe, it, expect } from 'vitest';
import {
  AG_ZONA,
  coefficienteCC,
  coefficienteSS,
  interpolaTR,
  periodoRitorno,
  risolviSito,
} from './sismica';
import { calcolaAzioni, AZIONI_DEFAULT } from './azioni';
import { COMUNI, REGIONI, comuniDi, provinceDi, trovaComune } from '../data/comuni';
import { TR_RETICOLO, parametriSito } from '../data/parametri-sismici';

describe('elenco dei comuni', () => {
  it('copre tutto il territorio nazionale', () => {
    expect(COMUNI.length).toBeGreaterThan(7800);
    expect(REGIONI).toHaveLength(20);
    expect(new Set(COMUNI.map((c) => c.sigla)).size).toBe(107);
  });

  it('ogni comune ha zona sismica valida e coordinate in Italia', () => {
    for (const c of COMUNI) {
      expect(c.zona).toBeGreaterThanOrEqual(1);
      expect(c.zona).toBeLessThanOrEqual(4);
      expect(c.lat).toBeGreaterThan(35);
      expect(c.lat).toBeLessThan(47.5);
      expect(c.lon).toBeGreaterThan(6);
      expect(c.lon).toBeLessThan(19);
    }
  });

  it('la cascata regione → provincia → comune è coerente', () => {
    const province = provinceDi('Abruzzo');
    expect(province.map((p) => p.sigla).sort()).toEqual(['AQ', 'CH', 'PE', 'TE']);
    const aquilano = comuniDi('Abruzzo', 'AQ');
    expect(aquilano.length).toBe(108);
    expect(aquilano.every((c) => c.provincia === "L'Aquila")).toBe(true);
  });

  it('riporta la classificazione DPC vigente', () => {
    expect(trovaComune('Abruzzo', 'AQ', "L'Aquila")?.zona).toBe(1);
    expect(trovaComune('Lombardia', 'MI', 'Milano')?.zona).toBe(3);
    expect(trovaComune('Sardegna', 'CA', 'Cagliari')?.zona).toBe(4);
    // le sottozone regionali restano leggibili, ma pesano come la più severa
    expect(trovaComune('Lazio', 'RM', 'Roma')?.zonaLabel).toBe('2A-3A-3B');
    expect(trovaComune('Lazio', 'RM', 'Roma')?.zona).toBe(2);
  });
});

describe('All. B — parametri di sito dal reticolo', () => {
  it('ogni comune ha i 9 periodi di ritorno', () => {
    for (const c of COMUNI) {
      const p = parametriSito(c.indice);
      expect(p).toBeDefined();
      expect(p!.ag).toHaveLength(TR_RETICOLO.length);
      expect(p!.F0).toHaveLength(TR_RETICOLO.length);
      expect(p!.TCstar).toHaveLength(TR_RETICOLO.length);
    }
  });

  it('i valori sono fisicamente sensati e crescenti con TR', () => {
    for (const c of COMUNI) {
      const p = parametriSito(c.indice)!;
      expect(p.ag[0]).toBeGreaterThan(0);
      expect(p.ag[8]).toBeLessThan(0.9);
      expect(p.ag[8]).toBeGreaterThan(p.ag[0]);
      expect(p.F0.every((v) => v > 2 && v < 3.6)).toBe(true);
      expect(p.TCstar.every((v) => v > 0.1 && v < 0.7)).toBe(true);
    }
  });

  it("ritrova i valori pubblicati per L'Aquila, Milano e Napoli (TR 475)", () => {
    const i475 = TR_RETICOLO.indexOf(475);
    const ag = (regione: string, sigla: string, nome: string) =>
      parametriSito(trovaComune(regione, sigla, nome)!.indice)!.ag[i475];
    expect(ag('Abruzzo', 'AQ', "L'Aquila")).toBeCloseTo(0.261, 3);
    expect(ag('Lombardia', 'MI', 'Milano')).toBeCloseTo(0.05, 3);
    expect(ag('Campania', 'NA', 'Napoli')).toBeCloseTo(0.168, 3);
  });

  it('interpola fra i TR tabellati con legge log-log', () => {
    const v = parametriSito(trovaComune('Abruzzo', 'AQ', "L'Aquila")!.indice)!.ag;
    // sui nodi restituisce il valore tabellato
    TR_RETICOLO.forEach((tr, i) => expect(interpolaTR(v, tr)).toBeCloseTo(v[i], 6));
    // in mezzo resta monotona e dentro l'intervallo
    const mezzo = interpolaTR(v, 712);
    expect(mezzo).toBeGreaterThan(v[6]);
    expect(mezzo).toBeLessThan(v[7]);
    // fuori dal reticolo si resta sui valori estremi
    expect(interpolaTR(v, 5)).toBeCloseTo(v[0], 6);
    expect(interpolaTR(v, 9000)).toBeCloseTo(v[8], 6);
  });
});

describe('§3.2.1 — periodo di ritorno', () => {
  it('VR 50 anni allo SLV dà i canonici 475 anni', () => {
    expect(periodoRitorno(50, 0.1)).toBeCloseTo(475, 0);
  });

  it('gli altri stati limite scalano come da Tab. 3.2.I', () => {
    expect(periodoRitorno(50, 0.81)).toBeCloseTo(30, 0);
    expect(periodoRitorno(50, 0.63)).toBeCloseTo(50, 0);
    expect(periodoRitorno(50, 0.05)).toBeCloseTo(975, 0);
  });
});

describe('parametri del sito scelto', () => {
  it('legge il reticolo per il comune e il TR richiesti', () => {
    const s = risolviSito('Abruzzo', 'AQ', "L'Aquila", 475);
    expect(s.fonte).toBe('reticolo');
    expect(s.ag).toBeCloseTo(0.261, 3);
    expect(s.F0).toBeCloseTo(2.364, 2);
    expect(s.TCstar).toBeCloseTo(0.347, 2);
    expect(s.manuali).toEqual({ ag: false, F0: false, TCstar: false });
  });

  it('i valori inseriti a mano vincono, uno per uno', () => {
    const s = risolviSito('Abruzzo', 'AQ', "L'Aquila", 475, { ag: 0.19, TCstar: 0.28 });
    expect(s.ag).toBe(0.19);
    expect(s.TCstar).toBe(0.28);
    expect(s.F0).toBeCloseTo(2.364, 2); // non forzato: resta quello del reticolo
    expect(s.manuali).toEqual({ ag: true, F0: false, TCstar: true });
    expect(s.nota).toContain('imposti a mano');
  });

  it('senza comune valido ripiega sul limite di zona, dichiarandolo', () => {
    const s = risolviSito('Lombardia', 'MI', 'Comune inesistente', 475);
    expect(s.fonte).toBe('zona');
    expect(s.comune).toBeUndefined();
    expect(s.ag).toBe(AG_ZONA[3]);
    expect(s.nota).toContain('Reticolo non disponibile');
  });
});

describe('Tab. 3.2.IV — amplificazione stratigrafica', () => {
  it('suolo A non amplifica', () => {
    expect(coefficienteSS('A', 0.25, 2.4)).toBe(1);
    expect(coefficienteCC('A', 0.3)).toBe(1);
  });

  it('SS dipende da ag·F0 e resta dentro i limiti di tabella', () => {
    // C: 1.70 − 0.60·F0·ag/g, limitato a 1.00 ÷ 1.50
    expect(coefficienteSS('C', 0.15, 2.4)).toBeCloseTo(1.484, 3);
    expect(coefficienteSS('C', 0.02, 2.4)).toBe(1.5); // limite superiore
    // D: 2.40 − 1.50·F0·ag/g, limitato a 0.90 ÷ 1.80
    expect(coefficienteSS('D', 0.35, 3.0)).toBe(0.9); // limite inferiore
    expect(coefficienteSS('D', 0.02, 2.4)).toBe(1.8);
    // B: 1.40 − 0.40·F0·ag/g, limitato a 1.00 ÷ 1.20
    expect(coefficienteSS('B', 0.261, 2.42)).toBeCloseTo(1.147, 3);
  });

  it('CC cresce al diminuire di TC*', () => {
    expect(coefficienteCC('C', 0.35)).toBeCloseTo(1.485, 3);
    expect(coefficienteCC('C', 0.28)).toBeGreaterThan(coefficienteCC('C', 0.35));
  });
});

describe('spettro di progetto con i default della scheda', () => {
  const r = calcolaAzioni(AZIONI_DEFAULT).sisma;

  it('parte da Fagagna (UD), suolo C, SLV', () => {
    expect(r.sito).toBe('Fagagna (UD)');
    expect(r.zona).toBe(2);
    expect(r.fonte).toBe('reticolo');
    expect(r.VR).toBe(50);
    expect(r.TR).toBeCloseTo(475, 0);
    expect(r.ag).toBeCloseTo(0.217, 3);
  });

  it('S = SS·ST e Sd = ag·S·F0/q', () => {
    expect(r.Ss).toBeCloseTo(1.7 - 0.6 * r.F0 * r.ag, 6);
    expect(r.S).toBeCloseTo(r.Ss * r.St, 6);
    expect(r.Sd).toBeCloseTo((r.ag * r.S * r.F0) / r.q, 6);
  });

  it('periodi caratteristici — eq. 3.2.5 ÷ 3.2.7', () => {
    expect(r.TC).toBeCloseTo(r.Cc * r.TCstar, 6);
    expect(r.TB).toBeCloseTo(r.TC / 3, 6);
    expect(r.TD).toBeCloseTo(4 * r.ag + 1.6, 6);
  });

  it('il quadro dei quattro stati limite è ordinato per severità', () => {
    const [slo, sld, slv, slc] = r.statiLimite;
    expect([slo.id, sld.id, slv.id, slc.id]).toEqual(['SLO', 'SLD', 'SLV', 'SLC']);
    expect(slo.TR).toBeLessThan(sld.TR);
    expect(sld.TR).toBeLessThan(slv.TR);
    expect(slv.TR).toBeLessThan(slc.TR);
    expect(slo.ag).toBeLessThan(slc.ag);
  });

  it('cambiando stato limite cambiano TR e ag', () => {
    const slc = calcolaAzioni({ ...AZIONI_DEFAULT, sl: 'SLC' }).sisma;
    expect(slc.TR).toBeCloseTo(975, 0);
    expect(slc.ag).toBeGreaterThan(r.ag);
  });

  it('classe d’uso e vita nominale spostano il periodo di ritorno', () => {
    const scuola = calcolaAzioni({ ...AZIONI_DEFAULT, cu: 'III (affollata) — 1.5' }).sisma;
    expect(scuola.VR).toBe(75);
    expect(scuola.TR).toBeCloseTo(712, 0);
    expect(scuola.ag).toBeGreaterThan(r.ag);
  });
});
