/**
 * Pure helpers for the farm map (agri-api#459, Phase 1): server rows ↔ map
 * features, status colours, reading formatting, bounds, GeoJSON import/export,
 * basemaps and the one-time import of browser-stored sensors.
 *
 * Dependency-free (no mapbox-gl, no React) so it runs under jest.
 */
import type {
  Basemap,
  InstallationStatus,
  MapSector,
  MapStatus,
  ReadingSnapshot,
  SectorGeometry,
  SensorInstallation,
  SensorInstallationWrite,
} from '@agri/api-client/farmMapApi';

// ---------------------------------------------------------------------------
// Basemaps
// ---------------------------------------------------------------------------
export interface BasemapSpec {
  style: string;
  /** Mapbox Standard config applied after the style loads ("basemap" import). */
  config?: Record<string, boolean>;
}

const STANDARD_SATELLITE = 'mapbox://styles/mapbox/standard-satellite';

export const BASEMAPS: Record<Basemap, BasemapSpec> = {
  satellite_labels: {
    style: STANDARD_SATELLITE,
    config: {
      showPlaceLabels: true,
      showRoadLabels: true,
      showPointOfInterestLabels: false,
      showTransitLabels: false,
    },
  },
  satellite: {
    style: STANDARD_SATELLITE,
    config: {
      showPlaceLabels: false,
      showRoadLabels: false,
      showPointOfInterestLabels: false,
      showTransitLabels: false,
      showRoadsAndTransit: false,
    },
  },
  streets: { style: 'mapbox://styles/mapbox/standard' },
};

export const BASEMAP_IDS: Basemap[] = [
  'satellite_labels',
  'satellite',
  'streets',
];

export function isBasemap(v: unknown): v is Basemap {
  return typeof v === 'string' && (BASEMAP_IDS as string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Status colours (spec: green normal, orange warning, red critical/offline,
// grey no data)
// ---------------------------------------------------------------------------
export const STATUS_COLORS: Record<MapStatus, string> = {
  normal: '#16a34a',
  warning: '#f97316',
  critical: '#dc2626',
  offline: '#b91c1c',
  no_data: '#9ca3af',
  unlinked: '#9ca3af',
};

export const STATUS_ORDER: MapStatus[] = [
  'normal',
  'warning',
  'critical',
  'offline',
  'no_data',
  'unlinked',
];

/** Mapbox `match` expression on a feature's `status` property. */
export function statusColorExpression(prop = 'status'): unknown[] {
  const pairs: unknown[] = [];
  for (const s of STATUS_ORDER) pairs.push(s, STATUS_COLORS[s]);
  return ['match', ['get', prop], ...pairs, STATUS_COLORS.no_data];
}

// ---------------------------------------------------------------------------
// Readings
// ---------------------------------------------------------------------------
export function formatReading(
  r: ReadingSnapshot | null | undefined
): string | null {
  if (!r || r.value == null || !Number.isFinite(r.value)) return null;
  const abs = Math.abs(r.value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const v = Number(r.value.toFixed(digits)).toString();
  return r.unit ? `${v} ${r.unit}` : v;
}

/** "5 min" / "3 h" / "2 j" style age bucket, or null for missing / future. */
export function readingAge(
  iso: string | null | undefined,
  now: number = Date.now()
): { value: number; unit: 'minute' | 'hour' | 'day' } | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 60) return { value: mins, unit: 'minute' };
  const hours = Math.round(mins / 60);
  if (hours < 48) return { value: hours, unit: 'hour' };
  return { value: Math.round(hours / 24), unit: 'day' };
}

// ---------------------------------------------------------------------------
// Default reading stream per map sensor type
// ---------------------------------------------------------------------------
export const DEFAULT_SENSOR_KEY: Record<string, string> = {
  soil_moisture: 'soil_moisture_medium',
  soil_temperature: 'soil_temperature_medium',
  air_temperature: 'temperature_weather',
  humidity_air: 'humidity_weather',
  weather_station: 'temperature_weather',
  water_level: 'water_level',
  flow_meter: 'water_flow',
  pressure: 'water_pressure',
  ec_soil: 'soil_conductivity',
  ph_soil: 'ph_soil',
};

// ---------------------------------------------------------------------------
// Sensor features
// ---------------------------------------------------------------------------
export interface SensorFeatureProps {
  installationId: number;
  name: string;
  sensorType: string;
  /** Draw feature id of the containing sector ('' when outside every sector). */
  zoneId: string;
  zoneName: string;
  status: MapStatus;
  valueText: string;
}

export function installationToFeature(
  inst: SensorInstallation,
  sectorDrawIdByServerId: ReadonlyMap<number, string>,
  sectorNameByServerId: ReadonlyMap<number, string>
): GeoJSON.Feature<GeoJSON.Point, SensorFeatureProps> {
  const sectorDrawId =
    inst.sector_id != null
      ? (sectorDrawIdByServerId.get(inst.sector_id) ?? '')
      : '';
  return {
    type: 'Feature',
    id: String(inst.id),
    properties: {
      installationId: inst.id,
      name: inst.name,
      sensorType: inst.sensor_type,
      zoneId: sectorDrawId,
      zoneName:
        inst.sector_id != null
          ? (sectorNameByServerId.get(inst.sector_id) ?? '')
          : '',
      status: inst.sensor_key ? 'no_data' : 'unlinked',
      valueText: '',
    },
    geometry: { type: 'Point', coordinates: [inst.longitude, inst.latitude] },
  };
}

/** Copy live status onto sensor features (mutates `features`). */
export function applyStatusToFeatures(
  features: GeoJSON.Feature<GeoJSON.Point, SensorFeatureProps>[],
  statuses: InstallationStatus[]
): void {
  const byId = new Map(statuses.map((s) => [s.id, s]));
  for (const f of features) {
    const s = byId.get(f.properties.installationId);
    if (!s) continue;
    f.properties.status = s.status;
    f.properties.valueText = formatReading(s.latest) ?? '';
  }
}

/** Sector feature from a server row (only rows that have a shape). */
export function sectorToDrawFeature(s: MapSector): GeoJSON.Feature | null {
  if (!s.geometry) return null;
  return {
    type: 'Feature',
    id: String(s.id),
    properties: { name: s.name, ...(s.color ? { color: s.color } : {}) },
    geometry: s.geometry,
  };
}

// ---------------------------------------------------------------------------
// Bounds / camera
// ---------------------------------------------------------------------------
export type LngLatBounds = [[number, number], [number, number]];

function visitPositions(
  g: GeoJSON.Geometry,
  fn: (p: GeoJSON.Position) => void
) {
  switch (g.type) {
    case 'Point':
      fn(g.coordinates);
      break;
    case 'MultiPoint':
    case 'LineString':
      g.coordinates.forEach(fn);
      break;
    case 'MultiLineString':
    case 'Polygon':
      g.coordinates.forEach((r) => r.forEach(fn));
      break;
    case 'MultiPolygon':
      g.coordinates.forEach((p) => p.forEach((r) => r.forEach(fn)));
      break;
    case 'GeometryCollection':
      g.geometries.forEach((x) => visitPositions(x, fn));
      break;
  }
}

/** Bounding box of every valid position, or null when there is none. */
export function boundsOf(
  geometries: (GeoJSON.Geometry | null | undefined)[]
): LngLatBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const g of geometries) {
    if (!g) continue;
    visitPositions(g, (p) => {
      const [x, y] = p;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
  }
  if (!Number.isFinite(minX)) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

// ---------------------------------------------------------------------------
// Area / perimeter display
// ---------------------------------------------------------------------------
export function formatArea(ha: number | null | undefined): string | null {
  if (ha == null || !Number.isFinite(ha)) return null;
  return ha >= 10 ? `${ha.toFixed(1)} ha` : `${ha.toFixed(2)} ha`;
}

export function formatPerimeter(m: number | null | undefined): string | null {
  if (m == null || !Number.isFinite(m)) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

// ---------------------------------------------------------------------------
// GeoJSON import / export of sectors
// ---------------------------------------------------------------------------
export function sectorsToGeoJSON(
  sectors: MapSector[]
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sectors
      .filter((s) => s.geometry)
      .map((s) => ({
        type: 'Feature' as const,
        id: s.id,
        properties: {
          name: s.name,
          color: s.color ?? null,
          area_ha: s.area_ha ?? null,
          perimeter_m: s.perimeter_m ?? null,
          crop: s.crop ?? null,
          variety: s.variety ?? null,
          planting_date: s.planting_date ?? null,
          irrigation_type: s.irrigation_type ?? null,
          root_depth_cm: s.root_depth_cm ?? null,
          is_active: s.is_active ?? true,
        },
        geometry: s.geometry as SectorGeometry,
      })),
  };
}

export interface ImportedSector {
  name: string;
  geometry: SectorGeometry;
  color: string | null;
}

export class GeoJSONImportError extends Error {}

/**
 * Parse a user-supplied GeoJSON file into sectors to create. Accepts a
 * FeatureCollection, a single Feature, or a bare Polygon/MultiPolygon; other
 * geometry types are skipped. Throws `GeoJSONImportError` when nothing usable
 * is found or the text is not JSON.
 */
export function parseSectorImport(
  text: string,
  maxSectors = 200
): ImportedSector[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new GeoJSONImportError('invalid_json');
  }
  const features: unknown[] = [];
  const obj = data as { type?: string; features?: unknown[] };
  if (obj?.type === 'FeatureCollection' && Array.isArray(obj.features)) {
    features.push(...obj.features);
  } else if (obj?.type === 'Feature') {
    features.push(obj);
  } else if (obj?.type === 'Polygon' || obj?.type === 'MultiPolygon') {
    features.push({ type: 'Feature', properties: {}, geometry: obj });
  } else {
    throw new GeoJSONImportError('not_geojson');
  }

  const out: ImportedSector[] = [];
  features.forEach((raw, i) => {
    const f = raw as {
      geometry?: GeoJSON.Geometry;
      properties?: Record<string, unknown>;
    };
    const g = f?.geometry;
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) return;
    const props = f.properties ?? {};
    const rawName = props.name ?? props.NAME ?? props.nom ?? props.Name;
    const name =
      typeof rawName === 'string' && rawName.trim()
        ? rawName.trim().slice(0, 100)
        : `Secteur importé ${i + 1}`;
    const color =
      typeof props.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(props.color)
        ? props.color
        : null;
    out.push({ name, geometry: g, color });
  });
  if (out.length === 0) throw new GeoJSONImportError('no_polygons');
  if (out.length > maxSectors) throw new GeoJSONImportError('too_many');
  return out;
}

// ---------------------------------------------------------------------------
// One-time import of browser-stored sensors (agrilogy-farm-sensors-v1)
// ---------------------------------------------------------------------------
interface LegacySensorProps {
  name?: unknown;
  sensorType?: unknown;
  zoneId?: unknown;
}

/**
 * Turn the old localStorage sensor collection into create bodies. The old
 * feature id becomes `client_ref`, so re-running the import never duplicates.
 *
 * @param sectorServerIdByLegacyId old sector draw id → new server sector id
 */
export function legacySensorsToWrites(
  fc: GeoJSON.FeatureCollection | null | undefined,
  sectorServerIdByLegacyId: ReadonlyMap<string, number>
): SensorInstallationWrite[] {
  if (!fc || !Array.isArray(fc.features)) return [];
  const out: SensorInstallationWrite[] = [];
  for (const f of fc.features) {
    const g = f.geometry as GeoJSON.Point | undefined;
    if (g?.type !== 'Point') continue;
    const [lon, lat] = g.coordinates;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const p = (f.properties ?? {}) as LegacySensorProps;
    const type =
      typeof p.sensorType === 'string' && p.sensorType
        ? p.sensorType
        : 'soil_moisture';
    const name =
      typeof p.name === 'string' && p.name.trim()
        ? p.name.trim().slice(0, 100)
        : type;
    const legacySector = typeof p.zoneId === 'string' ? p.zoneId : '';
    out.push({
      name,
      sensor_type: type.slice(0, 40),
      sensor_key: DEFAULT_SENSOR_KEY[type] ?? null,
      latitude: lat,
      longitude: lon,
      sector_id: legacySector
        ? (sectorServerIdByLegacyId.get(legacySector) ?? null)
        : null,
      client_ref: f.id != null ? String(f.id).slice(0, 64) : null,
    });
  }
  return out;
}
