/**
 * Crop-calendar (Kc) client — the caller's crop coefficients per zone.
 * Backed by agri-api `/kc` (JwtAuth). A Kc is a crop split into growth-stage
 * periods, each with a date range + Kc value, that feed ETc/irrigation.
 */
import api from './api';

export interface KcPeriod {
  id?: number;
  period_name: string;
  start_date: string; // ISO yyyy-mm-dd
  end_date: string;
  kc_value: number;
}

export interface Kc {
  id: number;
  name: string;
  plant_name: string;
  zone_id: number | null;
  zone_name: string | null;
  number_of_periods: number;
  periods: KcPeriod[];
}

export interface KcWritePayload {
  name: string;
  plant_name: string;
  zone_id: number | null;
  periods: KcPeriod[];
}

export interface ZoneOption {
  id: number;
  name: string;
}

export const kcApi = {
  listZones: () => api.get<ZoneOption[]>('/zones').then((r) => r.data),

  list: (zoneId?: number) =>
    api
      .get<Kc[]>('/kc', { params: zoneId ? { zone_id: zoneId } : undefined })
      .then((r) => r.data),

  create: (payload: KcWritePayload) =>
    api.post<Kc>('/kc', payload).then((r) => r.data),

  update: (id: number, payload: KcWritePayload) =>
    api.put<Kc>(`/kc/${id}`, payload).then((r) => r.data),

  remove: (id: number) => api.delete(`/kc/${id}`).then((r) => r.data),
};
