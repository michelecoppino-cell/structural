import { describe, expect, it } from 'vitest';
import { SENZA_CATEGORIA, categorie, leggiNormative, urlSicuro, type LinkUtente } from './normative';

const doc = (id: string, categoria: string): LinkUtente => ({
  id,
  sigla: id.toUpperCase(),
  titolo: '',
  url: `https://esempio.it/${id}`,
  categoria,
  capitoli: [],
});

describe('urlSicuro', () => {
  it('completa lo schema mancante', () => {
    expect(urlSicuro('cnr.it/norme/dt207')).toBe('https://cnr.it/norme/dt207');
  });

  it('lascia passare http e https', () => {
    expect(urlSicuro('https://www.studiopetrillo.com/ntc2018')).toBe('https://www.studiopetrillo.com/ntc2018');
    expect(urlSicuro('http://intranet.locale/norme.pdf')).toBe('http://intranet.locale/norme.pdf');
  });

  it('scarta gli schemi eseguibili di un JSON importato', () => {
    expect(urlSicuro('javascript:alert(document.cookie)')).toBeNull();
    expect(urlSicuro('JavaScript:alert(1)')).toBeNull();
    expect(urlSicuro('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(urlSicuro('vbscript:msgbox(1)')).toBeNull();
  });

  it('scarta i valori vuoti e i non-stringa', () => {
    expect(urlSicuro('')).toBeNull();
    expect(urlSicuro('   ')).toBeNull();
    expect(urlSicuro(undefined)).toBeNull();
    expect(urlSicuro(42)).toBeNull();
  });
});

describe('categorie della libreria', () => {
  it('raggruppa i documenti nell\u2019ordine in cui stanno', () => {
    const gruppi = categorie([doc('a', 'Eurocodici'), doc('b', 'Norme nazionali'), doc('c', 'Eurocodici')]);
    expect(gruppi.map((g) => g.nome)).toEqual(['Eurocodici', 'Norme nazionali']);
    expect(gruppi[0].voci.map((v) => v.id)).toEqual(['a', 'c']);
  });

  it('mette su uno scaffale di servizio i documenti senza categoria', () => {
    const gruppi = categorie([doc('a', ''), doc('b', '   ')]);
    expect(gruppi).toHaveLength(1);
    expect(gruppi[0].nome).toBe(SENZA_CATEGORIA);
    expect(gruppi[0].orfana).toBe(true);
  });

  it('un file scritto prima delle categorie si rilegge senza', () => {
    const [v] = leggiNormative([{ id: 'n1', sigla: 'NTC', titolo: '', url: 'https://esempio.it/ntc' }]);
    expect(v.categoria).toBe('');
    expect(categorie([v])[0].nome).toBe(SENZA_CATEGORIA);
  });

  it('legge la categoria scritta nel file e scarta quelle non testuali', () => {
    const voci = leggiNormative([
      { id: 'n1', url: 'https://esempio.it/a', categoria: 'Capitolati' },
      { id: 'n2', url: 'https://esempio.it/b', categoria: 42 },
    ]);
    expect(voci.map((v) => v.categoria)).toEqual(['Capitolati', '']);
  });
});
