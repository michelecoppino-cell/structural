/**
 * Contenuto testuale delle schede: valori, formule e riferimenti normativi.
 *
 * Il contenuto nasce **strutturato** — capitoli, blocchi, righe — perché due
 * cose lo usano con esigenze diverse: il «Copia» lo appiattisce in testo da
 * incollare in Word, la scheda Esportazione lo impagina sul foglio A4. Una
 * sola sorgente, così le due strade non raccontano numeri diversi.
 */

import type { AppState, CapitoloId, TabId } from '../state/store';
import { inputVerifiche } from '../state/store';
import { calcolaAzioni, num } from './azioni';
import { COMBINAZIONI, calcolaSollecitazioni } from './sollecitazioni';
import { SCHEMI_BY_ID } from './trave';
import { verificaFlessioneCA, verificaTaglioArmato, verificaTaglioNonArmato } from './verifiche';
import { valido, validaTaglioArmato, validaTaglioNonArmato } from './validazione';
import { ricalcola, testoVoce, vociDaSelezioni, type VoceCalcolata } from './calcolatrice';
import {
  livelloEsito,
  ricalcolaQuaderno,
  testoBlocco,
  type LivelloEsito,
  type BloccoCalcolato,
  type ImportoScheda,
  type Sorgenti,
} from './quaderno';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** Un blocco di relazione: un titolo e le sue righe già formattate. */
export interface Blocco {
  titolo: string;
  righe: string[];
}

/** Un capitolo esportabile, con il nome che compare sulla spunta. */
export interface Capitolo {
  id: CapitoloId;
  titolo: string;
  blocchi: Blocco[];
}

export const CAPITOLI: { id: CapitoloId; titolo: string }[] = [
  { id: 'azioni', titolo: 'Azioni' },
  { id: 'sollecitazioni', titolo: 'Sollecitazioni' },
  { id: 'verifiche', titolo: 'Verifiche' },
  { id: 'calcolatrice', titolo: 'Grandezze del calcolo' },
  { id: 'costi', titolo: 'Stime costi' },
];

/** Titolo di un capitolo dal suo id, per le pastiglie e per il foglio. */
export function titoloCapitolo(id: string): string {
  return CAPITOLI.find((c) => c.id === id)?.titolo ?? id;
}

/* ─────────────────────────── i capitoli, uno per uno ────────────────────── */

function blocchiAzioni(state: AppState): Blocco[] {
  const az = calcolaAzioni(state.azioni);
  const blocchi: Blocco[] = [
    {
      titolo: 'Azione sismica — NTC2018 §3.2',
      righe: [
        `Sito: ${az.sisma.sito}, ${state.azioni.regione} — zona sismica ${az.sisma.zonaLabel ?? '—'}`,
        `Sottosuolo ${state.azioni.suolo}; topografia ${state.azioni.topo}`,
        az.sisma.nota,
        `VR = VN·CU = ${fx(az.sisma.VR, 0)} anni; stato limite ${state.azioni.sl ?? 'SLV'}; TR = ${fx(az.sisma.TR, 0)} anni`,
        ...az.sisma.statiLimite.map(
          (s) =>
            `${s.id}: TR = ${fx(s.TR, 0)} anni; ag/g = ${fx(s.ag, 3)}; F0 = ${fx(s.F0, 3)}; TC* = ${fx(s.TCstar, 3)} s`,
        ),
        `ag/g = ${fx(az.sisma.ag, 3)}; SS = ${fx(az.sisma.Ss)}; ST = ${fx(az.sisma.St)}; S = SS·ST = ${fx(az.sisma.S)}`,
        `F0 = ${fx(az.sisma.F0, 3)}; TC* = ${fx(az.sisma.TCstar, 3)} s; CC = ${fx(az.sisma.Cc)} → TB = ${fx(az.sisma.TB)} s; TC = ${fx(az.sisma.TC)} s; TD = ${fx(az.sisma.TD)} s`,
        `q = ${fx(az.sisma.q)}; Sd(T1) = ag·S·F0/q = ${fx(az.sisma.Sd, 3)} g`,
        ...(az.sisma.periodo
          ? [
              `Lettura dello spettro per T = ${fx(az.sisma.periodo.T)} s (${az.sisma.periodo.ramo}): ` +
                `Se(T) = ${fx(az.sisma.periodo.Se, 3)} g = ${fx(az.sisma.periodo.SeMS2, 2)} m/s²; ` +
                `Sd(T) = ${fx(az.sisma.periodo.Sd, 3)} g = ${fx(az.sisma.periodo.SdMS2, 2)} m/s²` +
                (az.sisma.periodo.minimo ? ' (al minimo 0.2·ag di §3.2.3.5)' : ''),
            ]
          : []),
      ],
    },
    {
      titolo: 'Carico neve — NTC2018 §3.4',
      righe: [
        `Zona ${state.azioni.zneve}; as = ${fx(num(state.azioni.as), 0)} m; falda α = ${fx(az.neve.alfa, 0)}°`,
        `μ1 = ${fx(az.neve.mu)} (Tab. 3.4.II per α = ${fx(az.neve.alfa, 0)}°: ${fx(az.neve.muSuggerito)}); CE = ${fx(az.neve.ce)}; Ct = ${fx(az.neve.ct)}`,
        `qsk = ${fx(az.neve.qsk)} kN/m²; qs = μ1·qsk·CE·Ct = ${fx(az.neve.qs)} kN/m² sulla proiezione orizzontale`,
      ],
    },
    {
      titolo: 'Azione del vento — NTC2018 §3.3',
      righe: [
        `Zona ${state.azioni.zvento}; esposizione ${state.azioni.espo}; z = ${fx(num(state.azioni.z))} m`,
        `qb = ½·ρ·vb² = ${fx(az.vento.qb, 3)} kN/m²; ce(z) = ${fx(az.vento.ce)}`,
        `p = qb·ce·cp·cd = ${fx(az.vento.p)} kN/m² (sopravento); ${fx(az.vento.pSotto)} kN/m² (sottovento)`,
      ],
    },
    {
      titolo: 'Carichi variabili — NTC2018 §3.1.4, Tab. 3.1.II',
      righe: [
        az.variabili.categoria,
        `qk = ${fx(az.variabili.qk)} kN/m²; Qk = ${fx(az.variabili.Qk)} kN; Hk = ${fx(az.variabili.Hk)} kN/m`,
        `ψ0 = ${fx(az.variabili.psi0)}; ψ1 = ${fx(az.variabili.psi1)}; ψ2 = ${fx(az.variabili.psi2)}`,
      ],
    },
    {
      titolo: 'Spinta delle terre — NTC2018 §6.5.3',
      righe: [
        `γ = ${fx(num(state.azioni.gamma), 1)} kN/m³; φ′ = ${fx(num(state.azioni.phi), 0)}°; H = ${fx(num(state.azioni.H))} m`,
        `Ka = tan²(45° − φ′/2) = ${fx(az.terre.ka, 3)}; Sa = ½·γ·H²·Ka = ${fx(az.terre.Sa, 1)} kN/m`,
        `za = H/3 = ${fx(az.terre.za)} m; Mrib = ${fx(az.terre.Mrib, 1)} kNm/m`,
      ],
    },
    {
      titolo: 'Urti di veicoli in transito — NTC2018 §3.6.3.3',
      righe: [
        `Scenario: ${az.urti.scenario}`,
        `Fdx = ${fx(az.urti.Fdx, 0)} kN (direzione di marcia); Fdy = ${fx(az.urti.Fdy, 0)} kN (ortogonale) — non si sommano`,
        `Applicazione a h = ${fx(az.urti.h)} m dal piano viabile su area 0.25 × 1.50 m; Mbase = Fd·h = ${fx(az.urti.Mbase, 1)} kNm`,
        `Confronto energetico (EN 1991-1-7 App. C): m = ${fx(az.urti.m)} t a ${fx(az.urti.v, 0)} km/h, k = ${fx(az.urti.k, 0)} kN/m → Ec = ${fx(az.urti.Ec, 0)} kJ; F = v·√(k·m) = ${fx(az.urti.Fcalc, 0)} kN`,
        `Forza di progetto adottata: Fd = ${fx(az.urti.Fd, 0)} kN (${state.azioni.urtoDaEnergia ? 'dal calcolo energetico' : 'da Tab. 3.6.II'})`,
        ...(az.urti.avviso ? [az.urti.avviso] : []),
      ],
    },
  ];

  if (az.terre.sisma.attiva) blocchi.push(spintaSismica(state, az));
  return blocchi;
}

/** Blocco della spinta sismica delle terre, solo se è stata attivata. */
function spintaSismica(state: AppState, az: ReturnType<typeof calcolaAzioni>): Blocco {
  const s = az.terre.sisma;
  const H = num(state.azioni.H);
  if (s.avviso) return { titolo: 'Spinta sismica delle terre — NTC2018 §7.11.6', righe: [s.avviso] };
  return {
    titolo: 'Spinta sismica delle terre — NTC2018 §7.11.6 (Mononobe-Okabe)',
    righe: [
      `amax/g = S·ag/g = ${fx(s.amax, 3)}; βm = ${fx(num(state.azioni.betam))} → kh = ${fx(s.kh, 3)}; kv = ${fx(s.kv, 3)}`,
      `θ = atan[kh/(1∓kv)] = ${fx(s.theta, 2)}°; δ = ${fx(num(state.azioni.delta), 0)}°; β = ${fx(num(state.azioni.betaTerre), 0)}°; ψ = ${fx(num(state.azioni.psiTerre), 0)}°`,
      `Kae = ${fx(s.kae, 3)} (Ka statico = ${fx(az.terre.ka, 3)})`,
      `Ed = ½·γ·H²·(1∓kv)·Kae = ${fx(s.Ed, 1)} kN/m; ΔEd = Ed − Sa = ${fx(s.dEd, 1)} kN/m applicato a H/2 = ${fx(H / 2)} m`,
      `M totale = Sa·H/3 + ΔEd·H/2 = ${fx(s.Mtot, 1)} kNm/m`,
    ],
  };
}

function blocchiSollecitazioni(state: AppState): Blocco[] {
  const s = state.sollecitazioni;
  const az = calcolaAzioni(state.azioni);
  const r = calcolaSollecitazioni(s, az);
  const t = r.trave;
  const comb = COMBINAZIONI.find((c) => c.id === s.combinazione)!;
  const verticale = s.orientamento === 'verticale';

  return [
    {
      titolo: `Schema statico: ${SCHEMI_BY_ID[s.schema].label} — elemento ${s.orientamento}`,
      righe: [
        `L = ${fx(r.L)} m; interasse = ${fx(num(s.interasse))} m; EJ = ${fx(r.EJ, 0)} kNm²`,
        `Sezione: ${
          s.sezioneMateriale === 'manuale'
            ? 'E e J inseriti a mano'
            : s.sezioneMateriale === 'cls'
              ? `c.a. ${s.sezioneB}×${s.sezioneH} mm, ${s.sezioneCls}`
              : `${s.sezioneProfilo}, inflesso attorno all’asse ${s.sezioneAsse}`
        } → E = ${fx(r.E, 0)} MPa; J = ${fx(r.J, 0)} cm⁴`,
      ],
    },
    {
      titolo: `Combinazione: ${comb.label} — ${comb.ref}`,
      righe: [
        ...r.contributi.map(
          (c) =>
            `${c.sorgente.descr}: qk = ${fx(c.sorgente.qk)} kN/m²; γ = ${fx(c.gamma)}; ψ = ${fx(c.psi)} → ${fx(c.qd)} kN/m² (${c.ruolo})`,
        ),
        `→ q di progetto = ${fx(r.q)} kN/m` + (verticale ? `; N = ${fx(r.N, 1)} kN` : ''),
      ],
    },
    {
      titolo: 'Sollecitazioni',
      righe: [
        `M max = ${fx(t.MmaxAbs.val, 1)} kNm (x = ${fx(t.MmaxAbs.x)} m)`,
        `V max = ${fx(t.VmaxAbs.val, 1)} kN (x = ${fx(t.VmaxAbs.x)} m)`,
        `Reazioni: RA = ${fx(t.reazioni.A.R, 1)} kN; MA = ${fx(t.reazioni.A.M, 1)} kNm; RB = ${fx(t.reazioni.B.R, 1)} kN; MB = ${fx(t.reazioni.B.M, 1)} kNm`,
        `Freccia max = ${fx(Math.abs(t.fmax.val) * 1000, 2)} mm (x = ${fx(t.fmax.x)} m); L/f = ${Number.isFinite(t.Lsuf) ? fx(t.Lsuf, 0) : '∞'}`,
      ],
    },
  ];
}

function blocchiVerifiche(state: AppState): Blocco[] {
  const inp = verificheDi(state);
  const na = verificaTaglioNonArmato(inp.taglioNonArmato);
  const ar = verificaTaglioArmato(inp.taglioArmato);
  const fl = verificaFlessioneCA(state.verifiche.flessioneCA);
  const flIn = state.verifiche.flessioneCA;

  return [
    {
      titolo: 'Taglio — elementi senza armature trasversali (NTC2018 §4.1.2.3.5.1)',
      righe: [
        `Sezione ${inp.taglioNonArmato.bw} × ${inp.taglioNonArmato.h} mm; d = ${inp.taglioNonArmato.d} mm; ${inp.taglioNonArmato.cls}`,
        `As = ${fx(na.As, 0)} mm²; ρ1 = ${fx(na.rho1, 5)}; k = ${fx(na.k, 3)}; σcp = ${fx(na.sigmaCp, 3)} N/mm²; νmin = ${fx(na.vmin, 4)} N/mm²`,
        `VRd = max[(0.18·k·(100·ρ1·fck)^⅓/γc + 0.15·σcp)·bw·d ; (νmin + 0.15·σcp)·bw·d] = ${fx(na.VRd, 1)} kN`,
        `VEd = ${inp.taglioNonArmato.VEd} kN → VEd/VRd = ${fx(na.esito.sfruttamento, 3)} — ${na.esito.ok ? 'VERIFICATO' : 'NON VERIFICATO'} (margine ${fx(na.esito.margine, 1)}%)`,
      ],
    },
    {
      titolo: 'Taglio — elementi con armature trasversali (NTC2018 §4.1.2.3.5.2)',
      righe: [
        `Sezione ${inp.taglioArmato.bw} × ${inp.taglioArmato.h} mm; d = ${fx(ar.d, 0)} mm; ${inp.taglioArmato.cls}`,
        `Staffe ⌀${inp.taglioArmato.phiStaffa}/${inp.taglioArmato.passo} mm a ${inp.taglioArmato.nBracci} bracci; Asw = ${fx(ar.Asw, 1)} mm²; α = ${inp.taglioArmato.alfa}°`,
        `ωsw = ${fx(ar.omegaSw, 5)}; cotϑ* = ${fx(ar.cotThetaStar, 3)} → cotϑ = ${fx(ar.cotTheta, 3)} (ϑ = ${fx(ar.theta, 1)}°); αc = ${fx(ar.alfaC, 3)}`,
        `VRsd (eq. 4.1.18) = ${fx(ar.VRsd, 1)} kN; VRcd (eq. 4.1.19) = ${fx(ar.VRcd, 1)} kN`,
        `VRd = min(VRsd, VRcd) = ${fx(ar.VRd, 1)} kN — meccanismo governante: ${ar.governa}`,
        `VEd = ${inp.taglioArmato.VEd} kN → VEd/VRd = ${fx(ar.esito.sfruttamento, 3)} — ${ar.esito.ok ? 'VERIFICATO' : 'NON VERIFICATO'} (margine ${fx(ar.esito.margine, 1)}%)`,
        `Minimi §4.1.6.1.1: Asw,min = ${fx(ar.AswMin, 0)} mm²/m — ${ar.esitoAswMin.ok ? 'soddisfatto' : 'NON soddisfatto'}; passo max = ${fx(ar.passoMax, 0)} mm — ${ar.esitoPasso.ok ? 'soddisfatto' : 'NON soddisfatto'}`,
      ],
    },
    {
      titolo: 'Flessione semplice SLU — sezione rettangolare (NTC2018 §4.1.2.1.2)',
      righe: [
        `Sezione ${flIn.b} × ${flIn.h} mm; ${flIn.cls}; ${flIn.acciaio}; c = ${flIn.c} mm; c′ = ${flIn.c2} mm`,
        `Armatura tesa ${flIn.n1}⌀${flIn.phi1}${num(flIn.n2) > 0 ? ` + ${flIn.n2}⌀${flIn.phi2}` : ''} → As = ${fx(fl.As, 0)} mm²`,
        `Armatura compressa ${flIn.n1c}⌀${flIn.phi1c} → A′s = ${fx(fl.As2, 0)} mm²`,
        `fcd = ${fx(fl.fcd)} N/mm²; fyd = ${fx(fl.fyd, 0)} N/mm²; d = ${fx(fl.d, 0)} mm; x = ${fx(fl.x, 1)} mm; x/d = ${fx(fl.xSuD, 3)}`,
        `MRd = 0.8·x·b·fcd·(d − 0.4·x) + A′s·fyd·(d − c′) = ${fx(fl.MRd, 1)} kNm`,
        `MEd = ${flIn.MEd} kNm → MEd/MRd = ${fx(fl.esito.sfruttamento, 3)} — ${fl.esito.ok ? 'VERIFICATO' : 'NON VERIFICATO'} (margine ${fx(fl.esito.margine, 1)}%)`,
      ],
    },
  ];
}

function blocchiCalcolatrice(state: AppState): Blocco[] {
  // anche le grandezze scelte a tendina fanno parte del calcolo: stanno in
  // testa alla sequenza come nel pannello del quaderno
  const voci = grandezzeQuaderno(state).filter((v) => v.espressione.trim());
  return [
    {
      titolo: 'Grandezze e operazioni compilate',
      righe: voci.length ? voci.map(testoVoce) : ['(nessuna grandezza compilata)'],
    },
  ];
}

function blocchiCosti(state: AppState): Blocco[] {
  const righe = state.costi.map((v) => {
    const tot = num(v.quantita) * num(v.prezzo);
    return `${v.categoria} | ${v.descrizione} | ${v.quantita} ${v.um} × ${v.prezzo} € = ${tot.toFixed(2)} €`;
  });
  const generale = state.costi.reduce((s, v) => s + num(v.quantita) * num(v.prezzo), 0);
  return [
    { titolo: 'Computo sintetico', righe },
    { titolo: 'Totale', righe: [`TOTALE GENERALE = ${generale.toFixed(2)} €`] },
  ];
}

/* ───────────────────── il quaderno: sorgenti e foglio ───────────────────── */

/**
 * Le grandezze del pannello del quaderno, ricalcolate: prima quelle che
 * nascono dalle scelte di libreria, poi quelle scritte a mano. È la stessa
 * sequenza che si vede nella colonna a destra, e la sola fonte dei numeri —
 * la usano il foglio a schermo e l'esportazione, così non raccontano due cose
 * diverse.
 */
export function grandezzeQuaderno(state: AppState): VoceCalcolata[] {
  const c = state.calcolatrice;
  return ricalcola([...vociDaSelezioni(c.selezioni), ...c.voci], c.unita);
}

/**
 * Quello che si può tirare dentro dalle altre schede, già pronto: il taglio
 * delle Sollecitazioni, la neve delle Azioni, le resistenze delle Verifiche.
 * I numeri arrivano nell'unità con cui la scheda di provenienza li mostra; a
 * portarli in unità base pensa il quaderno.
 */
export function importiDaSchede(state: AppState): ImportoScheda[] {
  const az = calcolaAzioni(state.azioni);
  const soll = calcolaSollecitazioni(state.sollecitazioni, az);
  const t = soll.trave;
  const inp = inputVerifiche(state, Math.abs(t.VmaxAbs.val));
  const na = verificaTaglioNonArmato(inp.taglioNonArmato);
  const ar = verificaTaglioArmato(inp.taglioArmato);
  const fl = verificaFlessioneCA(state.verifiche.flessioneCA);
  const esito = (ok: boolean, sfr: number) =>
    `${ok ? 'verificato' : 'NON verificato'} (${(sfr * 100).toFixed(0)}%)`;

  return [
    { id: 'imp-mmax', nome: 'Mmax', etichetta: 'M max', scheda: 'Sollecitazioni', valore: t.MmaxAbs.val, um: 'kNm' },
    { id: 'imp-vmax', nome: 'Vmax', etichetta: 'V max', scheda: 'Sollecitazioni', valore: t.VmaxAbs.val, um: 'kN' },
    { id: 'imp-q', nome: 'qd', etichetta: 'q di progetto', scheda: 'Sollecitazioni', valore: soll.q, um: 'kN/m' },
    { id: 'imp-luce', nome: 'L', etichetta: 'Luce L', scheda: 'Sollecitazioni', valore: soll.L, um: 'm' },
    {
      id: 'imp-fmax',
      nome: 'fmax',
      etichetta: 'Freccia max',
      scheda: 'Sollecitazioni',
      valore: Math.abs(t.fmax.val) * 1000,
      um: 'mm',
    },
    { id: 'imp-neve', nome: 'qs', etichetta: 'Carico neve qs', scheda: 'Azioni', valore: az.neve.qs, um: 'kN/mq' },
    { id: 'imp-vento', nome: 'pv', etichetta: 'Pressione vento p', scheda: 'Azioni', valore: az.vento.p, um: 'kN/mq' },
    { id: 'imp-qk', nome: 'qk', etichetta: 'Variabile qk', scheda: 'Azioni', valore: az.variabili.qk, um: 'kN/mq' },
    { id: 'imp-terre', nome: 'Sa', etichetta: 'Spinta terre Sa', scheda: 'Azioni', valore: az.terre.Sa, um: 'kN/m' },
    {
      id: 'imp-vrd0',
      nome: 'VRd0',
      etichetta: 'VRd senza staffe',
      scheda: 'Verifiche',
      valore: na.VRd,
      um: 'kN',
    },
    { id: 'imp-vrd', nome: 'VRd', etichetta: 'VRd con staffe', scheda: 'Verifiche', valore: ar.VRd, um: 'kN' },
    { id: 'imp-mrd', nome: 'MRd', etichetta: 'MRd flessione', scheda: 'Verifiche', valore: fl.MRd, um: 'kNm' },
    {
      id: 'imp-esito-taglio',
      nome: '',
      etichetta: 'Esito taglio',
      scheda: 'Verifiche',
      valore: NaN,
      um: '',
      testo: esito(ar.esito.ok, ar.esito.sfruttamento),
    },
    {
      id: 'imp-esito-flessione',
      nome: '',
      etichetta: 'Esito flessione',
      scheda: 'Verifiche',
      valore: NaN,
      um: '',
      testo: esito(fl.esito.ok, fl.esito.sfruttamento),
    },
  ];
}

/** Tutto quello che serve a dare un valore ai blocchi del quaderno. */
export function sorgentiQuaderno(state: AppState): Sorgenti {
  return {
    voci: grandezzeQuaderno(state),
    preimpostate: state.calcolatrice.preimpostate,
    importi: importiDaSchede(state),
    elenco: state.calcolatrice.unita,
  };
}

/** Il quaderno ricalcolato: i blocchi con il valore che hanno adesso. */
export function quadernoCalcolato(state: AppState): BloccoCalcolato[] {
  return ricalcolaQuaderno(state.quaderno.blocchi, sorgentiQuaderno(state));
}

/**
 * Una pagina del foglio, elemento per elemento: è la forma in cui il quaderno
 * esce, sia a schermo che in stampa, nel testo da incollare e nell'HTML.
 */
export type ElementoFoglio =
  | { tipo: 'capitolo'; id: string; capitolo: Capitolo }
  | { tipo: 'calcolo'; id: string; passo: string; testo: string; nota: string; livello: LivelloEsito }
  | { tipo: 'nota'; id: string; testo: string }
  | { tipo: 'immagine'; id: string; img: string; didascalia: string; larghezza: number };

/**
 * Il foglio del quaderno, nell'ordine dei blocchi: i capitoli si espandono nei
 * loro blocchi di relazione, le righe di calcolo diventano testo, note e
 * schemi restano quello che sono.
 */
export function foglioQuaderno(state: AppState): ElementoFoglio[] {
  return quadernoCalcolato(state).flatMap((b): ElementoFoglio[] => {
    const id = b.blocco.id;
    if (b.blocco.tipo === 'capitolo') {
      const c = CAPITOLI.find((x) => x.id === b.blocco.fonte);
      if (!c) return [];
      return [{ tipo: 'capitolo', id, capitolo: { ...c, blocchi: blocchiCapitolo(state, c.id) } }];
    }
    if (b.blocco.tipo === 'nota') {
      const testo = b.blocco.testo.trim();
      return testo ? [{ tipo: 'nota', id, testo }] : [];
    }
    if (b.blocco.tipo === 'immagine') {
      return b.blocco.img
        ? [
            {
              tipo: 'immagine',
              id,
              img: b.blocco.img,
              didascalia: b.blocco.testo.trim(),
              larghezza: b.blocco.larghezza,
            },
          ]
        : [];
    }
    // la nota della fonte e l'appunto scritto a mano vanno insieme sotto la
    // riga: sono tutte e due il commento di quel passaggio
    const nota = [b.nota.trim(), b.blocco.appunto.trim()].filter(Boolean).join(' — ');
    return [{ tipo: 'calcolo', id, passo: b.passo, testo: testoBlocco(b), nota, livello: livelloEsito(b) }];
  });
}

/** I blocchi di un capitolo, calcolati sullo stato corrente. */
export function blocchiCapitolo(state: AppState, id: CapitoloId): Blocco[] {
  switch (id) {
    case 'azioni':
      return blocchiAzioni(state);
    case 'sollecitazioni':
      return blocchiSollecitazioni(state);
    case 'verifiche':
      return blocchiVerifiche(state);
    case 'calcolatrice':
      return blocchiCalcolatrice(state);
    case 'costi':
      return blocchiCosti(state);
  }
}

/** Tutti i capitoli chiesti, nell'ordine in cui compaiono nell'app. */
export function capitoli(state: AppState, scelti: CapitoloId[]): Capitolo[] {
  return CAPITOLI.filter((c) => scelti.includes(c.id)).map((c) => ({
    ...c,
    blocchi: blocchiCapitolo(state, c.id),
  }));
}

/* ─────────────────────────── testo da incollare ─────────────────────────── */

/** Intestazione di commessa, comune al «Copia» e al foglio di esportazione. */
export function intestazione(state: AppState, titolo: string): string[] {
  const p = state.progetto;
  return [
    `${titolo} — ${p.nome} (commessa ${p.commessa})`,
    `${p.localita} · NTC2018 (DM 17/01/2018) · rev. ${p.revisione}`,
    '',
  ];
}

/** Blocchi appiattiti in righe di testo, con i rientri della relazione. */
export function testoBlocchi(blocchi: Blocco[]): string[] {
  return blocchi.flatMap((b, i) => [...(i ? [''] : []), b.titolo.toUpperCase(), ...b.righe.map((r) => `  ${r}`)]);
}

/** Il foglio del quaderno appiattito in righe di testo, nell'ordine dei blocchi. */
export function testoFoglio(state: AppState): string[] {
  const righe = foglioQuaderno(state).flatMap((e) => {
    if (e.tipo === 'capitolo')
      return [e.capitolo.titolo.toUpperCase(), ''.padEnd(e.capitolo.titolo.length, '─'), ...testoBlocchi(e.capitolo.blocchi), ''];
    if (e.tipo === 'nota') return [e.testo, ''];
    if (e.tipo === 'immagine') return [`[schema allegato${e.didascalia ? `: ${e.didascalia}` : ''}]`, ''];
    return [`${e.passo}  ${e.testo}${e.nota ? `   — ${e.nota}` : ''}`];
  });
  return righe.length ? righe : ['(quaderno vuoto)'];
}

/** Blocco di testo della scheda, pronto da incollare in Word. */
export function testoRelazione(state: AppState, tab: TabId): string {
  const capitolo = CAPITOLI.find((c) => c.id === tab);
  if (!capitolo) {
    // schede senza un capitolo proprio: dal quaderno si copia il foglio come
    // è stato composto, dalle altre (la Libreria) lo stesso — è il documento
    const e = state.quaderno;
    return [
      ...intestazione(state, 'RELAZIONE'),
      ...(e.intestazione.trim() ? [e.intestazione.trim(), ''] : []),
      ...testoFoglio(state),
      ...(e.nota.trim() ? ['', e.nota.trim()] : []),
    ].join('\n');
  }
  return [...intestazione(state, capitolo.titolo.toUpperCase()), ...testoBlocchi(blocchiCapitolo(state, capitolo.id))].join(
    '\n',
  );
}

/** Input delle verifiche con il VEd effettivamente in uso (collegato o a mano). */
function verificheDi(state: AppState) {
  const az = calcolaAzioni(state.azioni);
  const soll = calcolaSollecitazioni(state.sollecitazioni, az);
  return inputVerifiche(state, Math.abs(soll.trave.VmaxAbs.val));
}

/**
 * Esito di ogni verifica, con il nome: alimenta badge e piede della nav.
 * Una verifica con dati in ingresso non validi non è «soddisfatta»: conta fra
 * quelle da sistemare, altrimenti il badge direbbe ✓ mentre il pannello dice
 * che l'esito non è calcolabile.
 */
export function esitiVerifiche(state: AppState): { label: string; ok: boolean }[] {
  const inp = verificheDi(state);
  const na = verificaTaglioNonArmato(inp.taglioNonArmato);
  const ar = verificaTaglioArmato(inp.taglioArmato);
  const naOk = valido(validaTaglioNonArmato(inp.taglioNonArmato));
  const arOk = valido(validaTaglioArmato(inp.taglioArmato));
  return [
    { label: 'Taglio senza staffe', ok: naOk && na.esito.ok },
    { label: 'Taglio con staffe', ok: arOk && ar.esito.ok },
    { label: 'Armatura minima', ok: arOk && ar.esitoAswMin.ok },
    { label: 'Passo massimo', ok: arOk && ar.esitoPasso.ok },
  ];
}

/** Numero di verifiche non soddisfatte, per il badge di navigazione. */
export function verificheNonSoddisfatte(state: AppState): { ko: number; tot: number } {
  const esiti = esitiVerifiche(state);
  return { ko: esiti.filter((e) => !e.ok).length, tot: esiti.length };
}
