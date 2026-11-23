import {
  balanceChartRows,
  DASH,
  depletionGauge,
  fmtNum,
  fmtSigned,
  insightsLang,
  insightsTextDir,
  insightTabIndex,
  isStableTrend,
  knownCode,
  shortDay,
  visibleInsightTabs,
  vegetationScheme,
  VEGETATION_STATUSES,
  waterStatusScheme,
  WATER_STATUSES,
} from './insights';

describe('fmtNum / fmtSigned', () => {
  it('renders null, undefined, NaN and infinities as a dash', () => {
    for (const v of [null, undefined, NaN, Infinity, -Infinity]) {
      expect(fmtNum(v)).toBe(DASH);
      expect(fmtSigned(v)).toBe(DASH);
    }
  });

  it('formats with digits and unit', () => {
    expect(fmtNum(32.14, 1, 'mm')).toBe('32.1 mm');
    expect(fmtNum(0.85, 2)).toBe('0.85');
    expect(fmtNum(-0.01, 1)).toBe('0.0');
  });

  it('signs values with a true minus and no sign for zero', () => {
    expect(fmtSigned(-0.06)).toBe('−0.06');
    expect(fmtSigned(0.04)).toBe('+0.04');
    expect(fmtSigned(0.001)).toBe('0.00');
    expect(fmtSigned(-8.6, 1, 'mm')).toBe('−8.6 mm');
  });
});

describe('status chips', () => {
  it('maps every water status and falls back to gray', () => {
    expect(WATER_STATUSES.map(waterStatusScheme)).toEqual([
      'green',
      'orange',
      'red',
    ]);
    expect(waterStatusScheme(null)).toBe('gray');
    expect(waterStatusScheme('weird')).toBe('gray');
  });

  it('maps every vegetation status and falls back to gray', () => {
    for (const s of VEGETATION_STATUSES)
      expect(vegetationScheme(s)).toMatch(/\w+/);
    expect(vegetationScheme('water_stress')).toBe('orange');
    expect(vegetationScheme('insufficient_data')).toBe('gray');
    expect(vegetationScheme(undefined)).toBe('gray');
  });

  it('knownCode accepts only listed codes', () => {
    expect(knownCode('ok', WATER_STATUSES)).toBe('ok');
    expect(knownCode('nope', WATER_STATUSES)).toBeNull();
    expect(knownCode(null, WATER_STATUSES)).toBeNull();
  });
});

describe('depletionGauge', () => {
  it('scales Dr and RAW over TAW', () => {
    expect(depletionGauge({ taw_mm: 80, raw_mm: 40, dr_mm: 20 })).toEqual({
      fillPct: 25,
      rawPct: 50,
      soonPct: 37.5,
    });
  });

  it('clamps an over-depleted or negative Dr', () => {
    expect(
      depletionGauge({ taw_mm: 80, raw_mm: 40, dr_mm: 120 })!.fillPct
    ).toBe(100);
    expect(depletionGauge({ taw_mm: 80, raw_mm: 40, dr_mm: -3 })!.fillPct).toBe(
      0
    );
  });

  it('is null without a usable TAW, and tolerates null Dr / RAW', () => {
    expect(depletionGauge({ taw_mm: null, raw_mm: 1, dr_mm: 1 })).toBeNull();
    expect(depletionGauge({ taw_mm: 0, raw_mm: 1, dr_mm: 1 })).toBeNull();
    expect(depletionGauge({ taw_mm: 50, raw_mm: null, dr_mm: null })).toEqual({
      fillPct: 0,
      rawPct: 0,
      soonPct: 0,
    });
  });
});

describe('balanceChartRows', () => {
  it('sorts oldest first and never produces NaN', () => {
    const rows = balanceChartRows([
      {
        date: '2026-11-11',
        et0_mm: null,
        kc: null,
        etc_mm: null,
        rain_mm: null,
        irrigation_mm: 5,
        dr_mm: null,
      },
      {
        date: '2026-11-10',
        et0_mm: 3.1,
        kc: 0.85,
        etc_mm: 2.6,
        rain_mm: 0,
        irrigation_mm: null,
        dr_mm: 2.6,
      },
    ]);
    expect(rows).toEqual([
      { date: '2026-11-10', dr: 2.6, rain: 0, irrigation: 0, et: 2.6 },
      { date: '2026-11-11', dr: null, rain: 0, irrigation: 5, et: null },
    ]);
  });
});

it('shortDay', () => {
  expect(shortDay('2026-11-09')).toBe('09/11');
  expect(shortDay('bad')).toBe('bad');
});

describe('isStableTrend', () => {
  it('treats a weekly change under 0.01 as stable', () => {
    expect(isStableTrend(0)).toBe(true);
    expect(isStableTrend(-0.004)).toBe(true);
    expect(isStableTrend(0.01)).toBe(false);
    expect(isStableTrend(-0.06)).toBe(false);
    expect(isStableTrend(null)).toBe(false);
    expect(isStableTrend(Number.NaN)).toBe(false);
  });
});

describe('insightsLang', () => {
  it.each([
    ['fr', 'fr'],
    ['ar', 'ar'],
    ['en', 'en'],
    ['ar-MA', 'ar'],
    ['EN_us', 'en'],
    ['de', 'fr'],
    ['', 'fr'],
    [null, 'fr'],
    [undefined, 'fr'],
  ])('%p → %p', (locale, want) => {
    expect(insightsLang(locale)).toBe(want);
  });
});

describe('insightsTextDir', () => {
  it('follows the language the server answered in', () => {
    expect(insightsTextDir('ar')).toBe('rtl');
    expect(insightsTextDir('fr')).toBe('ltr');
    expect(insightsTextDir('en')).toBe('ltr');
  });
  it('lets the browser decide when an older server sends no lang', () => {
    expect(insightsTextDir(undefined)).toBe('auto');
    expect(insightsTextDir(null)).toBe('auto');
    expect(insightsTextDir('xx')).toBe('auto');
  });
});

describe('insight tabs', () => {
  it('hides the satellite tab without the NDVI panel', () => {
    expect(visibleInsightTabs(true)).toEqual([
      'irrigation',
      'vegetation',
      'satellite',
    ]);
    expect(visibleInsightTabs(false)).toEqual(['irrigation', 'vegetation']);
  });
  it('maps the remembered tab to an index, first tab when hidden', () => {
    const all = visibleInsightTabs(true);
    const two = visibleInsightTabs(false);
    expect(insightTabIndex(all, 'satellite')).toBe(2);
    expect(insightTabIndex(all, 'vegetation')).toBe(1);
    expect(insightTabIndex(two, 'satellite')).toBe(0);
    expect(insightTabIndex(two, null)).toBe(0);
  });
});
