/** Farm-scale measuring (distance along a path, enclosed area). Pure. */

type LngLat = [number, number];
const R = 6_371_008.8; // mean Earth radius, metres
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceM(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthM(pts: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += distanceM(pts[i - 1]!, pts[i]!);
  return total;
}

/** Area (m²) of the polygon through `pts` (closed implicitly). Local
 * equirectangular projection: exact enough for fields up to a few km. */
export function polygonAreaM2(pts: LngLat[]): number {
  if (pts.length < 3) return 0;
  const lat0 = rad(pts.reduce((s, p) => s + p[1], 0) / pts.length);
  const xy = pts.map(([lon, lat]) => [
    rad(lon) * R * Math.cos(lat0),
    rad(lat) * R,
  ]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i]!;
    const [x2, y2] = xy[(i + 1) % xy.length]!;
    a += x1! * y2! - x2! * y1!;
  }
  return Math.abs(a) / 2;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}

export function formatAreaM2(m2: number): string {
  return m2 < 10_000
    ? `${Math.round(m2)} m²`
    : `${(m2 / 10_000).toFixed(2)} ha`;
}
