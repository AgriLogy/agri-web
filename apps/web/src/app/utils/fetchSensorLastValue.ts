import api from '@/app/lib/api';
import type { NpkSensorData, SensorData } from '@/app/types';
import { getSensorEndpointSpec } from '@/app/utils/sensorApiPaths';

export type LastSensorSample = {
  rawValue: number;
  defaultUnit?: string;
};

function dateRangeParams() {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  return { start_date: start, end_date: end };
}

function lastFromSensorData(arr: SensorData[]): LastSensorSample | null {
  if (!arr?.length) return null;
  const last = arr[arr.length - 1];
  if (typeof last.value !== 'number' || !Number.isFinite(last.value))
    return null;
  return { rawValue: last.value, defaultUnit: last.default_unit };
}

function npkValue(row: NpkSensorData, c: 'n' | 'p' | 'k'): number | null {
  const v =
    c === 'n'
      ? row.nitrogen_value
      : c === 'p'
        ? row.phosphorus_value
        : row.potassium_value;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Dernière mesure brute pour une clé catalogue (même zone / fenêtre que les graphiques).
 */
export async function fetchLastSensorSample(
  sensorKey: string,
  zoneId: number | null
): Promise<LastSensorSample | null> {
  const spec = getSensorEndpointSpec(sensorKey);
  if (!spec) return null;

  const params: Record<string, string | number> = {
    ...dateRangeParams(),
  };
  if (zoneId != null) params.zone = zoneId;

  try {
    if (spec.kind === 'single') {
      const res = await api.get<SensorData[]>(spec.path, { params });
      return lastFromSensorData(res.data ?? []);
    }
    if (spec.kind === 'firstNonEmpty') {
      for (const path of spec.paths) {
        const res = await api.get<SensorData[]>(path, { params });
        const sample = lastFromSensorData(res.data ?? []);
        if (sample) return sample;
      }
      return null;
    }
    if (spec.kind === 'npk') {
      const res = await api.get<NpkSensorData[]>(spec.path, { params });
      const rows = res.data ?? [];
      if (!rows.length) return null;
      const last = rows[rows.length - 1];
      const raw = npkValue(last, spec.component);
      if (raw == null) return null;
      return {
        rawValue: raw,
        defaultUnit: last.default_unit,
      };
    }
  } catch {
    return null;
  }
  return null;
}
