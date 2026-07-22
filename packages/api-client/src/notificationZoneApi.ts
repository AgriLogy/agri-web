/**
 * Thin axios wrapper around /notification-zones/ (agrilogy-front #57).
 *
 * Custom notification zones are user-owned alert groupings independent of the
 * farm zones. Each holds sensor assignments ({ sensor_key, source_zone }); an
 * alert can bind to a notification zone instead of a farm zone.
 *
 * Keep in sync with apps/alerts/router_notification_zones.py.
 */

import api from './api';

/**
 * Fired after a notification zone is created / updated / deleted so any open
 * consumer (e.g. the zone picker of the notification form) refreshes its list
 * without a page reload.
 */
export const NOTIFICATION_ZONES_UPDATED_EVENT =
  'agrilogy-notification-zones-updated';

export function emitNotificationZonesUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_ZONES_UPDATED_EVENT));
}

export interface NotificationZoneSensor {
  id: number;
  sensor_key: string;
  source_zone: number | null;
  label: string | null;
  unit: string | null;
}

export interface NotificationZone {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  user: number;
  created_at: string | null;
  updated_at: string | null;
  sensors: NotificationZoneSensor[];
}

export interface SensorAssignmentInput {
  sensor_key: string;
  source_zone?: number | null;
  label?: string | null;
}

export interface NotificationZoneWritePayload {
  name?: string;
  description?: string;
  is_active?: boolean;
  sensors?: SensorAssignmentInput[];
}

/** One (farm zone, sensor) stream the caller can assign to a notification zone. */
export interface AvailableZoneSensors {
  zone_id: number;
  zone_name: string;
  sensors: { sensor_key: string; label: string | null; unit: string | null }[];
}

export const notificationZoneApi = {
  list: () =>
    api.get<NotificationZone[]>('/notification-zones').then((r) => r.data),

  get: (id: number) =>
    api.get<NotificationZone>(`/notification-zones/${id}`).then((r) => r.data),

  create: (payload: NotificationZoneWritePayload) =>
    api
      .post<NotificationZone>('/notification-zones', payload)
      .then((r) => r.data),

  update: (id: number, payload: NotificationZoneWritePayload) =>
    api
      .patch<NotificationZone>(`/notification-zones/${id}`, payload)
      .then((r) => r.data),

  remove: (id: number) =>
    api.delete<void>(`/notification-zones/${id}`).then((r) => r.data),

  addSensor: (id: number, payload: SensorAssignmentInput) =>
    api
      .post<NotificationZoneSensor>(
        `/notification-zones/${id}/sensors`,
        payload
      )
      .then((r) => r.data),

  removeSensor: (id: number, sensorId: number) =>
    api
      .delete<void>(`/notification-zones/${id}/sensors/${sensorId}`)
      .then((r) => r.data),

  availableSensors: () =>
    api
      .get<{
        zones: AvailableZoneSensors[];
      }>('/notification-zones/available-sensors')
      .then((r) => r.data.zones),
};
