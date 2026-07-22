/**
 * Unit tests for the zone-picker token logic (agri-web #62).
 *
 * The picker mixes two id spaces — farm zones (`GET /zones`) and custom
 * notification zones (`GET /notification-zones`) — whose numeric ids overlap.
 * The `farm:<id>` / `notif:<id>` token is what keeps them apart, so the
 * round-trip and the collision case are the contract worth pinning down.
 */

import {
  buildZoneChoices,
  decodeZoneChoiceValue,
  encodeZoneChoiceValue,
  resolveSourceZoneId,
  type FarmZone,
} from '@agri/api-client/zonePickerChoices';
import type { NotificationZone } from '@agri/api-client/notificationZoneApi';

const farmZones: FarmZone[] = [
  { id: 1, name: 'Parcelle Nord' },
  { id: 2, name: 'Parcelle Sud' },
];

function notifZone(
  id: number,
  name: string,
  sourceZones: (number | null)[] = []
): NotificationZone {
  return {
    id,
    name,
    description: '',
    is_active: true,
    user: 7,
    created_at: null,
    updated_at: null,
    sensors: sourceZones.map((source_zone, i) => ({
      id: id * 100 + i,
      sensor_key: `sensor_${i}`,
      source_zone,
      label: null,
      unit: null,
    })),
  };
}

describe('zone choice token encode/decode', () => {
  it('round-trips a farm zone token', () => {
    const value = encodeZoneChoiceValue('farm', 12);
    expect(value).toBe('farm:12');
    expect(decodeZoneChoiceValue(value)).toEqual({ kind: 'farm', id: 12 });
  });

  it('round-trips a notification zone token', () => {
    const value = encodeZoneChoiceValue('notification', 12);
    expect(value).toBe('notif:12');
    expect(decodeZoneChoiceValue(value)).toEqual({
      kind: 'notification',
      id: 12,
    });
  });

  it('keeps a farm zone and a notification zone with the SAME id distinct', () => {
    const farm = encodeZoneChoiceValue('farm', 3);
    const notif = encodeZoneChoiceValue('notification', 3);
    expect(farm).not.toBe(notif);
    expect(decodeZoneChoiceValue(farm)).toEqual({ kind: 'farm', id: 3 });
    expect(decodeZoneChoiceValue(notif)).toEqual({
      kind: 'notification',
      id: 3,
    });
  });

  it('rejects values that are not tokens', () => {
    expect(decodeZoneChoiceValue('3')).toBeNull();
    expect(decodeZoneChoiceValue('')).toBeNull();
    expect(decodeZoneChoiceValue(':3')).toBeNull();
    expect(decodeZoneChoiceValue('farm:')).toBeNull();
    expect(decodeZoneChoiceValue('farm:abc')).toBeNull();
    expect(decodeZoneChoiceValue('zone:3')).toBeNull();
    expect(decodeZoneChoiceValue(null)).toBeNull();
    expect(decodeZoneChoiceValue(undefined)).toBeNull();
  });
});

describe('resolveSourceZoneId', () => {
  it('uses the first assigned sensor that carries a source zone', () => {
    const zone = notifZone(5, 'Verger', [null, 2]);
    expect(resolveSourceZoneId(zone, farmZones)).toBe(2);
  });

  it('falls back to the first farm zone when no sensor is assigned', () => {
    expect(resolveSourceZoneId(notifZone(5, 'Verger'), farmZones)).toBe(1);
  });

  it('falls back to 0 when the account has no farm zone at all', () => {
    expect(resolveSourceZoneId(notifZone(5, 'Verger'), [])).toBe(0);
  });
});

describe('buildZoneChoices', () => {
  it('lists farm zones first, then notification zones', () => {
    const choices = buildZoneChoices(farmZones, [
      notifZone(9, 'Mes oliviers', [2]),
    ]);
    expect(choices.map((c) => c.kind)).toEqual([
      'farm',
      'farm',
      'notification',
    ]);
    expect(choices.map((c) => c.value)).toEqual([
      'farm:1',
      'farm:2',
      'notif:9',
    ]);
    expect(choices.map((c) => c.label)).toEqual([
      'Parcelle Nord',
      'Parcelle Sud',
      'Mes oliviers',
    ]);
  });

  it('carries the derived zoneId and the notificationZoneId per choice', () => {
    const choices = buildZoneChoices(farmZones, [
      notifZone(9, 'Avec capteur', [2]),
      notifZone(10, 'Sans capteur'),
    ]);
    expect(choices[0]).toMatchObject({ zoneId: 1, notificationZoneId: null });
    expect(choices[2]).toMatchObject({ zoneId: 2, notificationZoneId: 9 });
    // No sensor assigned -> falls back to the first farm zone.
    expect(choices[3]).toMatchObject({ zoneId: 1, notificationZoneId: 10 });
  });

  it('produces unique values when the two id spaces collide', () => {
    const choices = buildZoneChoices(
      [{ id: 1, name: 'Zone ferme 1' }],
      [notifZone(1, 'Zone notif 1', [1])]
    );
    expect(new Set(choices.map((c) => c.value)).size).toBe(2);
    expect(choices.map((c) => c.value)).toEqual(['farm:1', 'notif:1']);
  });

  it('returns only farm zones when the user created none', () => {
    expect(buildZoneChoices(farmZones, [])).toHaveLength(2);
  });
});
