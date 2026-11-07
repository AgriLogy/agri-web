/**
 * Pure NDVI helpers for the farm map (agri-api#459 phase 2). No React, no
 * next-intl, so they stay testable under jest.
 */

import type { NdviStat } from '@agri/api-client/farmMapApi';

/** Mapbox image-source corners (TL, TR, BR, BL) of a polygon's bbox. */
export function bboxCorners(
  geometry: { type: string; coordinates: unknown } | null | undefined
): [number, number][] | null {
  if (!geometry) return null;
  const pts: [number, number][] = [];
  const visit = (v: unknown): void => {
    if (!Array.isArray(v)) return;
    if (
      v.length >= 2 &&
      typeof v[0] === 'number' &&
      typeof v[1] === 'number' &&
      Number.isFinite(v[0]) &&
      Number.isFinite(v[1])
    ) {
      pts.push([v[0], v[1]]);
      return;
    }
    v.forEach(visit);
  };
  visit(geometry.coordinates);
  if (pts.length < 3) return null;
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  const [w, e] = [Math.min(...lons), Math.max(...lons)];
  const [s, n] = [Math.min(...lats), Math.max(...lats)];
  if (w === e || s === n) return null;
  return [
    [w, n],
    [e, n],
    [e, s],
    [w, s],
  ];
}

export type NdviClass = 'bare' | 'low' | 'moderate' | 'high';

/** Coarse vigour class for a mean NDVI (wording lives in i18n). */
export function ndviClass(mean: number): NdviClass {
  if (mean < 0.2) return 'bare';
  if (mean < 0.4) return 'low';
  if (mean < 0.6) return 'moderate';
  return 'high';
}

/** Dates where enough of the sector was clear to trust the mean. */
export const MIN_VALID_FRACTION = 0.6;

export function usableStats(series: NdviStat[]): NdviStat[] {
  return series.filter((s) => s.valid_fraction >= MIN_VALID_FRACTION);
}

/** Change of mean NDVI between the last two usable dates, or null. */
export function latestChange(
  series: NdviStat[]
): { from: NdviStat; to: NdviStat; delta: number } | null {
  const ok = usableStats(series);
  if (ok.length < 2) return null;
  const from = ok[ok.length - 2]!;
  const to = ok[ok.length - 1]!;
  return { from, to, delta: Math.round((to.mean - from.mean) * 1000) / 1000 };
}

/** CSS linear-gradient for the legend bar (stops spread -0.2 → 0.8). */
export function legendGradient(stops: { value: number; color: string }[]) {
  if (!stops.length) return 'none';
  const lo = stops[0]!.value;
  const hi = stops[stops.length - 1]!.value;
  const parts = stops.map(
    (s) => `${s.color} ${Math.round(((s.value - lo) / (hi - lo || 1)) * 100)}%`
  );
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

/** The stat for one acquisition date, if the statistics cover it. */
export function statAt(series: NdviStat[], date: string): NdviStat | null {
  return series.find((s) => s.date === date) ?? null;
}

/**
 * Persistent decline: the last two clear acquisitions are both below the
 * sector's earlier clear-sky average by more than `drop`. Needs at least two
 * earlier clear dates as a baseline, otherwise null (not enough history).
 */
export function persistentDecline(
  series: NdviStat[],
  drop = 0.1
): { baseline: number; latest: number } | null | false {
  const ok = usableStats(series);
  if (ok.length < 4) return null;
  const recent = ok.slice(-2);
  const earlier = ok.slice(0, -2);
  const baseline = earlier.reduce((a, s) => a + s.mean, 0) / earlier.length;
  const declined = recent.every((s) => s.mean < baseline - drop);
  return declined
    ? {
        baseline: Math.round(baseline * 1000) / 1000,
        latest: recent[recent.length - 1]!.mean,
      }
    : false;
}
