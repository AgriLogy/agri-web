/**
 * Rectangular-basin volume math for the ultrasonic water-level sensor.
 *
 * Geometry (all metres):
 * - L, W ......... interior length / width of the rectangle
 * - H_tot ........ sensor plane (rim) to basin bottom
 * - D_max ........ distance sensor -> max-water line (mount offset / dead band)
 *
 * Captor reports D(t) = distance sensor -> water surface (m, after unit
 * conversion to metres). Derived per point:
 *   h(t)  = clamp(H_tot - D(t), 0, H_tot)
 *   h_max = H_tot - D_max
 *   fill% = h / h_max * 100
 *   V(t)  = L * W * h(t) * 1000            (litres)
 *   V_max = L * W * h_max * 1000
 *
 * Legacy zones only carry {maxDepthM (= h_max), areaM2 (= L*W), offsetM
 * (= D_max)} without L/W/H_tot: volume still works (V = area * h) but the
 * dimensioned rectangle visual falls back to a generic tank.
 */

export interface BasinGeometryRect {
  lengthM?: number | null;
  widthM?: number | null;
  /** Sensor plane to bottom (H_tot). Falls back to maxDepthM + offsetM. */
  heightM?: number | null;
  /** Distance sensor -> max-water line (D_max). */
  sensorToMaxM?: number | null;
  /** Legacy: usable depth h_max. */
  maxDepthM?: number | null;
  /** Legacy: surface area L*W. */
  areaM2?: number | null;
  /** Legacy alias of sensorToMaxM. */
  offsetM?: number | null;
}

export interface BasinResolved {
  lengthM: number | null;
  widthM: number | null;
  hTotM: number | null;
  dMaxM: number;
  areaM2: number | null;
  hMaxM: number | null;
  vMaxL: number | null;
  /** True when L+W+H_tot are all known: dimensioned rectangle visual. */
  isRectangle: boolean;
}

const num = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;

export function resolveBasin(geom: BasinGeometryRect): BasinResolved {
  const lengthM = num(geom.lengthM);
  const widthM = num(geom.widthM);
  const dMaxM = num(geom.sensorToMaxM ?? geom.offsetM) ?? 0;
  // H_tot direct, else legacy h_max + D_max.
  const legacyHMax = num(geom.maxDepthM);
  const heightM =
    num(geom.heightM) ?? (legacyHMax != null ? legacyHMax + dMaxM : null);
  const areaM2 =
    lengthM != null && widthM != null ? lengthM * widthM : num(geom.areaM2);
  const hMaxM = heightM != null ? Math.max(0, heightM - dMaxM) : legacyHMax;
  const vMaxL = areaM2 != null && hMaxM != null ? areaM2 * hMaxM * 1000 : null;
  return {
    lengthM,
    widthM,
    hTotM: heightM,
    dMaxM,
    areaM2,
    hMaxM,
    vMaxL,
    isRectangle: lengthM != null && widthM != null && heightM != null,
  };
}

export interface BasinPoint {
  /** Water column h(t) in metres. */
  hM: number;
  /** Fill vs h_max in %. */
  fillPct: number;
  /** Volume in litres. */
  volumeL: number;
}

/** Convert one raw captor distance D(t) (m) to height / % / litres. */
export function distanceToBasinPoint(
  distanceM: number,
  basin: BasinResolved
): BasinPoint | null {
  if (!Number.isFinite(distanceM)) return null;
  if (basin.hTotM == null || basin.hMaxM == null || basin.hMaxM <= 0)
    return null;
  if (basin.areaM2 == null || basin.areaM2 <= 0) return null;
  const hM = Math.min(
    basin.hTotM,
    Math.max(0, basin.hTotM - Math.max(0, distanceM))
  );
  const fillPct = Math.min(100, Math.max(0, (hM / basin.hMaxM) * 100));
  return { hM, fillPct, volumeL: basin.areaM2 * hM * 1000 };
}

/** Raw sensor value (cm|m via default_unit) -> metres. */
export function rawToMetres(
  value: number,
  defaultUnit?: string | null
): number {
  const u = (defaultUnit ?? 'm').trim().toLowerCase();
  if (u === 'cm') return value / 100;
  if (u === 'mm') return value / 1000;
  return value;
}
