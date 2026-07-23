/**
 * Unit tests for the pure sensor-group logic (agri-web #95).
 *
 * No DOM, no axios: the dashboard's grouping/sorting rules, the multi-group
 * case, the degraded-schema detection and the legacy-import plan are all
 * decided here.
 */
import {
  buildAvailableSensors,
  buildSensorGroupSections,
  groupNamesForSensor,
  isSensorGroupsUnavailableError,
  planLocalGroupImport,
  sensorIdentity,
  type AvailableSensor,
} from '@agri/api-client/sensorGroupModel';
import type {
  SensorGroup,
  SensorGroupSensor,
} from '@agri/api-client/sensorGroupApi';
import type { FarmSectorNode } from '@agri/api-client/farmApi';
import type { MyDevice } from '@agri/api-client/myDevicesApi';

const membership = (over: Partial<SensorGroupSensor>): SensorGroupSensor => ({
  id: 1,
  group_id: 1,
  device_id: 10,
  sensor_key: 'soil_temperature',
  label: null,
  zone_id: 5,
  display_order: 0,
  device_name: 'Router A',
  device_serial: 'RA-1',
  ...over,
});

const group = (over: Partial<SensorGroup>): SensorGroup => ({
  id: 1,
  name: 'Serre A',
  description: '',
  display_order: 0,
  is_active: true,
  created_at: null,
  updated_at: null,
  sensors: [],
  ...over,
});

const device = (over: Partial<MyDevice>): MyDevice => ({
  id: 10,
  device_type: 'lora',
  serial: 'RA-1',
  name: 'Router A',
  zone: 5,
  latitude: null,
  longitude: null,
  ...over,
});

const sectors: FarmSectorNode[] = [
  {
    sector_id: 1,
    sector_name: 'Secteur 1',
    zones: [
      {
        zone_id: 5,
        zone_name: 'Zone 5',
        captors: [
          {
            sensor_key: 'soil_temperature',
            configured: true,
            last_received: '2026-07-20T10:00:00Z',
          },
          {
            sensor_key: 'soil_humidity',
            configured: true,
            last_received: null,
          },
        ],
      },
    ],
  },
  {
    sector_id: null,
    sector_name: null,
    zones: [
      {
        zone_id: 9,
        zone_name: 'Zone 9',
        captors: [
          {
            sensor_key: 'soil_temperature',
            configured: true,
            last_received: null,
          },
        ],
      },
    ],
  },
];

describe('sensorIdentity', () => {
  it('keys a sensor by device AND key — the key alone is not unique', () => {
    expect(sensorIdentity(10, 'soil_temperature')).toBe('10:soil_temperature');
    expect(sensorIdentity(11, 'soil_temperature')).not.toBe(
      sensorIdentity(10, 'soil_temperature')
    );
  });

  it('still yields a stable key for a sensor with no device', () => {
    expect(sensorIdentity(null, 'ph')).toBe('nodevice:ph');
  });
});

describe('buildAvailableSensors', () => {
  it('resolves every zone captor to the device that owns its zone', () => {
    const list = buildAvailableSensors(sectors, [
      device({ id: 10, zone: 5 }),
      device({ id: 20, zone: 9, name: 'Router B', serial: 'RB-1' }),
    ]);
    expect(list).toHaveLength(3);
    const zone5 = list.filter((s) => s.zoneId === 5);
    expect(zone5.every((s) => s.deviceId === 10)).toBe(true);
    expect(list.find((s) => s.zoneId === 9)?.deviceName).toBe('Router B');
    expect(list.find((s) => s.zoneId === 5)?.sectorName).toBe('Secteur 1');
  });

  it('picks the lowest-id device when a zone has several', () => {
    const list = buildAvailableSensors(sectors, [
      device({ id: 42, zone: 5 }),
      device({ id: 7, zone: 5, name: 'Oldest' }),
    ]);
    expect(
      list.filter((s) => s.zoneId === 5).every((s) => s.deviceId === 7)
    ).toBe(true);
  });

  it('keeps sensors of a device-less zone but marks them unassignable', () => {
    const list = buildAvailableSensors(sectors, []);
    expect(list).toHaveLength(2); // the two identities collapse: nodevice:*
    expect(list.every((s) => s.deviceId === null)).toBe(true);
  });

  it('carries the last-received timestamp through', () => {
    const list = buildAvailableSensors(sectors, [device({})]);
    const temp = list.find(
      (s) => s.zoneId === 5 && s.sensorKey === 'soil_temperature'
    );
    expect(temp?.lastReceived).toBe('2026-07-20T10:00:00Z');
  });
});

describe('buildSensorGroupSections', () => {
  const available: AvailableSensor[] = buildAvailableSensors(sectors, [
    device({ id: 10, zone: 5 }),
    device({ id: 20, zone: 9 }),
  ]);

  it('renders one section per group plus an ungrouped bucket', () => {
    const sections = buildSensorGroupSections(
      [group({ id: 1, sensors: [membership({})] })],
      available
    );
    expect(sections.map((s) => s.name)).toEqual(['Serre A', null]);
    expect(sections[0].sensors.map((s) => s.sensorKey)).toEqual([
      'soil_temperature',
    ]);
    // Everything not in a group stays reachable.
    expect(sections[1].isUngrouped).toBe(true);
    expect(sections[1].sensors.map((s) => s.key).sort()).toEqual([
      '10:soil_humidity',
      '20:soil_temperature',
    ]);
  });

  it('lists a sensor under EVERY group holding it (no exclusivity)', () => {
    const sections = buildSensorGroupSections(
      [
        group({ id: 1, name: 'Serre A', sensors: [membership({ id: 1 })] }),
        group({
          id: 2,
          name: 'Irrigation',
          display_order: 1,
          sensors: [membership({ id: 2, group_id: 2 })],
        }),
      ],
      available
    );
    expect(sections[0].sensors[0].key).toBe('10:soil_temperature');
    expect(sections[1].sensors[0].key).toBe('10:soil_temperature');
    // Each row knows the full membership set…
    expect(sections[0].sensors[0].groupNames).toEqual([
      'Serre A',
      'Irrigation',
    ]);
    // …and carries the membership id of the group it is rendered under, so
    // "remove" only detaches it from that one.
    expect(sections[0].sensors[0].membershipId).toBe(1);
    expect(sections[1].sensors[0].membershipId).toBe(2);
    // A doubly-grouped sensor is NOT also in the ungrouped bucket.
    expect(
      sections[2].sensors.some((s) => s.key === '10:soil_temperature')
    ).toBe(false);
  });

  it('orders groups by display_order then name, sensors by display_order', () => {
    const sections = buildSensorGroupSections(
      [
        group({ id: 1, name: 'Zeta', display_order: 5 }),
        group({ id: 2, name: 'Beta', display_order: 1 }),
        group({ id: 3, name: 'Alpha', display_order: 1 }),
        group({
          id: 4,
          name: 'Ordered',
          display_order: 0,
          sensors: [
            membership({ id: 8, sensor_key: 'b', display_order: 2 }),
            membership({ id: 9, sensor_key: 'a', display_order: 1 }),
          ],
        }),
      ],
      available
    );
    expect(sections.map((s) => s.name)).toEqual([
      'Ordered',
      'Alpha',
      'Beta',
      'Zeta',
      null,
    ]);
    expect(sections[0].sensors.map((s) => s.sensorKey)).toEqual(['a', 'b']);
  });

  it('hides inactive groups unless asked for them', () => {
    const groups = [group({ id: 1, name: 'Off', is_active: false })];
    expect(buildSensorGroupSections(groups, available)).toHaveLength(1); // ungrouped only
    expect(
      buildSensorGroupSections(groups, available, { includeInactive: true })
    ).toHaveLength(2);
  });

  it('still renders a membership whose sensor is not in the overview', () => {
    const sections = buildSensorGroupSections(
      [
        group({
          id: 1,
          sensors: [membership({ device_id: 99, sensor_key: 'ghost' })],
        }),
      ],
      available
    );
    expect(sections[0].sensors[0].sensorKey).toBe('ghost');
    expect(sections[0].sensors[0].deviceName).toBe('Router A');
  });
});

describe('groupNamesForSensor', () => {
  it('returns every group holding the pair, and none for a lookalike key', () => {
    const groups = [
      group({ id: 1, name: 'A', sensors: [membership({ device_id: 10 })] }),
      group({
        id: 2,
        name: 'B',
        sensors: [membership({ id: 2, device_id: 10 })],
      }),
      group({
        id: 3,
        name: 'C',
        sensors: [membership({ id: 3, device_id: 11 })],
      }),
    ];
    expect(groupNamesForSensor(groups, 10, 'soil_temperature')).toEqual([
      'A',
      'B',
    ]);
    expect(groupNamesForSensor(groups, 11, 'soil_temperature')).toEqual(['C']);
    expect(groupNamesForSensor(groups, 12, 'soil_temperature')).toEqual([]);
  });
});

describe('isSensorGroupsUnavailableError', () => {
  const refusal = (detail: string) => ({
    response: { status: 400, data: { detail } },
  });

  it('recognises the API refusal naming the held migration', () => {
    expect(
      isSensorGroupsUnavailableError(
        refusal(
          'Sensor groups are not available on this deployment: ' +
            'analytics_sensorgroup does not exist. Apply the agri-db migration ' +
            'that creates it (f4b6d2e8c1a9), then retry.'
        )
      )
    ).toBe(true);
  });

  it('matches on the migration id alone, whatever the wording', () => {
    expect(
      isSensorGroupsUnavailableError(refusal('apply f4b6d2e8c1a9 first'))
    ).toBe(true);
  });

  it('leaves ordinary 400s alone', () => {
    expect(
      isSensorGroupsUnavailableError(
        refusal('A group with that name already exists.')
      )
    ).toBe(false);
    expect(isSensorGroupsUnavailableError(refusal('name is required.'))).toBe(
      false
    );
  });

  it('is not fooled by another status or a non-axios error', () => {
    expect(
      isSensorGroupsUnavailableError({
        response: { status: 500, data: { detail: 'f4b6d2e8c1a9' } },
      })
    ).toBe(false);
    expect(isSensorGroupsUnavailableError(new Error('boom'))).toBe(false);
    expect(isSensorGroupsUnavailableError(undefined)).toBe(false);
  });
});

describe('planLocalGroupImport', () => {
  const available = buildAvailableSensors(sectors, [
    device({ id: 10, zone: 5 }),
    device({ id: 20, zone: 9 }),
  ]);

  it('imports a legacy group, resolving unambiguous sensor keys', () => {
    const plan = planLocalGroupImport(
      [{ id: 'g_1', name: 'Serre A', sensorKeys: ['soil_humidity'] }],
      [],
      available
    );
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0].members).toEqual([
      { deviceId: 10, sensorKey: 'soil_humidity', zoneId: 5 },
    ]);
    expect(plan.unresolvedCount).toBe(0);
  });

  it('never guesses when a bare key matches sensors on two devices', () => {
    const plan = planLocalGroupImport(
      [{ id: 'g_1', name: 'Serre A', sensorKeys: ['soil_temperature'] }],
      [],
      available
    );
    expect(plan.groups[0].members).toEqual([]);
    expect(plan.groups[0].unresolved).toEqual(['soil_temperature']);
    expect(plan.unresolvedCount).toBe(1);
  });

  it('skips a local group whose name the account already uses', () => {
    const plan = planLocalGroupImport(
      [{ id: 'g_1', name: ' serre a ', sensorKeys: [] }],
      [group({ name: 'Serre A' })],
      available
    );
    expect(plan.groups).toHaveLength(0);
    expect(plan.skippedNames).toEqual(['serre a']);
  });

  it('drops nameless entries and de-duplicates within the batch', () => {
    const plan = planLocalGroupImport(
      [
        { id: 'a', name: '  ', sensorKeys: [] },
        { id: 'b', name: 'Dup', sensorKeys: [] },
        { id: 'c', name: 'Dup', sensorKeys: [] },
      ],
      [],
      available
    );
    expect(plan.groups.map((g) => g.name)).toEqual(['Dup']);
    expect(plan.skippedNames).toEqual(['Dup']);
  });
});
