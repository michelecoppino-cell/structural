/**
 * Blocco di testo "Copia per relazione": valori, formule e riferimenti
 * normativi pronti da incollare in Word.
 */

import type { AppState, TabId } from '../state/store';
import { inputVerifiche } from '../state/store';
import { calcolaAzioni, num } from './azioni';
import { COMBINAZIONI, calcolaSollecitazioni } from './sollecitazioni';
import { SCHEMI_BY_ID } from './trave';
import { verificaTaglioArmato, verificaTaglioNonArmato } from './verifiche';
import { valido, validaTaglioArmato, validaTaglioNonArmato } from './validazione';

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
      `  Sito: ${az.sisma.sito}, ${state.azioni.regione} — zona sismica ${az.sisma.zonaLabel ?? '—'}`,
      `  Sottosuolo ${state.azioni.suolo}; topografia ${state.azioni.topo}`,
      `  ${az.sisma.nota}`,
      `  VR = VN·CU = ${fx(az.sisma.VR, 0)} anni; stato limite ${state.azioni.sl ?? 'SLV'}; TR = ${fx(az.sisma.TR, 0)} anni`,
      ...az.sisma.statiLimite.map(
        (s) =>
          `    ${s.id}: TR = ${fx(s.TR, 0)} anni; ag/g = ${fx(s.ag, 3)}; F0 = ${fx(s.F0, 3)}; TC* = ${fx(s.TCstar, 3)} s`,
      ),
      `  ag/g = ${fx(az.sisma.ag, 3)}; SS = ${fx(az.sisma.Ss)}; ST = ${fx(az.sisma.St)}; S = SS·ST = ${fx(az.sisma.S)}`,
      `  F0 = ${fx(az.sisma.F0, 3)}; TC* = ${fx(az.sisma.TCstar, 3)} s; CC = ${fx(az.sisma.Cc)} → TB = ${fx(az.sisma.TB)} s; TC = ${fx(az.sisma.TC)} s; TD = ${fx(az.sisma.TD)} s`,
      `  q = ${fx(az.sisma.q)}; Sd(T1) = ag·S·F0/q = ${fx(az.sisma.Sd, 3)} g`,
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
    const inp = verificheDi(state);
    const na = verificaTaglioNonArmato(inp.taglioNonArmato);
    const ar = verificaTaglioArmato(inp.taglioArmato);
    return [
      ...intestazione,
      'VERIFICA A TAGLIO — ELEMENTI SENZA ARMATURE TRASVERSALI (NTC2018 §4.1.2.3.5.1)',
      `  Sezione ${inp.taglioNonArmato.bw} × ${inp.taglioNonArmato.h} mm; d = ${inp.taglioNonArmato.d} mm; ${inp.taglioNonArmato.cls}`,
      `  As = ${fx(na.As, 0)} mm²; ρ1 = ${fx(na.rho1, 5)}; k = ${fx(na.k, 3)}; σcp = ${fx(na.sigmaCp, 3)} N/mm²; νmin = ${fx(na.vmin, 4)} N/mm²`,
      `  VRd = max[(0.18·k·(100·ρ1·fck)^⅓/γc + 0.15·σcp)·bw·d ; (νmin + 0.15·σcp)·bw·d] = ${fx(na.VRd, 1)} kN`,
      `  VEd = ${inp.taglioNonArmato.VEd} kN → VEd/VRd = ${fx(na.esito.sfruttamento, 3)} — ${na.esito.ok ? 'VERIFICATO' : 'NON VERIFICATO'} (margine ${fx(na.esito.margine, 1)}%)`,
      '',
      'VERIFICA A TAGLIO — ELEMENTI CON ARMATURE TRASVERSALI (NTC2018 §4.1.2.3.5.2)',
      `  Sezione ${inp.taglioArmato.bw} × ${inp.taglioArmato.h} mm; d = ${fx(ar.d, 0)} mm; ${inp.taglioArmato.cls}`,
      `  Staffe ⌀${inp.taglioArmato.phiStaffa}/${inp.taglioArmato.passo} mm a ${inp.taglioArmato.nBracci} bracci; Asw = ${fx(ar.Asw, 1)} mm²; α = ${inp.taglioArmato.alfa}°`,
      `  ωsw = ${fx(ar.omegaSw, 5)}; cotϑ* = ${fx(ar.cotThetaStar, 3)} → cotϑ = ${fx(ar.cotTheta, 3)} (ϑ = ${fx(ar.theta, 1)}°); αc = ${fx(ar.alfaC, 3)}`,
      `  VRsd (eq. 4.1.18) = ${fx(ar.VRsd, 1)} kN; VRcd (eq. 4.1.19) = ${fx(ar.VRcd, 1)} kN`,
      `  VRd = min(VRsd, VRcd) = ${fx(ar.VRd, 1)} kN — meccanismo governante: ${ar.governa}`,
      `  VEd = ${inp.taglioArmato.VEd} kN → VEd/VRd = ${fx(ar.esito.sfruttamento, 3)} — ${ar.esito.ok ? 'VERIFICATO' : 'NON VERIFICATO'} (margine ${fx(ar.esito.margine, 1)}%)`,
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
