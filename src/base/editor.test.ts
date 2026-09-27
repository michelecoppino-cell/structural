import { describe, expect, it } from 'vitest';
import { aCapoRiga, avvolgi, BLOCCO_CALCOLO, inserisci, inserisciBlocco, nomeImmagine } from './editor';
import { blocchi, inline, percorsoImmagine } from './markdown';
import { calcolaBlocco } from './calcolo';

describe('pulsanti dell’editor', () => {
  it('il grassetto avvolge la selezione, e un secondo tocco lo toglie', () => {
    const m = avvolgi('il momento flettente', 3, 10, '**', '**', 'testo');
    expect(m.testo).toBe('il **momento** flettente');
    expect(m.testo.slice(m.da, m.a)).toBe('momento');
    expect(avvolgi(m.testo, m.da, m.a, '**', '**', 'testo').testo).toBe('il momento flettente');
  });

  it('senza selezione mette il segnaposto, selezionato', () => {
    const m = avvolgi('ab', 1, 1, '*', '*', 'testo');
    expect(m.testo).toBe('a*testo*b');
    expect(m.testo.slice(m.da, m.a)).toBe('testo');
  });

  it('l’elenco mette il segno su ogni riga selezionata, e lo toglie', () => {
    const t = 'uno\ndue\ntre';
    const m = aCapoRiga(t, 0, t.length, '- ');
    expect(m.testo).toBe('- uno\n- due\n- tre');
    expect(aCapoRiga(m.testo, 0, m.testo.length, '- ').testo).toBe(t);
  });

  it('l’elenco numerato conta, le caselle si mettono anche a metà riga', () => {
    expect(aCapoRiga('a\nb', 0, 3, '1. ').testo).toBe('1. a\n2. b');
    const m = aCapoRiga('prima\nfare questo\ndopo', 9, 9, '- [ ] ');
    expect(m.testo).toBe('prima\n- [ ] fare questo\ndopo');
  });

  it('un titolo di un altro livello si sostituisce', () => {
    expect(aCapoRiga('### Pali', 2, 2, '## ').testo).toBe('## Pali');
  });

  it('un blocco si stacca con righe vuote da quello che ha intorno', () => {
    const m = inserisciBlocco('sopra\nsotto', 5, 5, '---');
    expect(m.testo).toBe('sopra\n\n---\n\nsotto');
  });

  it('il blocco di calcolo nasce calcolabile, con la prima riga selezionata', () => {
    const m = inserisciBlocco('', 0, 0, BLOCCO_CALCOLO);
    expect(m.testo.slice(m.da, m.a)).toBe('a = 1 [m]    # descrizione');
    const b = blocchi(m.testo)[0];
    expect(b.t).toBe('codice');
    if (b.t === 'codice') {
      const r = calcolaBlocco(b.testo);
      expect(r.every((x) => x.t !== 'voce' || !x.voce.errore)).toBe(true);
    }
  });

  it('inserire mette il cursore dopo', () => {
    const m = inserisci('ab', 1, 1, '[[X]]');
    expect(m).toEqual({ testo: 'a[[X]]b', da: 6, a: 6 });
  });
});

describe('immagini', () => {
  it('il nome dell’allegato dice di che scheda è e quando', () => {
    const n = nomeImmagine('geotecnica/pali.md', 'webp', new Date('2026-09-27T10:11:12Z'));
    expect(n).toMatch(/^_allegati\/pali-20260927-101112-[a-z0-9]{1,3}\.webp$/);
  });

  it('si leggono nelle due forme, e da sola su una riga diventano una figura', () => {
    expect(inline('vedi ![grafico](_allegati/g.png) qui')[1]).toEqual({ t: 'immagine', src: '_allegati/g.png', alt: 'grafico' });
    expect(blocchi('![[diagramma M.png|Momento]]')[0]).toEqual({ t: 'figura', src: '_allegati/diagramma M.png', alt: 'Momento' });
    expect(blocchi('![Taglio](./_allegati/t.webp)')[0]).toMatchObject({ t: 'figura', src: '_allegati/t.webp' });
  });

  it('un nome nudo sta negli allegati, un indirizzo web resta com’è', () => {
    expect(percorsoImmagine('grafico%20taglio.png')).toBe('_allegati/grafico taglio.png');
    expect(percorsoImmagine('https://x.it/a.png')).toBe('https://x.it/a.png');
    expect(percorsoImmagine('100%.png')).toBe('_allegati/100%.png');
  });

  it('![[una scheda]] che non è un’immagine resta un collegamento', () => {
    expect(inline('![[Pali]]').some((x) => x.t === 'wiki')).toBe(true);
  });
});
