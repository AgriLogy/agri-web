'use client';

import { useMemo } from 'react';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { calibrateChartValue } from '@/app/utils/chartSeriesCalibration';

export type StationCalibrationField = {
  dataKey: string;
  sensorKey: string;
  preTransform?: (v: number) => number;
};

/**
 * Applies lecture unit overrides (a, b) to `sensor_data` rows for station / dashboard Recharts.
 * Recomputes when API data or unit overrides change.
 */
export function useCalibratedStationChartRows<
  T extends Record<string, unknown>,
>(rows: T[] | undefined, fields: readonly StationCalibrationField[]): T[] {
  const unitRev = useUnitOverridesRevision();
  return useMemo(() => {
    const list = rows ?? [];
    if (fields.length === 0) return list;
    return list.map((row) => {
      const next = { ...row } as T;
      for (const { dataKey, sensorKey, preTransform } of fields) {
        const raw = row[dataKey];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          (next as Record<string, unknown>)[dataKey] = calibrateChartValue(
            sensorKey,
            raw,
            preTransform
          );
        }
      }
      return next;
    });
  }, [rows, unitRev, fields]);
}
