/**
 * I blocchi ` ```calcolo ` delle schede: righe di Quaderno dentro un appunto.
 *
 * Una scheda di studio che spiega il momento in mezzeria può anche calcolarlo,
 * con lo stesso motore del Quaderno — unità che si convertono comprese. La
 * sintassi è quella che si scriverebbe a mano:
 *
 * ```calcolo
 * # dati
 * q = 25 [kN/m]          # carico distribuito
 * l = 6 [m]
 * M = q*l^2/8 [kNm]      # momento in mezzeria
 * ```
 *
 *  - `nome = espressione` definisce una grandezza, e le righe sotto la usano;
 *  - `[unità]` in fondo è l'unità in cui leggere il risultato;
 *  - `# …` dopo la formula è la nota, e una riga che comincia con `#` è un
 *    titoletto dentro il blocco.
 *
 * Il blocco è chiuso in sé: vede le sue righe e nient'altro. È quello che lo
 * rende rileggibile fra un anno, e trasportabile nel Quaderno così com'è.
 */
import { ricalcola, type VoceCalcolata, type VoceCalcolo } from '../calc/calcolatrice';
import { UNITA_DEFAULT } from '../calc/unita';

export type RigaCalcolo = { t: 'titoletto'; testo: string } | { t: 'voce'; voce: VoceCalcolata };

/** Una riga del blocco, prima del calcolo. */
export type RigaLetta = { t: 'titoletto'; testo: string } | { t: 'voce'; voce: VoceCalcolo };

/** Il cancelletto della nota: staccato da quello che lo precede, perché `C#` non è una nota. */
function divideNota(riga: string): [string, string] {
  const m = /(^|\s)#\s?(.*)$/.exec(riga);
  if (!m || m.index === 0) return [riga, ''];
  return [riga.slice(0, m.index), m[2].trim()];
}

/** Le righe del blocco, lette ma non ancora calcolate. */
export function leggiCalcolo(testo: string): RigaLetta[] {
  const out: RigaLetta[] = [];
  testo.split(/\r?\n/).forEach((grezza, k) => {
    const riga = grezza.trim();
    if (!riga) return;
    if (riga.startsWith('#')) {
      out.push({ t: 'titoletto', testo: riga.replace(/^#+\s*/, '') });
      return;
    }
    const [formula, nota] = divideNota(riga);
    let resto = formula.trim();
    let um = '';
    const u = /\[([^\]]*)\]\s*$/.exec(resto);
    if (u) {
      um = u[1].trim();
      resto = resto.slice(0, u.index).trim();
    }
    // il primo uguale separa il nome dall'espressione; senza, è un conto e basta
    const uguale = resto.indexOf('=');
    const nome = uguale > 0 ? resto.slice(0, uguale).trim() : '';
    const espressione = uguale > 0 ? resto.slice(uguale + 1).trim() : resto;
    out.push({
      t: 'voce',
      voce: { id: `base-${k}`, nome, espressione, nota, um, tipo: 'operazione' },
    });
  });
  return out;
}

/** Il blocco calcolato: ogni riga vede le grandezze definite sopra di lei. */
export function calcolaBlocco(testo: string, unita: string[] = UNITA_DEFAULT): RigaCalcolo[] {
  const righe = leggiCalcolo(testo);
  const voci = righe.flatMap((r) => (r.t === 'voce' ? [r.voce] : []));
  const calcolate = ricalcola(voci, unita);
  let k = 0;
  return righe.map((r) => (r.t === 'voce' ? { t: 'voce', voce: calcolate[k++] } : r));
}
