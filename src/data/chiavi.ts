/**
 * Spazi di manovra per le chiavi — quanto posto ci vuole intorno a un bullone
 * per poterlo davvero serrare.
 *
 * Sono le misure del serraggio in officina e in cantiere: `S` è l'apertura di
 * chiave del dado, `f` e `g` valgono per le chiavi a forchetta, `h` e `k` per
 * le poligonali. `f` (o `h`) è la distanza minima fra l'asse del bullone e un
 * ostacolo laterale — una parete, un'ala, un altro elemento — mentre `g` (o
 * `k`) è l'interasse minimo fra due bulloni contigui perché la chiave ci passi
 * in mezzo. La forchetta chiede più posto della poligonale, che è il motivo per
 * cui nei nodi fitti si serra di poligonale.
 *
 * L'apertura S è quella dei bulloni strutturali ad alta resistenza (serie
 * UNI 5712 / EN 14399), più grande di quella dei bulloni ISO 4014 del
 * profilario: a parità di vite il dado è più massiccio.
 *
 * Le distanze così ricavate sono un vincolo di montaggio: vanno rispettate
 * insieme — non al posto — dei minimi normativi di passo e distanza dal bordo.
 */

export interface RigaChiave {
  /** Taglia della vite (M12, M14, …). */
  vite: string;
  /** Apertura di chiave del dado (mm). */
  S: number;
  /** Chiave a forchetta: distanza minima dell'asse dall'ostacolo (mm). */
  f: number;
  /** Chiave a forchetta: interasse minimo fra due bulloni (mm). */
  g: number;
  /** Chiave poligonale: distanza minima dell'asse dall'ostacolo (mm). */
  h: number;
  /** Chiave poligonale: interasse minimo fra due bulloni (mm). */
  k: number;
}

/** La tabella completa, una taglia di vite per riga. */
export const SPAZI_CHIAVI: RigaChiave[] = [
  { vite: 'M12', S: 22, f: 23.5, g: 45, h: 18.25, k: 35 },
  { vite: 'M14', S: 24, f: 25, g: 48, h: 19.75, k: 38 },
  { vite: 'M16', S: 27, f: 28, g: 55, h: 21.75, k: 42 },
  { vite: 'M18', S: 30, f: 30, g: 60, h: 23.75, k: 46 },
  { vite: 'M20', S: 32, f: 31.5, g: 62.5, h: 25.25, k: 49 },
  { vite: 'M22', S: 36, f: 37, g: 73, h: 28.25, k: 55 },
  { vite: 'M24', S: 41, f: 41.5, g: 82.5, h: 32.25, k: 63 },
  { vite: 'M27', S: 46, f: 45, g: 90, h: 36.25, k: 71 },
  { vite: 'M30', S: 50, f: 47, g: 96.5, h: 39.25, k: 77 },
  { vite: 'M36', S: 60, f: 51.5, g: 109.5, h: 48, k: 93 },
];

/** Gli spazi di manovra di una taglia, se è a tabella. */
export function spaziChiave(vite: string): RigaChiave | undefined {
  return SPAZI_CHIAVI.find((r) => r.vite === vite);
}
