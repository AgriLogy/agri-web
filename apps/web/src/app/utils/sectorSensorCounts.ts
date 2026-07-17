/**
 * Count how many placed sensors fall in each drawn secteur, so the map label
 * can show "name & data" per zone (MAP-1 / MAP-2). Each sensor carries the
 * name of the secteur that contains it (`zoneName`, set by reassignSensorZones).
 */
type SensorLike = { properties?: { zoneName?: unknown } | null };

/** Map of secteur name -> number of sensors placed inside it. */
export function sensorCountsBySector(
  sensors: readonly SensorLike[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of sensors) {
    const zone = s.properties?.zoneName;
    if (typeof zone === 'string' && zone.trim()) {
      counts.set(zone, (counts.get(zone) ?? 0) + 1);
    }
  }
  return counts;
}
