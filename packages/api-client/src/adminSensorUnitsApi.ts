/** Typed wrapper for /users/<u>/sensor-units. */
import api from './api';

export type SensorUnitsMap = Record<string, string>;

export const adminSensorUnitsApi = {
  get: async (username: string): Promise<SensorUnitsMap> => {
    const res = await api.get<SensorUnitsMap>(
      `/users/${encodeURIComponent(username)}/sensor-units`
    );
    return res.data ?? {};
  },
  patch: async (
    username: string,
    units: SensorUnitsMap
  ): Promise<SensorUnitsMap> => {
    const res = await api.patch<SensorUnitsMap>(
      `/users/${encodeURIComponent(username)}/sensor-units`,
      units
    );
    return res.data ?? {};
  },
};
