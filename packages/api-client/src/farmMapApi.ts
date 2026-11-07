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

  listZones: () => api.get<ZoneOption[]>('/zones').then((r) => r.data),
  listSensorKeys: () =>
    api.get<{ keys: SensorKeyOption[] }>('/sensors').then((r) => r.data.keys),
};
