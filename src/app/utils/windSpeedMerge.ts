import api from '@/app/lib/api';
import type { SensorData } from '@/app/types';

/** Optional `wind_gust` after merge or from embedded API fields on windspeed rows. */
export type WindSpeedSensorRow = SensorData & { wind_gust?: number };

/**
 * Heuristic gust-only URLs (not documented in this repo / README).
 * Station UI (`WindSpeedGraph.tsx`) reads `wind_gust` from the same `sensor_data` as `wind_speed`
 * — rafale may only exist there. If your Django API exposes a dedicated route, prepend it here.
 */
const WIND_GUST_ENDPOINTS = [
  '/sensors/windgust',
  '/sensors/wind_gust',
  '/sensors/windgust',
  '/sensors/wind_gust',
] as const;

function unwrapSensorList(data: unknown): SensorData[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: SensorData[] }).results;
  }
  return [];
}

/** Second-precision key so "2024-01-01T12:00:00.000Z" matches "2024-01-01T12:00:00Z". */
function timeKey(ts: string): string {
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return ts;
  const d = new Date(ms);
  return d.toISOString().slice(0, 19);
}

/** Gust endpoint may use `value` (standard SensorData) or `wind_gust` / `gust` only. */
function gustNumeric(row: SensorData): number | undefined {
  if (typeof row.value === 'number' && Number.isFinite(row.value)) {
    return row.value;
  }
  const o = row as unknown as Record<string, unknown>;
  for (const k of ['wind_gust', 'gust', 'rafale', 'wind_gust_kmh']) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v !== '') {
      const n = Number(String(v).replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

/**
 * Fetches rafale (gust) as its own sensor series (`timestamp` + `value`).
 * Tries each URL; skips empty 200 responses so a wrong first route does not block the right one.
 */
export async function fetchWindGustRows(params: {
  start_date: string;
  end_date: string;
  zone: number | null;
}): Promise<SensorData[]> {
  let lastEmpty: SensorData[] = [];
  for (const path of WIND_GUST_ENDPOINTS) {
    try {
      const res = await api.get<unknown>(path, { params });
      const rows = unwrapSensorList(res.data);
      if (rows.length > 0) return rows;
      lastEmpty = rows;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[fetchWindGustRows] ${path} failed:`, err);
      }
      continue;
    }
  }
  return lastEmpty;
}

/**
 * Nearest gust sample within `maxDeltaMs` (default 90s) when timestamps do not match exactly.
 */
function nearestGustValue(
  speedTs: string,
  gustRows: SensorData[],
  maxDeltaMs: number
): number | undefined {
  const t = Date.parse(speedTs);
  if (Number.isNaN(t)) return undefined;
  let best: { delta: number; value: number } | null = null;
  for (const g of gustRows) {
    const gv = gustNumeric(g);
    if (gv === undefined) continue;
    const gt = Date.parse(g.timestamp);
    if (Number.isNaN(gt)) continue;
    const delta = Math.abs(gt - t);
    if (delta <= maxDeltaMs && (best == null || delta < best.delta)) {
      best = { delta, value: gv };
    }
  }
  return best?.value;
}

/**
 * Attaches `wind_gust` to each speed row using exact timestamp, normalized key, then nearest sample.
 */
export function mergeGustIntoSpeedRows(
  speedRows: SensorData[],
  gustRows: SensorData[]
): WindSpeedSensorRow[] {
  if (gustRows.length === 0) {
    return speedRows.map((s) => ({ ...s }));
  }

  const byExact = new Map<string, number>();
  const byTimeKey = new Map<string, number>();
  for (const g of gustRows) {
    const gv = gustNumeric(g);
    if (gv === undefined) continue;
    byExact.set(g.timestamp, gv);
    byTimeKey.set(timeKey(g.timestamp), gv);
  }

  return speedRows.map((s) => {
    const gust =
      byExact.get(s.timestamp) ??
      byTimeKey.get(timeKey(s.timestamp)) ??
      nearestGustValue(s.timestamp, gustRows, 90_000);

    return gust !== undefined ? { ...s, wind_gust: gust } : { ...s };
  });
}
