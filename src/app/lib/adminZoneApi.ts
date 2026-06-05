/**
 * Typed wrapper for /users/<u>/zones* (CRUD + params)
 * and the active-graph admin endpoint.
 */
import api from './api';

export type AdminZone = {
  id: number;
  name: string;
  space: number;
  soil_param_TAW: number;
  soil_param_FC: number;
  soil_param_WP: number;
  soil_param_RAW: number;
  critical_moisture_threshold: number;
  pomp_flow_rate: number;
  irrigation_water_quantity: number;
};

export type AdminZoneCreatePayload = Omit<AdminZone, 'id'> & {
  // every field optional except the four required by the model
  name: string;
  space: number;
  critical_moisture_threshold: number;
  pomp_flow_rate?: number;
};

export type AdminZonePatchPayload = Partial<Omit<AdminZone, 'id'>>;

export type AdminZoneParams = Pick<
  AdminZone,
  | 'id'
  | 'soil_param_TAW'
  | 'soil_param_FC'
  | 'soil_param_WP'
  | 'soil_param_RAW'
  | 'critical_moisture_threshold'
  | 'pomp_flow_rate'
  | 'irrigation_water_quantity'
>;

export type ActiveGraphRecord = Record<string, boolean | number>;

const unwrap = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as Record<string, unknown>).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
};

export const adminZoneApi = {
  list: async (username: string): Promise<AdminZone[]> => {
    const res = await api.get(`/users/${encodeURIComponent(username)}/zones`);
    return unwrap<AdminZone>(res.data);
  },

  retrieve: async (username: string, zoneId: number): Promise<AdminZone> => {
    const res = await api.get<AdminZone>(
      `/users/${encodeURIComponent(username)}/zones${zoneId}/`
    );
    return res.data;
  },

  create: async (
    username: string,
    payload: AdminZoneCreatePayload
  ): Promise<AdminZone> => {
    const res = await api.post<AdminZone>(
      `/users/${encodeURIComponent(username)}/zones`,
      payload
    );
    return res.data;
  },

  update: async (
    username: string,
    zoneId: number,
    payload: AdminZonePatchPayload
  ): Promise<AdminZone> => {
    const res = await api.patch<AdminZone>(
      `/users/${encodeURIComponent(username)}/zones${zoneId}/`,
      payload
    );
    return res.data;
  },

  remove: async (username: string, zoneId: number): Promise<void> => {
    await api.delete(`/users/${encodeURIComponent(username)}/zones${zoneId}/`);
  },

  params: {
    get: async (username: string, zoneId: number): Promise<AdminZoneParams> => {
      const res = await api.get<AdminZoneParams>(
        `/users${encodeURIComponent(username)}/zones/${zoneId}/params/`
      );
      return res.data;
    },
    update: async (
      username: string,
      zoneId: number,
      payload: Partial<Omit<AdminZoneParams, 'id'>>
    ): Promise<AdminZoneParams> => {
      const res = await api.patch<AdminZoneParams>(
        `/users${encodeURIComponent(username)}/zones/${zoneId}/params/`,
        payload
      );
      return res.data;
    },
  },

  activeGraph: {
    get: async (
      username: string,
      zoneId: number
    ): Promise<ActiveGraphRecord> => {
      const res = await api.get<ActiveGraphRecord>(
        `/users${encodeURIComponent(username)}/zones/${zoneId}/active-graph/`
      );
      return res.data;
    },
    patch: async (
      username: string,
      zoneId: number,
      payload: ActiveGraphRecord
    ): Promise<ActiveGraphRecord> => {
      const res = await api.patch<ActiveGraphRecord>(
        `/users${encodeURIComponent(username)}/zones/${zoneId}/active-graph/`,
        payload
      );
      return res.data;
    },
  },
};
