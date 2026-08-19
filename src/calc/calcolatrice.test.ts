import { describe, it, expect } from 'vitest';
import {
  PREIMPOSTATE_DEFAULT,
  SELEZIONI_DEFAULT,
  VOCI_DEFAULT,
  formatta,
  formattaIn,
  formattaRisultato,
  haOperazioni,
  nomeAmmesso,
  nomiMancanti,
  nomiRichiesti,
  normalizzaVoci,
  ricalcola,
  svuotaCompilabili,
  testoVoce,
  valuta,
  valutaConUnita,
  variabili,
  vociDaSelezioni,
  type VoceCalcolo,
} from './calcolatrice';
import { daBase } from './unita';
import { HEA, IPE } from '../data/profili-acciaio';

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

describe('grandezze di partenza', () => {
  it('i pesi di volume arrivano già compilati, le lunghezze no', () => {
    const r = ricalcola(VOCI_DEFAULT);
    const v = Object.fromEntries(r.map((x) => [x.nome, x]));
    expect(v['γC'].valore).toBe(25);
    expect(v['γS'].valore).toBe(78.5);
    expect(v['γT'].valore).toBe(18);
    expect(v['b'].espressione).toBe('');
    expect(v['b'].errore).toBe('');
    // la γ greca è un nome ammesso a tutti gli effetti
    expect(r.every((x) => x.nomeValido)).toBe(true);
  });

  it('la γ si può richiamare in un’espressione', () => {
    const vars = variabili(ricalcola(VOCI_DEFAULT));
    // i valori girano in unità base: γC scritto 25 kN/mc vale 25000 N/mc, così
    // il peso per metro viene in N/m e si legge in kN/m senza fattori a mano
    const e = valuta('0,3*0,5*γC', vars);
    expect(e.ok && e.valore).toBe(3750);
    expect(daBase(3750, 'kN/m')).toBeCloseTo(3.75, 9);
  });

  it('la γ si scrive anche con la g latina, per esteso o no', () => {
    const vars = variabili(ricalcola(VOCI_DEFAULT));
    expect(valuta('gC', vars)).toEqual({ ok: true, valore: 25000 });
    expect(valuta('gammaC', vars)).toEqual({ ok: true, valore: 25000 });
    expect(valuta('gs', vars)).toEqual({ ok: true, valore: 78500 });
    // un nome che non esiste resta un errore, non diventa una γ qualsiasi
    expect(valuta('gZ', vars).ok).toBe(false);
    // e il nome vero, se c'è, ha comunque la precedenza sull'alias
    expect(valuta('gC', { ...vars, gC: 1 })).toEqual({ ok: true, valore: 1 });
  });

  it('anche il conto dei nomi mancanti conosce la g latina', () => {
    const vars = variabili(ricalcola(VOCI_DEFAULT));
    expect(nomiMancanti('b*h*gC', vars)).toEqual(['b', 'h']);
  });
});

describe('colonne e migrazione delle voci', () => {
  it('svuota solo le grandezze compilabili', () => {
    const voci = svuotaCompilabili([
      { id: '1', nome: 'b', espressione: '0.3', nota: '', um: 'm', tipo: 'compilabile' },
      { id: '2', nome: 'γC', espressione: '25', nota: '', um: 'kN/mc', tipo: 'fissa' },
      { id: '3', nome: 'A', espressione: 'b*h', nota: '', um: 'mq', tipo: 'operazione' },
    ]);
    expect(voci.map((v) => v.espressione)).toEqual(['', '25', 'b*h']);
  });

  it('porta i nomi vecchi su quelli nuovi, formule comprese', () => {
    const voci = normalizzaVoci([
      { id: '1', nome: 'gCLS', espressione: '', nota: '', um: 'kN/mc' },
      { id: '2', nome: 'γCLS', espressione: '25', nota: '', um: 'kN/mc' },
      { id: '3', nome: 'P', espressione: 'b*h*γCLS', nota: '', um: 'kN/m' },
    ]);
    // il doppione con la g latina sparisce, il γ resta con il nome nuovo
    expect(voci.map((v) => v.nome)).toEqual(['γC', 'P']);
    expect(voci[1].espressione).toBe('b*h*γC');
  });

  it('deduce la colonna delle voci salvate prima che esistesse', () => {
    const voci = normalizzaVoci([
      { id: '1', nome: 'γMUR', espressione: '18' },
      { id: '2', nome: 'b', espressione: '0,3' },
      { id: '3', nome: 'A', espressione: 'b*h' },
    ]);
    expect(voci.map((v) => v.tipo)).toEqual(['fissa', 'compilabile', 'operazione']);
  });
});

describe('operazioni preimpostate', () => {
  it('dice quali nomi servono, saltando funzioni e costanti', () => {
    expect(nomiRichiesti('q*l^2/8')).toEqual(['q', 'l']);
    expect(nomiRichiesti('sqrt(2)*pi*r')).toEqual(['r']);
    expect(nomiRichiesti('3+4')).toEqual([]);
    // quello che non si riesce nemmeno a leggere non ha nomi da chiedere
    expect(nomiRichiesti('2 + @')).toEqual([]);
  });

  it('dice quali nomi mancano fra quelli disponibili', () => {
    expect(nomiMancanti('q*l^2/8', { q: 10 })).toEqual(['l']);
    expect(nomiMancanti('q*l^2/8', { q: 10, l: 5 })).toEqual([]);
  });

  it('le formule di serie si calcolano con le grandezze compilate', () => {
    const voci = ricalcola([
      ...VOCI_DEFAULT.map((v) =>
        v.nome === 'q' ? { ...v, espressione: '10' } : v.nome === 'l' ? { ...v, espressione: '5' } : v,
      ),
    ]);
    const vars = variabili(voci);
    const m = PREIMPOSTATE_DEFAULT.find((p) => p.id === 'pre-m-app')!;
    expect(nomiMancanti(m.espressione, vars)).toEqual([]);
    const esito = valutaConUnita(m.espressione, vars);
    // q = 10 kN/m e l = 5 m danno 31250 Nm, cioè i 31,25 kNm di sempre
    expect(esito.ok && esito.valore).toBeCloseTo(31250, 6);
    expect(daBase(31250, 'kNm')).toBeCloseTo(31.25, 9);
  });

  it('una formula con grandezze non compilate resta in attesa', () => {
    const vars = variabili(ricalcola(VOCI_DEFAULT));
    const w = PREIMPOSTATE_DEFAULT.find((p) => p.id === 'pre-w')!;
    expect(nomiMancanti(w.espressione, vars)).toEqual(['b', 'h']);
  });
});

describe('grandezze fisse scelte dalla libreria', () => {
  it('senza scelte non genera niente', () => {
    expect(vociDaSelezioni(SELEZIONI_DEFAULT)).toEqual([]);
  });

  it('il calcestruzzo dà fck, fcd, fctm, fctd ed Ecm con i coefficienti di serie', () => {
    const g = vociDaSelezioni({ ...SELEZIONI_DEFAULT, cls: 'C25/30' });
    const val = (n: string) => Number(g.find((x) => x.nome === n)?.espressione);
    expect(g.map((x) => x.nome)).toEqual(['fck', 'fcd', 'fctm', 'fctd', 'Ecm']);
    expect(val('fck')).toBe(25);
    expect(val('fcd')).toBeCloseTo((0.85 * 25) / 1.5, 2);
    expect(val('fctm')).toBeCloseTo(0.3 * 25 ** (2 / 3), 2);
    expect(val('fctd')).toBeCloseTo((0.7 * 0.3 * 25 ** (2 / 3)) / 1.5, 2);
    expect(val('Ecm')).toBeCloseTo(31476, 0);
    // i coefficienti parziali non compaiono come grandezze
    expect(g.some((x) => /γ|alfa/i.test(x.nome))).toBe(false);
  });

  it('l’acciaio dà solo fyd e ftd, con i γ della sua famiglia', () => {
    const carp = vociDaSelezioni({ ...SELEZIONI_DEFAULT, acciaio: 'S275' });
    expect(carp.map((x) => x.nome)).toEqual(['fyd', 'ftd']);
    expect(Number(carp[0].espressione)).toBeCloseTo(275 / 1.05, 2);
    expect(Number(carp[1].espressione)).toBeCloseTo(430 / 1.25, 2);

    const bul = vociDaSelezioni({ ...SELEZIONI_DEFAULT, acciaio: '8.8' });
    expect(Number(bul[0].espressione)).toBeCloseTo(640 / 1.25, 2);
    expect(Number(bul[1].espressione)).toBeCloseTo(800 / 1.25, 2);
  });

  it('ferri e bulloni compilano le aree solo se c’è la quantità', () => {
    expect(vociDaSelezioni({ ...SELEZIONI_DEFAULT, barraFi: '16' })).toEqual([]);
    const ferri = vociDaSelezioni({ ...SELEZIONI_DEFAULT, barraFi: '16', barraN: '4' });
    expect(ferri[0].nome).toBe('Ar');
    expect(Number(ferri[0].espressione)).toBeCloseTo(4 * 201.1, 1);
    expect(ferri[0].um).toBe('mmq');

    const bulloni = vociDaSelezioni({ ...SELEZIONI_DEFAULT, bulloneM: 'M12', bulloneN: '2' });
    expect(bulloni.map((x) => x.nome)).toEqual(['Ab', 'Abl']);
    expect(Number(bulloni[0].espressione)).toBeCloseTo(2 * 84.3, 1);
    expect(Number(bulloni[1].espressione)).toBeCloseTo(2 * 113.1, 1);
  });

  it('il profilo del sagomario dà area, inerzie e moduli dei due assi', () => {
    // senza taglia non c'è profilo: il tipo di serie da solo non genera niente
    expect(vociDaSelezioni({ ...SELEZIONI_DEFAULT, profiloTipo: 'IPE' })).toEqual([]);

    const g = vociDaSelezioni({ ...SELEZIONI_DEFAULT, profiloTipo: 'IPE', profiloTaglia: 'IPE 200' });
    expect(g.map((x) => x.nome)).toEqual(['Ap', 'Ix', 'Wx', 'Iy', 'Wy', 'Avz', 'hp', 'bp']);
    const p = IPE['IPE 200'];
    const val = (n: string) => Number(g.find((x) => x.nome === n)?.espressione);
    expect(val('Ap')).toBeCloseTo(p.A, 2);
    expect(val('Ix')).toBeCloseTo(p.Ix, 0);
    expect(val('Wx')).toBeCloseTo(p.Wx, 1);
    expect(val('hp')).toBeCloseTo(200, 1);
    expect(g.map((x) => x.um)).toEqual(['cmq', 'cm^4', 'cmc', 'cm^4', 'cmc', 'cmq', 'mm', 'mm']);
    // sono costanti di tabella, non grandezze da compilare
    expect(g.every((x) => x.tipo === 'fissa')).toBe(true);
  });

  it('inerzia e modulo del profilo entrano nelle formule con la loro unità', () => {
    const generate = vociDaSelezioni({ ...SELEZIONI_DEFAULT, profiloTipo: 'HEA', profiloTaglia: 'HEA 200' });
    const voci = ricalcola([
      ...generate,
      { id: 'm', nome: 'M', espressione: '100', nota: '', um: 'kNm', tipo: 'compilabile' },
      { id: 's', nome: 'σ', espressione: 'M/Wx', nota: '', um: 'MPa', tipo: 'operazione' },
    ]);
    const sigma = voci[voci.length - 1];
    expect(sigma.errore).toBe('');
    // 100 kNm su Wx in cm³ fa una tensione, letta in MPa senza conversioni a mano
    expect(sigma.valore).toBeCloseTo(100e6 / (HEA['HEA 200'].Wx * 1000), 0);
    expect(sigma.umEffettiva).toBe('MPa');
  });

  it('le grandezze generate si richiamano per nome nelle formule', () => {
    const generate = vociDaSelezioni({ ...SELEZIONI_DEFAULT, cls: 'C25/30', barraFi: '16', barraN: '4' });
    const voci = ricalcola([
      ...generate,
      { id: 'x', nome: 'N', espressione: 'Ar*fcd', nota: '', um: '', tipo: 'operazione' },
    ]);
    const N = voci[voci.length - 1];
    expect(N.errore).toBe('');
    // Ar in mmq per fcd in MPa fa una forza: prima veniva il numero grezzo,
    // ora vengono i newton — e si leggono in kN senza scriverlo
    expect(N.valoreBase).toBeCloseTo(4 * 201.1 * ((0.85 * 25) / 1.5), -1);
    expect(N.umEffettiva).toBe('kN');
    expect(N.valore).toBeCloseTo(11.4, 1);
  });
});

describe('definizione o formula', () => {
  it('un numero scritto e basta non è un\u2019operazione', () => {
    for (const e of ['0,3', '0.30', '-3', '+4', '1e3', '(80)', '50%', '  12  ']) {
      expect(haOperazioni(e), e).toBe(false);
    }
  });

  it('appena compare un\u2019operazione la riga diventa una formula', () => {
    for (const e of ['b*h', '2+3', 'q*l^2/8', 'sqrt(2)', '2(3+4)', 'b', '-b', '3*2%']) {
      expect(haOperazioni(e), e).toBe(true);
    }
  });

  it('un\u2019espressione illeggibile è una formula, non un numero', () => {
    expect(haOperazioni('3 §')).toBe(true);
  });

  it('una riga vuota non è né l\u2019una né l\u2019altra', () => {
    expect(haOperazioni('')).toBe(false);
    expect(haOperazioni('   ')).toBe(false);
  });

  it('testoVoce non ripete il numero di una definizione', () => {
    const voci = ricalcola([
      { id: 'b', nome: 'b', espressione: '0,3', nota: '', um: 'm', tipo: 'compilabile' },
      { id: 'h', nome: 'h', espressione: '0,5', nota: '', um: 'm', tipo: 'compilabile' },
      { id: 'a', nome: 'A', espressione: 'b*h', nota: '', um: 'mq', tipo: 'operazione' },
    ]);
    expect(testoVoce(voci[0])).toBe('b = 0.3 m');
    expect(testoVoce(voci[2])).toBe('A = b*h = 0.15 mq');
  });
});

describe('il risultato di una formula si legge con una cifra dopo la virgola', () => {
  it('arrotonda alla prima cifra e non lascia lo zero in coda', () => {
    expect(formattaRisultato(0.0855)).toBe('0.1');
    expect(formattaRisultato(12.3456)).toBe('12.3');
    expect(formattaRisultato(12)).toBe('12');
    expect(formattaRisultato(-3.28)).toBe('-3.3');
  });

  it('un numero che diventerebbe zero tiene le sue cifre significative', () => {
    expect(formattaRisultato(0.00042)).toBe('0.00042');
    expect(formattaRisultato(0)).toBe('0');
  });

  it('i numeri enormi restano in notazione scientifica', () => {
    expect(formattaRisultato(2.5e10)).toBe('2.5000·10^+10');
  });

  it('le percentuali non cambiano: restano il semaforo di prima', () => {
    expect(formattaIn(66.68238, '%')).toBe('66.7');
    expect(formattaIn(0.0855, 'mq')).toBe('0.1');
  });
});
