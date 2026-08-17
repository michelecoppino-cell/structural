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
 *  - variabili: i nomi delle operazioni salvate, più `ans` (ultimo risultato);
 *    i pesi di volume si scrivono con la γ ma si richiamano anche con la g
 *    latina (`gC` = `gammaC` = `γC`), che sulla tastiera c'è sempre.
 *
 * Le funzioni trigonometriche lavorano in **gradi** (`tan(45)` = 1): in questo
 * ambito gli angoli si scrivono in gradi — α delle staffe, φ′ del terreno.
 */

import {
  UNITA_DEFAULT,
  adimensionale,
  divDim,
  leggiUnita,
  mulDim,
  powDim,
  scriviUnita,
  ugualiDim,
  unitaInElenco,
  type Dim,
} from './unita';
import { ACCIAI, CLS, COEFF_DEFAULT, ecmCLS, fctkCLS, fctmCLS } from '../data/materiali';
import { areaBarre } from '../data/armature';
import { BULLONI } from '../data/bulloni';

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

/* ─────────────────────────── la γ scritta con la g ─────────────────────── */

/**
 * γ è la g greca: i pesi di volume si chiamano γC, γS, γT ma nessuno ha la γ
 * sulla tastiera, così si accetta anche la g latina — `gC`, e per esteso
 * `gammaC`. Qui si elencano le scritture equivalenti a un nome, dalla più
 * fedele alla più tollerante (la maiuscola del suffisso: `gc` → `γC`).
 */
export function scrittureEquivalenti(nome: string): string[] {
  const out = [nome];
  const m = /^(gamma|g)(.+)$/i.exec(nome);
  if (m) {
    const resto = m[2];
    for (const r of [resto, resto.toUpperCase()]) if (!out.includes(`γ${r}`)) out.push(`γ${r}`);
  }
  return out;
}

/** Nome sotto cui la variabile è davvero definita, o `undefined` se non c'è. */
export function risolviNome(nome: string, vars: Record<string, unknown>): string | undefined {
  return scrittureEquivalenti(nome).find((n) => n in vars);
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
 * L'espressione non si calcola durante la lettura: se ne costruisce l'albero.
 * Sullo stesso albero passano due volte, il calcolo del valore e quello
 * dell'unità di misura, e le due cose non possono divergere.
 */
export type Nodo =
  | { t: 'num'; v: number }
  | { t: 'var'; nome: string }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Nodo; b: Nodo }
  | { t: 'neg'; a: Nodo }
  | { t: 'pct'; a: Nodo }
  | { t: 'fn'; nome: string; args: Nodo[] };

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
    /** Nomi definiti: servono già qui, per distinguere una variabile da un errore. */
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

  analizza(): Nodo {
    const n = this.somma();
    if (this.i < this.tk.length) throw new ErroreCalcolo('espressione incompleta o parentesi di troppo');
    return n;
  }

  private somma(): Nodo {
    let a = this.prodotto();
    for (;;) {
      const t = this.guarda();
      if (t?.t === 'op' && (t.v === '+' || t.v === '-')) {
        this.i += 1;
        a = { t: 'bin', op: t.v, a, b: this.prodotto() };
      } else return a;
    }
  }

  private prodotto(): Nodo {
    let a = this.unario();
    for (;;) {
      const t = this.guarda();
      if (t?.t === 'op' && (t.v === '*' || t.v === '/')) {
        this.i += 1;
        a = { t: 'bin', op: t.v, a, b: this.unario() };
      } else if (this.iniziaValore()) {
        // prodotto implicito: 2(3+4), 3area, 2pi
        a = { t: 'bin', op: '*', a, b: this.unario() };
      } else return a;
    }
  }

  private unario(): Nodo {
    const t = this.guarda();
    if (t?.t === 'op' && (t.v === '-' || t.v === '+')) {
      this.i += 1;
      const a = this.unario();
      return t.v === '-' ? { t: 'neg', a } : a;
    }
    return this.potenza();
  }

  private potenza(): Nodo {
    const base = this.postfisso();
    const t = this.guarda();
    if (t?.t === 'op' && t.v === '^') {
      this.i += 1;
      return { t: 'bin', op: '^', a: base, b: this.unario() };
    }
    return base;
  }

  private postfisso(): Nodo {
    let a = this.primario();
    for (;;) {
      const t = this.guarda();
      if (t?.t === 'op' && t.v === '%') {
        this.i += 1;
        a = { t: 'pct', a };
      } else return a;
    }
  }

  private primario(): Nodo {
    const t = this.guarda();
    if (!t) throw new ErroreCalcolo('manca un valore alla fine dell’espressione');

    if (t.t === 'num') {
      this.i += 1;
      return { t: 'num', v: t.v };
    }

    if (t.t === 'par' && t.v === '(') {
      this.i += 1;
      const n = this.somma();
      const chiusa = this.guarda();
      if (!(chiusa?.t === 'par' && chiusa.v === ')')) throw new ErroreCalcolo('manca una parentesi chiusa');
      this.i += 1;
      return n;
    }

    if (t.t === 'nome') {
      this.i += 1;
      const nome = t.v;
      const dopo = this.guarda();
      const fn = FUNZIONI[nome.toLowerCase()];

      if (dopo?.t === 'par' && dopo.v === '(' && fn) {
        this.i += 1;
        const args: Nodo[] = [];
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
        return { t: 'fn', nome: nome.toLowerCase(), args };
      }

      // la γ si può scrivere con la g: γCLS, gCLS e gammaCLS sono lo stesso nome
      const definito = risolviNome(nome, this.vars);
      if (definito) return { t: 'var', nome: definito };
      if (nome in COSTANTI) return { t: 'num', v: COSTANTI[nome] };
      // funzione a un argomento senza parentesi, come sul tastierino: √81, sin 30
      if (fn && fn.arieta.includes(1) && this.iniziaValore())
        return { t: 'fn', nome: nome.toLowerCase(), args: [this.unario()] };
      if (fn) throw new ErroreCalcolo(`a ${nome}() manca l’argomento fra parentesi`);
      throw new ErroreCalcolo(`nome sconosciuto: ${nome}`);
    }

    throw new ErroreCalcolo('manca un valore');
  }
}

/* ─────────────────────────── valore dell'albero ─────────────────────────── */

function valoreDi(n: Nodo, vars: Record<string, number>): number {
  switch (n.t) {
    case 'num':
      return n.v;
    case 'var':
      return vars[n.nome];
    case 'neg':
      return -valoreDi(n.a, vars);
    case 'pct':
      return valoreDi(n.a, vars) / 100;
    case 'fn':
      return FUNZIONI[n.nome].f(...n.args.map((a) => valoreDi(a, vars)));
    case 'bin': {
      const a = valoreDi(n.a, vars);
      const b = valoreDi(n.b, vars);
      switch (n.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b;
        case '^':
          return a ** b;
      }
    }
  }
}

/* ─────────────────────────── unità dell'albero ─────────────────────────── */

/**
 * Unità del risultato, ricavata da quelle delle operazioni richiamate per
 * nome: `null` vuol dire «non determinabile» — di solito una somma fra unità
 * diverse, o un esponente che non è un numero puro. Non è un errore di
 * calcolo: si smette solo di proporre l'unità.
 */
function dimDi(n: Nodo, vars: Record<string, number>, unita: Record<string, Dim>): Dim | null {
  switch (n.t) {
    case 'num':
      return {};
    case 'var':
      return unita[n.nome] ?? {};
    case 'neg':
    case 'pct':
      return dimDi(n.a, vars, unita);
    case 'fn': {
      const args = n.args.map((a) => dimDi(a, vars, unita));
      if (args.some((a) => a === null)) return null;
      const d = args as Dim[];
      // sqrt dimezza gli esponenti: sqrt(mq) = m
      if (n.nome === 'sqrt') return powDim(d[0], 0.5);
      // queste tornano un valore omogeneo agli argomenti
      if (['abs', 'round', 'floor', 'ceil', 'min', 'max'].includes(n.nome)) {
        const primo = d[0];
        // round(x; 2): il secondo argomento è il numero di decimali, non un valore
        const daConfrontare = n.nome === 'round' ? d.slice(0, 1) : d;
        return daConfrontare.every((x) => ugualiDim(x, primo)) ? primo : null;
      }
      // logaritmi, esponenziale e trigonometria vogliono e danno numeri puri
      return {};
    }
    case 'bin': {
      const a = dimDi(n.a, vars, unita);
      if (a === null) return null;
      if (n.op === '^') {
        const esp = valoreDi(n.b, vars);
        if (!Number.isFinite(esp) || !adimensionale(dimDi(n.b, vars, unita) ?? { x: 1 })) return null;
        return powDim(a, esp);
      }
      const b = dimDi(n.b, vars, unita);
      if (b === null) return null;
      if (n.op === '*') return mulDim(a, b);
      if (n.op === '/') return divDim(a, b);
      // somma e differenza: le unità devono coincidere; un numero puro (una
      // costante, un coefficiente) si somma a qualunque cosa senza lamentarsi
      if (ugualiDim(a, b)) return a;
      if (adimensionale(a)) return b;
      if (adimensionale(b)) return a;
      return null;
    }
  }
}

/* ─────────────────────────── interfaccia pubblica ─────────────────────────── */

export type Esito = { ok: true; valore: number } | { ok: false; errore: string };

/** Come `Esito`, ma porta anche l'unità ricavata dai nomi richiamati. */
export type EsitoUnita =
  | { ok: true; valore: number; dim: Dim | null }
  | { ok: false; errore: string };

/** Valuta un'espressione con le variabili date. Non solleva mai: torna l'errore. */
export function valuta(espressione: string, vars: Record<string, number> = {}): Esito {
  const e = valutaConUnita(espressione, vars);
  return e.ok ? { ok: true, valore: e.valore } : e;
}

/**
 * Valuta l'espressione e, insieme, ne ricava l'unità di misura dalle unità
 * delle operazioni richiamate per nome: `b*h` in metri dà mq, `area*gCLS` con
 * gCLS in kN/mc dà kN/m.
 */
export function valutaConUnita(
  espressione: string,
  vars: Record<string, number> = {},
  unita: Record<string, Dim> = {},
): EsitoUnita {
  const src = espressione.trim();
  if (!src) return { ok: false, errore: 'espressione vuota' };
  try {
    const albero = new Parser(tokenizza(src), vars).analizza();
    const valore = valoreDi(albero, vars);
    if (!Number.isFinite(valore)) return { ok: false, errore: 'risultato non finito (divisione per zero?)' };
    return { ok: true, valore, dim: dimDi(albero, vars, unita) };
  } catch (e) {
    return { ok: false, errore: e instanceof ErroreCalcolo ? e.message : 'espressione non valida' };
  }
}

/* ─────────────────────────── operazioni salvate ─────────────────────────── */

/**
 * Che cosa è una voce dell'elenco:
 *  - `compilabile`: una grandezza del calcolo in corso (b, h, q…). Il valore
 *    vale per questa seduta e si azzera alla riapertura, perché la trave di
 *    ieri non è quella di oggi;
 *  - `fissa`: un dato che non cambia da un calcolo all'altro (i pesi di
 *    volume). Resta compilata, ma si può correggere come tutte le altre;
 *  - `operazione`: un calcolo salvato dal display, con la sua formula.
 */
export type TipoVoce = 'compilabile' | 'fissa' | 'operazione';

export interface VoceCalcolo {
  id: string;
  /** Nome della variabile; vuoto = operazione salvata ma non riusabile per nome. */
  nome: string;
  espressione: string;
  nota: string;
  /** Unità di misura, solo descrittiva (m², kN/m², …). */
  um: string;
  /** Ruolo della voce; assente nei salvataggi vecchi, lo deduce la migrazione. */
  tipo?: TipoVoce;
}

/**
 * Grandezze di partenza: quelle che in un predimensionamento si scrivono
 * sempre. Le lunghezze partono **vuote** — il valore lo mette chi calcola —
 * mentre i pesi di volume sono grandezze fisse, già compilate con il valore
 * di normale impiego e comunque modificabili.
 */
export const VOCI_DEFAULT: VoceCalcolo[] = [
  { id: 'calc-b', nome: 'b', espressione: '', nota: 'base', um: 'm', tipo: 'compilabile' },
  { id: 'calc-l', nome: 'l', espressione: '', nota: 'luce / larghezza', um: 'm', tipo: 'compilabile' },
  { id: 'calc-h', nome: 'h', espressione: '', nota: 'altezza', um: 'm', tipo: 'compilabile' },
  { id: 'calc-q', nome: 'q', espressione: '', nota: 'carico distribuito', um: 'kN/m', tipo: 'compilabile' },
  { id: 'calc-gc', nome: 'γC', espressione: '25', nota: 'peso di volume del calcestruzzo', um: 'kN/mc', tipo: 'fissa' },
  { id: 'calc-gs', nome: 'γS', espressione: '78,5', nota: 'peso di volume dell’acciaio', um: 'kN/mc', tipo: 'fissa' },
  { id: 'calc-gt', nome: 'γT', espressione: '18', nota: 'peso di volume del terreno', um: 'kN/mc', tipo: 'fissa' },
];

/**
 * Grandezze proposte in aggiunta a quelle di partenza: si aggiungono con un
 * tocco, così l'elenco delle grandezze lo compone chi calcola invece di
 * subirlo. I pesi di volume portano con sé la densità del materiale.
 */
export const GRANDEZZE_CATALOGO: Omit<VoceCalcolo, 'id'>[] = [
  { nome: 's', espressione: '', nota: 'spessore', um: 'm', tipo: 'compilabile' },
  { nome: 'i', espressione: '', nota: 'interasse', um: 'm', tipo: 'compilabile' },
  { nome: 'A', espressione: '', nota: 'area', um: 'mq', tipo: 'compilabile' },
  { nome: 'F', espressione: '', nota: 'forza concentrata', um: 'kN', tipo: 'compilabile' },
  { nome: 'E', espressione: '', nota: 'modulo elastico', um: 'MPa', tipo: 'compilabile' },
  { nome: 'J', espressione: '', nota: 'momento d’inerzia', um: 'mc', tipo: 'compilabile' },
  { nome: 'γMUR', espressione: '18', nota: 'peso di volume della muratura', um: 'kN/mc', tipo: 'fissa' },
  { nome: 'γLEGNO', espressione: '5', nota: 'peso di volume del legno', um: 'kN/mc', tipo: 'fissa' },
  { nome: 'γACQUA', espressione: '10', nota: 'peso di volume dell’acqua', um: 'kN/mc', tipo: 'fissa' },
];

/**
 * Nomi cambiati per strada, con il loro nome di oggi: i γ del calcestruzzo,
 * dell'acciaio e del terreno si chiamavano per esteso, e nei salvataggi di
 * ieri convivevano con dei doppioni scritti con la g latina. La migrazione li
 * riporta tutti sul nome nuovo, nei nomi delle voci e dentro le formule.
 */
export const RINOMINATE: Record<string, string> = {
  γCLS: 'γC',
  γACC: 'γS',
  γTERRA: 'γT',
  gCLS: 'γC',
  gACC: 'γS',
  gTERRA: 'γT',
};

/**
 * Riscrive i nomi rinominati dentro un'espressione, lasciando stare tutto il
 * resto: si lavora sui token, così `γCLS` dentro `b*h*γCLS` cambia ma una
 * sottostringa dentro un altro nome no.
 */
export function rinominaInEspressione(espressione: string, mappa: Record<string, string>): string {
  if (!espressione) return espressione;
  return espressione.replace(/[\p{L}_][\p{L}\p{N}_]*/gu, (n) => mappa[n] ?? n);
}

/* ─────────────────────── operazioni preimpostate ─────────────────────── */

/**
 * Formula pronta all'uso: si scrive una volta con i nomi delle grandezze e
 * si richiama quando servono i numeri. Non porta un valore proprio — il
 * valore nasce dalle grandezze compilate sopra nel momento in cui la si usa.
 */
export interface Preimpostata {
  id: string;
  /** Nome che prenderà l'operazione una volta salvata (può essere vuoto). */
  nome: string;
  espressione: string;
  nota: string;
  um: string;
}

/** Le formule del predimensionamento a mano, scritte sui nomi di partenza. */
export const PREIMPOSTATE_DEFAULT: Preimpostata[] = [
  { id: 'pre-m-app', nome: 'M', espressione: 'q*l^2/8', nota: 'momento in mezzeria, trave appoggiata', um: 'kNm' },
  { id: 'pre-m-inc', nome: 'M', espressione: 'q*l^2/12', nota: 'momento agli incastri, trave incastrata', um: 'kNm' },
  { id: 'pre-m-mens', nome: 'M', espressione: 'q*l^2/2', nota: 'momento all’incastro, mensola', um: 'kNm' },
  { id: 'pre-v-app', nome: 'V', espressione: 'q*l/2', nota: 'taglio agli appoggi', um: 'kN' },
  { id: 'pre-area', nome: 'A', espressione: 'b*h', nota: 'area della sezione rettangolare', um: 'mq' },
  { id: 'pre-w', nome: 'W', espressione: 'b*h^2/6', nota: 'modulo di resistenza della sezione rettangolare', um: 'mc' },
  { id: 'pre-j', nome: 'J', espressione: 'b*h^3/12', nota: 'momento d’inerzia della sezione rettangolare', um: '' },
  { id: 'pre-peso', nome: 'P', espressione: 'b*h*γC', nota: 'peso proprio della trave', um: 'kN/m' },
  { id: 'pre-freccia', nome: 'f', espressione: '5*q*l^4/(384*E*J)', nota: 'freccia in mezzeria, trave appoggiata', um: '' },
];

/* ─────────────── grandezze fisse scelte dalla libreria ─────────────── */

/**
 * Le scelte a tendina della colonna delle grandezze fisse: classe del
 * calcestruzzo, acciaio, ferro d'armatura e bullone. Vuoto vuol dire «questa
 * scelta non l'ho fatta»: le grandezze che ne discenderebbero non compaiono.
 */
export interface Selezioni {
  /** Classe di resistenza del calcestruzzo, es. `C25/30`. */
  cls: string;
  /** Sigla dell'acciaio: carpenteria, armatura o classe del bullone. */
  acciaio: string;
  /** Diametro del ferro d'armatura (mm) e numero di barre. */
  barraFi: string;
  barraN: string;
  /** Taglia del bullone (es. `M12`) e numero di bulloni. */
  bulloneM: string;
  bulloneN: string;
}

export const SELEZIONI_DEFAULT: Selezioni = {
  cls: '',
  acciaio: '',
  barraFi: '12',
  barraN: '',
  bulloneM: 'M12',
  bulloneN: '',
};

/** Numero scritto in un campo delle scelte: virgola o punto, vuoto = 0. */
function numero(s: string): number {
  const v = Number(String(s ?? '').replace(',', '.').trim());
  return Number.isFinite(v) ? v : 0;
}

/**
 * Le grandezze fisse che nascono dalle scelte a tendina. Sono voci come le
 * altre — hanno nome, valore e unità, e le formule le richiamano per nome — ma
 * non si scrivono a mano: cambiano quando cambia la scelta. I coefficienti
 * parziali restano quelli di serie e non compaiono: chi vuole un γ diverso si
 * aggiunge la sua grandezza fissa a mano.
 */
export function vociDaSelezioni(s: Selezioni): VoceCalcolo[] {
  const out: VoceCalcolo[] = [];
  // le resistenze si leggono a due decimali e i moduli elastici a numero
  // intero: sono valori di tabella, non l'esito di un calcolo da conservare
  // con tutte le cifre
  const val = (n: number, d = 2) => formatta(arrotonda(n, d));

  const cls = CLS[s.cls?.trim() ?? ''];
  if (cls) {
    const { alfacc, gammaC } = COEFF_DEFAULT;
    const fcd = (alfacc * cls.fck) / gammaC;
    const fctm = fctmCLS(cls.fck);
    const fctd = fctkCLS(cls.fck) / gammaC;
    out.push(
      { id: 'gen-fck', nome: 'fck', espressione: val(cls.fck), nota: `${s.cls} — resistenza caratteristica a compressione`, um: 'MPa', tipo: 'fissa' },
      { id: 'gen-fcd', nome: 'fcd', espressione: val(fcd), nota: `${s.cls} — αcc·fck/γC con αcc ${alfacc} e γC ${gammaC}`, um: 'MPa', tipo: 'fissa' },
      { id: 'gen-fctm', nome: 'fctm', espressione: val(fctm), nota: `${s.cls} — resistenza media a trazione`, um: 'MPa', tipo: 'fissa' },
      { id: 'gen-fctd', nome: 'fctd', espressione: val(fctd), nota: `${s.cls} — 0.7·fctm/γC con γC ${gammaC}`, um: 'MPa', tipo: 'fissa' },
      { id: 'gen-ecm', nome: 'Ecm', espressione: val(ecmCLS(cls.fck), 0), nota: `${s.cls} — modulo elastico secante`, um: 'MPa', tipo: 'fissa' },
    );
  }

  const acc = ACCIAI[s.acciaio?.trim() ?? ''];
  if (acc) {
    out.push(
      { id: 'gen-fyd', nome: 'fyd', espressione: val(acc.fyk / acc.gammaY), nota: `${s.acciaio} — ${acc.nota}`, um: 'MPa', tipo: 'fissa' },
      { id: 'gen-ftd', nome: 'ftd', espressione: val(acc.ftk / acc.gammaU), nota: `${s.acciaio} — ${acc.nota}`, um: 'MPa', tipo: 'fissa' },
    );
  }

  const fi = numero(s.barraFi);
  const nBarre = numero(s.barraN);
  if (fi > 0 && nBarre > 0) {
    out.push({
      id: 'gen-ar',
      nome: 'Ar',
      espressione: val(areaBarre(fi, nBarre), 1),
      nota: `armatura ${nBarre}⌀${fi} — area complessiva`,
      um: 'mmq',
      tipo: 'fissa',
    });
  }

  const bul = BULLONI[s.bulloneM?.trim() ?? ''];
  const nBulloni = numero(s.bulloneN);
  if (bul && nBulloni > 0) {
    out.push(
      { id: 'gen-ab', nome: 'Ab', espressione: val(bul.Ares * nBulloni, 1), nota: `${nBulloni} ${s.bulloneM} — area resistente complessiva`, um: 'mmq', tipo: 'fissa' },
      { id: 'gen-abl', nome: 'Abl', espressione: val(bul.A * nBulloni, 1), nota: `${nBulloni} ${s.bulloneM} — area lorda complessiva del gambo`, um: 'mmq', tipo: 'fissa' },
    );
  }

  return out;
}

/**
 * Nomi richiamati da un'espressione: servono a dire quali grandezze mancano
 * ancora prima di provare a calcolare. Le funzioni e le costanti non contano —
 * `sqrt`, `pi` ed `e` ci sono sempre. Un'espressione che non si riesce nemmeno
 * a leggere non ha nomi da chiedere: torna un elenco vuoto.
 */
export function nomiRichiesti(espressione: string): string[] {
  let tk: Token[];
  try {
    tk = tokenizza(espressione);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const t of tk) {
    if (t.t !== 'nome') continue;
    if (t.v.toLowerCase() in FUNZIONI || t.v in COSTANTI) continue;
    if (!out.includes(t.v)) out.push(t.v);
  }
  return out;
}

/** Nomi richiamati che non sono ancora disponibili fra le variabili. */
export function nomiMancanti(espressione: string, vars: Record<string, number>): string[] {
  return nomiRichiesti(espressione).filter((n) => !risolviNome(n, vars));
}

export interface VoceCalcolata extends VoceCalcolo {
  valore: number;
  errore: string;
  /** Nome valido e non già usato prima: solo allora la voce è richiamabile. */
  nomeValido: boolean;
  /** Unità ricavata dall'operazione ('' se non determinabile o non serve). */
  umCalcolata: string;
  /** Quella che si vede: la scritta a mano se c'è, altrimenti la calcolata. */
  umEffettiva: string;
  /** true = l'unità scritta a mano non è fra quelle in elenco. */
  umFuoriElenco: boolean;
}

/**
 * Ricalcola l'intera sequenza: ogni voce vede le variabili definite dalle voci
 * che la precedono, così correggere l'area a monte aggiorna tutto quello che
 * ne discende senza doverlo riscrivere. Insieme al valore si porta dietro
 * l'unità di misura, che l'operazione successiva riusa.
 *
 * Un'espressione vuota non è un errore: è una voce ancora da compilare.
 */
export function ricalcola(voci: VoceCalcolo[], elenco: string[] = UNITA_DEFAULT): VoceCalcolata[] {
  const vars: Record<string, number> = {};
  const unita: Record<string, Dim> = {};
  const usati = new Set<string>();

  return voci.map((v) => {
    const vuota = !v.espressione.trim();
    const esito = vuota ? null : valutaConUnita(v.espressione, vars, unita);
    const nome = v.nome.trim();
    const nomeValido =
      !!nome && nomeAmmesso(nome) && !usati.has(nome) && !(nome in COSTANTI) && !(nome.toLowerCase() in FUNZIONI);

    const scritta = v.um.trim();
    const calcolata = esito?.ok && esito.dim ? scriviUnita(esito.dim, elenco) : '';
    const umEffettiva = scritta || calcolata;

    if (esito?.ok && nomeValido) {
      vars[nome] = esito.valore;
      unita[nome] = leggiUnita(umEffettiva);
      usati.add(nome);
    }
    // `ans` è sempre l'ultimo risultato utile della sequenza
    if (esito?.ok) {
      vars.ans = esito.valore;
      unita.ans = leggiUnita(umEffettiva);
    }

    return {
      ...v,
      valore: esito?.ok ? esito.valore : NaN,
      errore: !esito || esito.ok ? '' : esito.errore,
      nomeValido,
      umCalcolata: calcolata,
      umEffettiva,
      umFuoriElenco: !!scritta && !unitaInElenco(scritta, elenco),
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

/** Unità delle variabili disponibili a valle della sequenza (nome → unità). */
export function unitaVariabili(voci: VoceCalcolata[]): Record<string, Dim> {
  const out: Record<string, Dim> = {};
  for (const v of voci) {
    if (v.nomeValido && Number.isFinite(v.valore)) out[v.nome.trim()] = leggiUnita(v.umEffettiva);
  }
  const ultima = [...voci].reverse().find((v) => Number.isFinite(v.valore));
  if (ultima) out.ans = leggiUnita(ultima.umEffettiva);
  return out;
}

/** Un valore scritto come numero e basta: non è un'operazione, è un dato. */
const SOLO_NUMERO = /^[+-]?[\d\s.,]+$/;

/**
 * Riporta in ordine l'elenco delle voci che arriva da un salvataggio: applica
 * i nomi nuovi (anche dentro le formule), butta i doppioni dei γ scritti con
 * la g e assegna il ruolo alle voci che non ce l'hanno ancora.
 */
export function normalizzaVoci(raw: Partial<VoceCalcolo>[]): VoceCalcolo[] {
  const voci: VoceCalcolo[] = raw.map((v, i) => ({
    id: v?.id || `calc-${i}`,
    nome: v?.nome ?? '',
    espressione: v?.espressione ?? '',
    nota: v?.nota ?? '',
    um: v?.um ?? '',
    tipo: v?.tipo,
  }));

  // il nome vecchio e il suo doppione con la g latina finiscono sullo stesso
  // nome nuovo: di quel gruppo si tiene una voce sola, la prima che porta un
  // valore (altrimenti la prima), perché due γC sarebbero un richiamo ambiguo
  const tieni = new Map<string, string>();
  for (const v of voci) {
    const nome = v.nome.trim();
    const nuovo = RINOMINATE[nome];
    if (!nuovo) continue;
    const scelta = tieni.get(nuovo);
    const vuota = !voci.find((x) => x.id === scelta)?.espressione.trim();
    if (!scelta || (vuota && v.espressione.trim())) tieni.set(nuovo, v.id);
  }
  const doppione = (v: VoceCalcolo) => {
    const nuovo = RINOMINATE[v.nome.trim()];
    return !!nuovo && tieni.get(nuovo) !== v.id;
  };

  return voci
    .filter((v) => !doppione(v))
    .map((v) => {
      const nome = RINOMINATE[v.nome.trim()] ?? v.nome;
      const espressione = rinominaInEspressione(v.espressione, RINOMINATE);
      return { ...v, nome, espressione, tipo: v.tipo ?? tipoDedotto(nome, espressione) };
    });
}

/** Ruolo di una voce salvata prima che i ruoli esistessero. */
function tipoDedotto(nome: string, espressione: string): TipoVoce {
  if (nome.trim().startsWith('γ')) return 'fissa';
  if (!espressione.trim() || SOLO_NUMERO.test(espressione.trim())) return 'compilabile';
  return 'operazione';
}

/**
 * Svuota le grandezze compilabili: alla riapertura la base e l'altezza della
 * trave di ieri non servono più, mentre i pesi di volume e le operazioni
 * salvate restano dove sono.
 */
export function svuotaCompilabili(voci: VoceCalcolo[]): VoceCalcolo[] {
  return voci.map((v) => (v.tipo === 'compilabile' ? { ...v, espressione: '' } : v));
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
  const um = v.umEffettiva ? ` ${v.umEffettiva}` : '';
  const nota = v.nota.trim() ? `   — ${v.nota.trim()}` : '';
  if (!v.espressione.trim()) return `${testa}(da compilare)${nota}`;
  const valore = v.errore ? `errore: ${v.errore}` : `${formatta(v.valore)}${um}`;
  return `${testa}${v.espressione} = ${valore}${nota}`;
}
