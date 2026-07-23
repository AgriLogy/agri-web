/**
 * Unit tests for the pure report logic (agri-web #102, RPT-1).
 *
 * No DOM, no axios: query-param building, the outcome-vs-inputs split, the
 * timezone-independent formatters, empty-vs-degraded detection and the pager
 * math are all decided here.
 */
import {
  buildAlertEventParams,
  buildIrrigationDecisionParams,
  decisionInputRows,
  enumKeySegment,
  formatChannels,
  formatMeasure,
  formatObservedVsThreshold,
  formatTimestamp,
  hasNextPage,
  hasPrevPage,
  humanizeEnum,
  isoRangeFromDates,
  pageWindow,
  REPORTS_PAGE_SIZE,
  reportViewState,
  splitDecision,
} from '@agri/api-client/reportsModel';
import type {
  IrrigationDecision,
  ReportEnvelope,
} from '@agri/api-client/reportsApi';

const decision = (over: Partial<IrrigationDecision> = {}): IrrigationDecision => ({
  decided_at: '2026-07-20T06:00:00Z',
  zone_id: 5,
  source: 'water_balance',
  irrigate: true,
  reason: 'soil_deficit',
  net_mm: 4.2,
  gross_mm: 5.1,
  volume_m3: 12.7,
  duration_hr: 1.5,
  summary: 'Irriguer 12.7 m³',
  inputs: {
    et0_mm: 5.4,
    etc_mm: 4.9,
    dr_today_mm: 6.1,
    soil_moisture_pct: 21.3,
  },
  ...over,
});

describe('buildAlertEventParams', () => {
  it('defaults limit/offset and drops every empty filter', () => {
    expect(buildAlertEventParams()).toEqual({
      limit: REPORTS_PAGE_SIZE,
      offset: 0,
    });
    expect(
      buildAlertEventParams({ start: '', end: null, zoneId: null, sensorKey: '  ' })
    ).toEqual({ limit: REPORTS_PAGE_SIZE, offset: 0 });
  });

  it('passes the real filters through under the snake_case wire names', () => {
    expect(
      buildAlertEventParams({
        start: '2026-07-01T00:00:00Z',
        end: '2026-07-20T23:59:59Z',
        zoneId: 9,
        sensorKey: 'soil_temperature',
        offset: 50,
      })
    ).toEqual({
      start: '2026-07-01T00:00:00Z',
      end: '2026-07-20T23:59:59Z',
      zone_id: 9,
      sensor_key: 'soil_temperature',
      limit: REPORTS_PAGE_SIZE,
      offset: 50,
    });
  });

  it('keeps zone_id 0 if it were ever a real zone (only null is dropped)', () => {
    expect(buildAlertEventParams({ zoneId: 0 }).zone_id).toBe(0);
  });
});

describe('buildIrrigationDecisionParams', () => {
  it('sends source and both explicit irrigate values, but not the "both" case', () => {
    expect(buildIrrigationDecisionParams({ source: 'manual', irrigate: true }))
      .toEqual({ source: 'manual', irrigate: true, limit: REPORTS_PAGE_SIZE, offset: 0 });
    expect(buildIrrigationDecisionParams({ irrigate: false }).irrigate).toBe(
      false
    );
    expect(
      'irrigate' in buildIrrigationDecisionParams({ irrigate: null })
    ).toBe(false);
    expect(
      'irrigate' in buildIrrigationDecisionParams({})
    ).toBe(false);
  });
});

describe('isoRangeFromDates', () => {
  it('spans the whole day even for a same-day range', () => {
    expect(isoRangeFromDates('2026-07-20', '2026-07-20')).toEqual({
      start: '2026-07-20T00:00:00Z',
      end: '2026-07-20T23:59:59Z',
    });
  });
});

describe('splitDecision — outcome ⟂ inputs', () => {
  it('routes verdict fields to the outcome and water-balance terms to inputs', () => {
    const { outcome, inputs } = splitDecision(decision());

    expect(outcome).toEqual({
      decidedAt: '2026-07-20T06:00:00Z',
      zoneId: 5,
      source: 'water_balance',
      irrigate: true,
      reason: 'soil_deficit',
      netMm: 4.2,
      grossMm: 5.1,
      volumeM3: 12.7,
      durationHr: 1.5,
      summary: 'Irriguer 12.7 m³',
    });

    // The inputs carry the agronomy terms, in agronomic order.
    expect(inputs.map((r) => r.key)).toEqual([
      'et0_mm',
      'etc_mm',
      'dr_today_mm',
      'soil_moisture_pct',
    ]);
    expect(inputs.find((r) => r.key === 'et0_mm')?.value).toBe(5.4);
  });

  it('REGRESSION GUARD: no input term leaks into the outcome, no outcome field leaks into inputs', () => {
    const { outcome, inputs } = splitDecision(decision());
    const inputKeys = new Set(inputs.map((r) => r.key));
    // If the split were wrong (inputs spread onto the outcome), et0_mm etc.
    // would surface as outcome properties and volume_m3 would be missing.
    for (const term of ['et0_mm', 'etc_mm', 'dr_today_mm', 'soil_moisture_pct']) {
      expect(term in outcome).toBe(false);
    }
    // …and the verdict fields must NOT appear among the input rows shown in the
    // expandable detail.
    for (const field of ['volume_m3', 'net_mm', 'summary', 'irrigate']) {
      expect(inputKeys.has(field)).toBe(false);
    }
    expect(outcome.volumeM3).toBe(12.7);
  });

  it('handles a decision with no inputs — the detail is simply empty', () => {
    expect(splitDecision(decision({ inputs: null })).inputs).toEqual([]);
  });
});

describe('decisionInputRows', () => {
  it('keeps unknown extra terms after the known ones and coerces junk to null', () => {
    const rows = decisionInputRows({
      soil_moisture_pct: 20,
      et0_mm: 5,
      kc: 0.8,
      note: 'x' as unknown as number,
    });
    expect(rows.map((r) => r.key)).toEqual([
      'et0_mm', // known order first…
      'soil_moisture_pct',
      'kc', // …then extras in their own order
      'note',
    ]);
    expect(rows.find((r) => r.key === 'note')?.value).toBeNull();
  });

  it('returns [] for null/undefined', () => {
    expect(decisionInputRows(null)).toEqual([]);
    expect(decisionInputRows(undefined)).toEqual([]);
  });
});

describe('formatters are timezone-independent', () => {
  it('formatTimestamp slices the ISO string (UTC) and dashes null/garbage', () => {
    expect(formatTimestamp('2026-07-20T10:05:33Z')).toBe('2026-07-20 10:05');
    expect(formatTimestamp('2026-07-20T10:05:33+04:00')).toBe('2026-07-20 10:05');
    expect(formatTimestamp(null)).toBe('—');
    expect(formatTimestamp('not-a-date')).toBe('—');
  });

  it('formatMeasure trims trailing zeros and appends the unit', () => {
    expect(formatMeasure(12.3, '°C')).toBe('12.3 °C');
    expect(formatMeasure(15, '°C')).toBe('15 °C');
    expect(formatMeasure(1.239, 'mm')).toBe('1.24 mm'); // rounds to 2 dp
    expect(formatMeasure(3, null)).toBe('3');
    expect(formatMeasure(null, 'mm')).toBe('—');
  });

  it('formatObservedVsThreshold pairs both sides on the shared unit', () => {
    expect(formatObservedVsThreshold(1.2, 3, '°C')).toBe('1.2 °C / 3 °C');
    expect(formatObservedVsThreshold(null, 3, '°C')).toBe('— / 3 °C');
  });

  it('formatChannels joins or dashes', () => {
    expect(formatChannels(['email', 'whatsapp'])).toBe('email, whatsapp');
    expect(formatChannels([])).toBe('—');
    expect(formatChannels(null)).toBe('—');
  });
});

describe('enum helpers', () => {
  it('enumKeySegment normalizes casing/spacing so i18n lookups stay stable', () => {
    expect(enumKeySegment('water_balance')).toBe('water_balance');
    expect(enumKeySegment('Water Balance')).toBe('water_balance');
    expect(enumKeySegment('>=')).toBe('unknown');
    expect(enumKeySegment(null)).toBe('unknown');
  });

  it('humanizeEnum gives a readable fallback for untranslated values', () => {
    expect(humanizeEnum('sufficient_moisture')).toBe('Sufficient moisture');
    expect(humanizeEnum(null)).toBe('—');
  });
});

describe('reportViewState — empty vs degraded', () => {
  const env = (
    over: Partial<ReportEnvelope<unknown>>
  ): ReportEnvelope<unknown> => ({
    count: 0,
    limit: 50,
    offset: 0,
    schema_available: true,
    results: [],
    ...over,
  });

  it('is loading until the first envelope arrives', () => {
    expect(reportViewState(null, true)).toBe('loading');
  });

  it('is unavailable when schema_available is false (NOT the same as empty)', () => {
    expect(reportViewState(env({ schema_available: false }), false)).toBe(
      'unavailable'
    );
  });

  it('is empty for a healthy but result-less page', () => {
    expect(reportViewState(env({}), false)).toBe('empty');
  });

  it('is ready when rows are present', () => {
    expect(
      reportViewState(env({ results: [{}], count: 1 }), false)
    ).toBe('ready');
  });
});

describe('pagination math', () => {
  it('hasNextPage / hasPrevPage', () => {
    expect(hasNextPage(120, 50, 0)).toBe(true);
    expect(hasNextPage(120, 50, 100)).toBe(false);
    expect(hasPrevPage(0)).toBe(false);
    expect(hasPrevPage(50)).toBe(true);
  });

  it('pageWindow is 1-based, inclusive and never overstates the last page', () => {
    expect(pageWindow(0, 50, 120)).toEqual({ from: 1, to: 50, total: 120 });
    expect(pageWindow(100, 20, 120)).toEqual({ from: 101, to: 120, total: 120 });
    expect(pageWindow(0, 0, 0)).toEqual({ from: 0, to: 0, total: 0 });
  });
});
