/**
 * Farm map (agri-api#459, Phase 1): sector shapes + crop details, named sensor
 * installations, per-user map preferences and the live status overlay.
 *
 * Everything here used to live in the browser's localStorage; these endpoints
 * make it server-owned (owner-scoped by the JWT). Before the agri-db migration
 * is applied the server omits the shape / crop keys on sectors and answers 503
 * on farm-map writes — callers treat those keys as optional.
 */
import api from './api';

export type IrrigationType =
  | 'drip'
  | 'sprinkler'
  | 'subsurface_drip'
  | 'pivot'
  | 'flood'
  | 'other';

export const IRRIGATION_TYPES: IrrigationType[] = [
  'drip',
  'sprinkler',
  'subsurface_drip',
  'pivot',
  'flood',
  'other',
];

export type SectorGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export interface MapSector {
  id: number;
  name: string;
  zone_count: number;
  geometry?: SectorGeometry | null;
  area_ha?: number | null;
  perimeter_m?: number | null;
  color?: string | null;
  geometry_updated_at?: string | null;
  crop?: string | null;
  variety?: string | null;
  planting_date?: string | null;
  irrigation_type?: IrrigationType | null;
  root_depth_cm?: number | null;
  is_active?: boolean;
}

/** Body for create/update. Omit `geometry` to keep the stored shape. */
export interface SectorWrite {
  name: string;
  geometry?: SectorGeometry | null;
  color?: string | null;
  crop?: string | null;
  variety?: string | null;
  planting_date?: string | null;
  irrigation_type?: IrrigationType | null;
  root_depth_cm?: number | null;
  is_active?: boolean | null;
}

export type MaintenanceStatus =
  | 'ok'
  | 'needs_check'
  | 'in_maintenance'
  | 'retired';

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  'ok',
  'needs_check',
  'in_maintenance',
  'retired',
];

export interface SensorInstallation {
  id: number;
  name: string;
  sensor_type: string;
  sensor_key: string | null;
  latitude: number;
  longitude: number;
  sector_id: number | null;
  zone_id: number | null;
  device_id: number | null;
  installation_depth_cm: number | null;
  model: string | null;
  serial_number: string | null;
  node_id: string | null;
  installation_date: string | null;
  calibration_profile: string | null;
  notes: string | null;
  maintenance_status: MaintenanceStatus | null;
  client_ref: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type SensorInstallationWrite = Partial<
  Omit<SensorInstallation, 'id' | 'created_at' | 'updated_at'>
>;

export type Basemap = 'satellite_labels' | 'satellite' | 'streets';

export interface LayerPref {
  visible: boolean;
  opacity: number;
}

export interface CameraPref {
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface MapPreferences {
  basemap: Basemap;
  layers: Record<string, LayerPref>;
  camera: CameraPref | null;
}

export type MapStatus =
  | 'normal'
  | 'warning'
  | 'critical'
  | 'offline'
  | 'no_data'
  | 'unlinked';

export interface ReadingSnapshot {
  value: number | null;
  unit: string | null;
  timestamp: string;
}

export interface InstallationStatus {
  id: number;
  status: MapStatus;
  latest: ReadingSnapshot | null;
  battery: ReadingSnapshot | null;
  signal: ReadingSnapshot | null;
  alerts: { id: number; name: string }[];
}

export interface SectorStatus {
  id: number;
  status: MapStatus;
  sensor_count: number;
  alert_count: number;
}

export interface FarmMapStatus {
  generated_at: string;
  installations: InstallationStatus[];
  sectors: SectorStatus[];
}

export interface ZoneOption {
  id: number;
  name: string;
}

export interface SensorKeyOption {
  key: string;
  unit: string;
  label: string;
}

// ---- NDVI (Sentinel-2 via Copernicus, agri-api#459 phase 2) ---------------
export interface NdviLegendStop {
  value: number;
  color: string;
}
export type SatIndex = 'ndvi' | 'ndmi' | 'ndre';
export type SatImageKind = SatIndex | 'false_color';
export interface SatIndexInfo {
  id: SatIndex;
  use: string;
  legend: NdviLegendStop[];
  classes: { low_below: number; high_from: number };
}
export interface NdviConfig {
  configured: boolean;
  source: string;
  legend: NdviLegendStop[];
  indexes?: SatIndexInfo[];
  image_kinds?: SatImageKind[];
}
export interface NdviDate {
  date: string;
  cloud_cover: number;
}
export interface NdviStat {
  date: string;
  mean: number;
  min: number | null;
  max: number | null;
  std: number | null;
  /** Share of the sector's pixels that were clear (not cloud/shadow). */
  valid_fraction: number;
  /** Share of clear pixels in the index's low / medium / high classes. */
  classes?: { low: number; medium: number; high: number } | null;
}

// ---- NDVI phase 3 (agri-api#459): insights, forecast, history, KML ---------
export type WaterBalanceStatus = 'ok' | 'irrigate_soon' | 'irrigate_now';
export type WaterBalanceUnavailable =
  | 'no_zone'
  | 'no_soil_params'
  | 'no_location';
export type KcSource = 'kc_period' | 'default';
export type RecommendationAction = 'irrigate' | 'wait' | 'none';
export type VegetationStatus =
  | 'healthy'
  | 'water_stress'
  | 'excess_water'
  | 'low_vigor_other'
  | 'declining'
  | 'insufficient_data';
export type InsightConfidence = 'high' | 'medium' | 'low';

export interface WaterBalanceDay {
  date: string;
  et0_mm: number | null;
  kc: number | null;
  etc_mm: number | null;
  rain_mm: number | null;
  irrigation_mm: number | null;
  dr_mm: number | null;
}

export interface WaterBalance {
  available: boolean;
  reason: WaterBalanceUnavailable | string | null;
  taw_mm: number | null;
  raw_mm: number | null;
  dr_mm: number | null;
  depletion_pct: number | null;
  status: WaterBalanceStatus | null;
  start_date: string | null;
  assumption: string | null;
  days: WaterBalanceDay[];
}

export interface IrrigationRecommendation {
  action: RecommendationAction;
  volume_m3: number | null;
  duration_min: number | null;
  rain_next_48h_mm: number | null;
  message: string;
}

export interface VegetationInsight {
  status: VegetationStatus;
  label: string;
  message: string;
  confidence: InsightConfidence | null;
  ndvi: {
    date: string;
    mean: number | null;
    trend_per_week: number | null;
    points: number;
  } | null;
  soil_moisture_pct: number | null;
  soil_moisture_at: string | null;
  critical_moisture_pct: number | null;
}

export interface SectorInsights {
  sector_id: number;
  sector_name: string;
  date: string;
  crop: string | null;
  zone_ids: number[];
  kc: { value: number | null; source: KcSource; period_name: string | null };
  water_balance: WaterBalance;
  recommendation: IrrigationRecommendation | null;
  vegetation: VegetationInsight | null;
  /** Language the agronomy wording came back in (absent on older servers,
   *  which always answer in French). */
  lang?: InsightsLang;
}

/** Languages the insights endpoint translates its wording into. */
export type InsightsLang = 'fr' | 'ar' | 'en';

export interface ForecastDay {
  date: string;
  rain_mm: number | null;
  et0_mm: number | null;
}

export interface SectorForecast {
  sector_id: number;
  name: string;
  centroid: { lat: number; lon: number } | null;
  daily: ForecastDay[];
  total_rain_mm: number | null;
  total_et0_mm: number | null;
  balance_mm: number | null;
}

export interface FarmForecast {
  provider: string;
  days: string[];
  sectors: SectorForecast[];
}

export interface NdviHistory {
  sector_id: number;
  index: SatIndex;
  from: string;
  to: string;
  series: NdviStat[];
}

export type GeometrySource = 'draw' | 'kml' | 'restore';

export interface GeometryRevision {
  id: number;
  created_at: string;
  source: GeometrySource | string;
  area_ha: number | null;
  perimeter_m: number | null;
  geometry: SectorGeometry | null;
}

export type KmlSkipReason =
  | 'not_a_polygon'
  | 'invalid_geometry'
  | 'duplicate_name';

export interface KmlImportResult {
  dry_run: boolean;
  sectors: {
    name: string;
    area_ha: number | null;
    perimeter_m: number | null;
    geometry: SectorGeometry | null;
    id: number | null;
  }[];
  skipped: { name: string; reason: KmlSkipReason | string }[];
}

export const farmMapApi = {
  listSectors: () => api.get<MapSector[]>('/sectors').then((r) => r.data),
  createSector: (body: SectorWrite) =>
    api.post<MapSector>('/sectors', body).then((r) => r.data),
  updateSector: (id: number, body: SectorWrite) =>
    api.patch<MapSector>(`/sectors/${id}`, body).then((r) => r.data),
  deleteSector: (id: number) =>
    api.delete(`/sectors/${id}`).then((r) => r.data),

  listInstallations: () =>
    api.get<SensorInstallation[]>('/sensor-installations').then((r) => r.data),
  createInstallation: (body: SensorInstallationWrite) =>
    api
      .post<SensorInstallation>('/sensor-installations', body)
      .then((r) => r.data),
  updateInstallation: (id: number, body: SensorInstallationWrite) =>
    api
      .patch<SensorInstallation>(`/sensor-installations/${id}`, body)
      .then((r) => r.data),
  deleteInstallation: (id: number) =>
    api.delete(`/sensor-installations/${id}`).then((r) => r.data),

  getPreferences: () =>
    api.get<MapPreferences>('/map-preferences').then((r) => r.data),
  savePreferences: (body: Partial<MapPreferences>) =>
    api.put<MapPreferences>('/map-preferences', body).then((r) => r.data),

  status: () => api.get<FarmMapStatus>('/farm-map/status').then((r) => r.data),
  ndviConfig: () =>
    api.get<NdviConfig>('/farm-map/ndvi/config').then((r) => r.data),
  ndviDates: (sectorId: number, days = 120, maxCloud = 40) =>
    api
      .get<{ dates: NdviDate[] }>(`/farm-map/ndvi/sectors/${sectorId}/dates`, {
        params: { days, max_cloud: maxCloud },
      })
      .then((r) => r.data.dates),
  ndviStats: (sectorId: number, days = 120, index: SatIndex = 'ndvi') =>
    api
      .get<{ series: NdviStat[] }>(`/farm-map/ndvi/sectors/${sectorId}/stats`, {
        params: { days, index },
      })
      .then((r) => r.data.series),
  /** PNG clipped to the sector (transparent outside it and on clouds). */
  ndviImage: (sectorId: number, date: string, index: SatImageKind = 'ndvi') =>
    api
      .get<Blob>(`/farm-map/ndvi/sectors/${sectorId}/image`, {
        params: { date, index },
        responseType: 'blob',
      })
      .then((r) => r.data),

  // ---- phase 3 -----------------------------------------------------------
  /** `lang` picks the language of the agronomy wording (recommendation /
   *  vegetation messages, balance assumption); older servers ignore it. */
  sectorInsights: (sectorId: number, lang?: InsightsLang) => {
    const url = `/farm-map/sectors/${sectorId}/insights`;
    return (
      lang
        ? api.get<SectorInsights>(url, { params: { lang } })
        : api.get<SectorInsights>(url)
    ).then((r) => r.data);
  },
  forecast: (days = 3) =>
    api
      .get<FarmForecast>('/farm-map/forecast', { params: { days } })
      .then((r) => r.data),
  /** Stored index series (no Copernicus call, grows with each /stats). */
  ndviHistory: (sectorId: number, index: SatIndex = 'ndvi', days = 365) =>
    api
      .get<NdviHistory>(`/farm-map/ndvi/sectors/${sectorId}/history`, {
        params: { index, days },
      })
      .then((r) => r.data),
  geometryHistory: (sectorId: number) =>
    api
      .get<{
        sector_id: number;
        revisions: GeometryRevision[];
      }>(`/sectors/${sectorId}/geometry-history`)
      .then((r) => r.data.revisions),
  restoreGeometry: (sectorId: number, revisionId: number) =>
    api
      .post<MapSector>(
        `/sectors/${sectorId}/geometry-history/${revisionId}/restore`
      )
      .then((r) => r.data),
  /** `.kml` / `.kmz` (≤ 2 MB). `dryRun` previews without creating. */
  importKml: (file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append('file', file);
    form.append('dry_run', dryRun ? 'true' : 'false');
    return api
      .post<KmlImportResult>('/farm-map/sectors/import-kml', form)
      .then((r) => r.data);
  },

  listZones: () => api.get<ZoneOption[]>('/zones').then((r) => r.data),
  listSensorKeys: () =>
    api.get<{ keys: SensorKeyOption[] }>('/sensors').then((r) => r.data.keys),
};
