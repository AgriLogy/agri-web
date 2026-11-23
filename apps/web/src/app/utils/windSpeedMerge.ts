import type { SensorData } from '@/app/types';

/** Optional `wind_gust` after merge or from embedded API fields on windspeed rows. */
export type WindSpeedSensorRow = SensorData & { wind_gust?: number };

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
