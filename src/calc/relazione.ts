/**
 * Blocco di testo "Copia per relazione": valori, formule e riferimenti
 * normativi pronti da incollare in Word.
 */

import type { AppState, TabId } from '../state/store';
import { calcolaAzioni, num } from './azioni';
import { COMBINAZIONI, calcolaSollecitazioni } from './sollecitazioni';
import { SCHEMI_BY_ID } from './trave';
import { verificaTaglioArmato, verificaTaglioNonArmato } from './verifiche';

const fx = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

export function testoRelazione(state: AppState, tab: TabId): string {
  const p = state.progetto;
  const intestazione = [
    `${tab.toUpperCase()} — ${p.nome} (commessa ${p.commessa})`,
    `${p.localita} · NTC2018 (DM 17/01/2018) · rev. ${p.revisione}`,
    '',
  ];
  const az = calcolaAzioni(state.azioni);

  if (tab === 'azioni') {
    return [
      ...intestazione,
      'AZIONE SISMICA — NTC2018 §3.2',
      `  Località: ${state.azioni.loc}; sottosuolo ${state.azioni.suolo}; topografia ${state.azioni.topo}`,
      `  ag/g = ${fx(az.sisma.ag, 3)}; S = SS·ST = ${fx(az.sisma.S)}; F0 = ${fx(az.sisma.F0)}; q = ${fx(az.sisma.q)}`,
      `  Sd(T1) = ag·S·F0/q = ${fx(az.sisma.Sd, 3)} g`,
      `  VR = VN·CU = ${fx(az.sisma.VR, 0)} anni; TR (SLV) = ${fx(az.sisma.TR, 0)} anni`,
      '',
      'CARICO NEVE — NTC2018 §3.4',
      `  Zona ${state.azioni.zneve}; as = ${fx(num(state.azioni.as), 0)} m`,
      `  qsk = ${fx(az.neve.qsk)} kN/m²; qs = μ1·qsk·CE·Ct = ${fx(az.neve.qs)} kN/m²`,
      '',
      'AZIONE DEL VENTO — NTC2018 §3.3',
      `  Zona ${state.azioni.zvento}; esposizione ${state.azioni.espo}; z = ${fx(num(state.azioni.z))} m`,
      `  qb = ½·ρ·vb² = ${fx(az.vento.qb, 3)} kN/m²; ce(z) = ${fx(az.vento.ce)}`,
      `  p = qb·ce·cp·cd = ${fx(az.vento.p)} kN/m² (sopravento); ${fx(az.vento.pSotto)} kN/m² (sottovento)`,
      '',
      'CARICHI VARIABILI — NTC2018 §3.1.4, Tab. 3.1.II',
      `  ${az.variabili.categoria}`,
      `  qk = ${fx(az.variabili.qk)} kN/m²; Qk = ${fx(az.variabili.Qk)} kN; Hk = ${fx(az.variabili.Hk)} kN/m`,
      `  ψ0 = ${fx(az.variabili.psi0)}; ψ1 = ${fx(az.variabili.psi1)}; ψ2 = ${fx(az.variabili.psi2)}`,
      '',
      'SPINTA DELLE TERRE — NTC2018 §6.5.3',
      `  γ = ${fx(num(state.azioni.gamma), 1)} kN/m³; φ′ = ${fx(num(state.azioni.phi), 0)}°; H = ${fx(num(state.azioni.H))} m`,
      `  Ka = tan²(45° − φ′/2) = ${fx(az.terre.ka, 3)}; Sa = ½·γ·H²·Ka = ${fx(az.terre.Sa, 1)} kN/m`,
      `  za = H/3 = ${fx(az.terre.za)} m; Mrib = ${fx(az.terre.Mrib, 1)} kNm/m`,
    ].join('\n');
  }

  if (tab === 'sollecitazioni') {
    const s = state.sollecitazioni;
    const r = calcolaSollecitazioni(s, az);
    const t = r.trave;
    const comb = COMBINAZIONI.find((c) => c.id === s.combinazione)!;
    return [
      ...intestazione,
      `SCHEMA STATICO: ${SCHEMI_BY_ID[s.schema].label} — elemento ${s.orientamento}`,
      `  L = ${fx(r.L)} m; interasse = ${fx(num(s.interasse))} m; EJ = ${fx(r.EJ, 0)} kNm²`,
      '',
      `COMBINAZIONE: ${comb.label} — ${comb.ref}`,
      ...r.contributi.map(
        (c) =>
          `  ${c.sorgente.descr}: qk = ${fx(c.sorgente.qk)} kN/m²; γ = ${fx(c.gamma)}; ψ = ${fx(c.psi)} → ${fx(c.qd)} kN/m² (${c.ruolo})`,
      ),
      `  → q di progetto = ${fx(r.q)} kN/m` + (s.orientamento === 'verticale' ? `; N = ${fx(r.N, 1)} kN` : ''),
      '',
      'SOLLECITAZIONI',
      `  M max = ${fx(t.MmaxAbs.val, 1)} kNm (x = ${fx(t.MmaxAbs.x)} m)`,
      `  V max = ${fx(t.VmaxAbs.val, 1)} kN (x = ${fx(t.VmaxAbs.x)} m)`,
      `  Reazioni: RA = ${fx(t.reazioni.A.R, 1)} kN; MA = ${fx(t.reazioni.A.M, 1)} kNm; RB = ${fx(t.reazioni.B.R, 1)} kN; MB = ${fx(t.reazioni.B.M, 1)} kNm`,
      `  Freccia max = ${fx(Math.abs(t.fmax.val) * 1000, 2)} mm (x = ${fx(t.fmax.x)} m); L/f = ${Number.isFinite(t.Lsuf) ? fx(t.Lsuf, 0) : '∞'}`,
    ].join('\n');
  }

  if (tab === 'verifiche') {
    const na = verificaTaglioNonArmato(state.verifiche.taglioNonArmato);
    const ar = verificaTaglioArmato(state.verifiche.taglioArmato);
    return [
      ...intestazione,
      'VERIFICA A TAGLIO — ELEMENTI SENZA ARMATURE TRASVERSALI (NTC2018 §4.1.2.3.5.1)',
      `  Sezione ${state.verifiche.taglioNonArmato.bw} × ${state.verifiche.taglioNonArmato.h} mm; d = ${state.verifiche.taglioNonArmato.d} mm; ${state.verifiche.taglioNonArmato.cls}`,
      `  As = ${fx(na.As, 0)} mm²; ρ1 = ${fx(na.rho1, 5)}; k = ${fx(na.k, 3)}; σcp = ${fx(na.sigmaCp, 3)} N/mm²; νmin = ${fx(na.vmin, 4)} N/mm²`,
      `  VRd = max[(0.18·k·(100·ρ1·fck)^⅓/γc + 0.15·σcp)·bw·d ; (νmin + 0.15·σcp)·bw·d] = ${fx(na.VRd, 1)} kN`,
      `  VEd = ${state.verifiche.taglioNonArmato.VEd} kN → VEd/VRd = ${fx(na.esito.sfruttamento, 3)} — ${na.esito.ok ? 'VERIFICATO' : 'NON VERIFICATO'} (margine ${fx(na.esito.margine, 1)}%)`,
      '',
      'VERIFICA A TAGLIO — ELEMENTI CON ARMATURE TRASVERSALI (NTC2018 §4.1.2.3.5.2)',
      `  Sezione ${state.verifiche.taglioArmato.bw} × ${state.verifiche.taglioArmato.h} mm; d = ${fx(ar.d, 0)} mm; ${state.verifiche.taglioArmato.cls}`,
      `  Staffe ⌀${state.verifiche.taglioArmato.phiStaffa}/${state.verifiche.taglioArmato.passo} mm a ${state.verifiche.taglioArmato.nBracci} bracci; Asw = ${fx(ar.Asw, 1)} mm²; α = ${state.verifiche.taglioArmato.alfa}°`,
      `  ωsw = ${fx(ar.omegaSw, 5)}; cotϑ* = ${fx(ar.cotThetaStar, 3)} → cotϑ = ${fx(ar.cotTheta, 3)} (ϑ = ${fx(ar.theta, 1)}°); αc = ${fx(ar.alfaC, 3)}`,
      `  VRsd (eq. 4.1.18) = ${fx(ar.VRsd, 1)} kN; VRcd (eq. 4.1.19) = ${fx(ar.VRcd, 1)} kN`,
      `  VRd = min(VRsd, VRcd) = ${fx(ar.VRd, 1)} kN — meccanismo governante: ${ar.governa}`,
      `  VEd = ${state.verifiche.taglioArmato.VEd} kN → VEd/VRd = ${fx(ar.esito.sfruttamento, 3)} — ${ar.esito.ok ? 'VERIFICATO' : 'NON VERIFICATO'} (margine ${fx(ar.esito.margine, 1)}%)`,
      `  Minimi §4.1.6.1.1: Asw,min = ${fx(ar.AswMin, 0)} mm²/m — ${ar.esitoAswMin.ok ? 'soddisfatto' : 'NON soddisfatto'}; passo max = ${fx(ar.passoMax, 0)} mm — ${ar.esitoPasso.ok ? 'soddisfatto' : 'NON soddisfatto'}`,
    ].join('\n');
  }

  // costi
  const righe = state.costi.map((v) => {
    const tot = num(v.quantita) * num(v.prezzo);
    return `  ${v.categoria} | ${v.descrizione} | ${v.quantita} ${v.um} × ${v.prezzo} € = ${tot.toFixed(2)} €`;
  });
  const generale = state.costi.reduce((s, v) => s + num(v.quantita) * num(v.prezzo), 0);
  return [...intestazione, 'COMPUTO SINTETICO', ...righe, '', `  TOTALE GENERALE = ${generale.toFixed(2)} €`].join('\n');
}

/** Numero di verifiche non soddisfatte, per il badge di navigazione. */
export function verificheNonSoddisfatte(state: AppState): { ko: number; tot: number } {
  const na = verificaTaglioNonArmato(state.verifiche.taglioNonArmato);
  const ar = verificaTaglioArmato(state.verifiche.taglioArmato);
  const esiti = [na.esito, ar.esito, ar.esitoAswMin, ar.esitoPasso];
  return { ko: esiti.filter((e) => !e.ok).length, tot: esiti.length };
}
