/**
 * Irrigation-automation client — backed by agri-api `/irrigation` (JwtAuth).
 * Scheduled programs + manual valve/pump commands. Physical dispatch is
 * simulated by default on the backend (IRRIGATION_DISPATCH_ENABLED) — read
 * `getConfig().dispatch_enabled` to show a simulation banner.
 */
import api from './api';
// ZoneOption ({ id, name }) is defined once in kcApi and re-exported here so
// subpath consumers of this module keep working while the package barrel
// (index.ts) sees a single canonical declaration (no duplicate-export clash).
import type { ZoneOption } from './kcApi';
export type { ZoneOption };

export interface IrrigationProgram {
  id: number;
  name: string;
  zone_id: number;
  enabled: boolean;
  start_time: string; // HH:MM:SS
  weekdays: string; // CSV ISO weekday numbers, "" = every day
  duration_min: number | null;
  target_volume_m3: number | null;
  last_run_at: string | null;
}

export interface ProgramPayload {
  name: string;
  zone_id: number;
  start_time: string;
  weekdays?: string;
  enabled?: boolean;
  duration_min?: number | null;
  target_volume_m3?: number | null;
}

export type CommandAction = 'open' | 'close';
export type CommandStatus = 'pending' | 'simulated' | 'sent' | 'failed';

export interface OutputCommand {
  id: number;
  zone_id: number;
  device_id: number | null;
  action: CommandAction;
  source: 'manual' | 'scheduled';
  status: CommandStatus;
  detail: string;
  created_at: string | null;
  dispatched_at: string | null;
}

export const irrigationAutomationApi = {
  listZones: () => api.get<ZoneOption[]>('/zones').then((r) => r.data),

  getConfig: () =>
    api
      .get<{ dispatch_enabled: boolean }>('/irrigation/config')
      .then((r) => r.data),

  listPrograms: (zoneId?: number) =>
    api
      .get<IrrigationProgram[]>('/irrigation/programs', {
        params: zoneId ? { zone_id: zoneId } : undefined,
      })
      .then((r) => r.data),

  createProgram: (payload: ProgramPayload) =>
    api
      .post<IrrigationProgram>('/irrigation/programs', payload)
      .then((r) => r.data),

  updateProgram: (id: number, payload: ProgramPayload) =>
    api
      .put<IrrigationProgram>(`/irrigation/programs/${id}`, payload)
      .then((r) => r.data),

  deleteProgram: (id: number) =>
    api.delete(`/irrigation/programs/${id}`).then((r) => r.data),

  sendCommand: (zoneId: number, action: CommandAction, deviceId?: number) =>
    api
      .post<OutputCommand>('/irrigation/commands', {
        zone_id: zoneId,
        action,
        device_id: deviceId ?? null,
      })
      .then((r) => r.data),

  listCommands: (zoneId?: number) =>
    api
      .get<OutputCommand[]>('/irrigation/commands', {
        params: zoneId ? { zone_id: zoneId } : undefined,
      })
      .then((r) => r.data),
};
