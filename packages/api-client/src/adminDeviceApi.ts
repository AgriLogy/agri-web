/**
 * Typed wrapper for the admin device/router registry (/devices).
 */
import api from './api';

export type DeviceType = 'dragon' | 'lora' | 'bivocom';

export type AdminDevice = {
  id: number;
  device_type: DeviceType;
  serial: string;
  name: string;
  user: string | null;
  zone: number | null;
  is_active: boolean;
  created_at: string | null;
};

export type AdminDeviceWritePayload = {
  device_type?: DeviceType;
  serial?: string;
  name?: string;
  username?: string;
  zone_id?: number | null;
  is_active?: boolean;
};

export const adminDeviceApi = {
  list: (username?: string) =>
    api
      .get<AdminDevice[]>('/devices', {
        params: username ? { username } : undefined,
      })
      .then((r) => r.data),

  create: (payload: AdminDeviceWritePayload) =>
    api.post<AdminDevice>('/devices', payload).then((r) => r.data),

  update: (id: number, payload: AdminDeviceWritePayload) =>
    api.patch<AdminDevice>(`/devices/${id}`, payload).then((r) => r.data),

  remove: (id: number) =>
    api.delete<void>(`/devices/${id}`).then((r) => r.data),
};
