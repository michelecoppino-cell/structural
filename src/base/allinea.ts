/**
 * Come la copia locale della Base si rimette in pari con OneDrive: la parte
 * pura, senza rete né accesso, e per questo provata a parte.
 */

/** Un file in copia, com'era all'ultima lettura. */
export interface InCopia {
  percorso: string;
  etag: string;
  modificata: string;
  testo: string;
}

const eMarkdown = (p: string) => /\.md$/i.test(p);

/**
 * Allinea la copia con la cartella: scarica i file nuovi o cambiati, butta
 * quelli che non ci sono più. È puro rispetto alla copia che riceve, e per
 * questo si prova senza rete (vedi `base.test.ts`).
 */
export async function allinea(
  copia: InCopia[],
  elenca: () => Promise<{ percorso: string; etag: string; modificato: string; scarico: string }[]>,
  scarica: (percorso: string, scarico: string) => Promise<string>,
): Promise<{ voci: InCopia[]; scaricate: number }> {
  const remoti = (await elenca()).filter((f) => eMarkdown(f.percorso));
  const perPercorso = new Map(copia.map((v) => [v.percorso, v]));
  let scaricate = 0;
  const voci: InCopia[] = [];
  // a gruppi di sei: abbastanza per non aspettare, poco per non farsi fermare da Graph
  for (let k = 0; k < remoti.length; k += 6) {
    const gruppo = remoti.slice(k, k + 6);
    const letti = await Promise.all(
      gruppo.map(async (f) => {
        const vecchia = perPercorso.get(f.percorso);
        if (vecchia && vecchia.etag === f.etag) return vecchia;
        scaricate++;
        return { percorso: f.percorso, etag: f.etag, modificata: f.modificato, testo: await scarica(f.percorso, f.scarico) };
      }),
    );
    voci.push(...letti);
  }
  return { voci, scaricate };
}
