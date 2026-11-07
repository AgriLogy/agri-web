type Position = [number, number];

const isPosition = (p: unknown): p is Position =>
  Array.isArray(p) &&
  typeof p[0] === 'number' &&
  typeof p[1] === 'number' &&
  Number.isFinite(p[0]) &&
  Number.isFinite(p[1]);

/**
 * Ray-casting point-in-polygon on one ring.
 *
 * Tolerates incomplete rings: while a sector is being drawn, mapbox-gl-draw
 * reports the polygon in progress with empty (null/undefined) vertices. Those
 * are skipped, and a ring with fewer than 3 real corners contains nothing.
 * Throwing here used to abort the draw.update handler and freeze "Dessiner".
 */
export function pointInPolygon(
  point: [number, number],
  ring: ReadonlyArray<unknown>
): boolean {
  const pts = ring.filter(isPosition);
  if (pts.length < 3) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-20) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
