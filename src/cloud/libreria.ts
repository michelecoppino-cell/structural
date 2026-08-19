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
import { leggiNormative, type LinkUtente } from '../data/normative';
import type { Preimpostata } from '../calc/calcolatrice';

/**
 * Versione del formato del file su OneDrive. È salita a 2 quando i documenti
 * hanno preso l'indice scritto a mano (`capitoli`) e a 3 quando hanno preso la
 * categoria: i file scritti dalle versioni precedenti si rileggono lo stesso,
 * `leggiNormative` li completa con un indice vuoto e senza categoria — i
 * documenti finiscono tutti nello scaffale «Senza categoria», da dove si
 * smistano quando fa comodo.
 */
export const LIBRERIA_VERSION = 3;

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
    normative: leggiNormative(o.normative),
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
 *  - c'è da entrambe le parti ma diversa → ha vinto chi l'ha **cambiata**: se
 *    qui è rimasta com'era nella base e altrove è cambiata, quella buona è
 *    quella di là. Solo quando è cambiata da tutte e due le parti vince questo
 *    dispositivo, che è quello che l'utente ha in mano.
 *
 * Quest'ultimo punto è quello che costava le modifiche. Tenere sempre la copia
 * locale non perde *voci*, ma perde quello che è stato **scritto dentro** una
 * voce: le categorie sistemate dal PC sparivano al primo giro fatto dal
 * telefono — che quelle stesse norme le aveva, vecchie, e le rimandava su
 * OneDrive così com'erano — e poi ricomparivano al giro successivo del PC, che
 * faceva la stessa cosa al contrario. Un dispositivo che non ha toccato niente
 * non ha niente da far vincere.
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
  const perId = (l: T[]) => new Map(l.map((v) => [chiave(v), v]));
  const remotiPerId = perId(remoto);
  const basePerId = base ? perId(base) : null;

  // cancellate su questo dispositivo: c'erano all'ultima sincronizzazione e ora
  // non ci sono più qui, quindi non devono rientrare da OneDrive
  const cancellateQui = (id: string) => !!idBase && idBase.has(id) && !idLocali.has(id);
  // cancellate sull'altro dispositivo: idem, a parti invertite
  const cancellateAltrove = (id: string) => !!idBase && idBase.has(id) && !idRemoti.has(id);

  /**
   * La voce da tenere fra le due copie che hanno lo stesso id: quella di qui,
   * a meno che qui non sia rimasta identica a com'era all'ultima
   * sincronizzazione — allora la modifica è solo dell'altro dispositivo, e la
   * modifica batte il «non ho fatto niente».
   */
  const piuRecente = (qui: T, id: string): T => {
    const altrove = remotiPerId.get(id);
    if (altrove === undefined || !basePerId) return qui;
    const prima = basePerId.get(id);
    if (prima === undefined) return qui;
    const cambiataQui = impronta(qui) !== impronta(prima);
    return cambiataQui ? qui : altrove;
  };

  const fuse = locale.filter((v) => !cancellateAltrove(chiave(v))).map((v) => piuRecente(v, chiave(v)));
  for (const v of remoto) {
    const id = chiave(v);
    if (idLocali.has(id) || cancellateQui(id)) continue;
    fuse.push(v);
  }
  return fuse;
}

/**
 * Il contenuto di una voce ridotto a testo, per dire se è cambiata. Le chiavi
 * si ordinano: due dispositivi possono avere costruito lo stesso oggetto in
 * ordine diverso, e una differenza che non c'è farebbe credere a una modifica.
 */
function impronta(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(impronta).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${impronta(o[k])}`)
    .join(',')}}`;
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

/**
 * Rete di protezione prima di scrivere su OneDrive: elenca le voci che
 * **sparirebbero** dal file senza che nessuno le abbia cancellate.
 *
 * Una voce può legittimamente uscire dal file solo se era nella fotografia
 * dell'ultima sincronizzazione e non è più sul dispositivo — quella è una
 * cancellazione vera, fatta da qualcuno. Tutto il resto è un guasto: un file
 * letto male, una fotografia disallineata, un errore di fusione. La differenza
 * fra le due cose non si vede a occhio nel file scritto, e quando la si scopre
 * i dati sono già andati — quindi la si controlla prima, ogni volta.
 *
 * @returns le sigle o i valori delle voci a rischio; vuoto se è tutto in regola.
 */
export function perditeIngiustificate(remoto: Libreria, fusa: Libreria, base: Libreria | null): string[] {
  const perse = <T>(rem: T[], fus: T[], bas: T[] | undefined, chiave: (v: T) => string, nome: (v: T) => string) => {
    const idFusi = new Set(fus.map(chiave));
    const idBase = new Set((bas ?? []).map(chiave));
    return rem.filter((v) => !idFusi.has(chiave(v)) && !idBase.has(chiave(v))).map(nome);
  };
  return [
    ...perse(remoto.normative, fusa.normative, base?.normative, (v) => v.id, (v) => v.sigla || v.id),
    ...perse(remoto.unita, fusa.unita, base?.unita, (v) => v, (v) => v),
    ...perse(remoto.preimpostate, fusa.preimpostate, base?.preimpostate, (v) => v.id, (v) => v.nome || v.id),
  ];
}
