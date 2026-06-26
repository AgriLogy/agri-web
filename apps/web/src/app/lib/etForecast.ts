/**
 * Pure display helpers for the 7-day ET0 forecast (agrilogy-front #18).
 *
 * Dependency-free (only a type-only import) so they're jest-testable without
 * the next-intl/Chakra component layer or axios.
 */

import type { EtForecastDay } from '@agri/api-client';

/** The day with the highest reference ET0 (null for an empty forecast). */
export function peakEtDay(days: EtForecastDay[]): EtForecastDay | null {
  if (days.length === 0) return null;
  return days.reduce((max, d) => (d.et0_mm > max.et0_mm ? d : max), days[0]);
}

/** Total expected reference ET0 over the window, mm (rounded to 1dp). */
export function totalEtMm(days: EtForecastDay[]): number {
  const sum = days.reduce((acc, d) => acc + d.et0_mm, 0);
  return Math.round(sum * 10) / 10;
}

/** Largest et0_mm in the set, for scaling a bar visualisation (min 0.1). */
export function maxEtMm(days: EtForecastDay[]): number {
  return days.reduce((m, d) => Math.max(m, d.et0_mm), 0.1);
}
