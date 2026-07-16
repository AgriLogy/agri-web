/**
 * Unit tests for the zone live-metrics assembly (NOT-1: notification cards
 * showed "—" for every metric). Pure functions — no network.
 */
import {
  formatMetric,
  latestReading,
  priorDayReading,
  buildZoneLiveMetrics,
  definedMetrics,
  type SensorReading,
} from '@agri/api-client/zoneLiveMetricsApi';

describe('formatMetric', () => {
  it('rounds to one decimal', () => {
    expect(formatMetric(34.44)).toBe('34.4');
    expect(formatMetric(0.65)).toBe('0.7');
    expect(formatMetric(58)).toBe('58');
  });
  it('returns undefined for missing / non-finite values', () => {
    expect(formatMetric(null)).toBeUndefined();
    expect(formatMetric(undefined)).toBeUndefined();
    expect(formatMetric(Number.NaN)).toBeUndefined();
  });
});

const rows: SensorReading[] = [
  { timestamp: '2025-05-01T01:00:00Z', value: 19.9 },
  { timestamp: '2025-05-02T01:00:00Z', value: 34.4 },
  { timestamp: '2025-05-02T00:00:00Z', value: 30.0 },
  { timestamp: '2025-04-30T00:00:00Z', value: 10.0 },
  { timestamp: '2025-05-03T00:00:00Z', value: null }, // ignored
];

describe('latestReading', () => {
  it('returns the newest reading that has a value', () => {
    expect(latestReading(rows)?.value).toBe(34.4);
  });
  it('returns undefined for an empty list', () => {
    expect(latestReading([])).toBeUndefined();
  });
});

describe('priorDayReading', () => {
  it('returns the newest reading on a day before the latest', () => {
    // latest day is 2025-05-02 → prior day pick is 2025-05-01 (19.9).
    expect(priorDayReading(rows)?.value).toBe(19.9);
  });
  it('returns undefined when all readings are on the same day', () => {
    expect(
      priorDayReading([
        { timestamp: '2025-05-02T00:00:00Z', value: 1 },
        { timestamp: '2025-05-02T05:00:00Z', value: 2 },
      ])
    ).toBeUndefined();
  });
});

describe('buildZoneLiveMetrics', () => {
  it('maps each sensor stream to its card field', () => {
    const m = buildZoneLiveMetrics({
      temperature: rows,
      humidity: [
        { timestamp: '2025-05-01T00:00:00Z', value: 70.1 },
        { timestamp: '2025-05-02T00:00:00Z', value: 38.3 },
      ],
      et0: [{ timestamp: '2025-05-02T00:00:00Z', value: 0.7 }],
      soilMoisture: [{ timestamp: '2025-05-02T00:00:00Z', value: 58.5 }],
      soilTemp: [{ timestamp: '2025-05-02T00:00:00Z', value: 34.9 }],
      soilPh: [{ timestamp: '2025-05-02T00:00:00Z', value: 6.8 }],
    });
    expect(m.today_temperature).toBe('34.4');
    expect(m.yesterday_temperature).toBe('19.9');
    expect(m.today_humidity).toBe('38.3');
    expect(m.yesterday_humidity).toBe('70.1');
    expect(m.ET0).toBe('0.7');
    expect(m.soil_humidity).toBe('58.5');
    expect(m.soil_temperature).toBe('34.9');
    expect(m.soil_ph).toBe('6.8');
  });

  it('leaves a field undefined when its sensor has no data (→ card keeps "—")', () => {
    const m = buildZoneLiveMetrics({
      soilMoisture: [{ timestamp: '2025-05-02T00:00:00Z', value: 58.5 }],
      // no soilPh / temperature / et0 → those stay undefined
    });
    expect(m.soil_humidity).toBe('58.5');
    expect(m.soil_ph).toBeUndefined();
    expect(m.ET0).toBeUndefined();
    expect(m.today_temperature).toBeUndefined();
  });
});

describe('definedMetrics', () => {
  it('drops undefined keys so a merge never clobbers real values with undefined', () => {
    const merged = {
      soil_humidity: '—',
      ...definedMetrics({ soil_humidity: undefined, ET0: '0.7' }),
    };
    expect(merged.soil_humidity).toBe('—'); // not overwritten by undefined
    expect(merged.ET0).toBe('0.7');
  });
});
