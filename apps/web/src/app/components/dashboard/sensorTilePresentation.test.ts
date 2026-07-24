/**
 * Unit tests for the dashboard sensor-tile presentation helpers (agri-web #127).
 * Pure functions — no DOM, no next-intl.
 */

import {
  sensorCategory,
  categoryColorScheme,
  freshness,
  relativeReceived,
  exactReceived,
  humanizeSensorKey,
} from './sensorTilePresentation';

describe('sensorCategory', () => {
  it.each([
    ['soil_moisture_high', 'soil'],
    ['ec_soil_high', 'soil'],
    ['ec_salinity', 'soil'],
    ['soil_ph', 'soil'],
    ['multi_depth_soil_moisture', 'soil'],
    ['soil_temperature_low', 'soil'],
    ['ph_water', 'water'],
    ['water_flow', 'water'],
    ['water_level', 'water'],
    ['water_ec', 'water'],
    ['et0_weather', 'weather'],
    ['et0_calculated', 'weather'],
    ['vpd', 'weather'],
    ['wind_speed', 'weather'],
    ['solar_radiation', 'weather'],
    ['precipitation_rate', 'weather'],
    ['temperature_weather', 'weather'],
    ['humidity_weather', 'weather'],
    ['pressure_weather', 'weather'],
    ['electricity_consumption', 'power'],
    ['fruit_size', 'plant'],
    ['large_fruit_diameter', 'plant'],
    ['leaf_moisture', 'plant'],
    ['leaf_temperature', 'plant'],
    ['something_unknown', 'other'],
  ])('classifies %s as %s', (key, expected) => {
    expect(sensorCategory(key)).toBe(expected);
  });

  it('gives every category a distinct colour scheme', () => {
    const schemes = (
      ['soil', 'water', 'weather', 'plant', 'power', 'other'] as const
    ).map(categoryColorScheme);
    expect(new Set(schemes).size).toBe(schemes.length);
  });
});

describe('freshness', () => {
  const now = Date.parse('2026-07-24T12:00:00Z');
  it('returns never for null/blank/garbage', () => {
    expect(freshness(null, now)).toBe('never');
    expect(freshness(undefined, now)).toBe('never');
    expect(freshness('not-a-date', now)).toBe('never');
  });
  it('buckets by age', () => {
    expect(freshness('2026-07-24T06:00:00Z', now)).toBe('fresh'); // 6h
    expect(freshness('2026-07-21T12:00:00Z', now)).toBe('recent'); // 3d
    expect(freshness('2026-07-05T12:00:00Z', now)).toBe('stale'); // 19d
  });
});

describe('relativeReceived', () => {
  const now = Date.parse('2026-07-24T12:00:00Z');
  it('returns null without a timestamp', () => {
    expect(relativeReceived(null, now, 'en')).toBeNull();
    expect(relativeReceived('nope', now, 'en')).toBeNull();
  });
  it('formats a past reading in the given locale', () => {
    const out = relativeReceived('2026-07-21T12:00:00Z', now, 'en');
    expect(out).toMatch(/3/);
    expect(out).toMatch(/day/i);
  });
  it('handles hours and months', () => {
    expect(relativeReceived('2026-07-24T09:00:00Z', now, 'en')).toMatch(
      /hour/i
    );
    expect(relativeReceived('2026-05-24T12:00:00Z', now, 'en')).toMatch(
      /month/i
    );
  });
});

describe('exactReceived', () => {
  it('returns null without a timestamp, a string otherwise', () => {
    expect(exactReceived(null, 'fr')).toBeNull();
    expect(typeof exactReceived('2026-07-05T16:28:00Z', 'fr')).toBe('string');
  });
});

describe('humanizeSensorKey', () => {
  it.each([
    ['ec_soil_high', 'EC Soil High'],
    ['ph_water', 'pH Water'],
    ['et0_calculated', 'ET₀ Calculated'],
    ['multi_depth_soil_moisture', 'Multi Depth Soil Moisture'],
    ['vpd', 'VPD'],
  ])('humanizes %s', (key, expected) => {
    expect(humanizeSensorKey(key)).toBe(expected);
  });
});
