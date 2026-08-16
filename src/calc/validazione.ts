/**
 * Controllo dei dati in ingresso.
 *
 * Il motore di calcolo resta tollerante (le funzioni pure non lanciano mai),
 * ma un passo delle staffe pari a 0 o un'altezza utile maggiore dell'altezza
 * della sezione producono un risultato privo di significato: qui si dice quali
 * campi sono fuori dai limiti, così l'interfaccia può marcarli e — soprattutto —
 * non dichiarare un esito falso.
 */

import { num } from './azioni';
import type { InputAzioni } from './azioni';
import type { InputSollecitazioni } from './sollecitazioni';
import type { InputTaglioArmato, InputTaglioNonArmato } from './verifiche';

export type Errori<T> = Partial<Record<keyof T, string>>;

/** true se nessun campo è fuori dai limiti. */
export const valido = (e: Errori<unknown>) => Object.keys(e).length === 0;

const positivo = (v: string, nome: string) =>
  num(v) > 0 ? undefined : `${nome} deve essere maggiore di zero.`;

const nonNegativo = (v: string, nome: string) =>
  num(v) >= 0 ? undefined : `${nome} non può essere negativo.`;

/** Scarta le chiavi senza messaggio, così `valido()` è un semplice conteggio. */
function raccogli<T>(campi: Record<string, string | undefined>): Errori<T> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(campi)) if (v) out[k] = v;
  return out as Errori<T>;
}

/* ─────────────────── §4.1.2.3.5.1 — taglio senza staffe ─────────────────── */

export function validaTaglioNonArmato(inp: InputTaglioNonArmato): Errori<InputTaglioNonArmato> {
  const h = num(inp.h);
  const d = num(inp.d);
  return raccogli({
    VEd: nonNegativo(inp.VEd, 'Il taglio agente'),
    gammaC: num(inp.gammaC) >= 1 ? undefined : 'γc non può essere minore di 1.',
    bw: positivo(inp.bw, 'La larghezza bw'),
    h: positivo(inp.h, "L'altezza h"),
    d:
      positivo(inp.d, "L'altezza utile d") ??
      (h > 0 && d > h ? "L'altezza utile d non può superare l'altezza h della sezione." : undefined),
    n1: nonNegativo(inp.n1, 'Il numero di barre'),
    n2: nonNegativo(inp.n2, 'Il numero di barre'),
  });
}

/* ─────────────────── §4.1.2.3.5.2 — taglio con staffe ───────────────────── */

export function validaTaglioArmato(inp: InputTaglioArmato): Errori<InputTaglioArmato> {
  const alfa = num(inp.alfa);
  const d = num(inp.h) - num(inp.phiStaffa) - num(inp.phiLong) / 2 - num(inp.c);
  return raccogli({
    VEd: nonNegativo(inp.VEd, 'Il taglio agente'),
    gammaC: num(inp.gammaC) >= 1 ? undefined : 'γc non può essere minore di 1.',
    fyd: positivo(inp.fyd, 'La tensione di snervamento fyd'),
    bw: positivo(inp.bw, 'La larghezza bw'),
    h:
      positivo(inp.h, "L'altezza h") ??
      (d <= 0 ? 'Copriferro e diametri consumano tutta la sezione: d risulta ≤ 0.' : undefined),
    c: nonNegativo(inp.c, 'Il copriferro'),
    nBracci: positivo(inp.nBracci, 'Il numero di bracci'),
    passo: positivo(inp.passo, 'Il passo delle staffe'),
    alfa:
      alfa >= 45 && alfa <= 90
        ? undefined
        : "L'inclinazione delle staffe deve stare fra 45° e 90° (§4.1.2.3.5.2).",
  });
}

/* ─────────────────────────── scheda Sollecitazioni ───────────────────────── */

export function validaSollecitazioni(inp: InputSollecitazioni): Errori<InputSollecitazioni> {
  const L = num(inp.L);
  const aP = num(inp.aP);
  const verticale = inp.orientamento === 'verticale';
  return raccogli({
    L: positivo(inp.L, verticale ? "L'altezza H" : 'La luce di calcolo L'),
    interasse: positivo(inp.interasse, "L'interasse"),
    areaInfluenza: verticale ? positivo(inp.areaInfluenza, "L'area di influenza") : undefined,
    aP:
      L > 0 && (aP < 0 || aP > L)
        ? `L'ascissa del carico concentrato deve stare fra 0 e ${L.toFixed(2)} m.`
        : undefined,
    E: positivo(inp.E, 'Il modulo elastico E'),
    J: positivo(inp.J, "Il momento d'inerzia J"),
    pp: nonNegativo(inp.pp, 'Il peso proprio G1'),
    g2: nonNegativo(inp.g2, 'Il carico permanente G2'),
  });
}

/* ─────────────────────────── scheda Azioni ─────────────────────────── */

export function validaAzioni(inp: InputAzioni): Errori<InputAzioni> {
  const phi = num(inp.phi);
  return raccogli({
    vn: num(inp.vn) >= 10 ? undefined : 'La vita nominale VN non può essere minore di 10 anni.',
    q: num(inp.q) >= 1 ? undefined : 'Il fattore di comportamento q non può essere minore di 1.',
    as: nonNegativo(inp.as, 'La quota sul livello del mare'),
    alfaNeve:
      num(inp.alfaNeve) >= 0 && num(inp.alfaNeve) <= 75
        ? undefined
        : "L'inclinazione della falda deve stare fra 0° e 75°.",
    mu: nonNegativo(inp.mu, 'Il coefficiente di forma μ1'),
    ceN: positivo(inp.ceN, 'Il coefficiente di esposizione CE'),
    ct: positivo(inp.ct, 'Il coefficiente termico Ct'),
    z: positivo(inp.z, 'La quota di riferimento z'),
    cd: positivo(inp.cd, 'Il coefficiente dinamico cd'),
    gamma: positivo(inp.gamma, 'Il peso di volume γ'),
    phi:
      phi > 0 && phi < 45
        ? undefined
        : "L'angolo di attrito φ′ deve stare fra 0° e 45° perché Ka di Rankine abbia senso.",
    H: nonNegativo(inp.H, "L'altezza del paramento H"),
    betam:
      !inp.sismaTerre || (num(inp.betam) > 0 && num(inp.betam) <= 1)
        ? undefined
        : 'Il coefficiente βm deve stare fra 0 e 1 (Tab. 7.11.II).',
    betaTerre:
      !inp.sismaTerre || Math.abs(num(inp.betaTerre)) < phi
        ? undefined
        : "L'inclinazione del terrapieno β non può raggiungere l'angolo di attrito φ′.",
    psiTerre:
      !inp.sismaTerre || Math.abs(num(inp.psiTerre)) <= 30
        ? undefined
        : "L'inclinazione del paramento ψ deve stare fra −30° e 30°.",
  });
}
