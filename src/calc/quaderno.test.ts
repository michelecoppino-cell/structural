import { describe, it, expect } from 'vitest';
import {
  COLONNE_FOGLIO,
  LARGHEZZA_MIN,
  colonneBlocco,
  colonneValide,
  larghezzaValida,
  livelloEsito,
  normalizzaBlocchi,
  nuovoBlocco,
  ricalcolaQuaderno,
  SALTO_MAX,
  saltoValido,
  spanBlocco,
  testoBlocco,
  type BloccoQuaderno,
  type ImportoScheda,
  type Sorgenti,
} from './quaderno';
import { ricalcola, type Preimpostata, type VoceCalcolo } from './calcolatrice';
import { UNITA_DEFAULT } from './unita';
import { SCHEMA_VERSION, migra, type AppState } from '../state/store';

const voce = (nome: string, espressione: string, um = ''): VoceCalcolo => ({
  id: `v-${nome}`,
  nome,
  espressione,
  nota: '',
  um,
  tipo: 'compilabile',
});

const FORMULE: Preimpostata[] = [
  { id: 'f-area', nome: 'A', espressione: 'b*h', nota: 'area', um: 'mq' },
  { id: 'f-m', nome: 'M', espressione: 'q*l^2/8', nota: 'momento in mezzeria', um: 'kNm' },
  { id: 'f-w', nome: 'W', espressione: 'b*h^2/6', nota: 'modulo di resistenza', um: 'cmc' },
];

const IMPORTI: ImportoScheda[] = [
  { id: 'i-v', nome: 'Vmax', etichetta: 'V max', scheda: 'Sollecitazioni', valore: 18, um: 'kN' },
  {
    id: 'i-esito',
    nome: '',
    etichetta: 'Esito taglio',
    scheda: 'Verifiche',
    valore: NaN,
    um: '',
    testo: 'verificato (62%)',
  },
];

/** Le sorgenti di un quaderno: le grandezze del pannello e le formule. */
function sorgenti(voci: VoceCalcolo[]): Sorgenti {
  return {
    voci: ricalcola(voci, UNITA_DEFAULT),
    preimpostate: FORMULE,
    importi: IMPORTI,
    elenco: UNITA_DEFAULT,
  };
}

const TRAVE = [voce('b', '0,3', 'm'), voce('h', '0,5', 'm'), voce('q', '12', 'kN/m'), voce('l', '5', 'm')];

describe('blocchi del quaderno', () => {
  it('una grandezza trascinata mostra il suo valore e resta collegata', () => {
    const [b] = ricalcolaQuaderno([nuovoBlocco('valore', { fonte: 'v-b' })], sorgenti(TRAVE));
    expect(b.nome).toBe('b');
    expect(b.valore).toBeCloseTo(0.3, 9);
    expect(b.um).toBe('m');
    expect(b.collegato).toBe(true);
    // una grandezza scritta come numero è una definizione: niente secondo uguale
    expect(testoBlocco(b)).toBe('b = 0.3 m');
  });

  it('una grandezza calcolata tiene la formula prima del risultato', () => {
    const voci = [...TRAVE, voce('A', 'b*h', 'mq')];
    const [b] = ricalcolaQuaderno([nuovoBlocco('valore', { fonte: 'v-A' })], sorgenti(voci));
    // il risultato si legge con una cifra dopo la virgola: 0,15 mq → 0,1 mq
    expect(testoBlocco(b)).toBe('A = b*h = 0.1 mq');
  });

  it('cambiare la grandezza nel pannello aggiorna il blocco, senza toccarlo', () => {
    const blocchi = [nuovoBlocco('operazione', { fonte: 'f-area' })];
    const prima = ricalcolaQuaderno(blocchi, sorgenti(TRAVE))[0];
    const piuLarga = TRAVE.map((v) => (v.nome === 'b' ? { ...v, espressione: '0,6' } : v));
    const dopo = ricalcolaQuaderno(blocchi, sorgenti(piuLarga))[0];
    expect(prima.valore).toBeCloseTo(0.15, 9);
    expect(dopo.valore).toBeCloseTo(0.3, 9);
  });

  it('una formula scritta nel quaderno vede i blocchi che la precedono', () => {
    const r = ricalcolaQuaderno(
      [
        nuovoBlocco('operazione', { fonte: 'f-w' }),
        nuovoBlocco('operazione', { fonte: 'f-m' }),
        nuovoBlocco('formula', { nome: 'σ', espressione: 'M/W', um: 'MPa' }),
      ],
      sorgenti(TRAVE),
    );
    expect(r[2].errore).toBe('');
    // M = 37,5 kNm su W = 12500 cmc → 3 MPa: le unità si mescolano e tornano
    expect(r[2].valore).toBeCloseTo(3, 9);
    expect(r[2].um).toBe('MPa');
  });

  it('cambiare l’unità di un blocco converte il numero', () => {
    const con = (um: string) =>
      ricalcolaQuaderno(
        [
          nuovoBlocco('operazione', { fonte: 'f-w' }),
          nuovoBlocco('operazione', { fonte: 'f-m' }),
          nuovoBlocco('formula', { nome: 'σ', espressione: 'M/W', um }),
        ],
        sorgenti(TRAVE),
      )[2];
    expect(con('MPa').valore).toBeCloseTo(3, 9);
    expect(con('kg/cmq').valore).toBeCloseTo(30.591, 3);
    expect(con('kN/mq').valore).toBeCloseTo(3000, 9);
    // il valore che gira nelle formule resta lo stesso: cambia come si legge
    for (const um of ['MPa', 'kg/cmq', 'kN/mq']) expect(con(um).valoreBase).toBeCloseTo(3e6, 3);
  });

  it('propone solo le unità con cui quel risultato si può leggere', () => {
    const [b] = ricalcolaQuaderno([nuovoBlocco('operazione', { fonte: 'f-m' })], sorgenti(TRAVE));
    expect(b.umAmmesse).toContain('kNm');
    expect(b.umAmmesse).toContain('Nmm');
    expect(b.umAmmesse).not.toContain('MPa');
    expect(b.umFonte).toBe('kNm');
  });

  it('una formula a cui manca una grandezza lo dice, senza sbagliare', () => {
    const [b] = ricalcolaQuaderno([nuovoBlocco('operazione', { fonte: 'f-m' })], sorgenti([voce('q', '12', 'kN/m')]));
    expect(b.mancanti).toEqual(['l']);
    expect(b.errore).toBe('');
    expect(testoBlocco(b)).toContain('manca l');
  });

  it('un valore ripreso da un’altra scheda si converte come gli altri', () => {
    const r = ricalcolaQuaderno(
      [nuovoBlocco('import', { fonte: 'i-v' }), nuovoBlocco('import', { fonte: 'i-v', um: 'kg' })],
      sorgenti(TRAVE),
    );
    expect(r[0].valore).toBeCloseTo(18, 9);
    expect(r[0].provenienza).toBe('Sollecitazioni');
    expect(r[1].valore).toBeCloseTo(1835.5, 1);
  });

  it('un esito che non è un numero passa come testo', () => {
    const [b] = ricalcolaQuaderno([nuovoBlocco('import', { fonte: 'i-esito' })], sorgenti(TRAVE));
    expect(b.testo).toBe('verificato (62%)');
    expect(testoBlocco(b)).toBe('verificato (62%)');
  });

  it('due blocchi con lo stesso nome: il primo vince e il secondo lo dice', () => {
    const r = ricalcolaQuaderno(
      [
        nuovoBlocco('formula', { nome: 'A', espressione: 'b*h' }),
        nuovoBlocco('formula', { nome: 'A', espressione: 'b*l' }),
        nuovoBlocco('formula', { nome: 'x', espressione: 'A' }),
      ],
      sorgenti(TRAVE),
    );
    expect(r[1].nomeIgnorato).toBe(true);
    expect(r[2].valore).toBeCloseTo(0.15, 9);
  });

  it('una grandezza tirata dal pannello non è un doppione di sé stessa', () => {
    const r = ricalcolaQuaderno(
      [
        nuovoBlocco('valore', { fonte: 'v-b' }),
        nuovoBlocco('valore', { fonte: 'v-h' }),
        // due volte la stessa grandezza: stesso numero, nessuna ambiguità
        nuovoBlocco('valore', { fonte: 'v-b' }),
      ],
      sorgenti(TRAVE),
    );
    expect(r.map((b) => b.nomeIgnorato)).toEqual([false, false, false]);
    // e resta richiamabile: il valore è quello del pannello
    const [, , , sigma] = ricalcolaQuaderno(
      [
        nuovoBlocco('valore', { fonte: 'v-b' }),
        nuovoBlocco('valore', { fonte: 'v-h' }),
        nuovoBlocco('valore', { fonte: 'v-b' }),
        nuovoBlocco('formula', { nome: 'A', espressione: 'b*h' }),
      ],
      sorgenti(TRAVE),
    );
    expect(sigma.valore).toBeCloseTo(0.15, 9);
  });

  it('l’avviso resta dove il nome copre davvero un numero diverso', () => {
    const r = ricalcolaQuaderno(
      [
        nuovoBlocco('valore', { fonte: 'v-b' }),
        // stesso nome del pannello, ma un altro numero: qui l'ambiguità c'è
        nuovoBlocco('formula', { nome: 'b', espressione: '0,9', um: 'm' }),
      ],
      sorgenti(TRAVE),
    );
    expect(r[0].nomeIgnorato).toBe(false);
    expect(r[1].nomeIgnorato).toBe(true);
  });

  it('una fonte che non c’è più lo dice invece di sparire', () => {
    const [b] = ricalcolaQuaderno([nuovoBlocco('valore', { fonte: 'v-mai-esistita' })], sorgenti(TRAVE));
    expect(b.errore).toContain('non più in elenco');
  });

  it('note, schemi e capitoli occupano tutta la riga', () => {
    const r = ricalcolaQuaderno(
      [nuovoBlocco('nota', { testo: 'ciao' }), nuovoBlocco('immagine'), nuovoBlocco('capitolo', { fonte: 'azioni' })],
      sorgenti(TRAVE),
    );
    expect(r.map((b) => b.pieno)).toEqual([true, true, true]);
    expect(r.map((b) => b.passo)).toEqual(['01', '02', '03']);
  });

  it('i blocchi salvati si rileggono, quelli inventati si scartano', () => {
    const raw = [
      { tipo: 'formula', nome: 'A', espressione: 'b*h', um: 'mq' },
      { tipo: 'chissà', nome: 'x' },
      { id: 'q-9', tipo: 'nota', testo: 'promemoria' },
    ] as Partial<BloccoQuaderno>[];
    const b = normalizzaBlocchi(raw);
    expect(b.map((x) => x.tipo)).toEqual(['formula', 'nota']);
    expect(b[1].id).toBe('q-9');
    expect(b[0].img).toBe('');
    // un salvataggio di prima non ha la misura degli schemi: intera colonna
    expect(b[0].larghezza).toBe(0);
  });

  it('la larghezza di uno schema resta fra il minimo leggibile e la colonna intera', () => {
    expect(larghezzaValida(60)).toBe(60);
    expect(larghezzaValida(60.4)).toBe(60);
    expect(larghezzaValida(140)).toBe(100);
    expect(larghezzaValida(3)).toBe(LARGHEZZA_MIN);
    // 0, il vuoto e il non-numero vogliono dire «tutta la colonna»
    expect(larghezzaValida(0)).toBe(0);
    expect(larghezzaValida(undefined)).toBe(0);
    expect(larghezzaValida('mezza')).toBe(0);
    expect(normalizzaBlocchi([{ tipo: 'immagine', larghezza: 45 } as Partial<BloccoQuaderno>])[0].larghezza).toBe(45);
  });

  it('le colonne di un blocco restano fra 1 e 3; 0 vuol dire «come viene»', () => {
    expect(colonneValide(2)).toBe(2);
    expect(colonneValide(7)).toBe(COLONNE_FOGLIO);
    expect(colonneValide(0)).toBe(0);
    expect(colonneValide(undefined)).toBe(0);
    expect(colonneValide('tutta')).toBe(0);
  });

  it('senza scelta una riga di calcolo sta in una colonna, note e schemi in tutte', () => {
    expect(colonneBlocco(nuovoBlocco('formula'))).toBe(1);
    expect(colonneBlocco(nuovoBlocco('valore', { fonte: 'v-b' }))).toBe(1);
    expect(colonneBlocco(nuovoBlocco('nota'))).toBe(COLONNE_FOGLIO);
    expect(colonneBlocco(nuovoBlocco('immagine'))).toBe(COLONNE_FOGLIO);
    // la scelta esplicita vince su tutte e due
    expect(colonneBlocco(nuovoBlocco('formula', { colonne: 3 }))).toBe(3);
    expect(colonneBlocco(nuovoBlocco('nota', { colonne: 1 }))).toBe(1);
  });

  it('i posti liberi prima di un blocco restano fra 0 e due righe piene', () => {
    expect(saltoValido(2)).toBe(2);
    expect(saltoValido(99)).toBe(SALTO_MAX);
    expect(saltoValido(-1)).toBe(0);
    expect(saltoValido(undefined)).toBe(0);
    expect(saltoValido('giù')).toBe(0);
    // un salvataggio di prima non ce l'ha: nasce nel primo posto libero
    expect(normalizzaBlocchi([{ tipo: 'formula' } as Partial<BloccoQuaderno>])[0].salto).toBe(0);
    expect(normalizzaBlocchi([{ tipo: 'formula', salto: 4 } as Partial<BloccoQuaderno>])[0].salto).toBe(4);
  });

  it('una riga di calcolo si prende le colonne che le serve, non quelle che le si danno', () => {
    const corta = nuovoBlocco('formula', { nome: 'A', espressione: '2*3' });
    const lunga = nuovoBlocco('formula', {
      nome: 'MRd',
      espressione: 'N1*b1+(N+N2)*b2+0,5*γC*B1*H1*L1*(b1+b2)',
    });
    const [c, l] = ricalcolaQuaderno([corta, lunga], sorgenti(TRAVE));
    expect(spanBlocco(c)).toBe(1);
    expect(spanBlocco(l)).toBe(COLONNE_FOGLIO);
    expect(spanBlocco(l)).toBeGreaterThan(spanBlocco(c));

    // note, schemi e capitoli tengono invece la larghezza scelta
    const [nota, schema] = ricalcolaQuaderno(
      [nuovoBlocco('nota'), nuovoBlocco('immagine', { colonne: 1 })],
      sorgenti(TRAVE),
    );
    expect(spanBlocco(nota)).toBe(COLONNE_FOGLIO);
    expect(spanBlocco(schema)).toBe(1);
  });

  it('la nota scritta su un passaggio viaggia con il blocco', () => {
    const b = normalizzaBlocchi([
      { tipo: 'formula', espressione: '2+2', appunto: 'ipotesi di carico ridotta' } as Partial<BloccoQuaderno>,
    ]);
    expect(b[0].appunto).toBe('ipotesi di carico ridotta');
    // un salvataggio di prima non ce l'ha, e non deve diventare "undefined"
    expect(normalizzaBlocchi([{ tipo: 'nota' } as Partial<BloccoQuaderno>])[0].appunto).toBe('');
  });
});

describe('rapporti letti in percento', () => {
  const conPercento = (espressione: string) =>
    ricalcolaQuaderno(
      [
        nuovoBlocco('formula', { nome: 'M', espressione: '170', um: 'kNm' }),
        nuovoBlocco('formula', { nome: 'MRd', espressione: '255', um: 'kNm' }),
        nuovoBlocco('formula', { nome: 'Verifica', espressione, um: '%' }),
      ],
      sorgenti([]),
    )[2];

  it('il rapporto fra due momenti letto in % fa 67, non 0,67', () => {
    const b = conPercento('M/MRd');
    expect(b.valore).toBeCloseTo(66.667, 2);
    expect(b.um).toBe('%');
    // il valore che gira nelle formule a valle resta il numero puro
    expect(b.valoreBase).toBeCloseTo(0.66667, 4);
    expect(b.dato).toBe(false);
    expect(testoBlocco(b)).toBe('Verifica = M/MRd = 66.7 %');
  });

  it('un numero scritto a mano con il % resta quello che si è scritto', () => {
    const b = conPercento('80');
    expect(b.valore).toBe(80);
    expect(b.dato).toBe(true);
    expect(testoBlocco(b)).toBe('Verifica = 80 %');
  });

  it('il semaforo: verde sotto l’80 %, giallo fino al 100, rosso oltre', () => {
    expect(livelloEsito(conPercento('M/MRd'))).toBe('ok');
    expect(livelloEsito(conPercento('0.9*MRd/MRd'))).toBe('limite');
    expect(livelloEsito(conPercento('MRd/MRd'))).toBe('limite');
    expect(livelloEsito(conPercento('1.2*MRd/MRd'))).toBe('fuori');
    // niente semaforo dove non c'è una percentuale
    expect(livelloEsito(ricalcolaQuaderno([nuovoBlocco('formula', { espressione: '2*3' })], sorgenti([]))[0])).toBe('');
  });
});

describe('riordino dei blocchi', () => {
  it('spostare un blocco sopra a chi lo usa fa tornare il conto', () => {
    const area = nuovoBlocco('formula', { nome: 'A', espressione: '2*3', um: 'mq' });
    const forza = nuovoBlocco('formula', { nome: 'N', espressione: 'A*10', um: 'kN' });
    // scritti al contrario: N non trova ancora A
    const prima = ricalcolaQuaderno([forza, area], sorgenti([]));
    expect(prima[0].mancanti).toEqual(['A']);

    const dopo = ricalcolaQuaderno([area, forza], sorgenti([]));
    expect(dopo[1].mancanti).toEqual([]);
    expect(dopo[1].valore).toBeCloseTo(60, 6);
  });
});

describe('migrazione dei progetti salvati', () => {
  it('le spunte della vecchia scheda Esporta diventano capitoli sul foglio', () => {
    const vecchio = {
      schemaVersion: 6,
      esportazione: {
        capitoli: { azioni: true, sollecitazioni: false, verifiche: true, calcolatrice: false, costi: false },
        intestazione: 'Trave di copertura',
        nota: 'da confermare',
        quadretti: false,
      },
    } as unknown as Partial<AppState>;
    const s = migra(vecchio);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.quaderno.blocchi.map((b) => [b.tipo, b.fonte])).toEqual([
      ['capitolo', 'azioni'],
      ['capitolo', 'verifiche'],
    ]);
    expect(s.quaderno.intestazione).toBe('Trave di copertura');
    expect(s.quaderno.nota).toBe('da confermare');
    expect(s.quaderno.quadretti).toBe(false);
  });

  it('chi aveva aperto la Calcolatrice o l’Esporta si ritrova nel Quaderno', () => {
    expect(migra({ tab: 'calcolatrice' } as unknown as Partial<AppState>).tab).toBe('quaderno');
    expect(migra({ tab: 'esporta' } as unknown as Partial<AppState>).tab).toBe('quaderno');
    expect(migra({ tab: 'azioni' }).tab).toBe('azioni');
  });

  it('un quaderno già salvato si riapre com’era', () => {
    const blocchi = [nuovoBlocco('formula', { nome: 'A', espressione: 'b*h', um: 'cmq' })];
    const s = migra({ schemaVersion: SCHEMA_VERSION, quaderno: { blocchi, intestazione: '', nota: '', quadretti: true } });
    expect(s.quaderno.blocchi).toEqual(blocchi);
  });
});
