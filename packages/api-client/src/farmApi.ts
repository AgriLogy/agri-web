import api from './api';

/** One sensor in a zone: attached (configured) and/or has readings. */
export type Captor = {
  sensor_key: string;
  configured: boolean;
  /** ISO-8601 timestamp of the newest reading, or null if never received. */
  last_received: string | null;
};

export type FarmZone = {
  zone_id: number;
  zone_name: string;
  captors: Captor[];
};

/** A sector (or the `null` "unassigned" bucket) with its zones. */
export type FarmSectorNode = {
  sector_id: number | null;
  sector_name: string | null;
  zones: FarmZone[];
};

export type Sector = { id: number; name: string; zone_count: number };

/**
 * Farm structure + sector management. Backs the farm-visualization page and the
 * "organise zones into sectors" UI. All endpoints are owner-scoped server-side.
 */
export const farmApi = {
  /** Nested sectors → zones → captors (with last-received) for the whole farm. */
  overview: () =>
    api.get<FarmSectorNode[]>('/sectors/overview').then((r) => r.data),

  listSectors: () => api.get<Sector[]>('/sectors').then((r) => r.data),
  createSector: (name: string) =>
    api.post<Sector>('/sectors', { name }).then((r) => r.data),
  renameSector: (id: number, name: string) =>
    api.patch<Sector>(`/sectors/${id}`, { name }).then((r) => r.data),
  deleteSector: (id: number) =>
    api.delete(`/sectors/${id}`).then((r) => r.data),
  /** Set exactly which zones belong to a sector (bulk assign/unassign). */
  setSectorZones: (id: number, zoneIds: number[]) =>
    api
      .put<Sector>(`/sectors/${id}/zones`, { zone_ids: zoneIds })
      .then((r) => r.data),
};
