/**
 * Classificazione delle sezioni in acciaio — NTC2018 §4.2.3, prospetti
 * 4.2.III (parti interne), 4.2.IV (sporgenze delle ali) e 4.2.V (angolari e
 * sezioni tubolari), che ricalcano la tab. 5.2 della UNI EN 1993-1-1.
 *
 * La classe dice quanto la sezione può contare sulla plasticizzazione prima
 * che una sua parte instabilizzi localmente:
 *
 *  - **classe 1 e 2**: la sezione arriva al momento plastico → si usa Wpl;
 *  - **classe 3**: si ferma allo snervamento del lembo → si usa Wel;
 *  - **classe 4**: instabilizza prima ancora di snervare → servirebbero le
 *    proprietà efficaci, che questo modulo **non** calcola: la sezione viene
 *    marcata e va cambiata (o irrigidita), non verificata come se fosse in
 *    classe 3.
 *
 * Ogni parete si classifica per conto suo e la sezione prende la classe
 * peggiore. Le larghezze sono quelle **fra i raccordi**, come vuole il
 * prospetto: c = h − 2·tf − 2·r per l'anima di un doppio T, c = (b − tw −
 * 2·r)/2 per la sporgenza dell'ala.
 */

import { ACCIAIO_STRUTTURALE } from '../data/materiali';
import { proprietaProfilo, type ProprietaProfilo, type TipoProfilo } from '../data/profili-acciaio';

/** ε = √(235/fyk): il termine con cui i limiti si spostano col materiale. */
export const epsilon = (fyk: number): number => (fyk > 0 ? Math.sqrt(235 / fyk) : 1);

/** Come è sollecitata la parete, e quindi quali limiti le si applicano. */
export type Sollecitazione = 'flessione' | 'compressione';

export interface Parete {
  /** Nome leggibile della parete: «anima», «ala», «parete». */
  nome: string;
  /** Larghezza di calcolo c e spessore t (mm). */
  c: number;
  t: number;
  /** Rapporto c/t, o d/t per le sezioni circolari. */
  rapporto: number;
  /** I tre limiti che separano le classi 1|2, 2|3 e 3|4. */
  limiti: [number, number, number];
  classe: 1 | 2 | 3 | 4;
}

export interface RisultatiClasse {
  /** Classe della sezione: la peggiore fra quelle delle sue pareti. */
  classe: 1 | 2 | 3 | 4;
  epsilon: number;
  fyk: number;
  pareti: Parete[];
  /** Vero quando la sezione è snella e il calcolo elastico non basta più. */
  classe4: boolean;
  /**
   * Vero quando la classificazione è stata condotta su una geometria
   * semplificata (tubi e angolari senza raggi di piegatura tabellati).
   */
  approssimata: boolean;
}

/** Classe di una parete dal suo rapporto c/t e dai tre limiti del prospetto. */
function classePare(nome: string, c: number, t: number, limiti: [number, number, number]): Parete {
  const rapporto = t > 0 ? c / t : Infinity;
  const classe = rapporto <= limiti[0] ? 1 : rapporto <= limiti[1] ? 2 : rapporto <= limiti[2] ? 3 : 4;
  return { nome, c, t, rapporto, limiti, classe };
}

/* Limiti dei prospetti, già moltiplicati per ε dal chiamante. */

/** Prospetto 4.2.III — parete interna compressa o inflessa. */
const LIMITI_INTERNA: Record<Sollecitazione, [number, number, number]> = {
  // anima inflessa: asse neutro in mezzeria
  flessione: [72, 83, 124],
  // parete interamente compressa
  compressione: [33, 38, 42],
};

/** Prospetto 4.2.IV — sporgenza d'ala, compressione uniforme. */
const LIMITI_SPORGENZA: [number, number, number] = [9, 10, 14];

/**
 * Classifica il profilo. `sollecitazione` dice come lavora la sezione:
 * in flessione l'anima ha l'asse neutro in mezzeria e limiti larghi, in
 * compressione è tutta compressa e i limiti si stringono. Con azione assiale
 * **e** momento insieme si passa 'compressione', che è il caso peggiore dei
 * due: la classificazione esatta al variare della posizione dell'asse neutro
 * non è implementata, e stare dalla parte severa è l'alternativa onesta.
 */
export function classificaProfilo(
  tipo: TipoProfilo,
  p: ProprietaProfilo | undefined,
  fyk: number,
  sollecitazione: Sollecitazione,
): RisultatiClasse {
  const eps = epsilon(fyk);
  const vuoto: RisultatiClasse = {
    classe: 4,
    epsilon: eps,
    fyk,
    pareti: [],
    classe4: true,
    approssimata: false,
  };
  if (!p) return vuoto;

  const scala = (l: [number, number, number], k = eps): [number, number, number] => [
    l[0] * k,
    l[1] * k,
    l[2] * k,
  ];

  const pareti: Parete[] = [];
  let approssimata = false;

  if (tipo === 'IPE' || tipo === 'HEA' || tipo === 'HEB' || tipo === 'UPN') {
    // anima: parete interna, altezza libera fra i raccordi
    const cw = p.h - 2 * p.tf - 2 * p.r;
    pareti.push(classePare('anima', cw, p.tw, scala(LIMITI_INTERNA[sollecitazione])));
    // ala: sporgenza libera. Un U ha una sola sporgenza per ala, un doppio T
    // due, e la larghezza sporgente cambia di conseguenza
    const cf = tipo === 'UPN' ? p.b - p.tw - p.r : (p.b - p.tw - 2 * p.r) / 2;
    pareti.push(classePare('ala', cf, p.tf, scala(LIMITI_SPORGENZA)));
  } else if (tipo === 'TUBO_QUADRO' || tipo === 'TUBO_RETT') {
    // prospetto 4.2.III: le pareti di una sezione cava sono parti interne.
    // Senza i raggi di piegatura a tabella si usa c = b − 3·t, la convenzione
    // della UNI EN 1993-1-1 per i profili cavi
    approssimata = true;
    pareti.push(
      classePare('anima', p.h - 3 * p.tw, p.tw, scala(LIMITI_INTERNA[sollecitazione])),
      // le ali di una sezione cava inflessa sono tutte compresse
      classePare('ala', p.b - 3 * p.tf, p.tf, scala(LIMITI_INTERNA.compressione)),
    );
  } else if (tipo === 'TUBO_TONDO') {
    // prospetto 4.2.V: le sezioni circolari vanno su d/t, con ε²
    pareti.push(classePare('parete', p.h, p.tw, scala([50, 70, 90], eps ** 2)));
  } else if (tipo === 'ANGOLARE') {
    // prospetto 4.2.V: gli angolari hanno una soglia sola, e sotto quella
    // stanno in classe 3 — non in 1: la sporgenza di un angolare non ha la
    // riserva plastica di un'ala trattenuta dall'anima. I due controlli vanno
    // soddisfatti entrambi.
    approssimata = true;
    const t = p.tw;
    const sogliaUnica = (nome: string, c: number, limite: number): Parete => {
      const rapporto = t > 0 ? c / t : Infinity;
      return {
        nome,
        c,
        t,
        rapporto,
        limiti: [limite, limite, limite],
        classe: rapporto <= limite ? 3 : 4,
      };
    };
    pareti.push(
      sogliaUnica('lato', p.h, 15 * eps),
      sogliaUnica('media dei lati', (p.b + p.h) / 2, 11.5 * eps),
    );
  }

  const classe = pareti.reduce<1 | 2 | 3 | 4>((peggio, w) => (w.classe > peggio ? w.classe : peggio), 1);
  return { classe, epsilon: eps, fyk, pareti, classe4: classe === 4, approssimata };
}

/** Come sopra, partendo da tipo e taglia commerciale. */
export function classificaSezione(
  tipo: TipoProfilo,
  taglia: string,
  acciaio: string,
  sollecitazione: Sollecitazione,
): RisultatiClasse {
  const { fyk } = ACCIAIO_STRUTTURALE[acciaio] ?? ACCIAIO_STRUTTURALE.S275;
  return classificaProfilo(tipo, proprietaProfilo(tipo, taglia), fyk, sollecitazione);
}

/**
 * Il modulo resistente che la classe consente: plastico per le sezioni
 * compatte, elastico dalla classe 3 in su. La classe 4 ricade sull'elastico
 * — non è corretto (servirebbe la sezione efficace) ed è per questo che viene
 * segnalata a parte, non silenziosamente accettata.
 */
export function moduloDaClasse(classe: 1 | 2 | 3 | 4): 'plastico' | 'elastico' {
  return classe <= 2 ? 'plastico' : 'elastico';
}
