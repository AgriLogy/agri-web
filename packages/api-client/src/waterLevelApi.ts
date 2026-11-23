// Water level monitoring (agrilogy-front#261). One configuration per well,
// basin or tank; readings arrive as the standard WaterLevelReading (level_m),
// from the simulator today and a live sensor later. All values SI (m, m³).

import api from './api';

export type WaterSourceType = 'BASIN' | 'TANK' | 'WELL';
export type WaterSourceGeometry = 'RECTANGULAR' | 'CYLINDRICAL' | 'IRREGULAR';
export type WaterSourceMode = 'SIMULATED' | 'LIVE' | 'CALIBRATING';
export type WaterDataStatus =
  | 'LIVE'
  | 'SIMULATED'
  | 'STALE'
  | 'OFFLINE'
  | 'INVALID'
  | 'CALIBRATING';
export type WaterLevelState =
  | 'NORMAL'
  | 'LOW'
  | 'CRITICAL'
  | 'HIGH'
  | 'UNKNOWN';
export type WaterAlertKind = 'LOW' | 'CRITICAL' | 'HIGH' | 'OFFLINE';
export type WaterHistoryRange = '24h' | '7d' | '30d';

export interface CalibrationPoint {
  level_m: number;
  volume_m3: number;
}

export interface WaterLevelDevice {
  id: number;
  device_id: string;
  adapter: string;
  enabled: boolean;
  scale: number;
  offset_m: number;
  dev_eui: string | null;
  modbus_slave_id: number | null;
  register_address: number | null;
  register_type: string | null;
  baud_rate: number | null;
  parity: string | null;
  byte_order: string | null;
}

export type LiveDeviceInput = Partial<Omit<WaterLevelDevice, 'id'>>;

export interface WaterSourceInput {
  name: string;
  source_type: WaterSourceType;
  geometry: WaterSourceGeometry;
  zone_ids: number[];
  max_height_m: number;
  length_m: number | null;
  width_m: number | null;
  diameter_m: number | null;
  total_depth_m: number | null;
  max_capacity_m3: number | null;
  calibration_table: CalibrationPoint[] | null;
  minimum_reserve_m3: number;
  low_warning_pct: number;
  critical_pct: number;
  high_pct: number;
  offline_after_min: number;
  mode: WaterSourceMode;
  live_device?: LiveDeviceInput;
}

export interface WaterSource extends Omit<WaterSourceInput, 'live_device'> {
  id: number;
  capacity_m3: number | null;
  created_at: string;
  updated_at: string;
  devices: WaterLevelDevice[];
}

export interface WaterLevelMetrics {
  level_m: number;
  max_height_m: number;
  fill_percent: number;
  volume_m3: number | null;
  capacity_m3: number | null;
  free_capacity_m3: number | null;
  available_m3: number | null;
  minimum_reserve_m3: number;
  level_state: WaterLevelState;
  depth_to_water_m: number | null;
}

export interface WaterLevelAlert {
  id: number;
  kind: WaterAlertKind;
  opened_at: string;
  resolved_at: string | null;
  level_m: number | null;
  fill_percent: number | null;
}

export interface WaterLastReading {
  measured_at: string;
  level_m: number;
  mode: 'SIMULATED' | 'LIVE';
  quality: 'GOOD' | 'SUSPECT' | 'INVALID';
  device_id: string;
  battery_percent: number | null;
  rssi: number | null;
}

export interface WaterSourceStatus {
  water_source_id: number;
  name: string;
  source_type: WaterSourceType;
  mode: WaterSourceMode;
  data_status: WaterDataStatus;
  metrics: WaterLevelMetrics | null;
  last_reading: WaterLastReading | null;
  trend_24h_m3: number | null;
  trend_24h_level_m: number | null;
  thresholds: {
    low_warning_pct: number;
    critical_pct: number;
    high_pct: number;
    offline_after_min: number;
  };
  open_alerts: WaterLevelAlert[];
  server_time: string;
}

export interface WaterSourceWithStatus extends WaterSource {
  status: WaterSourceStatus;
}

export interface WaterHistoryPoint {
  measured_at: string;
  level_m: number;
  fill_percent: number;
  volume_m3: number | null;
  mode: 'SIMULATED' | 'LIVE';
}

export interface WaterHistory {
  water_source_id: number;
  range: WaterHistoryRange;
  start: string;
  end: string;
  points: WaterHistoryPoint[];
}

const BASE = '/water-sources';

export const waterLevelApi = {
  list: () => api.get<WaterSourceWithStatus[]>(BASE).then((r) => r.data),

  get: (id: number) =>
    api.get<WaterSource>(`${BASE}/${id}`).then((r) => r.data),

  create: (input: WaterSourceInput) =>
    api.post<WaterSource>(BASE, input).then((r) => r.data),

  update: (id: number, patch: Partial<WaterSourceInput>) =>
    api.patch<WaterSource>(`${BASE}/${id}`, patch).then((r) => r.data),

  remove: (id: number) => api.delete(`${BASE}/${id}`).then(() => undefined),

  status: (id: number) =>
    api.get<WaterSourceStatus>(`${BASE}/${id}/status`).then((r) => r.data),

  history: (id: number, range: WaterHistoryRange) =>
    api
      .get<WaterHistory>(`${BASE}/${id}/history`, { params: { range } })
      .then((r) => r.data),

  alerts: (id: number, limit = 50) =>
    api
      .get<WaterLevelAlert[]>(`${BASE}/${id}/alerts`, { params: { limit } })
      .then((r) => r.data),

  simulate: (id: number, levelM: number) =>
    api
      .post<WaterSourceStatus>(`${BASE}/${id}/simulate`, { level_m: levelM })
      .then((r) => r.data),
};
