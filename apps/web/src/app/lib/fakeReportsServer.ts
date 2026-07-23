/**
 * In-memory stand-in for the agri-api report endpoints the Historique page
 * talks to (`/reports/alert-events`, `/reports/irrigation-decisions`,
 * `/zones`), for the ReportsMain integration tests.
 *
 * Mirrors `fakeSensorGroupServer.ts`: same shape, same `degraded` switch. It is
 * faithful on the points the UI must get right:
 *   • both endpoints answer the paging ENVELOPE `{count, limit, offset,
 *     schema_available, results}`, newest first;
 *   • the filter query params (`start`/`end`/`zone_id`/`sensor_key`/`source`/
 *     `irrigate`/`limit`/`offset`) actually narrow the result set, so a test
 *     that changes a filter and asserts the REQUEST also sees fewer rows back;
 *   • paging is honoured (`limit`/`offset` slice `count` total rows);
 *   • when `degraded` is set it behaves like a deployment whose report tables
 *     are absent — `schema_available: false` and an empty `results`, the
 *     empty-vs-degraded case the UI must tell apart.
 *
 * Test-only helper: nothing in the app imports it.
 */

import type {
  AlertEvent,
  IrrigationDecision,
  ReportEnvelope,
} from '@agri/api-client/reportsApi';

export interface FakeZone {
  id: number;
  name: string;
}

export const DEFAULT_ZONES: FakeZone[] = [
  { id: 5, name: 'Zone 5' },
  { id: 9, name: 'Zone 9' },
];

export interface FakeReportsServer {
  /** Simulate a deployment whose report tables are not there. */
  degraded: boolean;
  zones: FakeZone[];
  alerts: AlertEvent[];
  decisions: IrrigationDecision[];
  seedAlert: (over?: Partial<AlertEvent>) => AlertEvent;
  seedDecision: (over?: Partial<IrrigationDecision>) => IrrigationDecision;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function makeFakeReportsServer(): FakeReportsServer {
  const server: FakeReportsServer = {
    degraded: false,
    zones: clone(DEFAULT_ZONES),
    alerts: [],
    decisions: [],
    seedAlert(over = {}) {
      const row: AlertEvent = {
        triggered_at: '2026-07-20T10:00:00Z',
        alert_name: 'Gel nocturne',
        condition: 'lt',
        threshold_value: 3,
        observed_value: 1.2,
        unit: '°C',
        sensor_key: 'soil_temperature',
        zone_id: 5,
        notified_channels: ['email'],
        reading_at: '2026-07-20T09:55:00Z',
        ...over,
      };
      server.alerts.push(row);
      return row;
    },
    seedDecision(over = {}) {
      const row: IrrigationDecision = {
        decided_at: '2026-07-20T06:00:00Z',
        zone_id: 5,
        source: 'water_balance',
        irrigate: true,
        reason: 'soil_deficit',
        net_mm: 4.2,
        gross_mm: 5.1,
        volume_m3: 12.7,
        duration_hr: 1.5,
        summary: 'Irriguer 12.7 m³',
        inputs: {
          et0_mm: 5.4,
          etc_mm: 4.9,
          dr_today_mm: 6.1,
          soil_moisture_pct: 21.3,
        },
        ...over,
      };
      server.decisions.push(row);
      return row;
    },
  };
  return server;
}

type Params = Record<string, unknown> | undefined;

/** Newest first, then filter/slice like the real router does. */
function envelope<T extends { zone_id: number | null }>(
  rows: T[],
  params: Params,
  extra: (row: T, p: Record<string, unknown>) => boolean,
  newestKey: (row: T) => string
): ReportEnvelope<T> {
  const p = (params ?? {}) as Record<string, unknown>;
  const sorted = [...rows].sort((a, b) =>
    newestKey(a) < newestKey(b) ? 1 : -1
  );
  const filtered = sorted.filter((row) => {
    if (p.zone_id != null && row.zone_id !== Number(p.zone_id)) return false;
    if (typeof p.start === 'string' && newestKey(row) < p.start) return false;
    if (typeof p.end === 'string' && newestKey(row) > p.end) return false;
    return extra(row, p);
  });
  const limit = p.limit != null ? Number(p.limit) : 50;
  const offset = p.offset != null ? Number(p.offset) : 0;
  const page = filtered.slice(offset, offset + limit);
  return {
    count: filtered.length,
    limit,
    offset,
    schema_available: true,
    results: clone(page),
  };
}

const degradedEnvelope = <T>(params: Params): ReportEnvelope<T> => {
  const p = (params ?? {}) as Record<string, unknown>;
  return {
    count: 0,
    limit: p.limit != null ? Number(p.limit) : 50,
    offset: p.offset != null ? Number(p.offset) : 0,
    schema_available: false,
    results: [],
  };
};

/** Point the mocked axios `get` at `server`. */
export function wireFakeReportsServer(
  server: FakeReportsServer,
  { mockGet }: { mockGet: jest.Mock }
) {
  mockGet.mockImplementation((url: string, config?: { params?: Params }) => {
    const params = config?.params;
    if (url === '/zones') {
      return Promise.resolve({ data: clone(server.zones) });
    }
    if (url === '/reports/alert-events') {
      if (server.degraded) {
        return Promise.resolve({ data: degradedEnvelope<AlertEvent>(params) });
      }
      return Promise.resolve({
        data: envelope(
          server.alerts,
          params,
          (row, p) =>
            typeof p.sensor_key !== 'string' || row.sensor_key === p.sensor_key,
          (row) => row.triggered_at
        ),
      });
    }
    if (url === '/reports/irrigation-decisions') {
      if (server.degraded) {
        return Promise.resolve({
          data: degradedEnvelope<IrrigationDecision>(params),
        });
      }
      return Promise.resolve({
        data: envelope(
          server.decisions,
          params,
          (row, p) => {
            if (typeof p.source === 'string' && row.source !== p.source) {
              return false;
            }
            if (
              typeof p.irrigate === 'boolean' &&
              row.irrigate !== p.irrigate
            ) {
              return false;
            }
            return true;
          },
          (row) => row.decided_at
        ),
      });
    }
    return Promise.reject({
      response: { status: 404, data: { detail: `no fake handler for ${url}` } },
    });
  });
}
