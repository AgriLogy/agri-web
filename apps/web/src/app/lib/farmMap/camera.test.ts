import {
  distanceKm,
  fallbackView,
  initialCenter,
  isLegacyDefaultCenter,
  isLngLat,
  LEGACY_DEFAULT_CENTERS,
  shouldRestoreCamera,
  withinBounds,
} from './camera';
import type { LngLatBounds } from './mapModel';

// A farm near Berrechid, far from the old hard-coded town.
const farm: LngLatBounds = [
  [-7.6, 33.25],
  [-7.58, 33.27],
];
const legacy = LEGACY_DEFAULT_CENTERS[0]!;
const DEFAULT = { lat: legacy[1], lon: legacy[0] };

describe('isLngLat / distanceKm', () => {
  it('validates coordinates', () => {
    expect(isLngLat([-7.5, 33.2])).toBe(true);
    expect(isLngLat([200, 0])).toBe(false);
    expect(isLngLat([0, NaN])).toBe(false);
    expect(isLngLat(null)).toBe(false);
    expect(isLngLat([1])).toBe(false);
  });

  it('measures roughly a degree of latitude as 111 km', () => {
    expect(distanceKm([0, 0], [0, 1])).toBeCloseTo(111.2, 0);
  });
});

describe('isLegacyDefaultCenter', () => {
  it('recognises the old hard-coded town (both spellings)', () => {
    for (const c of LEGACY_DEFAULT_CENTERS)
      expect(isLegacyDefaultCenter(c)).toBe(true);
    expect(isLegacyDefaultCenter([legacy[0] + 0.01, legacy[1]])).toBe(true);
    expect(isLegacyDefaultCenter([-7.59, 33.26])).toBe(false);
  });
});

describe('withinBounds', () => {
  it('keeps a small margin around the farm', () => {
    expect(withinBounds(farm, [-7.59, 33.26])).toBe(true);
    expect(withinBounds(farm, [-7.55, 33.26])).toBe(true); // ~3 km east
    expect(withinBounds(farm, [-7.4, 33.26])).toBe(false); // ~17 km east
  });
});

describe('shouldRestoreCamera', () => {
  it('restores a camera that looks at the farm', () => {
    expect(shouldRestoreCamera([-7.59, 33.26], farm)).toBe(true);
  });

  it('drops a camera saved on the default town once sectors exist', () => {
    // The technician case: the map used to open on the default town and
    // saved that view, then the sectors arrived.
    expect(shouldRestoreCamera(legacy, farm)).toBe(false);
  });

  it('with no farm, keeps a chosen camera but not the stale default town', () => {
    expect(shouldRestoreCamera([-5.0, 34.0], null)).toBe(true);
    expect(shouldRestoreCamera(legacy, null)).toBe(false);
  });

  it('ignores a malformed camera', () => {
    expect(shouldRestoreCamera(undefined, null)).toBe(false);
    expect(shouldRestoreCamera(['a', 'b'], farm)).toBe(false);
  });
});

describe('fallbackView', () => {
  it('frames registered devices first', () => {
    const v = fallbackView({
      devices: [{ type: 'Point', coordinates: [-7.59, 33.26] }],
      weather: { lat: 34, lon: -5 },
      defaultCenter: DEFAULT,
    });
    expect(v).toEqual({
      kind: 'bounds',
      bounds: [
        [-7.59, 33.26],
        [-7.59, 33.26],
      ],
      source: 'devices',
    });
  });

  it('then the weather location the app uses', () => {
    expect(
      fallbackView({
        devices: [],
        weather: { lat: 34, lon: -5 },
        defaultCenter: DEFAULT,
      })
    ).toEqual({ kind: 'center', center: [-5, 34], source: 'weather' });
  });

  it('falls back to the default only when nothing else is known', () => {
    expect(
      fallbackView({
        weather: { lat: NaN, lon: 0 },
        defaultCenter: DEFAULT,
      })
    ).toEqual({ kind: 'center', center: legacy, source: 'default' });
  });
});

it('initialCenter prefers the weather location', () => {
  expect(initialCenter({ lat: 34, lon: -5 }, DEFAULT)).toEqual([-5, 34]);
  expect(initialCenter(null, DEFAULT)).toEqual(legacy);
});
