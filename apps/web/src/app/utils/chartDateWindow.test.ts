import {
  averageByFrequency,
  frequencyToMs,
  sortByTimestamp,
  type ChartFrequency,
} from './chartDateWindow';

type Row = {
  id: number;
  timestamp: string;
  value: number;
  zone: number;
  default_unit: string;
  available_units: string[];
};

const row = (id: number, timestamp: string, value: number): Row => ({
  id,
  timestamp,
  value,
  zone: 1,
  default_unit: 'm/s',
  available_units: ['m/s', 'km/h'],
});

describe('frequencyToMs', () => {
  it('maps presets and native', () => {
    expect(frequencyToMs({ kind: 'native' })).toBeNull();
    expect(frequencyToMs({ kind: 'minute' })).toBe(60_000);
    expect(frequencyToMs({ kind: 'hour' })).toBe(3_600_000);
    expect(frequencyToMs({ kind: 'day' })).toBe(86_400_000);
  });

  it('computes a custom interval and floors/guards the amount', () => {
    expect(frequencyToMs({ kind: 'custom', amount: 15, unit: 'minute' })).toBe(
      15 * 60_000
    );
    // amount < 1 is clamped to 1 bucket-width
    expect(frequencyToMs({ kind: 'custom', amount: 0, unit: 'hour' })).toBe(
      3_600_000
    );
  });
});

describe('averageByFrequency', () => {
  it('collapses to one averaged row per clock hour', () => {
    const rows = sortByTimestamp([
      row(1, '2026-06-08T03:57:59Z', 10),
      row(2, '2026-06-08T03:58:20Z', 20),
      row(3, '2026-06-08T04:30:00Z', 30),
    ]);
    const out = averageByFrequency(rows, { kind: 'hour' });
    expect(out).toHaveLength(2);
    expect(out[0].timestamp).toBe('2026-06-08T03:00:00Z');
    expect(out[0].value).toBe(15); // (10 + 20) / 2
    expect(out[1].timestamp).toBe('2026-06-08T04:00:00Z');
    expect(out[1].value).toBe(30);
  });

  it('carries metadata and uses the last id in the bucket', () => {
    const out = averageByFrequency(
      [row(1, '2026-06-08T03:10:00Z', 10), row(2, '2026-06-08T03:50:00Z', 20)],
      { kind: 'hour' }
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(2); // last raw row in the bucket
    expect(out[0].zone).toBe(1);
    expect(out[0].default_unit).toBe('m/s');
    expect(out[0].available_units).toEqual(['m/s', 'km/h']);
  });

  it('averages every numeric measurement field (NPK-style)', () => {
    type Npk = {
      timestamp: string;
      nitrogen_value: number;
      phosphorus_value: number;
      potassium_value: number;
    };
    const rows: Npk[] = [
      {
        timestamp: '2026-06-08T03:05:00Z',
        nitrogen_value: 10,
        phosphorus_value: 100,
        potassium_value: 1,
      },
      {
        timestamp: '2026-06-08T03:45:00Z',
        nitrogen_value: 20,
        phosphorus_value: 200,
        potassium_value: 3,
      },
    ];
    const out = averageByFrequency(rows, { kind: 'hour' });
    expect(out).toHaveLength(1);
    expect(out[0].nitrogen_value).toBe(15);
    expect(out[0].phosphorus_value).toBe(150);
    expect(out[0].potassium_value).toBe(2);
  });

  it('buckets a custom 15-minute window', () => {
    const out = averageByFrequency(
      sortByTimestamp([
        row(1, '2026-06-08T03:00:00Z', 10),
        row(2, '2026-06-08T03:10:00Z', 20),
        row(3, '2026-06-08T03:20:00Z', 60),
      ]),
      { kind: 'custom', amount: 15, unit: 'minute' }
    );
    // 03:00 & 03:10 -> bucket 03:00 (avg 15); 03:20 -> bucket 03:15 (60)
    expect(out).toHaveLength(2);
    expect(out[0].timestamp).toBe('2026-06-08T03:00:00Z');
    expect(out[0].value).toBe(15);
    expect(out[1].timestamp).toBe('2026-06-08T03:15:00Z');
    expect(out[1].value).toBe(60);
  });

  it('returns the input unchanged for native and empty', () => {
    const rows = [row(1, '2026-06-08T03:00:00Z', 10)];
    expect(averageByFrequency(rows, { kind: 'native' })).toBe(rows);
    expect(averageByFrequency([], { kind: 'hour' as const })).toEqual([]);
  });

  it('ignores unparseable timestamps without throwing', () => {
    const freq: ChartFrequency = { kind: 'hour' };
    const out = averageByFrequency(
      [row(1, 'not-a-date', 10), row(2, '2026-06-08T03:30:00Z', 20)],
      freq
    );
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(20);
  });
});
