/**
 * Zone picker options for the zone-notification form (agri-web #62).
 *
 * The picker offers two different kinds of zone that live in two *different*
 * id spaces:
 *   - farm zones          — read-only, provisioned server-side, `GET /zones`
 *   - notification zones  — user-created, `GET /notification-zones`
 *
 * Because a farm zone and a notification zone can share the same numeric id,
 * a `<select>` cannot key on the raw id: the option value is a token that
 * carries the kind as well (`farm:<id>` / `notif:<id>`).
 *
 * Dependency-free on purpose (types only) so it stays unit-testable.
 */

import type { NotificationZone } from './notificationZoneApi';

/** A read-only farm zone as returned by `GET /zones`. */
export type FarmZone = { id: number; name: string };

export type ZoneChoiceKind = 'farm' | 'notification';

/** One entry of the Zone dropdown: a farm zone or a custom notification zone. */
export type ZoneChoice = {
  /** Dropdown token — `farm:<id>` or `notif:<id>` (the two id spaces overlap). */
  value: string;
  label: string;
  kind: ZoneChoiceKind;
  /** Farm zone the sensor reads and outbound dispatch resolve to. */
  zoneId: number;
  /** Set only for custom notification zones. */
  notificationZoneId: number | null;
};

const PREFIX: Record<ZoneChoiceKind, string> = {
  farm: 'farm',
  notification: 'notif',
};

/** `('farm', 3) -> 'farm:3'`, `('notification', 3) -> 'notif:3'`. */
export function encodeZoneChoiceValue(
  kind: ZoneChoiceKind,
  id: number
): string {
  return `${PREFIX[kind]}:${id}`;
}

/** Inverse of {@link encodeZoneChoiceValue}; `null` for anything unparseable. */
export function decodeZoneChoiceValue(
  value: string | null | undefined
): { kind: ZoneChoiceKind; id: number } | null {
  if (typeof value !== 'string') return null;
  const sep = value.indexOf(':');
  if (sep <= 0) return null;
  const prefix = value.slice(0, sep);
  const rest = value.slice(sep + 1);
  if (rest === '' || !/^-?\d+$/.test(rest)) return null;
  const id = Number(rest);
  if (!Number.isFinite(id)) return null;
  if (prefix === PREFIX.farm) return { kind: 'farm', id };
  if (prefix === PREFIX.notification) return { kind: 'notification', id };
  return null;
}

/**
 * Farm zone a custom notification zone reads from: the first assigned sensor's
 * source zone, falling back to the first farm zone of the account.
 */
export function resolveSourceZoneId(
  zone: NotificationZone,
  farmZones: FarmZone[]
): number {
  const fromSensors = (zone.sensors ?? []).find((s) => s.source_zone != null);
  if (fromSensors?.source_zone != null) return fromSensors.source_zone;
  return farmZones[0]?.id ?? 0;
}

/** Farm zones first, then the user's custom notification zones. */
export function buildZoneChoices(
  farmZones: FarmZone[],
  notificationZones: NotificationZone[]
): ZoneChoice[] {
  return [
    ...farmZones.map<ZoneChoice>((z) => ({
      value: encodeZoneChoiceValue('farm', z.id),
      label: z.name,
      kind: 'farm',
      zoneId: z.id,
      notificationZoneId: null,
    })),
    ...notificationZones.map<ZoneChoice>((z) => ({
      value: encodeZoneChoiceValue('notification', z.id),
      label: z.name,
      kind: 'notification',
      zoneId: resolveSourceZoneId(z, farmZones),
      notificationZoneId: z.id,
    })),
  ];
}
