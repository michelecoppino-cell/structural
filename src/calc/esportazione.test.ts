import { describe, it, expect } from 'vitest';
import { STATO_INIZIALE, type AppState } from '../state/store';
import { nuovoBlocco, type BloccoQuaderno } from './quaderno';
import { capitoliNelFoglio, documentoHtml, documentoTesto, nomeFile } from './esportazione';

const con = (patch: Partial<AppState['quaderno']>): AppState => ({
  ...STATO_INIZIALE,
  quaderno: { ...STATO_INIZIALE.quaderno, ...patch },
});

const cap = (id: string): BloccoQuaderno => nuovoBlocco('capitolo', { fonte: id });

describe('foglio del quaderno', () => {
  it('porta dentro solo i capitoli messi sul foglio', () => {
    const stato = con({ blocchi: [cap('azioni')] });
    expect(capitoliNelFoglio(stato).map((c) => c.id)).toEqual(['azioni']);
    const txt = documentoTesto(stato);
    expect(txt).toContain('AZIONI');
    expect(txt).not.toContain('SOLLECITAZIONI');
  });

  it('i capitoli escono nell’ordine dei blocchi, non in quello dell’app', () => {
    const stato = con({ blocchi: [cap('costi'), cap('azioni')] });
    expect(capitoliNelFoglio(stato).map((c) => c.id)).toEqual(['costi', 'azioni']);
  });

  it('con il quaderno vuoto resta l’intestazione e basta', () => {
    const stato = con({ blocchi: [] });
    expect(capitoliNelFoglio(stato)).toEqual([]);
    expect(documentoTesto(stato)).toContain('(quaderno vuoto)');
    expect(documentoHtml(stato)).toContain('Quaderno vuoto');
  });

  it('l’HTML è un file solo, senza risorse esterne', () => {
    const html = documentoHtml(con({ intestazione: 'Trave di copertura', nota: 'da confermare' }));
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Trave di copertura');
    expect(html).toContain('da confermare');
    // niente <script> e niente richieste in rete: si apre offline
    expect(html).not.toMatch(/<script/);
    expect(html).not.toMatch(/(src|href)="(https?:)?\/\//);
  });

  it('il testo e l’HTML riportano le stesse righe di calcolo', () => {
    const stato = con({ blocchi: [cap('sollecitazioni')] });
    const riga = capitoliNelFoglio(stato)[0].blocchi[2].righe[0];
    expect(documentoTesto(stato)).toContain(riga);
    expect(documentoHtml(stato)).toContain(riga.replace(/</g, '&lt;'));
  });

  it('note e righe di calcolo del quaderno finiscono nel documento', () => {
    const stato: AppState = {
      ...STATO_INIZIALE,
      calcolatrice: {
        ...STATO_INIZIALE.calcolatrice,
        voci: STATO_INIZIALE.calcolatrice.voci.map((v) =>
          v.nome === 'b' ? { ...v, espressione: '0,3' } : v.nome === 'h' ? { ...v, espressione: '0,5' } : v,
        ),
      },
      quaderno: {
        ...STATO_INIZIALE.quaderno,
        blocchi: [
          nuovoBlocco('nota', { testo: 'Trave di bordo del solaio tipo' }),
          nuovoBlocco('formula', { nome: 'A', espressione: 'b*h', um: 'cmq' }),
        ],
      },
    };
    const txt = documentoTesto(stato);
    expect(txt).toContain('Trave di bordo del solaio tipo');
    // 0,3 m × 0,5 m letti in cmq: 1500
    expect(txt).toContain('A = b*h = 1500 cmq');
    expect(documentoHtml(stato)).toContain('A = b*h = 1500 cmq');
  });

  it('uno schema incollato entra nell’HTML come immagine, nel testo come richiamo', () => {
    const img = 'data:image/png;base64,iVBORw0KGgo=';
    const stato = con({ blocchi: [nuovoBlocco('immagine', { img, testo: 'schema statico' })] });
    expect(documentoTesto(stato)).toContain('[schema allegato: schema statico]');
    expect(documentoHtml(stato)).toContain(`src="${img}"`);
  });

  it('quello che si scrive a mano nel foglio non rompe l’HTML', () => {
    const html = documentoHtml(con({ nota: '<script>alert(1)</script>' }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('il nome del file è pulito da spazi e segni', () => {
    expect(nomeFile(STATO_INIZIALE)).toMatch(/^[\p{L}\p{N}_.-]+$/u);
  });
});
