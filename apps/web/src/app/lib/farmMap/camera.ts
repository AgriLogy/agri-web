/**
 * Where the farm map opens (QA A2). Pure: no Mapbox, no storage access.
 *
 * Order of preference:
 *   1. the farm itself (sectors + sensors), framed — a saved camera is kept
 *      only when it actually looks at the farm;
 *   2. with nothing on the farm: the saved camera, unless it is the old
 *      hard-coded default town (a stale view saved before any sector existed);
 *   3. the account's registered devices (GPS), framed;
 *   4. the weather location the app already uses for the forecast;
 *   5. the caller's default centre (last resort).
 */

import { boundsOf, type LngLatBounds } from './mapModel';

export type LngLat = [number, number];

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * The town the dashboard used to hard-code as the map / weather centre
 * (GoogleMapWeather + WeatherDashboard). A camera saved there was not chosen
 * by the user, so it never wins over a real location.
 */
export const LEGACY_DEFAULT_CENTERS: readonly LngLat[] = [
  [-6.914351, 32.88986],
  [-6.93442, 32.906323],
];

/** How far around the farm a saved camera may look and still be kept. */
export const SAVED_CAMERA_MARGIN_KM = 5;
const LEGACY_RADIUS_KM = 3;
const KM_PER_DEG_LAT = 111.32;

export function isLngLat(v: unknown): v is LngLat {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === 'number' &&
    typeof v[1] === 'number' &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Math.abs(v[0]) <= 180 &&
    Math.abs(v[1]) <= 90
  );
}

export function isLatLon(v: LatLon | null | undefined): v is LatLon {
  return v != null && isLngLat([v.lon, v.lat]);
}

/** Great-circle distance in km. */
export function distanceKm(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isLegacyDefaultCenter(c: LngLat): boolean {
  return LEGACY_DEFAULT_CENTERS.some(
    (d) => distanceKm(c, d) <= LEGACY_RADIUS_KM
  );
}

/** `p` inside `bounds` grown by `marginKm` on every side. */
export function withinBounds(
  bounds: LngLatBounds,
  p: LngLat,
  marginKm = SAVED_CAMERA_MARGIN_KM
): boolean {
  const [[minX, minY], [maxX, maxY]] = bounds;
  const dLat = marginKm / KM_PER_DEG_LAT;
  const midLat = ((minY + maxY) / 2) * (Math.PI / 180);
  const dLon = marginKm / (KM_PER_DEG_LAT * Math.max(0.01, Math.cos(midLat)));
  return (
    p[0] >= minX - dLon &&
    p[0] <= maxX + dLon &&
    p[1] >= minY - dLat &&
    p[1] <= maxY + dLat
  );
}

/**
 * Restore the saved camera? Only when it looks at the farm (or, with no farm
 * yet, when it is not the stale default town).
 */
export function shouldRestoreCamera(
  center: unknown,
  farmBounds: LngLatBounds | null
): boolean {
  if (!isLngLat(center)) return false;
  if (farmBounds) return withinBounds(farmBounds, center);
  return !isLegacyDefaultCenter(center);
}

export type FallbackView =
  | { kind: 'bounds'; bounds: LngLatBounds; source: 'devices' }
  | { kind: 'center'; center: LngLat; source: 'weather' | 'default' };

/** Where to look when the farm has no sector and no sensor. */
export function fallbackView(opts: {
  devices?: (GeoJSON.Geometry | null | undefined)[];
  weather?: LatLon | null;
  defaultCenter: LatLon;
}): FallbackView {
  const b = boundsOf(opts.devices ?? []);
  if (b) return { kind: 'bounds', bounds: b, source: 'devices' };
  if (isLatLon(opts.weather))
    return {
      kind: 'center',
      center: [opts.weather.lon, opts.weather.lat],
      source: 'weather',
    };
  return {
    kind: 'center',
    center: [opts.defaultCenter.lon, opts.defaultCenter.lat],
    source: 'default',
  };
}

/** The map's first centre, before any data: weather location, else default. */
export function initialCenter(
  weather: LatLon | null | undefined,
  defaultCenter: LatLon
): LngLat {
  return isLatLon(weather)
    ? [weather.lon, weather.lat]
    : [defaultCenter.lon, defaultCenter.lat];
}
