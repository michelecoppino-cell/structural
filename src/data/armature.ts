/**
 * Tabellina delle armature: quello che serve a bordo tavolo quando si
 * disegnano i ferri — area, peso al metro, diametro del mandrino di piega e
 * raggio interno di curvatura.
 *
 * Il mandrino è quello minimo di EC2 §8.3, Tab. 8.1N, ripreso dalla Circolare
 * 2019: 4⌀ fino a ⌀16, 7⌀ oltre. Il raggio interno di curvatura è metà del
 * mandrino. Il peso è quello dell'acciaio, 7850 kg/m³.
 */

import { DIAMETRI, TONDI } from './materiali';

/** Peso di volume dell'acciaio da armatura (kg/m³). */
export const PESO_ACCIAIO = 7850;

/** Peso al metro di una barra (kg/m), dall'area in mm². */
export function pesoBarra(fi: number): number {
  const a = TONDI[fi]?.area ?? (Math.PI * fi * fi) / 4;
  return (a * PESO_ACCIAIO) / 1e6;
}

/** Diametro minimo del mandrino di piega (mm) — EC2 Tab. 8.1N. */
export function mandrinoPiega(fi: number): number {
  return fi <= 16 ? 4 * fi : 7 * fi;
}

/** Raggio interno di curvatura (mm): metà del mandrino. */
export function raggioPiega(fi: number): number {
  return mandrinoPiega(fi) / 2;
}

export interface RigaArmatura {
  fi: number;
  /** Area della singola barra (mm²). */
  area: number;
  /** Peso al metro (kg/m). */
  peso: number;
  /** Diametro minimo del mandrino di piega (mm). */
  mandrino: number;
  /** Raggio interno di curvatura (mm). */
  raggio: number;
}

/** La tabella completa, un diametro commerciale per riga. */
export const TABELLA_ARMATURE: RigaArmatura[] = DIAMETRI.map((fi) => ({
  fi,
  area: TONDI[fi].area,
  peso: pesoBarra(fi),
  mandrino: mandrinoPiega(fi),
  raggio: raggioPiega(fi),
}));

/** Area complessiva di n barre di diametro ⌀ (mm²). */
export function areaBarre(fi: number, n: number): number {
  const a = TONDI[fi]?.area ?? (Math.PI * fi * fi) / 4;
  return a * n;
}
