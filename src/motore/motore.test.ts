import { describe, it, expect } from 'vitest';
import {
  aggiungiAlQuaderno,
  apriProgetto,
  calcolaRighe,
  datiSezione,
  esiti,
  foglio,
  jsonProgetto,
  modifica,
  numeriChiave,
  progettoNuovo,
  relazione,
  riepilogo,
} from './index';
import { calcola, migra, STATO_INIZIALE } from '../state/stato';
import { calcolaAzioni } from '../calc/azioni';
import { testoRelazione } from '../calc/relazione';
import { libreriaVuota } from '../cloud/libreria';

describe('aprire un progetto', () => {
  it('rilegge il JSON di «Esporta JSON» com’era', () => {
    const s = modifica(progettoNuovo(), { azioni: { comune: 'Udine' }, flessioneCA: { MEd: '210' } }).stato;
    const riaperto = apriProgetto(jsonProgetto(s));
    expect(riaperto).toEqual(migra(JSON.parse(jsonProgetto(s))));
    expect(riaperto.azioni.comune).toBe('Udine');
    expect(riaperto.verifiche.flessioneCA.MEd).toBe('210');
  });

  it('rifiuta quello che non è un progetto, invece di aprirlo come uno di serie', () => {
    expect(() => apriProgetto('non json')).toThrow(/JSON valido/);
    expect(() => apriProgetto('[1,2]')).toThrow(/non è un progetto/);
    expect(() => apriProgetto({ ciao: 1 })).toThrow(/non è un progetto/);
  });

  it('dà gli stessi numeri e lo stesso testo delle schede', () => {
    const s = progettoNuovo();
    expect(relazione(s, 'azioni')).toBe(testoRelazione(s, 'azioni'));
    expect(calcola(s).azioni).toEqual(calcolaAzioni(s.azioni));
  });
});

describe('modificare', () => {
  it('trova regione e provincia dal comune, e aggiorna la località come la scheda Azioni', () => {
    const { stato, cambi } = modifica(progettoNuovo(), { azioni: { comune: 'tolmezzo' } });
    expect(stato.azioni).toMatchObject({ comune: 'Tolmezzo', prov: 'UD', regione: 'Friuli-Venezia Giulia' });
    expect(stato.progetto.localita).toBe('Tolmezzo (UD)');
    expect(cambi.map((c) => c.campo)).toContain('azioni.comune');
  });

  it('un comune che ha omonimi chiede la provincia invece di sceglierne uno', () => {
    // «Castro» c'è sia in provincia di Bergamo sia di Lecce
    expect(() => modifica(progettoNuovo(), { azioni: { comune: 'Castro' } })).toThrow(/aggiungi «prov»/);
    expect(modifica(progettoNuovo(), { azioni: { comune: 'Castro', prov: 'LE' } }).stato.azioni.prov).toBe('LE');
  });

  it('accetta la sigla di una scelta quando ne indica una sola', () => {
    const { stato } = modifica(progettoNuovo(), { azioni: { zneve: 'III', cat: 'C2' }, flessioneCA: { cls: 'c32/40' } });
    expect(stato.azioni.zneve).toMatch(/^III — /);
    expect(stato.azioni.cat).toMatch(/^C2 — /);
    expect(stato.verifiche.flessioneCA.cls).toBe('C32/40');
  });

  it('rifiuta tutto se una scelta non è in elenco: il motore ripiegherebbe in silenzio su quella di serie', () => {
    const prima = progettoNuovo();
    expect(() => modifica(prima, { azioni: { suolo: 'B', zneve: 'Z' }, sollecitazioni: { boh: '1' } })).toThrow(
      /zneve[\s\S]*boh/,
    );
    expect(prima.azioni.suolo).toBe(STATO_INIZIALE.azioni.suolo);
  });

  it('controlla la taglia contro il tipo di profilo', () => {
    expect(() => modifica(progettoNuovo(), { 'verifiche.acciaio': { tipoProfilo: 'HEA', profilo: 'IPE 200' } })).toThrow(
      /taglia HEA/,
    );
    const ok = modifica(progettoNuovo(), { acciaio: { tipoProfilo: 'HEA', profilo: '200' } }).stato;
    expect(ok.verifiche.acciaio.profilo).toBe('HEA 200');
  });

  it('scrive le grandezze del Quaderno per nome', () => {
    const { stato } = modifica(progettoNuovo(), { grandezze: { b: '0,30', k: '2' } });
    const g = datiSezione(stato, 'grandezze').dati;
    expect(g.b).toMatch(/0[.,]3/);
    expect(g.k).toBeDefined();
  });

  it('il collegamento del taglio passa: VEd delle verifiche viene dalle Sollecitazioni', () => {
    const s = modifica(progettoNuovo(), { sollecitazioni: { L: '8' } }).stato;
    const c = calcola(s);
    expect(c.taglioArmato.esito.sfruttamento).toBeGreaterThan(0);
    expect(esiti(s).map((e) => e.verifica)).toContain('Flessione c.a.');
  });
});

describe('il Quaderno', () => {
  it('aggiunge righe, titoli e note in coda, e i nomi si vedono fra loro', () => {
    const { stato, nuove } = aggiungiAlQuaderno(progettoNuovo(), {
      righe: '# Trave di prova\nq = 25 [kN/m]\nl = 6 [m]\nM = q*l^2/8 [kNm]  # mezzeria\n> verificare la luce in cantiere',
    });
    expect(stato.quaderno.blocchi.map((b) => b.tipo)).toEqual(['linea', 'formula', 'formula', 'formula', 'nota']);
    const m = nuove.find((r) => r.nome === 'M')!;
    expect(m.valore).toBeCloseTo(112.5, 6);
    expect(m.testo).toContain('q*l^2/8');
    expect(m.nota).toContain('mezzeria');
  });

  it('un capitolo entra come blocco, e il foglio lo mostra', () => {
    const { stato } = aggiungiAlQuaderno(progettoNuovo(), { capitoli: ['azioni'] });
    expect(foglio(stato)[0]).toMatchObject({ tipo: 'capitolo', testo: 'Azioni' });
    expect(relazione(stato)).toContain('AZIONI');
  });
});

describe('calcolo libero', () => {
  it('converte le unità come il Quaderno', () => {
    const r = calcolaRighe('b = 30 [cm]\nh = 50 [cm]\nW = b*h^2/6 [cmc]');
    expect(r[2].valore).toBeCloseTo(12500, 6);
    expect(r[2].errore).toBe('');
  });

  it('con un progetto vede i numeri delle schede', () => {
    const s = progettoNuovo();
    const mmax = numeriChiave(s).find((n) => n.nome === 'Mmax')!;
    const r = calcolaRighe('M2 = 2*Mmax [kNm]', { stato: s });
    // il risultato della scheda entra come import davanti alla riga che lo usa
    expect(r[0].nome).toBe('Mmax');
    expect(r[1].valore).toBeCloseTo(2 * mmax.valore, 6);
  });

  it('una costante della libreria si usa, e ridefinirla si dice', () => {
    const lib = { ...libreriaVuota(), grandezze: [{ id: 'g', nome: 'γC', espressione: '25', nota: '', um: 'kN/mc', tipo: 'fissa' as const }] };
    const usa = calcolaRighe('P = 0.3*0.5*γC [kN/m]', { libreria: lib });
    expect(usa[0].valore).toBeCloseTo(3.75, 6);
    const rid = calcolaRighe('γC = 24 [kN/mc]\nP = 0.3*0.5*γC [kN/m]', { libreria: lib });
    expect(rid[0].ridefinisce).toBe('γC');
    expect(rid[1].valore).toBeCloseTo(3.6, 6);
  });

  it('una grandezza che manca è un errore con il suo nome', () => {
    const r = calcolaRighe('M = q*l^2/8');
    expect(r[0].errore).not.toBe('');
  });
});

describe('riepilogo', () => {
  it('dice il sito, i numeri chiave e gli esiti', () => {
    const r = riepilogo(progettoNuovo());
    expect(r.sito).toContain('Fagagna');
    expect(r.numeri.some((n) => n.nome === 'Mmax')).toBe(true);
    expect(r.esiti.length).toBeGreaterThan(0);
  });
});
