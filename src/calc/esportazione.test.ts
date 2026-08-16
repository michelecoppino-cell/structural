import { describe, it, expect } from 'vitest';
import { STATO_INIZIALE, type AppState } from '../state/store';
import { capitoliScelti, documentoHtml, documentoTesto, nomeFile } from './esportazione';

const con = (patch: Partial<AppState['esportazione']>): AppState => ({
  ...STATO_INIZIALE,
  esportazione: { ...STATO_INIZIALE.esportazione, ...patch },
});

describe('foglio di esportazione', () => {
  it('porta dentro solo i capitoli spuntati', () => {
    const stato = con({
      capitoli: { azioni: true, sollecitazioni: false, verifiche: false, calcolatrice: false, costi: false },
    });
    expect(capitoliScelti(stato).map((c) => c.id)).toEqual(['azioni']);
    const txt = documentoTesto(stato);
    expect(txt).toContain('AZIONI');
    expect(txt).not.toContain('SOLLECITAZIONI');
  });

  it('con nessuna spunta resta l’intestazione e basta', () => {
    const stato = con({
      capitoli: { azioni: false, sollecitazioni: false, verifiche: false, calcolatrice: false, costi: false },
    });
    expect(capitoliScelti(stato)).toEqual([]);
    expect(documentoHtml(stato)).toContain('Nessun capitolo selezionato');
  });

  it('l’HTML è un file solo, senza risorse esterne', () => {
    const html = documentoHtml(con({ intestazione: 'Trave di copertura', nota: 'da confermare' }));
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Trave di copertura');
    expect(html).toContain('da confermare');
    // niente <script>, niente src/href verso l'esterno: si apre offline
    expect(html).not.toMatch(/<script|src=|href=/);
  });

  it('il testo e l’HTML riportano le stesse righe di calcolo', () => {
    const stato = con({
      capitoli: { azioni: false, sollecitazioni: true, verifiche: false, calcolatrice: false, costi: false },
    });
    const riga = capitoliScelti(stato)[0].blocchi[2].righe[0];
    expect(documentoTesto(stato)).toContain(riga);
    expect(documentoHtml(stato)).toContain(riga.replace(/</g, '&lt;'));
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
