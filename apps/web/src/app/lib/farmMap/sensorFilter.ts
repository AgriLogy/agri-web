/**
 * Sensor filters for the farm map (type, status, sector). Pure: the same
 * filter drives a Mapbox layer expression and the cluster source's data.
 */

export interface SensorFilter {
  /** null = every type. */
  types: string[] | null;
  /** null = every status (normal, warning, critical, offline, no_data, unlinked). */
  statuses: string[] | null;
  /** 'all', 'none' (outside any sector) or a sector's draw id. */
  sector: string;
}

export const NO_SENSOR_FILTER: SensorFilter = {
  types: null,
  statuses: null,
  sector: 'all',
};

export const isFiltering = (f: SensorFilter) =>
  f.types !== null || f.statuses !== null || f.sector !== 'all';

interface SensorProps {
  sensorType?: unknown;
  status?: unknown;
  zoneId?: unknown;
}

export function matchesSensorFilter(p: SensorProps, f: SensorFilter): boolean {
  if (f.types && !f.types.includes(String(p.sensorType ?? ''))) return false;
  if (f.statuses && !f.statuses.includes(String(p.status ?? ''))) return false;
  const zone = String(p.zoneId ?? '');
  if (f.sector === 'none' && zone !== '') return false;
  if (f.sector !== 'all' && f.sector !== 'none' && zone !== f.sector)
    return false;
  return true;
}

/** Mapbox filter expression equivalent of matchesSensorFilter (null = none). */
export function sensorFilterExpression(f: SensorFilter): unknown[] | null {
  const parts: unknown[] = [];
  if (f.types) parts.push(['in', ['get', 'sensorType'], ['literal', f.types]]);
  if (f.statuses)
    parts.push(['in', ['get', 'status'], ['literal', f.statuses]]);
  if (f.sector === 'none') parts.push(['==', ['get', 'zoneId'], '']);
  else if (f.sector !== 'all') parts.push(['==', ['get', 'zoneId'], f.sector]);
  return parts.length ? ['all', ...parts] : null;
}

/** Toggle one value in a multi-select where null means "all of `every`". */
export function toggleIn(
  current: string[] | null,
  value: string,
  every: string[]
): string[] | null {
  const base = current ?? every;
  const next = base.includes(value)
    ? base.filter((v) => v !== value)
    : [...base, value];
  return next.length === every.length && every.every((v) => next.includes(v))
    ? null
    : next;
}
