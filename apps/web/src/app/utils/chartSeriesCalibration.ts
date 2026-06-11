import { applySensorCalibration } from '@/app/utils/unitOverrides';

/**
 * Same rule as dashboards: valeur affichée = f(valeur brute) puis calibration linéaire.
 * Optional `preTransform` for edge cases where the API encoding differs from the unit assumed by a,b.
 */
export function calibrateChartValue(
  sensorKey: string,
  raw: number,
  preTransform?: (v: number) => number
): number {
  const v = typeof preTransform === 'function' ? preTransform(raw) : raw;
  if (!Number.isFinite(v)) return raw;
  return applySensorCalibration(sensorKey, v);
}
