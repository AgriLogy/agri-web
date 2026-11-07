import {
  NO_SENSOR_FILTER,
  isFiltering,
  matchesSensorFilter,
  sensorFilterExpression,
  toggleIn,
} from './sensorFilter';

const s = (sensorType: string, status: string, zoneId = '') => ({
  sensorType,
  status,
  zoneId,
});

describe('sensor filter', () => {
  it('lets everything through by default', () => {
    expect(isFiltering(NO_SENSOR_FILTER)).toBe(false);
    expect(sensorFilterExpression(NO_SENSOR_FILTER)).toBeNull();
    expect(
      matchesSensorFilter(s('soil_moisture', 'normal'), NO_SENSOR_FILTER)
    ).toBe(true);
  });

  it('filters by type, status and sector', () => {
    const f = {
      types: ['soil_moisture'],
      statuses: ['critical', 'offline'],
      sector: 'd1',
    };
    expect(matchesSensorFilter(s('soil_moisture', 'critical', 'd1'), f)).toBe(
      true
    );
    expect(matchesSensorFilter(s('soil_moisture', 'normal', 'd1'), f)).toBe(
      false
    );
    expect(matchesSensorFilter(s('flow', 'critical', 'd1'), f)).toBe(false);
    expect(matchesSensorFilter(s('soil_moisture', 'critical', 'd2'), f)).toBe(
      false
    );
    expect(sensorFilterExpression(f)).toEqual([
      'all',
      ['in', ['get', 'sensorType'], ['literal', ['soil_moisture']]],
      ['in', ['get', 'status'], ['literal', ['critical', 'offline']]],
      ['==', ['get', 'zoneId'], 'd1'],
    ]);
  });

  it('"none" keeps only sensors outside every sector', () => {
    const f = { ...NO_SENSOR_FILTER, sector: 'none' };
    expect(matchesSensorFilter(s('flow', 'normal', ''), f)).toBe(true);
    expect(matchesSensorFilter(s('flow', 'normal', 'd1'), f)).toBe(false);
  });

  it('toggleIn collapses back to null when everything is selected', () => {
    const every = ['a', 'b', 'c'];
    expect(toggleIn(null, 'b', every)).toEqual(['a', 'c']);
    expect(toggleIn(['a', 'c'], 'b', every)).toBeNull();
    expect(toggleIn(['a'], 'a', every)).toEqual([]);
  });
});
