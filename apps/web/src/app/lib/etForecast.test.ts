import { maxEtMm, peakEtDay, totalEtMm } from './etForecast';

const DAYS = [
  { date: '2026-07-01', et0_mm: 5.0 },
  { date: '2026-07-02', et0_mm: 6.5 },
  { date: '2026-07-03', et0_mm: 4.25 },
];

describe('etForecast helpers', () => {
  test('peakEtDay returns the highest-ET0 day', () => {
    expect(peakEtDay(DAYS)?.date).toBe('2026-07-02');
  });

  test('peakEtDay returns null for an empty forecast', () => {
    expect(peakEtDay([])).toBeNull();
  });

  test('totalEtMm sums and rounds to 1dp', () => {
    expect(totalEtMm(DAYS)).toBe(15.8); // 15.75 -> 15.8
    expect(totalEtMm([])).toBe(0);
  });

  test('maxEtMm returns the largest value (floor 0.1 for empty)', () => {
    expect(maxEtMm(DAYS)).toBe(6.5);
    expect(maxEtMm([])).toBe(0.1);
  });
});
