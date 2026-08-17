/**
 * Profilario dei bulloni a filettatura metrica grossa (ISO 261 / ISO 262) e
 * classi di resistenza delle viti — NTC2018 §11.3.4.6, Tab. 11.3.XII.
 *
 * `A` è l'area lorda del gambo (πd²/4), `Ares` l'area resistente della parte
 * filettata: nelle verifiche a taglio e a trazione si usa Ares quando il piano
 * di taglio attraversa la filettatura, che è il caso ordinario.
 * `chiave` è l'apertura della chiave esagonale (ISO 4014/4017), `d0` il
 * diametro nominale del foro con gioco normale — quello che serve per i passi
 * e le distanze dai bordi.
 */

export interface Bullone {
  /** Diametro nominale d (mm). */
  d: number;
  /** Passo della filettatura grossa (mm). */
  passo: number;
  /** Area lorda del gambo (mm²). */
  A: number;
  /** Area resistente della parte filettata (mm²). */
  Ares: number;
  /** Apertura di chiave (mm). */
  chiave: number;
  /** Diametro del foro con gioco normale (mm). */
  d0: number;
}

export const BULLONI: Record<string, Bullone> = {
  M6: { d: 6, passo: 1.0, A: 28.3, Ares: 20.1, chiave: 10, d0: 7 },
  M8: { d: 8, passo: 1.25, A: 50.3, Ares: 36.6, chiave: 13, d0: 9 },
  M10: { d: 10, passo: 1.5, A: 78.5, Ares: 58.0, chiave: 17, d0: 11 },
  M12: { d: 12, passo: 1.75, A: 113.1, Ares: 84.3, chiave: 19, d0: 13 },
  M14: { d: 14, passo: 2.0, A: 153.9, Ares: 115, chiave: 22, d0: 15 },
  M16: { d: 16, passo: 2.0, A: 201.1, Ares: 157, chiave: 24, d0: 18 },
  M18: { d: 18, passo: 2.5, A: 254.5, Ares: 192, chiave: 27, d0: 20 },
  M20: { d: 20, passo: 2.5, A: 314.2, Ares: 245, chiave: 30, d0: 22 },
  M22: { d: 22, passo: 2.5, A: 380.1, Ares: 303, chiave: 32, d0: 24 },
  M24: { d: 24, passo: 3.0, A: 452.4, Ares: 353, chiave: 36, d0: 26 },
  M27: { d: 27, passo: 3.0, A: 572.6, Ares: 459, chiave: 41, d0: 30 },
  M30: { d: 30, passo: 3.5, A: 706.9, Ares: 561, chiave: 46, d0: 33 },
  M33: { d: 33, passo: 3.5, A: 855.3, Ares: 694, chiave: 50, d0: 36 },
  M36: { d: 36, passo: 4.0, A: 1017.9, Ares: 817, chiave: 55, d0: 39 },
};

/** Taglie in ordine crescente di diametro: l'ordine delle tendine. */
export const TAGLIE_BULLONE = Object.keys(BULLONI);

/**
 * Classi di resistenza delle viti — Tab. 11.3.XII. La sigla si legge da sé:
 * `8.8` vuol dire ftb = 800 N/mm² e fyb = 0.8·ftb.
 */
export const CLASSI_BULLONE: Record<string, { fyb: number; ftb: number }> = {
  '4.6': { fyb: 240, ftb: 400 },
  '5.6': { fyb: 300, ftb: 500 },
  '6.8': { fyb: 480, ftb: 600 },
  '8.8': { fyb: 640, ftb: 800 },
  '10.9': { fyb: 900, ftb: 1000 },
};
