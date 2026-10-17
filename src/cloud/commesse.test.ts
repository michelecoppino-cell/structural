import { describe, expect, it } from 'vitest';
import { commessaProposta, ordinaCommesse } from './commesse';

const c = (nome: string) => ({ nome, modificato: '' });
const progetto = { nome: 'Nuova commessa', commessa: '2026-001', localita: '', revisione: '0' };

describe('cartelle delle commesse', () => {
  it('dalla più recente per numero, le altre dopo, le cartelle di servizio fuori', () => {
    const o = ordinaCommesse([c('9 - Rossi'), c('Modelli'), c('23 - Cigliani'), c('_vecchie'), c('10 - Bianchi')]);
    expect(o.map((x) => x.nome)).toEqual(['23 - Cigliani', '10 - Bianchi', '9 - Rossi', 'Modelli']);
  });

  it('propone la cartella già usata, se esiste ancora', () => {
    const cartelle = [c('23 - Cigliani'), c('10 - Bianchi')];
    expect(commessaProposta(cartelle, { ...progetto, cartella: '10 - Bianchi' })).toBe('10 - Bianchi');
    expect(commessaProposta(cartelle, { ...progetto, cartella: '5 - Sparita' })).toBeNull();
  });

  it('riconosce la commessa dal nome del progetto, senza accenti e maiuscole', () => {
    const cartelle = [c('23 - Cigliani'), c('10 - Bianchi')];
    expect(commessaProposta(cartelle, { ...progetto, nome: 'Casa CIGLIANI – solaio' })).toBe('23 - Cigliani');
  });

  it('con più candidate o nessun indizio non propone niente', () => {
    const cartelle = [c('23 - Rossi Udine'), c('24 - Rossi Fagagna')];
    expect(commessaProposta(cartelle, { ...progetto, nome: 'Rossi' })).toBeNull();
    expect(commessaProposta(cartelle, progetto)).toBeNull();
  });
});
