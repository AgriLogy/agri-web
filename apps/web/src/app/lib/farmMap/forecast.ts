/**
 * Pure helpers for the "Prévisions" map layer (agri-api#459 phase 3): colour
 * scales, bucketing, legend and the sector feature collection the fill layer
 * draws. No React, no Mapbox, no next-intl — testable under jest.
 */

import type {
  FarmForecast,
  SectorForecast,
  SectorGeometry,
} from '@agri/api-client/farmMapApi';
import { DASH, fmtNum, fmtSigned, isNum } from './insights';

export type ForecastMetric = 'rain' | 'balance';
export const FORECAST_METRICS: readonly ForecastMetric[] = ['rain', 'balance'];

/** Horizons offered in the selector (the API accepts 1–7). */
export const FORECAST_HORIZONS = [1, 3, 7] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];
export const DEFAULT_HORIZON: ForecastHorizon = 3;

/** Colour for a sector the forecast has no number for. */
export const NO_DATA_COLOR = '#a0aec0';

export interface ColorScale {
  /** Ascending bucket edges; bucket i is [edges[i-1], edges[i]). */
  edges: number[];
  /** One more colour than edges. */
  colors: string[];
}

/** Total rain (mm): sequential blue, dry → wet. */
export const RAIN_SCALE: ColorScale = {
  edges: [1, 5, 10, 20, 40],
  colors: ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
};

/** Rain − ET0 (mm): diverging red (drying) ↔ blue (wetting), neutral ±3. */
export const BALANCE_SCALE: ColorScale = {
  edges: [-20, -10, -3, 3, 10, 20],
  colors: [
    '#b2182b',
    '#ef8a62',
    '#fddbc7',
    '#f7f7f7',
    '#d1e5f0',
    '#67a9cf',
    '#2166ac',
  ],
};

export const SCALES: Record<ForecastMetric, ColorScale> = {
  rain: RAIN_SCALE,
  balance: BALANCE_SCALE,
};

/** Index of the bucket `v` falls in (edges are inclusive lower bounds). */
export function bucketIndex(v: number, edges: number[]): number {
  let i = 0;
  while (i < edges.length && v >= edges[i]!) i += 1;
  return i;
}

export function colorFor(v: number | null | undefined, scale: ColorScale) {
  return isNum(v) ? scale.colors[bucketIndex(v, scale.edges)]! : NO_DATA_COLOR;
}

/** The number a sector is coloured by, for the chosen metric. */
export function metricValue(
  s: Pick<SectorForecast, 'total_rain_mm' | 'balance_mm'>,
  metric: ForecastMetric
): number | null {
  const v = metric === 'rain' ? s.total_rain_mm : s.balance_mm;
  return isNum(v) ? v : null;
}

export interface LegendEntry {
  color: string;
  label: string;
}

const edgeLabel = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toFixed(1);

/**
 * Legend rows, low → high: "< 1", "1 – 5", …, "≥ 40" (mm appended by the UI).
 * Uses a true minus sign for negatives.
 */
export function legendEntries(scale: ColorScale): LegendEntry[] {
  const e = scale.edges.map((v) => edgeLabel(v).replace('-', '−'));
  return scale.colors.map((color, i) => ({
    color,
    label:
      i === 0
        ? `< ${e[0]}`
        : i === e.length
          ? `≥ ${e[e.length - 1]}`
          : `${e[i - 1]} – ${e[i]}`,
  }));
}

/** Display value for one metric ("12.4 mm", "−8.6 mm", "—"). */
export function formatMetric(
  v: number | null | undefined,
  metric: ForecastMetric
): string {
  if (!isNum(v)) return DASH;
  return metric === 'balance' ? fmtSigned(v, 1, 'mm') : fmtNum(v, 1, 'mm');
}

export interface ForecastFeatureProps {
  sector_id: number;
  name: string;
  color: string;
  /** Pre-formatted for the popup (Mapbox stringifies properties anyway). */
  rain: string;
  et0: string;
  balance: string;
  value: string;
}

/**
 * Fill features for the layer: the forecast's sectors joined to their shape by
 * id, coloured by the chosen metric. Sectors without a usable shape are left
 * out (nothing to paint).
 */
export function forecastFeatures(
  forecast: Pick<FarmForecast, 'sectors'> | null,
  geometryOf: (sectorId: number) => SectorGeometry | null | undefined,
  metric: ForecastMetric
): GeoJSON.FeatureCollection<SectorGeometry, ForecastFeatureProps> {
  const scale = SCALES[metric];
  const features: GeoJSON.Feature<SectorGeometry, ForecastFeatureProps>[] = [];
  for (const s of forecast?.sectors ?? []) {
    const geometry = geometryOf(s.sector_id);
    if (!geometry) continue;
    const v = metricValue(s, metric);
    features.push({
      type: 'Feature',
      id: s.sector_id,
      geometry,
      properties: {
        sector_id: s.sector_id,
        name: s.name,
        color: colorFor(v, scale),
        rain: formatMetric(s.total_rain_mm, 'rain'),
        et0: fmtNum(s.total_et0_mm, 1, 'mm'),
        balance: formatMetric(s.balance_mm, 'balance'),
        value: formatMetric(v, metric),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Clamp anything to a horizon the selector offers. */
export function toHorizon(v: unknown): ForecastHorizon {
  const n = Number(v);
  return (FORECAST_HORIZONS as readonly number[]).includes(n)
    ? (n as ForecastHorizon)
    : DEFAULT_HORIZON;
}
