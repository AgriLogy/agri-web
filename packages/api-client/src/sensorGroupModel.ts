/**
 * Pure logic behind account-persisted sensor groups (agri-web #95, GRP-1 P3).
 *
 * Dependency-free on purpose (type-only imports, erased at build time) so every
 * rule below is unit-testable without a DOM, axios or next-intl — the same
 * split as `zonePickerChoices.ts`.
 *
 * Three things live here:
 *   1. the sensor universe: the farm overview's captors resolved to the
 *      `(device_id, sensor_key)` pairs the API keys memberships by;
 *   2. the dashboard sections: one per group, plus the ungrouped remainder,
 *      built so that a sensor belonging to SEVERAL groups appears under each
 *      of them (the schema allows it, so the UI must not assume exclusivity);
 *   3. the degradation probe: recognising the API's refusal when the agri-db
 *      migration `f4b6d2e8c1a9` has not been applied.
 */

import { isSchemaUnavailableError } from './schemaAvailability';

import type { FarmSectorNode } from './farmApi';
import type { MyDevice } from './myDevicesApi';
import type { SensorGroup, SensorGroupSensor } from './sensorGroupApi';

/** One real sensor of the account: what a membership row points at. */
export interface AvailableSensor {
  /** Stable identity — see {@link sensorIdentity}. */
  key: string;
  /**
   * Owning device. `null` when the sensor's zone has no registered device, in
   * which case it cannot be added to a group (the API requires a device_id) —
   * it still shows on the dashboard, just not in the group picker.
   */
  deviceId: number | null;
  deviceName: string | null;
  sensorKey: string;
  zoneId: number;
  zoneName: string;
  sectorName: string | null;
  /** ISO-8601 timestamp of the newest reading, or null if never received. */
  lastReceived: string | null;
}

/** A sensor as rendered inside a dashboard section. */
export interface SectionSensor extends AvailableSensor {
  /** Membership row id — needed to remove it from THIS group. Null = ungrouped. */
  membershipId: number | null;
  /** Every group this sensor belongs to (length > 1 is legitimate). */
  groupNames: string[];
}

/** A collapsible block of the dashboard: one group, or the ungrouped bucket. */
export interface SensorGroupSection {
  /** Group id, or `null` for the ungrouped bucket. */
  groupId: number | null;
  /** Group name, or `null` for the ungrouped bucket (the UI translates it). */
  name: string | null;
  isUngrouped: boolean;
  sensors: SectionSensor[];
}

/**
 * Identity of a sensor. The API keys memberships by `(device_id, sensor_key)`,
 * so the sensor key alone is NOT unique across an account: two devices can
 * both report `soil_temperature`.
 */
export function sensorIdentity(
  deviceId: number | null | undefined,
  sensorKey: string
): string {
  return `${deviceId ?? 'nodevice'}:${sensorKey}`;
}

function byOrderThenName(
  a: { order: number; name: string },
  b: { order: number; name: string }
): number {
  if (a.order !== b.order) return a.order - b.order;
  return a.name.localeCompare(b.name);
}

/**
 * The account's sensor universe: every captor the farm overview reports,
 * resolved to the device that owns it.
 *
 * A zone with several devices resolves to its lowest-id device — the farm
 * overview reports captors per ZONE, not per device, so that is the only
 * deterministic choice available client-side.
 */
export function buildAvailableSensors(
  sectors: FarmSectorNode[],
  devices: MyDevice[]
): AvailableSensor[] {
  const deviceByZone = new Map<number, MyDevice>();
  for (const device of [...devices].sort((a, b) => a.id - b.id)) {
    if (device.zone == null) continue;
    if (!deviceByZone.has(device.zone)) deviceByZone.set(device.zone, device);
  }

  const out: AvailableSensor[] = [];
  const seen = new Set<string>();
  for (const sector of sectors ?? []) {
    for (const zone of sector.zones ?? []) {
      const device = deviceByZone.get(zone.zone_id) ?? null;
      for (const captor of zone.captors ?? []) {
        const key = sensorIdentity(device?.id ?? null, captor.sensor_key);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          key,
          deviceId: device?.id ?? null,
          deviceName: device?.name || device?.serial || null,
          sensorKey: captor.sensor_key,
          zoneId: zone.zone_id,
          zoneName: zone.zone_name,
          sectorName: sector.sector_name,
          lastReceived: captor.last_received ?? null,
        });
      }
    }
  }
  return out.sort((a, b) =>
    a.sensorKey === b.sensorKey
      ? a.zoneName.localeCompare(b.zoneName)
      : a.sensorKey.localeCompare(b.sensorKey)
  );
}

/** Names of every group holding `(deviceId, sensorKey)` — may be several. */
export function groupNamesForSensor(
  groups: SensorGroup[],
  deviceId: number | null,
  sensorKey: string
): string[] {
  const wanted = sensorIdentity(deviceId, sensorKey);
  return groups
    .filter((g) =>
      (g.sensors ?? []).some(
        (s) => sensorIdentity(s.device_id, s.sensor_key) === wanted
      )
    )
    .map((g) => g.name);
}

/** A membership row turned into a renderable sensor, with what we know of it. */
function membershipToSensor(
  membership: SensorGroupSensor,
  byIdentity: Map<string, AvailableSensor>,
  groupNames: string[]
): SectionSensor {
  const key = sensorIdentity(membership.device_id, membership.sensor_key);
  const known = byIdentity.get(key);
  return {
    key,
    deviceId: membership.device_id,
    deviceName:
      known?.deviceName ?? membership.device_name ?? membership.device_serial,
    sensorKey: membership.sensor_key,
    zoneId: known?.zoneId ?? membership.zone_id ?? 0,
    zoneName: known?.zoneName ?? '',
    sectorName: known?.sectorName ?? null,
    lastReceived: known?.lastReceived ?? null,
    membershipId: membership.id,
    groupNames,
  };
}

export interface BuildSectionsOptions {
  /** Include groups whose `is_active` is false (the settings screen does). */
  includeInactive?: boolean;
}

/**
 * The dashboard's collapsible sections: the groups in display order, then the
 * ungrouped remainder.
 *
 * Grouping is NOT a partition — a sensor in two groups is listed under both,
 * and only sensors in NO group at all fall into the ungrouped bucket, so
 * nothing the farmer owns ever becomes unreachable.
 */
export function buildSensorGroupSections(
  groups: SensorGroup[],
  available: AvailableSensor[],
  options: BuildSectionsOptions = {}
): SensorGroupSection[] {
  const visible = (groups ?? []).filter(
    (g) => options.includeInactive || g.is_active !== false
  );
  const byIdentity = new Map(available.map((s) => [s.key, s]));

  const namesByIdentity = new Map<string, string[]>();
  for (const group of visible) {
    for (const membership of group.sensors ?? []) {
      const key = sensorIdentity(membership.device_id, membership.sensor_key);
      const names = namesByIdentity.get(key) ?? [];
      if (!names.includes(group.name)) names.push(group.name);
      namesByIdentity.set(key, names);
    }
  }

  const sections: SensorGroupSection[] = visible
    .slice()
    .sort((a, b) =>
      byOrderThenName(
        { order: a.display_order ?? 0, name: a.name },
        { order: b.display_order ?? 0, name: b.name }
      )
    )
    .map((group) => ({
      groupId: group.id,
      name: group.name,
      isUngrouped: false,
      sensors: (group.sensors ?? [])
        .slice()
        .sort((a, b) =>
          byOrderThenName(
            { order: a.display_order ?? 0, name: a.sensor_key },
            { order: b.display_order ?? 0, name: b.sensor_key }
          )
        )
        .map((membership) =>
          membershipToSensor(
            membership,
            byIdentity,
            namesByIdentity.get(
              sensorIdentity(membership.device_id, membership.sensor_key)
            ) ?? [group.name]
          )
        ),
    }));

  const ungrouped = available
    .filter((sensor) => !namesByIdentity.has(sensor.key))
    .map<SectionSensor>((sensor) => ({
      ...sensor,
      membershipId: null,
      groupNames: [],
    }));

  sections.push({
    groupId: null,
    name: null,
    isUngrouped: true,
    sensors: ungrouped,
  });
  return sections;
}

// ---------------------------------------------------------------------------
// Degradation
// ---------------------------------------------------------------------------

/** The agri-db revision that creates `analytics_sensorgroup`. */
export const SENSOR_GROUPS_MIGRATION = 'f4b6d2e8c1a9';

/**
 * Does this rejection mean "the schema for sensor groups is not deployed"?
 *
 * Read off the server's own words rather than assumed: agri-api answers such
 * writes with 400 and a `detail` naming the missing table AND the migration to
 * apply. Matching either marker keeps this working if the wording is reworded,
 * while an ordinary 400 (duplicate name, empty name) is left alone.
 *
 * The detection itself lives in `schemaAvailability.ts` — per-sensor
 * calibration (agri-web #97) degrades in exactly the same way, so the
 * mechanism is shared rather than written twice.
 */
export function isSensorGroupsUnavailableError(error: unknown): boolean {
  return isSchemaUnavailableError(error, [
    SENSOR_GROUPS_MIGRATION,
    'analytics_sensorgroup',
  ]);
}

// ---------------------------------------------------------------------------
// One-time import of the legacy device-local groups
// ---------------------------------------------------------------------------

/** A group as the old `localStorage` store held it: a name + bare sensor keys. */
export interface LegacyLocalGroup {
  id: string;
  name: string;
  sensorKeys: string[];
}

export interface LocalImportMember {
  deviceId: number;
  sensorKey: string;
  zoneId: number;
}

export interface LocalImportGroupPlan {
  name: string;
  members: LocalImportMember[];
  /** Sensor keys that could not be resolved to exactly one owned sensor. */
  unresolved: string[];
}

export interface LocalImportPlan {
  groups: LocalImportGroupPlan[];
  /** Local groups skipped because the account already has that name. */
  skippedNames: string[];
  unresolvedCount: number;
}

/**
 * What a one-time import of the legacy device-local groups would do.
 *
 * The old store kept bare `sensor_key`s with no device, so a key is imported
 * only when the account owns exactly ONE sensor with it — anything ambiguous
 * is reported, never guessed. Groups whose name already exists server-side are
 * skipped rather than merged, so an import can never rewrite existing account
 * data.
 */
export function planLocalGroupImport(
  local: LegacyLocalGroup[],
  serverGroups: SensorGroup[],
  available: AvailableSensor[]
): LocalImportPlan {
  const takenNames = new Set(
    (serverGroups ?? []).map((g) => g.name.trim().toLowerCase())
  );
  const bySensorKey = new Map<string, AvailableSensor[]>();
  for (const sensor of available) {
    if (sensor.deviceId == null) continue;
    const list = bySensorKey.get(sensor.sensorKey) ?? [];
    list.push(sensor);
    bySensorKey.set(sensor.sensorKey, list);
  }

  const groups: LocalImportGroupPlan[] = [];
  const skippedNames: string[] = [];
  let unresolvedCount = 0;

  for (const group of local ?? []) {
    const name = (group.name ?? '').trim();
    if (!name) continue;
    if (takenNames.has(name.toLowerCase())) {
      skippedNames.push(name);
      continue;
    }
    takenNames.add(name.toLowerCase());
    const members: LocalImportMember[] = [];
    const unresolved: string[] = [];
    for (const sensorKey of group.sensorKeys ?? []) {
      const matches = bySensorKey.get(sensorKey) ?? [];
      if (matches.length === 1 && matches[0].deviceId != null) {
        members.push({
          deviceId: matches[0].deviceId,
          sensorKey,
          zoneId: matches[0].zoneId,
        });
      } else {
        unresolved.push(sensorKey);
      }
    }
    unresolvedCount += unresolved.length;
    groups.push({ name, members, unresolved });
  }

  return { groups, skippedNames, unresolvedCount };
}
