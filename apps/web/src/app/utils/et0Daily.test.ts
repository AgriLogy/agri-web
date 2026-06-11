import { aggregateEt0Daily, type Et0Reading } from './et0Daily';

/**
 * Build `count` readings on a single local day, spaced 2 min apart starting
 * 10:00 (kept around midday so the local-day bucket is TZ-stable in CI).
 * `value` may be a constant or a repeating pattern.
 */
function readings(
  date: string,
  count: number,
  value: number | number[]
): Et0Reading[] {
  const rows: Et0Reading[] = [];
  for (let i = 0; i < count; i++) {
    const mins = 10 * 60 + i * 2;
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    const v = Array.isArray(value) ? value[i % value.length] : value;
    rows.push({ timestamp: `${date}T${hh}:${mm}:00`, value: v });
  }
  return rows;
}

describe('aggregateEt0Daily', () => {
  it('returns null for no data', () => {
    expect(aggregateEt0Daily([])).toBeNull();
  });

  it('daily total = mean rate × 24 for hourly data', () => {
    // 24 hourly samples at 0.5 mm/h ⇒ 0.5 × 24 = 12 mm
    const r = aggregateEt0Daily(readings('2026-06-01', 24, 0.5));
    expect(r).not.toBeNull();
    expect(r!.latestTotal).toBeCloseTo(12, 5);
    expect(r!.dayCount).toBe(1);
    expect(r!.prevDay).toBeNull();
  });

  it('is cadence-independent: 15-min sampling does NOT over-count', () => {
    // 96 samples at 0.5 mm/h must still be 12 mm/day (naive Σ would give 48)
    const r = aggregateEt0Daily(readings('2026-06-01', 96, 0.5));
    expect(r!.latestTotal).toBeCloseTo(12, 5);
    expect(r!.latestTotal).not.toBeCloseTo(48, 1);
  });

  it('exposes previous full day + cumulative across days', () => {
    const r = aggregateEt0Daily([
      ...readings('2026-06-01', 24, 0.4), // 9.6 mm
      ...readings('2026-06-02', 24, 0.5), // 12 mm
    ]);
    expect(r!.latestDay).toBe('2026-06-02');
    expect(r!.latestTotal).toBeCloseTo(12, 5);
    expect(r!.prevDay).toBe('2026-06-01');
    expect(r!.prevTotal).toBeCloseTo(9.6, 5);
    expect(r!.cumulative).toBeCloseTo(21.6, 5);
    expect(r!.dayCount).toBe(2);
  });

  it('clamps negative rates to zero', () => {
    // alternating +1 / -1 ⇒ negatives clamped ⇒ mean 0.5 ⇒ 12 mm/day
    const r = aggregateEt0Daily(readings('2026-06-01', 24, [1, -1]));
    expect(r!.latestTotal).toBeCloseTo(12, 5);
  });

  it('skips non-numeric values', () => {
    const rows = readings('2026-06-01', 24, 0.5);
    // @ts-expect-error — exercising defensive NaN/garbage handling
    rows.push({ timestamp: '2026-06-01T12:00:00', value: undefined });
    rows.push({ timestamp: '2026-06-01T12:01:00', value: NaN });
    const r = aggregateEt0Daily(rows);
    expect(r!.latestTotal).toBeCloseTo(12, 5); // unaffected by the junk rows
  });

  it('unsorted input still resolves latest vs previous day', () => {
    const r = aggregateEt0Daily([
      ...readings('2026-06-03', 12, 0.5),
      ...readings('2026-06-01', 12, 0.5),
      ...readings('2026-06-02', 12, 0.5),
    ]);
    expect(r!.latestDay).toBe('2026-06-03');
    expect(r!.prevDay).toBe('2026-06-02');
    expect(r!.dayCount).toBe(3);
  });
});
