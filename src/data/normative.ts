/**
 * Le norme della libreria personale: documenti e indici che l'utente inserisce
 * a mano dalla scheda Normativa (NTC, Circolare, CNR, Eurocodici, capitolati,
 * qualunque link — non c'è più nessun indice di serie incluso nell'app).
 *
 * Ogni documento ha un indirizzo — di preferenza il link al PDF su OneDrive —
 * e, se l'utente lo scrive, un indice dei capitoli. L'indice è un dato senza
 * pretese: non porta a nessuna pagina, serve solo a ricordare a colpo d'occhio
 * a che pagina del documento sta un capitolo, per trovarla in fretta una volta
 * aperto il link.
 *
 * Sono dati di chi usa l'app, non della commessa: vivono nello stato al pari
 * del resto ma escono di qui per due strade che il resto non ha — sopravvivono
 * a «Svuota tutto» e vanno nel file su OneDrive (vedi `cloud/libreria.ts`).
 */

export interface CapitoloIndice {
  id: string;
  /** Numero o lettera del capitolo, come lo scrive l'utente: i punti danno il rientro ("2.1" sotto "2"). */
  numero: string;
  titolo: string;
  /** Pagina del documento — testo libero, così ci stanno anche intervalli come "45-60". */
  pagina: string;
}

/**
 * Un documento della libreria: ha una testata (sigla ocra, titolo bianco) e,
 * sotto, l'indice scritto a mano.
 */
export interface LinkUtente {
  id: string;
  /** Sigla o tipo — la riga ocra (es. "NTC 2018", "CNR-DT 207/2018 R1", "LINK"). */
  sigla: string;
  titolo: string;
  url: string;
  capitoli: CapitoloIndice[];
}

/**
 * Rilegge l'elenco dei documenti da un JSON arrivato da fuori (il file di
 * OneDrive o un progetto importato): si accetta campo per campo, e l'indirizzo
 * passa da `urlSicuro` — un file arrivato da fuori non deve poter mettere uno
 * schema eseguibile (`javascript:…`) dentro un link dell'app.
 */
export function leggiNormative(raw: unknown): LinkUtente[] {
  return (Array.isArray(raw) ? raw : []).flatMap((v: unknown, i) => {
    const n = (v ?? {}) as Partial<LinkUtente>;
    const url = urlSicuro(n.url);
    if (!url) return [];
    const capitoli = (Array.isArray(n.capitoli) ? n.capitoli : []).flatMap((c: unknown, j) => {
      const cc = (c ?? {}) as Partial<CapitoloIndice>;
      if (typeof cc.numero !== 'string' && typeof cc.titolo !== 'string') return [];
      return [{ id: cc.id || `cap-${i}-${j}`, numero: cc.numero ?? '', titolo: cc.titolo ?? '', pagina: cc.pagina ?? '' }];
    });
    return [{ id: n.id || `norma-${i}`, sigla: n.sigla ?? '', titolo: n.titolo ?? '', url, capitoli }];
  });
}

/**
 * Quanti livelli sotto la testata sta un capitolo: i punti nel numero danno il
 * rientro, come per i paragrafi delle norme prima che l'indice diventasse
 * scritto a mano — `2` → 0, `2.1` → 1, `2.1.3` → 2. Un numero senza cifre (una
 * lettera d'appendice come "A-D") resta a livello 0.
 */
export function livelloCapitolo(numero: string): number {
  const cifre = numero.match(/[0-9][0-9.]*/);
  if (!cifre) return 0;
  return Math.max(0, cifre[0].split('.').filter(Boolean).length - 1);
}

/**
 * Ripulisce un indirizzo scritto o importato: completa lo schema mancante
 * (`cnr.it/…` → `https://cnr.it/…`) e restituisce `null` per tutto ciò che non
 * è `http`/`https`.
 *
 * Serve nei due punti in cui un URL entra nell'app: il campo della scheda
 * Normativa e il JSON di un progetto (o della libreria) importato. Il secondo
 * è quello che conta davvero — un file arrivato da fuori (per mail, da un
 * collega, ritrovato in una cartella) può portarsi dentro un `javascript:…`
 * che l'app finirebbe per mettere in un `href`, cioè per eseguire al primo
 * clic dentro la propria pagina, con tutto quello che c'è in localStorage a
 * portata di mano.
 */
export function urlSicuro(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const u = url.trim();
  if (!u) return null;
  const completo = /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`;
  try {
    const parsed = new URL(completo);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return completo;
  } catch {
    return null;
  }
}
