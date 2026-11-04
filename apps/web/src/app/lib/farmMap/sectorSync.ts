/**
 * Reconcile the sectors drawn in Mapbox Draw with the server (agri-api#459).
 *
 * Draw emits events for programmatic changes too (`suppressAPIEvents: false`),
 * so instead of reacting to individual events the map diffs the current draw
 * state against what was last saved and sends only the differences. That keeps
 * create / rename / reshape / recolour / delete on one code path and makes a
 * failed request retry naturally on the next sync.
 *
 * Pure and dependency-free so it is unit-testable under jest.
 */
import type { SectorGeometry, SectorWrite } from '@agri/api-client/farmMapApi';

/** What the server last acknowledged for one draw feature. */
export interface SyncedSector {
  serverId: number;
  fingerprint: string;
}

export interface SectorCreate {
  drawId: string;
  body: SectorWrite;
}

export interface SectorUpdate {
  drawId: string;
  serverId: number;
  body: SectorWrite;
}

export interface SectorDelete {
  drawId: string;
  serverId: number;
}

export interface SectorDiff {
  creates: SectorCreate[];
  updates: SectorUpdate[];
  deletes: SectorDelete[];
}

function isSectorGeometry(
  g: GeoJSON.Geometry | null | undefined
): g is SectorGeometry {
  return !!g && (g.type === 'Polygon' || g.type === 'MultiPolygon');
}

/** Polygon has at least one closed ring with 4+ valid positions. */
export function isCompleteSectorGeometry(
  g: GeoJSON.Geometry | null | undefined
): boolean {
  if (!isSectorGeometry(g)) return false;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  if (polys.length === 0) return false;
  return polys.every((rings) => {
    const outer = rings[0];
    return (
      Array.isArray(outer) &&
      outer.length >= 4 &&
      outer.every(
        (p) =>
          Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])
      )
    );
  });
}

function sectorName(f: GeoJSON.Feature): string {
  const n = (f.properties as { name?: unknown } | null)?.name;
  return typeof n === 'string' && n.trim() ? n.trim().slice(0, 100) : 'Secteur';
}

function sectorColor(f: GeoJSON.Feature): string | null {
  const c = (f.properties as { color?: unknown } | null)?.color;
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(c)
    ? c
    : null;
}

/** The parts of a drawn sector the server stores. */
export function sectorBody(f: GeoJSON.Feature): SectorWrite {
  return {
    name: sectorName(f),
    geometry: f.geometry as SectorGeometry,
    color: sectorColor(f),
  };
}

/** Stable string for "did this sector change since the last save?". */
export function sectorFingerprint(f: GeoJSON.Feature): string {
  const b = sectorBody(f);
  return JSON.stringify([b.name, b.color, b.geometry]);
}

/**
 * Compare draw state to the last-saved snapshot.
 *
 * @param features   current `draw.getAll().features`
 * @param synced     drawId → last server acknowledgement
 * @param inFlight   drawIds with a create already in progress (skip them)
 */
export function diffSectors(
  features: GeoJSON.Feature[],
  synced: ReadonlyMap<string, SyncedSector>,
  inFlight: ReadonlySet<string> = new Set()
): SectorDiff {
  const out: SectorDiff = { creates: [], updates: [], deletes: [] };
  const present = new Set<string>();
  for (const f of features) {
    if (f.id == null || !isCompleteSectorGeometry(f.geometry)) continue;
    const drawId = String(f.id);
    present.add(drawId);
    const known = synced.get(drawId);
    if (!known) {
      if (!inFlight.has(drawId))
        out.creates.push({ drawId, body: sectorBody(f) });
      continue;
    }
    if (known.fingerprint !== sectorFingerprint(f)) {
      out.updates.push({
        drawId,
        serverId: known.serverId,
        body: sectorBody(f),
      });
    }
  }
  synced.forEach((s, drawId) => {
    if (!present.has(drawId))
      out.deletes.push({ drawId, serverId: s.serverId });
  });
  return out;
}
