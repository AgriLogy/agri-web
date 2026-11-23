/**
 * Pure helpers for the sector "Conseil" panel (agri-api#459 phase 3): water
 * balance gauge, status chips, number formatting. No React, no next-intl, so
 * they stay testable under jest.
 *
 * Every number from the insights endpoint may be `null` when an input is
 * missing; the UI must show "—" and never "NaN".
 */

import type {
  GeometrySource,
  KcSource,
  VegetationStatus,
  WaterBalance,
  WaterBalanceDay,
  WaterBalanceStatus,
} from '@agri/api-client/farmMapApi';

export const DASH = '—';

/** True for a real, finite number (null / undefined / NaN / ±∞ are not). */
export function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * `value` with `digits` decimals and an optional unit, or "—" when missing.
 * Negative zero is shown as 0.
 */
export function fmtNum(
  v: number | null | undefined,
  digits = 1,
  unit = ''
): string {
  if (!isNum(v)) return DASH;
  const fixed = v.toFixed(digits);
  const clean = Number(fixed) === 0 ? (0).toFixed(digits) : fixed;
  return unit ? `${clean} ${unit}` : clean;
}

/** Signed variant: "+0.04", "−0.06" (true minus sign), or "—". */
export function fmtSigned(
  v: number | null | undefined,
  digits = 2,
  unit = ''
): string {
  if (!isNum(v)) return DASH;
  const s = fmtNum(Math.abs(v), digits);
  const sign = Number(s) === 0 ? '' : v > 0 ? '+' : '−';
  return `${sign}${s}${unit ? ` ${unit}` : ''}`;
}

/** Chakra colour scheme for a water-balance status chip. */
export const WATER_STATUS_SCHEME: Record<WaterBalanceStatus, string> = {
  ok: 'green',
  irrigate_soon: 'orange',
  irrigate_now: 'red',
};

/** Hex colours matching the chips, for the gauge fill / chart line. */
export const WATER_STATUS_COLOR: Record<WaterBalanceStatus, string> = {
  ok: '#38a169',
  irrigate_soon: '#dd6b20',
  irrigate_now: '#e53e3e',
};

export function waterStatusScheme(status: string | null | undefined): string {
  return status && status in WATER_STATUS_SCHEME
    ? WATER_STATUS_SCHEME[status as WaterBalanceStatus]
    : 'gray';
}

/** Chakra colour scheme for a vegetation-status chip. */
const VEGETATION_SCHEME: Record<VegetationStatus, string> = {
  healthy: 'green',
  water_stress: 'orange',
  excess_water: 'blue',
  low_vigor_other: 'yellow',
  declining: 'red',
  insufficient_data: 'gray',
};

export function vegetationScheme(status: string | null | undefined): string {
  return status && status in VEGETATION_SCHEME
    ? VEGETATION_SCHEME[status as VegetationStatus]
    : 'gray';
}

/** Known codes for which the UI has its own wording; anything else → null. */
export function knownCode<T extends string>(
  value: string | null | undefined,
  codes: readonly T[]
): T | null {
  return value && (codes as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export const WATER_STATUSES: readonly WaterBalanceStatus[] = [
  'ok',
  'irrigate_soon',
  'irrigate_now',
];
export const VEGETATION_STATUSES: readonly VegetationStatus[] = [
  'healthy',
  'water_stress',
  'excess_water',
  'low_vigor_other',
  'declining',
  'insufficient_data',
];
export const UNAVAILABLE_REASONS = [
  'no_zone',
  'no_soil_params',
  'no_location',
] as const;
export const KC_SOURCES: readonly KcSource[] = ['kc_period', 'default'];
export const GEOMETRY_SOURCES: readonly GeometrySource[] = [
  'draw',
  'kml',
  'restore',
];

export interface DepletionGauge {
  /** Dr as a share of the bar (0–100), clamped. */
  fillPct: number;
  /** RAW marker position (0–100). */
  rawPct: number;
  /** "Irrigate soon" marker (0.75 × RAW), 0–100. */
  soonPct: number;
}

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

/**
 * Bar geometry for the depletion gauge: the bar spans 0 → TAW, Dr fills it,
 * RAW (and 0.75 × RAW) are markers. Null when TAW is unknown or not positive
 * (no meaningful scale).
 */
export function depletionGauge(
  wb: Pick<WaterBalance, 'taw_mm' | 'raw_mm' | 'dr_mm'>
): DepletionGauge | null {
  const { taw_mm: taw, raw_mm: raw, dr_mm: dr } = wb;
  if (!isNum(taw) || taw <= 0) return null;
  return {
    fillPct: isNum(dr) ? clampPct((dr / taw) * 100) : 0,
    rawPct: isNum(raw) ? clampPct((raw / taw) * 100) : 0,
    soonPct: isNum(raw) ? clampPct(((0.75 * raw) / taw) * 100) : 0,
  };
}

export interface BalanceChartRow {
  date: string;
  dr: number | null;
  rain: number;
  irrigation: number;
  et: number | null;
}

/**
 * Chart rows, oldest first. Missing rain / irrigation draw as no bar (0);
 * a missing Dr leaves a gap in the line (null), never NaN.
 */
export function balanceChartRows(days: WaterBalanceDay[]): BalanceChartRow[] {
  return [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      dr: isNum(d.dr_mm) ? d.dr_mm : null,
      rain: isNum(d.rain_mm) ? d.rain_mm : 0,
      irrigation: isNum(d.irrigation_mm) ? d.irrigation_mm : 0,
      et: isNum(d.etc_mm) ? d.etc_mm : null,
    }));
}

/** "2026-11-10" → "10/11" (short axis label, locale-free). */
export function shortDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : iso;
}

/** Weekly NDVI change under this (either way) reads as "stable" — same
 * threshold as agri-core's NDVI_STABLE_PER_WEEK. */
export const NDVI_STABLE_PER_WEEK = 0.01;

export function isStableTrend(trend: number | null | undefined): boolean {
  return (
    typeof trend === 'number' &&
    Number.isFinite(trend) &&
    Math.abs(trend) < NDVI_STABLE_PER_WEEK
  );
}
