/**
 * La Base tecnica su OneDrive: la cartella `strutturale/base/`, letta e
 * scritta da qui.
 *
 * Regole:
 *
 *  - **OneDrive è la verità**. A differenza della libreria, qui il locale è
 *    solo una copia per leggere senza rete: le schede le scrivono anche altri
 *    (un editor sul computer, Claude dal connettore), e una copia locale che si
 *    credesse la verità finirebbe per cancellarle.
 *  - **si scarica solo quello che è cambiato**. Ogni file porta il suo ETag;
 *    uno uguale a quello in copia non si riscarica. Cento schede costano una
 *    chiamata per l'elenco, e poi solo quelle toccate.
 *  - **si scrive sopra solo quello che si è letto**. Se il file è cambiato
 *    altrove dopo l'ultima lettura, la scrittura si ferma e lo dice.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { account, ServeAccesso, SINCRONIA_CONFIGURATA } from '../cloud/auth';
import { elencaFile, leggiTesto, ModificatoAltrove, scriviTesto } from '../cloud/onedrive';
import { leggiScheda, type Scheda } from './schede';
import { allinea, type InCopia } from './allinea';

export type { InCopia };

/** La cartella della Base, dentro quella dell'app. */
export const CARTELLA_BASE = 'base';

/** Dove sta la copia per leggere senza rete. */
const CHIAVE_COPIA = 'structural:base';

function leggiCopia(): InCopia[] {
  try {
    const grezza = localStorage.getItem(CHIAVE_COPIA);
    const dati = grezza ? (JSON.parse(grezza) as { voci?: InCopia[] }) : null;
    return Array.isArray(dati?.voci) ? dati.voci.filter((v) => typeof v?.testo === 'string') : [];
  } catch {
    return [];
  }
}

function scriviCopia(voci: InCopia[]): void {
  try {
    localStorage.setItem(CHIAVE_COPIA, JSON.stringify({ voci }));
  } catch {
    // copia piena o storage spento: la Base funziona lo stesso, solo non offline
  }
}

const inSchede = (voci: InCopia[]) =>
  voci.map((v) => leggiScheda(v.percorso, v.testo, v.modificata)).sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'));

export type StatoBase =
  /** manca il client id: l'app gira in locale, e la Base non ha dove stare */
  | 'spenta'
  /** nessun account collegato su questo dispositivo */
  | 'scollegata'
  | 'in-corso'
  | 'pronta'
  /** l'accesso è scaduto: serve un clic sul pannello di OneDrive */
  | 'scaduta'
  | 'errore';

export function useBase(collegato: boolean) {
  const [voci, setVoci] = useState<InCopia[]>(leggiCopia);
  const [stato, setStato] = useState<StatoBase>(SINCRONIA_CONFIGURATA ? 'scollegata' : 'spenta');
  const [errore, setErrore] = useState('');
  const vociRef = useRef(voci);
  vociRef.current = voci;

  const aggiorna = useCallback(async () => {
    if (!SINCRONIA_CONFIGURATA) return;
    if (!account()) {
      setStato('scollegata');
      return;
    }
    setStato('in-corso');
    setErrore('');
    try {
      const { voci: nuove } = await allinea(
        vociRef.current,
        () => elencaFile(CARTELLA_BASE),
        (p, scarico) => leggiTesto(`${CARTELLA_BASE}/${p}`, scarico),
      );
      vociRef.current = nuove;
      setVoci(nuove);
      scriviCopia(nuove);
      setStato('pronta');
    } catch (e) {
      if (e instanceof ServeAccesso) setStato('scaduta');
      else {
        setStato('errore');
        setErrore(e instanceof Error ? e.message : String(e));
      }
    }
  }, []);

  // al collegamento, e ogni volta che la scheda torna in primo piano
  useEffect(() => {
    if (collegato) void aggiorna();
    else setStato(SINCRONIA_CONFIGURATA ? 'scollegata' : 'spenta');
  }, [collegato, aggiorna]);

  /**
   * Salva una scheda. Una scheda nuova si scrive solo se il nome è libero,
   * una esistente solo sopra la versione letta: se è cambiata altrove si
   * rilegge la Base e l'errore lo dice, senza perdere il testo che si stava
   * scrivendo (resta a chi ha chiamato).
   */
  const salva = useCallback(
    async (percorso: string, testo: string): Promise<Scheda> => {
      const vecchia = vociRef.current.find((v) => v.percorso === percorso);
      try {
        const { etag, modificato } = await scriviTesto(
          `${CARTELLA_BASE}/${percorso}`,
          testo,
          vecchia ? { etag: vecchia.etag } : { nuovo: true },
        );
        const voce: InCopia = { percorso, etag, modificata: modificato, testo };
        const nuove = [...vociRef.current.filter((v) => v.percorso !== percorso), voce];
        // subito, non al prossimo disegno: due salvataggi di fila (i modelli
        // di partenza) altrimenti partirebbero dalla stessa copia vecchia
        vociRef.current = nuove;
        setVoci(nuove);
        scriviCopia(nuove);
        return leggiScheda(percorso, testo, modificato);
      } catch (e) {
        if (e instanceof ModificatoAltrove) void aggiorna();
        if (e instanceof ServeAccesso) setStato('scaduta');
        throw e;
      }
    },
    [aggiorna],
  );

  const schede = useMemo(() => inSchede(voci), [voci]);
  return { schede, stato, errore, aggiorna, salva };
}

export type Base = ReturnType<typeof useBase>;
