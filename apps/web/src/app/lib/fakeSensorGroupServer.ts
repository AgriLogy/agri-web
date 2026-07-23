/**
 * In-memory stand-in for the agri-api endpoints the sensor-group UI talks to
 * (`/sensor-groups`, `/sectors/overview`, `/my-devices`), shared by the
 * settings and dashboard integration tests.
 *
 * It is deliberately faithful on the two points the UI must get right:
 *   • a sensor may live in SEVERAL groups (uniqueness is per group);
 *   • when `degraded` is set it behaves like production today — the agri-db
 *     migration `f4b6d2e8c1a9` is missing, so reads answer `[]` and every
 *     write (including the availability probe) is refused with the 400 that
 *     names the migration.
 *
 * Test-only helper: nothing in the app imports it.
 */

import type { FarmSectorNode } from '@agri/api-client/farmApi';
import type { MyDevice } from '@agri/api-client/myDevicesApi';
import type {
  SensorGroup,
  SensorGroupSensor,
} from '@agri/api-client/sensorGroupApi';

export const MIGRATION_REFUSAL = {
  response: {
    status: 400,
    data: {
      detail:
        'Sensor groups are not available on this deployment: ' +
        'analytics_sensorgroup does not exist. Apply the agri-db migration ' +
        'that creates it (f4b6d2e8c1a9), then retry.',
    },
  },
};

const reject = (status: number, detail: string) =>
  Promise.reject({ response: { status, data: { detail } } });

export interface SeedSensor {
  device_id: number;
  sensor_key: string;
  zone_id?: number;
}

export interface FakeSensorGroupServer {
  /** Simulate the deployment where the migration has not been applied. */
  degraded: boolean;
  groups: SensorGroup[];
  sectors: FarmSectorNode[];
  devices: MyDevice[];
  seedGroup: (name: string, sensors: SeedSensor[]) => SensorGroup;
}

export const DEFAULT_SECTORS: FarmSectorNode[] = [
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
            sensor_key: 'soil_moisture',
            configured: true,
            last_received: null,
          },
        ],
      },
      {
        zone_id: 9,
        zone_name: 'Zone 9',
        captors: [
          { sensor_key: 'soil_ph', configured: true, last_received: null },
        ],
      },
    ],
  },
];

export const DEFAULT_DEVICES: MyDevice[] = [
  {
    id: 10,
    device_type: 'lora',
    serial: 'RA-1',
    name: 'Router A',
    zone: 5,
    latitude: null,
    longitude: null,
  },
  {
    id: 20,
    device_type: 'lora',
    serial: 'RB-1',
    name: 'Router B',
    zone: 9,
    latitude: null,
    longitude: null,
  },
];

export function makeFakeSensorGroupServer(): FakeSensorGroupServer {
  let nextGroupId = 1;
  let nextSensorId = 100;
  const server: FakeSensorGroupServer = {
    degraded: false,
    groups: [],
    sectors: JSON.parse(JSON.stringify(DEFAULT_SECTORS)),
    devices: JSON.parse(JSON.stringify(DEFAULT_DEVICES)),
    seedGroup(name, sensors) {
      const id = nextGroupId++;
      const group: SensorGroup = {
        id,
        name,
        description: '',
        display_order: 0,
        is_active: true,
        created_at: null,
        updated_at: null,
        sensors: sensors.map<SensorGroupSensor>((s) => ({
          id: nextSensorId++,
          group_id: id,
          device_id: s.device_id,
          sensor_key: s.sensor_key,
          label: null,
          zone_id: s.zone_id ?? 5,
          display_order: 0,
          device_name: 'Router A',
          device_serial: 'RA-1',
        })),
      };
      server.groups.push(group);
      return group;
    },
  };
  return server;
}

type Mocks = {
  mockGet: jest.Mock;
  mockPost: jest.Mock;
  mockPatch: jest.Mock;
  mockDelete: jest.Mock;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Point the mocked axios instance at `server`. */
export function wireFakeServer(
  server: FakeSensorGroupServer,
  { mockGet, mockPost, mockPatch, mockDelete }: Mocks
) {
  let nextGroupId = 1000;
  let nextSensorId = 5000;

  mockGet.mockImplementation((url: string) => {
    if (url === '/sensor-groups') {
      return Promise.resolve({
        data: server.degraded ? [] : clone(server.groups),
      });
    }
    if (url === '/sectors/overview') {
      return Promise.resolve({ data: clone(server.sectors) });
    }
    if (url === '/my-devices') {
      return Promise.resolve({ data: clone(server.devices) });
    }
    return reject(404, `no fake handler for GET ${url}`);
  });

  mockPost.mockImplementation((url: string, body: Record<string, unknown>) => {
    if (server.degraded) return Promise.reject(MIGRATION_REFUSAL);
    if (url === '/sensor-groups') {
      const name = String(body.name ?? '');
      if (server.groups.some((g) => g.name === name)) {
        return reject(400, 'A group with that name already exists.');
      }
      const group: SensorGroup = {
        id: nextGroupId++,
        name,
        description: '',
        display_order: 0,
        is_active: true,
        created_at: null,
        updated_at: null,
        sensors: [],
      };
      server.groups.push(group);
      return Promise.resolve({ data: clone(group) });
    }
    const membership = /^\/sensor-groups\/(\d+)\/sensors$/.exec(url);
    if (membership) {
      const group = server.groups.find((g) => g.id === Number(membership[1]));
      if (!group) return reject(404, 'Sensor group not found.');
      const deviceId = Number(body.device_id);
      const sensorKey = String(body.sensor_key);
      if (
        group.sensors.some(
          (s) => s.device_id === deviceId && s.sensor_key === sensorKey
        )
      ) {
        return reject(400, 'That sensor is already in this group.');
      }
      const device = server.devices.find((d) => d.id === deviceId);
      if (!device) return reject(404, 'Device not found.');
      const row: SensorGroupSensor = {
        id: nextSensorId++,
        group_id: group.id,
        device_id: deviceId,
        sensor_key: sensorKey,
        label: null,
        zone_id: (body.zone_id as number | null) ?? device.zone,
        display_order: 0,
        device_name: device.name,
        device_serial: device.serial,
      };
      group.sensors.push(row);
      return Promise.resolve({ data: clone(row) });
    }
    return reject(404, `no fake handler for POST ${url}`);
  });

  mockPatch.mockImplementation((url: string, body: Record<string, unknown>) => {
    if (server.degraded) return Promise.reject(MIGRATION_REFUSAL);
    const match = /^\/sensor-groups\/(\d+)$/.exec(url);
    if (!match) return reject(404, `no fake handler for PATCH ${url}`);
    const group = server.groups.find((g) => g.id === Number(match[1]));
    // Includes the availability probe's `PATCH /sensor-groups/0`: the schema
    // is there, the group simply is not.
    if (!group) return reject(404, 'Sensor group not found.');
    if (typeof body.name === 'string') group.name = body.name;
    return Promise.resolve({ data: clone(group) });
  });

  mockDelete.mockImplementation((url: string) => {
    if (server.degraded) return Promise.reject(MIGRATION_REFUSAL);
    const membership = /^\/sensor-groups\/(\d+)\/sensors\/(\d+)$/.exec(url);
    if (membership) {
      const group = server.groups.find((g) => g.id === Number(membership[1]));
      if (!group) return reject(404, 'Sensor group not found.');
      const before = group.sensors.length;
      group.sensors = group.sensors.filter(
        (s) => s.id !== Number(membership[2])
      );
      if (group.sensors.length === before) {
        return reject(404, 'Sensor not in this group.');
      }
      return Promise.resolve({ data: { success: true } });
    }
    const match = /^\/sensor-groups\/(\d+)$/.exec(url);
    if (!match) return reject(404, `no fake handler for DELETE ${url}`);
    const index = server.groups.findIndex((g) => g.id === Number(match[1]));
    if (index < 0) return reject(404, 'Sensor group not found.');
    server.groups.splice(index, 1);
    return Promise.resolve({ data: { success: true } });
  });
}
