/**
 * Calcolatrice di predimensionamento: interprete di espressioni con variabili
 * con nome, pensato per la sequenza tipica di un calcolo a mano — mi calcolo
 * un'area, poi un'incidenza, poi le moltiplico, e ogni passaggio ha un nome.
 *
 * Funzioni pure, niente React: l'intera scheda è ricalcolabile dallo stato.
 *
 * Sintassi accettata:
 *  - numeri con punto o virgola decimale (`3.5` = `3,5`), notazione `1e3`;
 *  - operatori `+ - * / ^` (`^` associativo a destra), parentesi, meno unario;
 *  - `%` suffisso = «per cento» (`120*5%` → 6), come su una calcolatrice;
 *  - moltiplicazione implicita fra un valore e una parentesi o un nome
 *    (`2(3+4)`, `3area`, `2pi`);
 *  - funzioni con argomenti separati da `;` (separatore it-IT, la virgola è
 *    già occupata dai decimali): `min(3;5)`;
 *  - variabili: i nomi delle operazioni salvate, più `ans` (ultimo risultato).
 *
 * Le funzioni trigonometriche lavorano in **gradi** (`tan(45)` = 1): in questo
 * ambito gli angoli si scrivono in gradi — α delle staffe, φ′ del terreno.
 */

const GRADI = Math.PI / 180;

/** Funzioni disponibili, con il numero di argomenti ammessi. */
export const FUNZIONI: Record<string, { arieta: number[]; f: (...a: number[]) => number; descr: string }> = {
  sqrt: { arieta: [1], f: Math.sqrt, descr: 'radice quadrata' },
  abs: { arieta: [1], f: Math.abs, descr: 'valore assoluto' },
  round: { arieta: [1, 2], f: (x, d = 0) => arrotonda(x, d), descr: 'arrotonda a d decimali' },
  floor: { arieta: [1], f: Math.floor, descr: 'arrotonda per difetto' },
  ceil: { arieta: [1], f: Math.ceil, descr: 'arrotonda per eccesso' },
  min: { arieta: [1, 2, 3, 4, 5, 6], f: (...a) => Math.min(...a), descr: 'minimo' },
  max: { arieta: [1, 2, 3, 4, 5, 6], f: (...a) => Math.max(...a), descr: 'massimo' },
  ln: { arieta: [1], f: Math.log, descr: 'logaritmo naturale' },
  log: { arieta: [1], f: Math.log10, descr: 'logaritmo in base 10' },
  exp: { arieta: [1], f: Math.exp, descr: 'e elevato a x' },
  sin: { arieta: [1], f: (x) => Math.sin(x * GRADI), descr: 'seno (gradi)' },
  cos: { arieta: [1], f: (x) => Math.cos(x * GRADI), descr: 'coseno (gradi)' },
  tan: { arieta: [1], f: (x) => Math.tan(x * GRADI), descr: 'tangente (gradi)' },
  asin: { arieta: [1], f: (x) => Math.asin(x) / GRADI, descr: 'arcoseno (gradi)' },
  acos: { arieta: [1], f: (x) => Math.acos(x) / GRADI, descr: 'arcocoseno (gradi)' },
  atan: { arieta: [1], f: (x) => Math.atan(x) / GRADI, descr: 'arcotangente (gradi)' },
};

/** Costanti sempre disponibili, anche senza operazioni salvate. */
export const COSTANTI: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E };

function arrotonda(x: number, d: number): number {
  const k = 10 ** Math.round(d);
  return Math.round(x * k) / k;
}

/* ─────────────────────────── analisi lessicale ─────────────────────────── */

type Token =
  | { t: 'num'; v: number }
  | { t: 'nome'; v: string }
  | { t: 'op'; v: string }
  | { t: 'par'; v: '(' | ')' }
  | { t: 'sep' };

const OPERATORI = '+-*/^';

/** Un nome inizia per lettera (o `_`) e prosegue con lettere, cifre, `_`. */
const INIZIO_NOME = /[\p{L}_]/u;
const CORPO_NOME = /[\p{L}\p{N}_]/u;

class ErroreCalcolo extends Error {}

function tokenizza(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (c === ' ' || c === '\t' || c === '\n') {
      i += 1;
      continue;
    }

    // numero: cifre con punto o virgola decimale, più esponente 1e3 / 1E-3
    if (/[0-9]/.test(c) || ((c === '.' || c === ',') && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i;
      while (j < src.length && /[0-9.,]/.test(src[j])) j += 1;
      if (/[eE]/.test(src[j] ?? '') && /[0-9+-]/.test(src[j + 1] ?? '')) {
        j += 2;
        while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      }
      const grezzo = src.slice(i, j).replace(/,/g, '.');
      const v = Number(grezzo);
      if (!Number.isFinite(v)) throw new ErroreCalcolo(`numero non valido: ${src.slice(i, j)}`);
      out.push({ t: 'num', v });
      i = j;
      continue;
    }

    if (INIZIO_NOME.test(c)) {
      let j = i;
      while (j < src.length && CORPO_NOME.test(src[j])) j += 1;
      out.push({ t: 'nome', v: src.slice(i, j) });
      i = j;
      continue;
    }

    // i segni "belli" che arrivano dal tastierino o da un copia-incolla
    if (c === '×') {
      out.push({ t: 'op', v: '*' });
      i += 1;
      continue;
    }
    if (c === '÷' || c === ':') {
      out.push({ t: 'op', v: '/' });
      i += 1;
      continue;
    }
    if (c === '−' || c === '–') {
      out.push({ t: 'op', v: '-' });
      i += 1;
      continue;
    }
    if (c === '√') {
      out.push({ t: 'nome', v: 'sqrt' });
      i += 1;
      continue;
    }

    if (OPERATORI.includes(c) || c === '%') {
      out.push({ t: 'op', v: c });
      i += 1;
      continue;
    }
    if (c === '(' || c === '[') {
      out.push({ t: 'par', v: '(' });
      i += 1;
      continue;
    }
    if (c === ')' || c === ']') {
      out.push({ t: 'par', v: ')' });
      i += 1;
      continue;
    }
    if (c === ';') {
      out.push({ t: 'sep' });
      i += 1;
      continue;
    }

    throw new ErroreCalcolo(`carattere non ammesso: «${c}»`);
  }

  return out;
}

/* ─────────────────────────── analisi sintattica ─────────────────────────── */

/**
 * Discesa ricorsiva sulla grammatica:
 *   somma   := prodotto (('+'|'-') prodotto)*
 *   prodotto:= unario (('*'|'/') unario)*
 *   unario  := ('-'|'+') unario | potenza
 *   potenza := postfisso ('^' unario)?        — associativa a destra, e con
 *              l'unario a destra perché `-3^2` vale −9 e `2^-1` vale 0.5
 *   postfisso := primario '%'*
 *   primario:= numero | nome | nome '(' argomenti ')' | nome unario |
 *              '(' somma ')'
 */
class Parser {
  private i = 0;

  constructor(
    private readonly tk: Token[],
    private readonly vars: Record<string, number>,
  ) {}

  private guarda(): Token | undefined {
    return this.tk[this.i];
  }

  /** true se il token corrente può iniziare un valore: serve al prodotto implicito. */
  private iniziaValore(): boolean {
    const t = this.guarda();
    return !!t && (t.t === 'num' || t.t === 'nome' || (t.t === 'par' && t.v === '('));
  }

  valuta(): number {
    const v = this.somma();
    if (this.i < this.tk.length) throw new ErroreCalcolo('espressione incompleta o parentesi di troppo');
    return v;
  }

  private somma(): number {
    let v = this.prodotto();
    for (;;) {
      const t = this.guarda();
      if (t?.t === 'op' && (t.v === '+' || t.v === '-')) {
        this.i += 1;
        const b = this.prodotto();
        v = t.v === '+' ? v + b : v - b;
      } else return v;
    }
  }

  private prodotto(): number {
    let v = this.unario();
    for (;;) {
      const t = this.guarda();
      if (t?.t === 'op' && (t.v === '*' || t.v === '/')) {
        this.i += 1;
        const b = this.unario();
        v = t.v === '*' ? v * b : v / b;
      } else if (this.iniziaValore()) {
        // prodotto implicito: 2(3+4), 3area, 2pi
        v *= this.unario();
      } else return v;
    }
  }

  private unario(): number {
    const t = this.guarda();
    if (t?.t === 'op' && (t.v === '-' || t.v === '+')) {
      this.i += 1;
      const v = this.unario();
      return t.v === '-' ? -v : v;
    }
    return this.potenza();
  }

  private potenza(): number {
    const base = this.postfisso();
    const t = this.guarda();
    if (t?.t === 'op' && t.v === '^') {
      this.i += 1;
      return base ** this.unario();
    }
    return base;
  }

  private postfisso(): number {
    let v = this.primario();
    for (;;) {
      const t = this.guarda();
      if (t?.t === 'op' && t.v === '%') {
        this.i += 1;
        v /= 100;
      } else return v;
    }
  }

  private primario(): number {
    const t = this.guarda();
    if (!t) throw new ErroreCalcolo('manca un valore alla fine dell’espressione');

    if (t.t === 'num') {
      this.i += 1;
      return t.v;
    }

    if (t.t === 'par' && t.v === '(') {
      this.i += 1;
      const v = this.somma();
      const chiusa = this.guarda();
      if (!(chiusa?.t === 'par' && chiusa.v === ')')) throw new ErroreCalcolo('manca una parentesi chiusa');
      this.i += 1;
      return v;
    }

    if (t.t === 'nome') {
      this.i += 1;
      const nome = t.v;
      const dopo = this.guarda();
      const fn = FUNZIONI[nome.toLowerCase()];

      if (dopo?.t === 'par' && dopo.v === '(' && fn) {
        this.i += 1;
        const args: number[] = [];
        if (!(this.guarda()?.t === 'par' && (this.guarda() as { v: string }).v === ')')) {
          args.push(this.somma());
          while (this.guarda()?.t === 'sep') {
            this.i += 1;
            args.push(this.somma());
          }
        }
        const chiusa = this.guarda();
        if (!(chiusa?.t === 'par' && chiusa.v === ')')) throw new ErroreCalcolo(`manca una parentesi chiusa in ${nome}()`);
        this.i += 1;
        if (!fn.arieta.includes(args.length))
          throw new ErroreCalcolo(`${nome}() non accetta ${args.length} argomenti`);
        return fn.f(...args);
      }

      if (nome in this.vars) return this.vars[nome];
      if (nome in COSTANTI) return COSTANTI[nome];
      // funzione a un argomento senza parentesi, come sul tastierino: √81, sin 30
      if (fn && fn.arieta.includes(1) && this.iniziaValore()) return fn.f(this.unario());
      if (fn) throw new ErroreCalcolo(`a ${nome}() manca l’argomento fra parentesi`);
      throw new ErroreCalcolo(`nome sconosciuto: ${nome}`);
    }

    throw new ErroreCalcolo('manca un valore');
  }
}

/* ─────────────────────────── interfaccia pubblica ─────────────────────────── */

export type Esito = { ok: true; valore: number } | { ok: false; errore: string };

/** Valuta un'espressione con le variabili date. Non solleva mai: torna l'errore. */
export function valuta(espressione: string, vars: Record<string, number> = {}): Esito {
  const src = espressione.trim();
  if (!src) return { ok: false, errore: 'espressione vuota' };
  try {
    const valore = new Parser(tokenizza(src), vars).valuta();
    if (!Number.isFinite(valore)) return { ok: false, errore: 'risultato non finito (divisione per zero?)' };
    return { ok: true, valore };
  } catch (e) {
    return { ok: false, errore: e instanceof ErroreCalcolo ? e.message : 'espressione non valida' };
  }
}

/* ─────────────────────────── operazioni salvate ─────────────────────────── */

export interface VoceCalcolo {
  id: string;
  /** Nome della variabile; vuoto = operazione salvata ma non riusabile per nome. */
  nome: string;
  espressione: string;
  nota: string;
  /** Unità di misura, solo descrittiva (m², kN/m², …). */
  um: string;
}

export interface VoceCalcolata extends VoceCalcolo {
  valore: number;
  errore: string;
  /** Nome valido e non già usato prima: solo allora la voce è richiamabile. */
  nomeValido: boolean;
}

/**
 * Ricalcola l'intera sequenza: ogni voce vede le variabili definite dalle voci
 * che la precedono, così correggere l'area a monte aggiorna tutto quello che
 * ne discende senza doverlo riscrivere.
 */
export function ricalcola(voci: VoceCalcolo[]): VoceCalcolata[] {
  const vars: Record<string, number> = {};
  const usati = new Set<string>();

  return voci.map((v) => {
    const esito = valuta(v.espressione, vars);
    const nome = v.nome.trim();
    const nomeValido =
      !!nome && nomeAmmesso(nome) && !usati.has(nome) && !(nome in COSTANTI) && !(nome.toLowerCase() in FUNZIONI);

    if (esito.ok && nomeValido) {
      vars[nome] = esito.valore;
      usati.add(nome);
    }
    // `ans` è sempre l'ultimo risultato utile della sequenza
    if (esito.ok) vars.ans = esito.valore;

    return {
      ...v,
      valore: esito.ok ? esito.valore : NaN,
      errore: esito.ok ? '' : esito.errore,
      nomeValido,
    };
  });
}

/** Variabili disponibili a valle della sequenza (nome → valore). */
export function variabili(voci: VoceCalcolata[]): Record<string, number> {
  const vars: Record<string, number> = {};
  for (const v of voci) if (v.nomeValido && Number.isFinite(v.valore)) vars[v.nome.trim()] = v.valore;
  const ultima = [...voci].reverse().find((v) => Number.isFinite(v.valore));
  if (ultima) vars.ans = ultima.valore;
  return vars;
}

export function nomeAmmesso(nome: string): boolean {
  const n = nome.trim();
  if (!n) return false;
  if (!INIZIO_NOME.test(n[0])) return false;
  return [...n].every((c) => CORPO_NOME.test(c));
}

/**
 * Formato dei numeri in output: notazione scientifica solo dove serve davvero,
 * altrimenti fino a 6 cifre significative senza zeri inutili in coda.
 */
export function formatta(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e9 || a < 1e-6)) return v.toExponential(4).replace('e', '·10^');
  const s = v.toFixed(a >= 1000 ? 2 : a >= 1 ? 4 : 6);
  return s.replace(/\.?0+$/, '');
}

/** Riga estesa «nome = espressione = risultato», per la relazione e l'export. */
export function testoVoce(v: VoceCalcolata): string {
  const testa = v.nome.trim() ? `${v.nome.trim()} = ` : '';
  const um = v.um.trim() ? ` ${v.um.trim()}` : '';
  const valore = v.errore ? `errore: ${v.errore}` : `${formatta(v.valore)}${um}`;
  const nota = v.nota.trim() ? `   — ${v.nota.trim()}` : '';
  return `${testa}${v.espressione} = ${valore}${nota}`;
}
