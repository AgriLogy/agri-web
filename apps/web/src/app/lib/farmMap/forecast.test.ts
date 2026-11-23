import {
  BALANCE_SCALE,
  bucketIndex,
  colorFor,
  forecastFeatures,
  formatMetric,
  legendEntries,
  metricValue,
  NO_DATA_COLOR,
  RAIN_SCALE,
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

it('toHorizon keeps 1/3/7 and defaults to 3', () => {
  expect(toHorizon(1)).toBe(1);
  expect(toHorizon('7')).toBe(7);
  expect(toHorizon(5)).toBe(3);
  expect(toHorizon(undefined)).toBe(3);
});
