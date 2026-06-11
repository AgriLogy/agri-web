/** Stable sort by ISO timestamp string (use before building a slider timeline). */
export function sortByTimestamp<T extends { timestamp: string }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export type FrequencyUnit = 'minute' | 'hour' | 'day';

/**
 * How densely a chart should show points. `native` keeps every reading;
 * `minute`/`hour`/`day` snap to fixed UTC-aligned buckets; `custom` is an
 * arbitrary `amount` × `unit` window (e.g. every 15 minutes).
 */
export type ChartFrequency =
  | { kind: 'native' }
  | { kind: 'minute' }
  | { kind: 'hour' }
  | { kind: 'day' }
  | { kind: 'custom'; amount: number; unit: FrequencyUnit };

const UNIT_MS: Record<FrequencyUnit, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};

/** Bucket width in ms for a frequency, or `null` for `native` (no bucketing). */
export function frequencyToMs(freq: ChartFrequency): number | null {
  switch (freq.kind) {
    case 'native':
      return null;
    case 'minute':
    case 'hour':
    case 'day':
      return UNIT_MS[freq.kind];
    case 'custom': {
      const amount = Number.isFinite(freq.amount)
        ? Math.max(1, Math.floor(freq.amount))
        : 1;
      return amount * UNIT_MS[freq.unit];
    }
  }
}

// Identity/text/array columns are carried from the last raw row in a bucket,
// never averaged. Everything else numeric is a measurement and gets averaged.
const NON_MEASUREMENT_KEYS = new Set(['id', 'zone', 'user', 'timestamp']);

const bucketStartIso = (ms: number): string =>
  new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Collapse already-sorted sensor rows into one averaged row per fixed-width
 * time bucket. Numeric measurement columns (value, wind_gust, the three NPK
 * components, …) are averaged over each bucket; identifiers and text/array
 * metadata are carried from the last raw row; the timestamp is snapped to the
 * bucket start (UTC-aligned). `native` returns the input unchanged.
 *
 * Pure + dependency-free so it stays unit-testable (no next-intl/React import).
 * Input MUST already be timestamp-sorted ascending (see {@link sortByTimestamp}).
 */
export function averageByFrequency<T extends { timestamp: string }>(
  sortedRows: T[],
  freq: ChartFrequency
): T[] {
  const bucketMs = frequencyToMs(freq);
  if (bucketMs == null || sortedRows.length === 0) return sortedRows;

  const buckets = new Map<number, T[]>();
  for (const row of sortedRows) {
    const t = Date.parse(row.timestamp);
    if (Number.isNaN(t)) continue;
    const start = Math.floor(t / bucketMs) * bucketMs;
    const existing = buckets.get(start);
    if (existing) existing.push(row);
    else buckets.set(start, [row]);
  }

  return [...buckets.keys()]
    .sort((a, b) => a - b)
    .map((start) => {
      const rows = buckets.get(start)!;
      // Seed from the last raw row so metadata (id, zone, units, color) carries.
      const merged: Record<string, unknown> = { ...rows[rows.length - 1] };

      const sums = new Map<string, { sum: number; n: number }>();
      for (const row of rows) {
        for (const [k, v] of Object.entries(row)) {
          if (NON_MEASUREMENT_KEYS.has(k)) continue;
          if (typeof v === 'number' && Number.isFinite(v)) {
            const acc = sums.get(k) ?? { sum: 0, n: 0 };
            acc.sum += v;
            acc.n += 1;
            sums.set(k, acc);
          }
        }
      }
      for (const [k, { sum, n }] of sums) {
        if (n > 0) merged[k] = sum / n;
      }

      merged.timestamp = bucketStartIso(start);
      return merged as T;
    });
}

/** Sorted unique timestamps from one or more series */
export function unionSortedTimestamps(
  ...series: Array<Array<{ timestamp: string }>>
): string[] {
  const set = new Set<string>();
  for (const list of series) {
    for (const row of list) {
      if (row?.timestamp) set.add(row.timestamp);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Filter rows whose timestamp falls within the inclusive index window on `timestamps` */
export function filterByTimestampWindow<T extends { timestamp: string }>(
  rows: T[],
  timestamps: string[],
  startIdx: number,
  endIdx: number
): T[] {
  if (timestamps.length === 0 || rows.length === 0) return rows;
  const lo = timestamps[startIdx];
  const hi = timestamps[endIdx];
  if (lo == null || hi == null) return rows;
  return rows.filter((r) => r.timestamp >= lo && r.timestamp <= hi);
}

/** Join speed + direction rows on matching timestamps (for wind rose / paired series). */
export function alignWindSeriesByTimestamp<T extends { timestamp: string }>(
  speedData: T[],
  directionData: T[]
): { timeline: string[]; speed: T[]; direction: T[] } {
  const dirByTs = new Map(directionData.map((d) => [d.timestamp, d]));
  const pairs: { ts: string; speed: T; direction: T }[] = [];
  for (const s of speedData) {
    const d = dirByTs.get(s.timestamp);
    if (d) pairs.push({ ts: s.timestamp, speed: s, direction: d });
  }
  pairs.sort((a, b) => a.ts.localeCompare(b.ts));
  return {
    timeline: pairs.map((p) => p.ts),
    speed: pairs.map((p) => p.speed),
    direction: pairs.map((p) => p.direction),
  };
}
