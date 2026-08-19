import { describe, expect, it } from 'vitest';
import { nomeConEstensione } from './salvataggio';

describe('nome del file scritto a mano', () => {
  it('aggiunge l’estensione se manca, e non la raddoppia se c’è', () => {
    expect(nomeConEstensione('capannone-rev2', '.json')).toBe('capannone-rev2.json');
    expect(nomeConEstensione('capannone-rev2.json', '.json')).toBe('capannone-rev2.json');
    expect(nomeConEstensione('capannone.JSON', '.json')).toBe('capannone.JSON');
  });

  it('toglie i caratteri che i sistemi non accettano nei nomi', () => {
    expect(nomeConEstensione('lotto 3/4: solaio*', '.json')).toBe('lotto 3-4- solaio-.json');
  });

  it('un nome vuoto non lascia il file senza nome', () => {
    expect(nomeConEstensione('   ', '.json')).toBe('progetto.json');
    expect(nomeConEstensione('...', '.json')).toBe('progetto.json');
  });
});
