/**
 * Daily ET₀ aggregation (modifications list #5).
 *
 * The calculated ET₀ series is a **mm/h rate** sampled sub-hourly (the backend
 * stores ~15-min cadence ⇒ ~94 points/day). FAO-56 daily ET₀ is the sum of the
 * 24 hourly values, i.e. the integral of the rate over the day. Summing the raw
 * samples over-counts by the sampling factor (~4× for 15-min data), so we use
 * the cadence-independent **mean(rate over the day) × 24h**, which equals the
 * Σ-of-24-hourly for a full hourly day. Negative rates are clamped to 0.
 *
 * Days are bucketed by **local** calendar date (the irrigation day).
 */
export interface Et0Reading {
  timestamp: string;
  value: number;
}

export interface Et0DailySummary {
  /** Most recent local day present in the data (YYYY-MM-DD). */
  latestDay: string;
  /** Daily ET₀ for `latestDay`, in mm. */
  latestTotal: number;
  /** Previous full day (YYYY-MM-DD), or null if only one day of data. */
  prevDay: string | null;
  /** Daily ET₀ for `prevDay` (the value next-day irrigation uses), in mm. */
  prevTotal: number | null;
  /** Sum of every day's daily ET₀ over the range, in mm. */
  cumulative: number;
  /** Number of distinct local days present. */
  dayCount: number;
}

/** Local calendar date (YYYY-MM-DD) of an ISO timestamp. */
function localDay(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('fr-CA');
}

export function aggregateEt0Daily(
  rows: readonly Et0Reading[]
): Et0DailySummary | null {
  const byDay = new Map<string, { sum: number; count: number }>();
  for (const d of rows) {
    const v = typeof d.value === 'number' ? d.value : NaN;
    if (Number.isNaN(v)) continue;
    const day = localDay(d.timestamp);
    const e = byDay.get(day) ?? { sum: 0, count: 0 };
    e.sum += Math.max(0, v); // clamp negative rates
    e.count += 1;
    byDay.set(day, e);
  }

  const days = [...byDay.keys()].sort();
  if (days.length === 0) return null;

  // Daily ET₀ = mean(mm/h) × 24h — cadence-independent.
  const dayTotal = (k: string): number => {
    const e = byDay.get(k);
    return e && e.count ? (e.sum / e.count) * 24 : 0;
  };

  const latestDay = days[days.length - 1];
  const prevDay = days.length > 1 ? days[days.length - 2] : null;
  return {
    latestDay,
    latestTotal: dayTotal(latestDay),
    prevDay,
    prevTotal: prevDay ? dayTotal(prevDay) : null,
    cumulative: days.reduce((acc, k) => acc + dayTotal(k), 0),
    dayCount: days.length,
  };
}
