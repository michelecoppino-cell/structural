/**
 * La **libreria personale**: le poche cose dell'app che non appartengono a una
 * commessa ma a chi la usa — le norme e i link aggiunti a mano, le unità di
 * misura proposte, le formule preimpostate.
 *
 * Sono i dati che devono comportarsi al contrario di tutti gli altri:
 * sopravvivere a «Svuota tutto», ritrovarsi identici sul telefono in cantiere e
 * sul PC in ufficio, e non sparire quando il browser fa pulizia della memoria.
 * Per questo vivono anche fuori dal browser, in un unico JSON su OneDrive.
 *
 * Qui dentro non si parla né di rete né di Microsoft: c'è solo la forma del
 * file e la regola con cui due copie della libreria tornano a essere una.
 */
import { urlSicuro, type LinkUtente } from '../data/normative';
import type { Preimpostata } from '../calc/calcolatrice';

/** Versione del formato del file su OneDrive. */
export const LIBRERIA_VERSION = 1;

export interface Libreria {
  schemaVersion: number;
  /** Quando è stata scritta l'ultima volta, in ISO: si legge nel pannello. */
  aggiornato: string;
  normative: LinkUtente[];
  unita: string[];
  preimpostate: Preimpostata[];
}

export function libreriaVuota(): Libreria {
  return { schemaVersion: LIBRERIA_VERSION, aggiornato: '', normative: [], unita: [], preimpostate: [] };
}

/**
 * Rilegge un file arrivato da OneDrive. Vale lo stesso principio del JSON di
 * progetto importato: è testo che viene da fuori dal codice, quindi si accetta
 * campo per campo e gli indirizzi passano da `urlSicuro`.
 */
export function leggiLibreria(raw: unknown): Libreria {
  const o = (raw ?? {}) as Partial<Libreria>;
  return {
    schemaVersion: LIBRERIA_VERSION,
    aggiornato: typeof o.aggiornato === 'string' ? o.aggiornato : '',
    normative: (Array.isArray(o.normative) ? o.normative : []).flatMap((v, i) => {
      const url = urlSicuro((v as LinkUtente)?.url);
      if (!url) return [];
      const n = v as LinkUtente;
      return [{ id: n.id || `norma-${i}`, sigla: n.sigla ?? '', titolo: n.titolo ?? '', url }];
    }),
    unita: (Array.isArray(o.unita) ? o.unita : []).filter((u): u is string => typeof u === 'string' && !!u.trim()),
    preimpostate: (Array.isArray(o.preimpostate) ? o.preimpostate : []).flatMap((v, i) => {
      const p = v as Preimpostata;
      if (!p || typeof p.espressione !== 'string') return [];
      return [{ id: p.id || `pre-${i}`, nome: p.nome ?? '', espressione: p.espressione, nota: p.nota ?? '', um: p.um ?? '' }];
    }),
  };
}

/* ───────────────────────────── fusione a tre vie ───────────────────────────── */

/**
 * Perché a **tre** vie. Con due sole liste — questo dispositivo e OneDrive —
 * non c'è modo di distinguere «l'ho appena aggiunta qui» da «l'ho appena
 * cancellata là»: in un caso la voce va tenuta, nell'altro va tolta, ma da
 * fuori le due situazioni sono identiche. Il risultato tipico è la voce
 * cancellata sul telefono che ricompare al primo accesso dal PC.
 *
 * La terza via è la fotografia dell'ultima sincronizzazione riuscita (la
 * *base*, tenuta in locale). Confrontando entrambe le liste con quella si sa
 * sempre chi ha fatto cosa:
 *
 *  - c'era nella base e ora manca da una parte → è stata **cancellata** lì, e
 *    la cancellazione vince;
 *  - non c'era nella base e ora c'è da una parte → è stata **aggiunta**, e si
 *    tiene;
 *  - c'è da entrambe le parti ma diversa → vince questo dispositivo, che è
 *    quello che l'utente ha in mano.
 *
 * Alla prima sincronizzazione in assoluto la base non esiste: si passa `null` e
 * le due liste si sommano, che è l'unica scelta che non butta via niente.
 */
function fondiElenco<T>(
  locale: T[],
  remoto: T[],
  base: T[] | null,
  chiave: (v: T) => string,
): T[] {
  const idLocali = new Set(locale.map(chiave));
  const idRemoti = new Set(remoto.map(chiave));
  const idBase = base ? new Set(base.map(chiave)) : null;

  // cancellate su questo dispositivo: c'erano all'ultima sincronizzazione e ora
  // non ci sono più qui, quindi non devono rientrare da OneDrive
  const cancellateQui = (id: string) => !!idBase && idBase.has(id) && !idLocali.has(id);
  // cancellate sull'altro dispositivo: idem, a parti invertite
  const cancellateAltrove = (id: string) => !!idBase && idBase.has(id) && !idRemoti.has(id);

  const fuse = locale.filter((v) => !cancellateAltrove(chiave(v)));
  for (const v of remoto) {
    const id = chiave(v);
    if (idLocali.has(id) || cancellateQui(id)) continue;
    fuse.push(v);
  }
  return fuse;
}

/**
 * Le due copie della libreria tornano una sola.
 * @param base la libreria com'era all'ultima sincronizzazione riuscita, o
 *   `null` se non c'è ancora stata.
 */
export function fondiLibrerie(locale: Libreria, remoto: Libreria, base: Libreria | null): Libreria {
  return {
    schemaVersion: LIBRERIA_VERSION,
    aggiornato: new Date().toISOString(),
    normative: fondiElenco(locale.normative, remoto.normative, base?.normative ?? null, (v) => v.id),
    unita: fondiElenco(locale.unita, remoto.unita, base?.unita ?? null, (v) => v),
    preimpostate: fondiElenco(locale.preimpostate, remoto.preimpostate, base?.preimpostate ?? null, (v) => v.id),
  };
}

/** Due librerie hanno lo stesso contenuto? (la data di scrittura non conta) */
export function stessoContenuto(a: Libreria, b: Libreria): boolean {
  const spoglia = (l: Libreria) => JSON.stringify([l.normative, l.unita, l.preimpostate]);
  return spoglia(a) === spoglia(b);
}
