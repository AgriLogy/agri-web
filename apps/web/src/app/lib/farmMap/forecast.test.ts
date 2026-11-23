import {
  BALANCE_SCALE,
  bucketIndex,
  colorFor,
  DEFAULT_OUTLINE,
  DEFAULT_OUTLINE_WIDTH,
  forecastFeatures,
  forecastLegendRows,
  formatMetric,
  isNoRain,
  legendEntries,
  metricValue,
  NO_DATA_COLOR,
  NO_RAIN_COLOR,
  NO_RAIN_OUTLINE,
  NO_RAIN_OUTLINE_WIDTH,
  RAIN_SCALE,
  sectorStyle,
  toHorizon,
} from './forecast';

const square: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  ],
};

const sector = (id: number, rain: number | null, balance: number | null) => ({
  sector_id: id,
  name: `S${id}`,
  centroid: { lat: 0, lon: 0 },
  daily: [],
  total_rain_mm: rain,
  total_et0_mm: 9.8,
  balance_mm: balance,
});

describe('bucketIndex / colorFor', () => {
  it('uses edges as inclusive lower bounds', () => {
    expect(bucketIndex(0, RAIN_SCALE.edges)).toBe(0);
    expect(bucketIndex(1, RAIN_SCALE.edges)).toBe(1);
    expect(bucketIndex(4.99, RAIN_SCALE.edges)).toBe(1);
    expect(bucketIndex(500, RAIN_SCALE.edges)).toBe(5);
  });

  it('every scale has one more colour than edges', () => {
    for (const s of [RAIN_SCALE, BALANCE_SCALE])
      expect(s.colors).toHaveLength(s.edges.length + 1);
  });

  it('diverges around zero for the balance', () => {
    expect(colorFor(-30, BALANCE_SCALE)).toBe(BALANCE_SCALE.colors[0]);
    expect(colorFor(0, BALANCE_SCALE)).toBe(BALANCE_SCALE.colors[3]);
    expect(colorFor(25, BALANCE_SCALE)).toBe(BALANCE_SCALE.colors[6]);
  });

  it('greys out missing values', () => {
    expect(colorFor(null, RAIN_SCALE)).toBe(NO_DATA_COLOR);
    expect(colorFor(NaN, RAIN_SCALE)).toBe(NO_DATA_COLOR);
  });
});

describe('legendEntries', () => {
  it('labels open-ended first and last buckets', () => {
    const l = legendEntries(RAIN_SCALE).map((e) => e.label);
    expect(l).toEqual(['< 1', '1 – 5', '5 – 10', '10 – 20', '20 – 40', '≥ 40']);
  });

  it('uses a true minus for negative edges', () => {
    const l = legendEntries(BALANCE_SCALE).map((e) => e.label);
    expect(l[0]).toBe('< −20');
    expect(l[3]).toBe('−3 – 3');
    expect(l[6]).toBe('≥ 20');
  });
});

describe('metricValue / formatMetric', () => {
  it('picks the metric and formats it', () => {
    const s = sector(1, 1.2, -8.6);
    expect(metricValue(s, 'rain')).toBe(1.2);
    expect(metricValue(s, 'balance')).toBe(-8.6);
    expect(formatMetric(-8.6, 'balance')).toBe('−8.6 mm');
    expect(formatMetric(12.44, 'rain')).toBe('12.4 mm');
    expect(formatMetric(null, 'rain')).toBe('—');
  });
});

describe('forecastFeatures', () => {
  it('joins shapes by id, skips unshaped sectors and formats nulls', () => {
    const fc = forecastFeatures(
      { sectors: [sector(3, 12, -3), sector(4, null, null), sector(9, 1, 1)] },
      (id) => (id === 9 ? null : square),
      'rain'
    );
    expect(fc.features.map((f) => f.properties.sector_id)).toEqual([3, 4]);
    expect(fc.features[0]!.properties).toMatchObject({
      color: RAIN_SCALE.colors[3],
      value: '12.0 mm',
      balance: '−3.0 mm',
    });
    expect(fc.features[1]!.properties).toMatchObject({
      color: NO_DATA_COLOR,
      rain: '—',
      balance: '—',
    });
  });

  it('is empty without data', () => {
    expect(forecastFeatures(null, () => square, 'balance').features).toEqual(
      []
    );
  });
});

describe('no rain (QA A7)', () => {
  it('treats totals that display as 0.0 mm as no rain, never missing data', () => {
    expect(isNoRain(0)).toBe(true);
    expect(isNoRain(0.04)).toBe(true);
    expect(isNoRain(0.05)).toBe(false);
    expect(isNoRain(0.6)).toBe(false);
    expect(isNoRain(null)).toBe(false);
    expect(isNoRain(undefined)).toBe(false);
    expect(isNoRain(NaN)).toBe(false);
  });

  it('gives 0 mm its own style in the rain metric', () => {
    const st = sectorStyle(sector(1, 0, -9.8), 'rain');
    expect(st).toEqual({
      color: NO_RAIN_COLOR,
      outline: NO_RAIN_OUTLINE,
      outlineWidth: NO_RAIN_OUTLINE_WIDTH,
      noRain: true,
    });
  });

  it('keeps "no rain" distinct from "no data" and from the < 1 mm bucket', () => {
    const noRain = sectorStyle(sector(1, 0, 0), 'rain');
    const noData = sectorStyle(sector(2, null, null), 'rain');
    const light = sectorStyle(sector(3, 0.6, 0), 'rain');
    expect(noRain.color).not.toBe(noData.color);
    expect(noRain.color).not.toBe(light.color);
    expect(noRain.outline).not.toBe(noData.outline);
    expect(noRain.outlineWidth).toBeGreaterThan(noData.outlineWidth);
    expect(noData).toMatchObject({
      color: NO_DATA_COLOR,
      outline: DEFAULT_OUTLINE,
      outlineWidth: DEFAULT_OUTLINE_WIDTH,
      noRain: false,
    });
    expect(light.color).toBe(RAIN_SCALE.colors[0]);
  });

  it('colours the balance by its number even when it did not rain', () => {
    const st = sectorStyle(sector(1, 0, -12), 'balance');
    expect(st.color).toBe(BALANCE_SCALE.colors[1]);
    expect(st.outline).toBe(DEFAULT_OUTLINE);
    expect(st.noRain).toBe(true);
  });

  it('flags no-rain features for the popup', () => {
    const fc = forecastFeatures(
      { sectors: [sector(1, 0, -9.8), sector(2, 3, -6)] },
      () => square,
      'rain'
    );
    expect(fc.features[0]!.properties).toMatchObject({
      noRain: true,
      color: NO_RAIN_COLOR,
      outline: NO_RAIN_OUTLINE,
      rain: '0.0 mm',
    });
    expect(fc.features[1]!.properties).toMatchObject({
      noRain: false,
      outline: DEFAULT_OUTLINE,
    });
  });
});

describe('forecastLegendRows', () => {
  it('lists no rain first and no data last for the rain metric', () => {
    const rows = forecastLegendRows('rain');
    expect(rows[0]).toEqual({
      color: NO_RAIN_COLOR,
      outline: NO_RAIN_OUTLINE,
      outlineWidth: NO_RAIN_OUTLINE_WIDTH,
      labelKey: 'noRain',
    });
    expect(rows.slice(1, -1).map((r) => r.label)).toEqual(
      legendEntries(RAIN_SCALE).map((e) => e.label)
    );
    expect(rows[rows.length - 1]).toMatchObject({
      color: NO_DATA_COLOR,
      labelKey: 'noData',
    });
  });

  it('has no "no rain" row on the balance', () => {
    const rows = forecastLegendRows('balance');
    expect(rows.some((r) => r.labelKey === 'noRain')).toBe(false);
    expect(rows).toHaveLength(BALANCE_SCALE.colors.length + 1);
  });
});

it('toHorizon keeps 1/3/7 and defaults to 3', () => {
  expect(toHorizon(1)).toBe(1);
  expect(toHorizon('7')).toBe(7);
  expect(toHorizon(5)).toBe(3);
  expect(toHorizon(undefined)).toBe(3);
});
