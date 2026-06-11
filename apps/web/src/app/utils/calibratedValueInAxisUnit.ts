import {
  applySensorCalibration,
  getUnitOverride,
} from '@/app/utils/unitOverrides';
import {
  getLinearStepBetweenUnits,
  getLinearStepBetweenUnitsWithFallback,
  normalizeUnitString,
} from '@/app/utils/sensorUnitConversion';

/**
 * For multi-series charts that share one Y-axis: express each calibrated reading
 * in a common `axisUnit` (usually the catalogue default) so scales stay comparable
 * when the user picks different display units per catalogue row.
 */
export function calibratedValueInAxisUnit(
  sensorKey: string,
  raw: number,
  axisUnit: string,
  catalogFallback: string
): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return raw;
  const vUser = applySensorCalibration(sensorKey, raw);
  if (!Number.isFinite(vUser)) return raw;
  const userUnit = getUnitOverride(sensorKey, catalogFallback);
  if (normalizeUnitString(userUnit) === normalizeUnitString(axisUnit)) {
    return vUser;
  }
  const step =
    getLinearStepBetweenUnits(userUnit, axisUnit) ??
    getLinearStepBetweenUnitsWithFallback(userUnit, axisUnit, catalogFallback);
  if (!step) return vUser;
  return vUser * step.k + step.c;
}
