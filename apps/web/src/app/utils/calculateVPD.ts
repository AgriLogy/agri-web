import { roundNumber } from './formatNumber';

/**
 * Saturation vapor pressure (kPa) at temperature T (°C).
 * Magnus formula: es = 0.61078 * exp(17.27*T / (T + 237.3))
 */
export function saturationVaporPressure(tempCelsius: number): number {
  if (typeof tempCelsius !== 'number' || Number.isNaN(tempCelsius)) return 0;
  return 0.61078 * Math.exp((17.27 * tempCelsius) / (tempCelsius + 237.3));
}

/**
 * Vapor Pressure Deficit (kPa) from temperature (°C) and relative humidity (%).
 * VPD = (1 - RH/100) * es(T)
 */
export function calculateVPD(
  tempCelsius: number,
  relativeHumidity: number
): number {
  const es = saturationVaporPressure(tempCelsius);
  const vpd = (1 - relativeHumidity / 100) * es;
  return roundNumber(vpd, 2);
}
