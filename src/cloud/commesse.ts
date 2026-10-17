/**
 * Le cartelle delle commesse su OneDrive, viste dall'app: in che ordine
 * mostrarle e quale proporre per il progetto aperto. Solo logica pura — le
 * chiamate a Graph stanno in `onedrive.ts`.
 */
import { normalizza } from '../base/schede';
import type { CartellaRemota } from './onedrive';
import type { Progetto } from '../state/stato';

/** Il numero in testa al nome (`23 - Cigliani` → 23), se c'è. */
const numero = (nome: string): number | null => {
  const m = /^\s*(\d+)/.exec(nome);
  return m ? Number(m[1]) : null;
};

/**
 * Le commesse dalla più recente: prima per numero in testa, decrescente (la 23
 * viene dopo la 22), poi quelle senza numero in ordine alfabetico. Le cartelle
 * di servizio (`_…`, `.…`) restano fuori.
 */
export function ordinaCommesse(cartelle: CartellaRemota[]): CartellaRemota[] {
  return cartelle
    .filter((c) => c.nome && !/^[_.]/.test(c.nome))
    .sort((a, b) => {
      const na = numero(a.nome);
      const nb = numero(b.nome);
      if (na !== null && nb !== null && na !== nb) return nb - na;
      if (na === null && nb !== null) return 1;
      if (na !== null && nb === null) return -1;
      return a.nome.localeCompare(b.nome, 'it');
    });
}

/**
 * La cartella da proporre: quella già usata per questo progetto, se c'è
 * ancora; altrimenti la sola il cui nome contiene una parola del nome del
 * progetto o il suo codice di commessa. Con più candidate non si propone
 * niente: indovinare la cartella sbagliata è peggio che chiederla.
 */
export function commessaProposta(cartelle: CartellaRemota[], progetto: Progetto): string | null {
  if (progetto.cartella && cartelle.some((c) => c.nome === progetto.cartella)) return progetto.cartella;
  const parole = normalizza(`${progetto.nome} ${progetto.commessa}`)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((p) => p.length >= 4 && !['nuova', 'commessa'].includes(p));
  if (parole.length === 0) return null;
  const candidate = cartelle.filter((c) => {
    const n = normalizza(c.nome);
    return parole.some((p) => n.includes(p));
  });
  return candidate.length === 1 ? candidate[0].nome : null;
}
