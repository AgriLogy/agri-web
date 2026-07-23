/**
 * Thin axios wrapper around `/sensor-groups` (agri-web #95, GRP-1 P3).
 *
 * A *sensor* is the pair `(device_id, sensor_key)`; a *group* is a named
 * bucket of such pairs owned by one account. The same sensor may belong to any
 * number of groups — the server's uniqueness constraint is per group — so no
 * consumer may assume exclusivity.
 *
 * Groups used to live in `localStorage` (`sensorGroupsV1`), which lost them on
 * every other device. They are account data now: this module is the only
 * persistence path.
 *
 * Keep in sync with agri-api `fastapp/routers/sensor_groups.py`.
 *
 * ── Degradation ──────────────────────────────────────────────────────────────
 * The agri-db migration `f4b6d2e8c1a9` that creates `analytics_sensorgroup`
 * is NOT applied to production yet. Until it is, the API answers:
 *   • reads  → `[]` (indistinguishable from "this farmer has no groups");
 *   • writes → 400 whose `detail` names the missing table and the migration.
 * So an empty read is NOT proof the feature works. {@link probeAvailability}
 * settles it with a side-effect-free write attempt, and
 * `isSensorGroupsUnavailableError` recognises the refusal on any real write.
 */

import api from './api';
import { isSensorGroupsUnavailableError } from './sensorGroupModel';

/** One membership row: a sensor as it sits inside one group. */
export interface SensorGroupSensor {
  id: number;
  group_id: number;
  device_id: number;
  sensor_key: string;
  label: string | null;
  zone_id: number | null;
  display_order: number | null;
  /** Joined in from `analytics_device` so the UI needs no second lookup. */
  device_name: string | null;
  device_serial: string | null;
}

export interface SensorGroup {
  id: number;
  name: string;
  description: string | null;
  display_order: number | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  sensors: SensorGroupSensor[];
}

export interface SensorGroupWritePayload {
  name?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface GroupSensorInput {
  device_id: number;
  sensor_key: string;
  label?: string | null;
  zone_id?: number | null;
  display_order?: number;
}

/**
 * Whether grouping can actually be persisted on this deployment.
 * `unknown` = not probed yet / the probe itself failed (offline, 5xx).
 */
export type SensorGroupsAvailability = 'available' | 'unavailable' | 'unknown';

export const sensorGroupApi = {
  list: (): Promise<SensorGroup[]> =>
    api.get<SensorGroup[]>('/sensor-groups').then((r) => r.data),

  create: (payload: SensorGroupWritePayload): Promise<SensorGroup> =>
    api.post<SensorGroup>('/sensor-groups', payload).then((r) => r.data),

  update: (
    id: number,
    payload: SensorGroupWritePayload
  ): Promise<SensorGroup> =>
    api.patch<SensorGroup>(`/sensor-groups/${id}`, payload).then((r) => r.data),

  remove: (id: number): Promise<void> =>
    api.delete(`/sensor-groups/${id}`).then(() => undefined),

  addSensor: (
    id: number,
    payload: GroupSensorInput
  ): Promise<SensorGroupSensor> =>
    api
      .post<SensorGroupSensor>(`/sensor-groups/${id}/sensors`, payload)
      .then((r) => r.data),

  removeSensor: (id: number, sensorId: number): Promise<void> =>
    api
      .delete(`/sensor-groups/${id}/sensors/${sensorId}`)
      .then(() => undefined),

  /**
   * Is the feature actually writable here?
   *
   * `PATCH /sensor-groups/0` with an empty body is the cheapest honest probe:
   * the server checks the schema BEFORE it looks the group up, so
   *   • schema missing → 400 naming migration `f4b6d2e8c1a9` → `unavailable`;
   *   • schema present → 404 "Sensor group not found." (id 0 never exists) →
   *     `available`, and nothing was written.
   * Any other outcome (network down, 5xx, 401 handled by the interceptor)
   * stays `unknown` so the UI does not accuse the backend of being broken.
   */
  probeAvailability: (): Promise<SensorGroupsAvailability> =>
    api
      .patch('/sensor-groups/0', {})
      .then((): SensorGroupsAvailability => 'available')
      .catch((error: unknown): SensorGroupsAvailability => {
        if (isSensorGroupsUnavailableError(error)) return 'unavailable';
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        // A reply that reached the router at all (404 not-found, 403 read-only,
        // 400 for another reason) proves the tables are there.
        if (status === 404 || status === 403 || status === 400) {
          return 'available';
        }
        return 'unknown';
      }),
};
