import { describe, expect, it } from 'vitest';
import { urlSicuro } from './normative';

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
