import { describe, expect, it } from 'vitest';
import {
  cerca,
  collegamenti,
  commutaCasella,
  contaCaselle,
  daModello,
  faccette,
  FILTRI_VUOTI,
  impostaCampo,
  leggiMeta,
  leggiScheda,
  nomeDaTitolo,
  nomeLibero,
  rimandiA,
  risolvi,
  separa,
} from './schede';
import { blocchi, inline, testoPiano, type Blocco } from './markdown';
import { calcolaBlocco, leggiCalcolo } from './calcolo';
import { allinea, type InCopia } from './allinea';
import { FILE_INIZIALI } from './modelli';
import type { LinkUtente } from '../data/normative';

const PALI = `---
titolo: Portanza dei pali
area: geotecnica
tipo: sintesi
stato: da-studiare   # da-studiare | in-corso | consolidata
tag: [fondazioni, pali]
norme:
  - NTC 2018 §6.4.3
  - EC7
---
# Portanza dei pali

La resistenza laterale dipende dall'attrito.
Vedi [[Coefficienti parziali]] e [[NTC 2018 §6.4.3]].

- [ ] ripassare Rc,k
- [x] leggere la Circolare
`;

describe('intestazione', () => {
  it('separa intestazione e corpo', () => {
    const { grezza, corpo } = separa(PALI);
    expect(grezza).toContain('area: geotecnica');
    expect(corpo.startsWith('# Portanza dei pali')).toBe(true);
  });

  it('senza intestazione è tutto corpo', () => {
    expect(separa('# Titolo\n\ntesto').grezza).toBeNull();
  });

  it('legge valori, elenchi in linea e a righe, e toglie i commenti', () => {
    const m = leggiMeta(separa(PALI).grezza);
    expect(m.stato).toBe('da-studiare');
    expect(m.tag).toEqual(['fondazioni', 'pali']);
    expect(m.norme).toEqual(['NTC 2018 §6.4.3', 'EC7']);
  });

  it('una scheda senza intestazione prende il titolo dal primo #, poi dal nome del file', () => {
    expect(leggiScheda('a.md', '# Il mio titolo\n\ntesto').titolo).toBe('Il mio titolo');
    expect(leggiScheda('cartella/appunti-veloci.md', 'solo testo').titolo).toBe('appunti-veloci');
  });

  it('cambia un campo lasciando il resto identico', () => {
    const nuovo = impostaCampo(PALI, 'stato', 'in-corso');
    expect(leggiScheda('p.md', nuovo).stato).toBe('in-corso');
    expect(nuovo.replace('stato: in-corso', '')).toBe(
      PALI.replace('stato: da-studiare   # da-studiare | in-corso | consolidata', ''),
    );
  });

  it('sostituisce anche un elenco scritto a righe', () => {
    const nuovo = impostaCampo(PALI, 'norme', ['EC7']);
    expect(leggiScheda('p.md', nuovo).norme).toEqual(['EC7']);
    expect(nuovo).not.toContain('NTC 2018 §6.4.3\n  - EC7');
  });

  it('aggiunge un campo che non c’era, e crea l’intestazione se manca', () => {
    expect(leggiScheda('p.md', impostaCampo(PALI, 'ripasso', '2026-09-26')).meta.ripasso).toBe('2026-09-26');
    const senza = impostaCampo('# T\n\ntesto', 'stato', 'in-corso');
    expect(senza.startsWith('---\nstato: in-corso\n---\n# T')).toBe(true);
  });
});

describe('nomi e modelli', () => {
  it('fa un nome di file da un titolo', () => {
    expect(nomeDaTitolo('Portanza dei pali — NTC §6.4')).toBe('portanza-dei-pali-ntc-6-4.md');
    expect(nomeDaTitolo('Perché è così')).toBe('perche-e-cosi.md');
  });

  it('trova un nome libero', () => {
    expect(nomeLibero('pali.md', ['pali.md', 'pali-2.md'])).toBe('pali-3.md');
    expect(nomeLibero('travi.md', ['pali.md'])).toBe('travi.md');
  });

  it('riempie i segnaposto del modello', () => {
    const t = daModello('---\ntitolo: {{titolo}}\n---\n# {{titolo}} del {{data}}', 'Pali', new Date('2026-09-26'));
    const s = leggiScheda('x.md', t);
    expect(s.titolo).toBe('Pali');
    expect(s.corpo).toContain('# Pali del 2026-09-26');
    expect(s.meta.creata).toBe('2026-09-26');
  });

  it('i modelli di partenza sono schede leggibili', () => {
    for (const f of FILE_INIZIALI) {
      const s = leggiScheda(f.percorso, daModello(f.testo, 'Prova'));
      expect(s.titolo).toBeTruthy();
      expect(() => blocchi(s.corpo)).not.toThrow();
    }
  });
});

describe('ricerca', () => {
  const schede = [
    leggiScheda('pali.md', PALI),
    leggiScheda('coeff.md', '---\ntitolo: Coefficienti parziali\narea: strutture\n---\nγM0 e γM1, e i pali.'),
    leggiScheda('_modelli/sintesi.md', '---\ntitolo: Sintesi\n---\npali pali pali'),
  ];

  it('il titolo pesa più del testo, e i modelli restano fuori', () => {
    const r = cerca(schede, { ...FILTRI_VUOTI, testo: 'pali' });
    expect(r.map((t) => t.scheda.percorso)).toEqual(['pali.md', 'coeff.md']);
    expect(r[1].estratto).toContain('pali');
  });

  it('tutte le parole devono esserci, anche senza accenti', () => {
    expect(cerca(schede, { ...FILTRI_VUOTI, testo: 'resistenza attrito' })).toHaveLength(1);
    expect(cerca(schede, { ...FILTRI_VUOTI, testo: 'resistenza vento' })).toHaveLength(0);
  });

  it('filtra per area, stato e tag', () => {
    expect(cerca(schede, { ...FILTRI_VUOTI, area: 'strutture' })).toHaveLength(1);
    expect(cerca(schede, { ...FILTRI_VUOTI, stato: 'da-studiare' })).toHaveLength(1);
    expect(cerca(schede, { ...FILTRI_VUOTI, tag: 'pali' })).toHaveLength(1);
  });

  it('conta le faccette, con gli stati nel loro ordine', () => {
    const s = [...schede, leggiScheda('c.md', '---\nstato: consolidata\n---\n'), leggiScheda('d.md', '---\nstato: in-corso\n---\n')];
    expect(faccette(s, 'stato').map((f) => f.valore)).toEqual(['da-studiare', 'in-corso', 'consolidata']);
    expect(faccette(s, 'area').at(-1)?.valore).toBe('Senza area');
  });
});

describe('collegamenti', () => {
  const ntc: LinkUtente = {
    id: 'n1',
    sigla: 'NTC 2018',
    titolo: 'Norme tecniche',
    url: 'https://onedrive.live.com/x',
    categoria: '',
    capitoli: [{ id: 'k', numero: '6.4.3', titolo: 'Pali', pagina: '210' }],
  };
  const schede = [leggiScheda('pali.md', PALI), leggiScheda('coeff.md', '---\ntitolo: Coefficienti parziali\n---\n')];

  it('porta a una scheda per titolo o per nome di file', () => {
    expect(risolvi('Coefficienti parziali', schede, [ntc])).toMatchObject({ tipo: 'scheda' });
    expect(risolvi('coeff', schede, [ntc])).toMatchObject({ tipo: 'scheda' });
  });

  it('porta a una norma della libreria, con la pagina del capitolo', () => {
    const d = risolvi('NTC2018 §6.4.3', schede, [ntc]);
    expect(d).toMatchObject({ tipo: 'norma', pagina: '210' });
    if (d.tipo === 'norma') expect(d.resto).toBe('§6.4.3');
  });

  it('non inventa destinazioni', () => {
    expect(risolvi('Eurocodice 7', schede, [ntc])).toEqual({ tipo: 'nessuna' });
  });

  it('elenca i collegamenti e trova chi rimanda a una scheda', () => {
    expect(collegamenti(PALI)).toEqual(['Coefficienti parziali', 'NTC 2018 §6.4.3']);
    expect(rimandiA(schede[1], schede).map((s) => s.percorso)).toEqual(['pali.md']);
  });
});

describe('caselle', () => {
  it('spunta la n-esima, anche dentro un riquadro, saltando il codice', () => {
    const testo = '- [ ] a\n```\n- [ ] nel codice\n```\n> [!nota]\n> - [ ] b\n- [x] c';
    expect(commutaCasella(testo, 1)).toBe(testo.replace('> - [ ] b', '> - [x] b'));
    expect(commutaCasella(testo, 2)).toBe(testo.replace('- [x] c', '- [ ] c'));
    expect(contaCaselle(testo)).toEqual({ fatte: 1, totali: 3 });
  });

  it('il lettore numera le caselle come chi le spunta', () => {
    const testo = '- [ ] a\n  - [ ] a1\n> [!nota]\n> - [ ] b\n\n1. [x] c';
    const indici: number[] = [];
    const visita = (bb: Blocco[]) =>
      bb.forEach((b) => {
        if (b.t === 'elenco') b.voci.forEach((v) => (indici.push(v.indiceCasella), visita(v.figli)));
        if (b.t === 'riquadro' || b.t === 'citazione') visita(b.figli);
      });
    visita(blocchi(testo));
    expect(indici).toEqual([0, 1, 2, 3]);
    expect(commutaCasella(testo, 3)).toContain('1. [ ] c');
  });
});

describe('markdown', () => {
  it('segni in linea', () => {
    expect(inline('**forte** e *corsivo* e `M = q l²/8`')).toEqual([
      { t: 'grassetto', c: [{ t: 'testo', v: 'forte' }] },
      { t: 'testo', v: ' e ' },
      { t: 'corsivo', c: [{ t: 'testo', v: 'corsivo' }] },
      { t: 'testo', v: ' e ' },
      { t: 'codice', v: 'M = q l²/8' },
    ]);
  });

  it('una moltiplicazione e un nome_con_trattini non sono corsivi', () => {
    expect(testoPiano(inline('2 * 3 * 4 e nome_di_variabile'))).toBe('2 * 3 * 4 e nome_di_variabile');
    expect(inline('2 * 3 * 4').every((x) => x.t === 'testo')).toBe(true);
  });

  it('link, collegamenti e indirizzi nudi', () => {
    const r = inline('[sito](https://a.it) [[Pali|i pali]] https://b.it.');
    expect(r[0]).toMatchObject({ t: 'link', url: 'https://a.it' });
    expect(r[2]).toEqual({ t: 'wiki', bersaglio: 'Pali', etichetta: 'i pali' });
    expect(r[4]).toMatchObject({ t: 'link', url: 'https://b.it' });
  });

  it('blocchi: titoli, elenchi annidati, tabelle, riquadri, codice', () => {
    const b = blocchi(
      [
        '# Titolo',
        'riga uno',
        'riga due',
        '',
        '- voce',
        '  - sotto',
        '- altra',
        '',
        '| a | b |',
        '|:--|--:|',
        '| 1 | 2 |',
        '',
        '> [!attenzione] Occhio',
        '> testo',
        '',
        '```calcolo',
        'a = 1',
        '```',
        '---',
      ].join('\n'),
    );
    expect(b.map((x) => x.t)).toEqual(['titolo', 'paragrafo', 'elenco', 'tabella', 'riquadro', 'codice', 'linea']);
    const elenco = b[2] as Extract<Blocco, { t: 'elenco' }>;
    expect(elenco.voci).toHaveLength(2);
    expect(elenco.voci[0].figli[0]).toMatchObject({ t: 'elenco' });
    expect(b[3]).toMatchObject({ allineamenti: ['sx', 'dx'] });
    expect(b[4]).toMatchObject({ t: 'riquadro', tipo: 'attenzione' });
    expect(b[5]).toMatchObject({ t: 'codice', lingua: 'calcolo', testo: 'a = 1' });
  });

  it('un elenco numerato ricorda da dove parte', () => {
    expect(blocchi('3. tre\n4. quattro')[0]).toMatchObject({ t: 'elenco', ordinato: true, inizio: 3 });
  });
});

describe('calcolo', () => {
  it('legge nome, espressione, unità e nota', () => {
    const r = leggiCalcolo('# dati\nq = 25 [kN/m]   # carico\nq*2');
    expect(r[0]).toEqual({ t: 'titoletto', testo: 'dati' });
    expect(r[1]).toMatchObject({ t: 'voce', voce: { nome: 'q', espressione: '25', um: 'kN/m', nota: 'carico' } });
    expect(r[2]).toMatchObject({ t: 'voce', voce: { nome: '', espressione: 'q*2' } });
  });

  it('calcola con le unità del Quaderno', () => {
    const r = calcolaBlocco('q = 25 [kN/m]\nl = 6 [m]\nM = q*l^2/8 [kNm]');
    const m = r[2];
    expect(m.t).toBe('voce');
    if (m.t === 'voce') {
      expect(m.voce.valore).toBeCloseTo(112.5, 6);
      expect(m.voce.umEffettiva).toBe('kNm');
    }
  });

  it('un errore resta sulla sua riga', () => {
    const r = calcolaBlocco('a = 2\nb = a + nonCe');
    expect(r[1].t === 'voce' && r[1].voce.errore).toBeTruthy();
    expect(r[0].t === 'voce' && r[0].voce.errore).toBe('');
  });
});

describe('allineamento con OneDrive', () => {
  const copia: InCopia[] = [
    { percorso: 'a.md', etag: '1', modificata: '', testo: 'A' },
    { percorso: 'via.md', etag: '1', modificata: '', testo: 'sparita' },
  ];

  it('riscarica solo quello che è cambiato e butta quello che non c’è più', async () => {
    const scaricati: string[] = [];
    const { voci, scaricate } = await allinea(
      copia,
      async () => [
        { percorso: 'a.md', etag: '1', modificato: '', scarico: '' },
        { percorso: 'b.md', etag: '7', modificato: 'ieri', scarico: '' },
        { percorso: 'foto.png', etag: '1', modificato: '', scarico: '' },
      ],
      async (p) => (scaricati.push(p), `testo di ${p}`),
    );
    expect(scaricati).toEqual(['b.md']);
    expect(scaricate).toBe(1);
    expect(voci.map((v) => v.percorso)).toEqual(['a.md', 'b.md']);
    expect(voci[0].testo).toBe('A');
  });
});
