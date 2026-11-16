import { apiAs, expect, test } from './fixtures';

/**
 * Phase 4 — "users from different tenants must never access each other's
 * data", checked at the API with each tenant's own token; plus the
 * technician's read-only scope on the owner it was granted.
 */
const BASIN = {
  name: 'E2E isolation basin',
  source_type: 'BASIN',
  geometry: 'RECTANGULAR',
  max_height_m: 3,
  length_m: 4,
  width_m: 2,
};

test.describe('tenant isolation (API)', () => {
  test('zones and readings stay with their owner', async ({ seed }) => {
    const a = await apiAs(seed.users.a);
    const b = await apiAs(seed.users.b);
    const zonesA = await (await a.get('/zones')).json();
    const zonesB = await (await b.get('/zones')).json();
    const ids = (z: { id: number }[]) => z.map((x) => x.id).sort();
    expect(ids(zonesA)).toEqual(ids(seed.users.a.zones!));
    expect(ids(zonesB)).toEqual(ids(seed.users.b.zones!));

    const zoneA = seed.users.a.zones![0].id;
    const own = await a.get(`/sensors/soilmoisturelow?zone=${zoneA}`);
    expect(own.status()).toBe(200);
    expect((await own.json()).length).toBeGreaterThan(0);

    const foreign = await b.get(`/sensors/soilmoisturelow?zone=${zoneA}`);
    expect([200, 403, 404]).toContain(foreign.status());
    if (foreign.status() === 200) expect(await foreign.json()).toEqual([]);

    const graph = await b.get(`/zones/${zoneA}/active-graph`);
    expect([403, 404]).toContain(graph.status());
  });

  test('sectors and water sources are invisible to another tenant', async ({
    seed,
  }) => {
    const a = await apiAs(seed.users.a);
    const b = await apiAs(seed.users.b);

    const sector = await a.post('/sectors', { data: { name: 'E2E sector A' } });
    expect(sector.status()).toBeLessThan(300);
    const sectorId = (await sector.json()).id;
    const sectorsB = await (await b.get('/sectors')).json();
    expect(JSON.stringify(sectorsB)).not.toContain('E2E sector A');
    const del = await b.delete(`/sectors/${sectorId}`);
    expect([403, 404]).toContain(del.status());

    const src = await a.post('/water-sources', { data: BASIN });
    expect(src.status()).toBe(201);
    const srcId = (await src.json()).id;
    expect(await (await b.get('/water-sources')).json()).toEqual([]);
    for (const res of [
      await b.get(`/water-sources/${srcId}`),
      await b.get(`/water-sources/${srcId}/status`),
      await b.patch(`/water-sources/${srcId}`, { data: { name: 'stolen' } }),
      await b.post(`/water-sources/${srcId}/simulate`, {
        data: { level_m: 1 },
      }),
      await b.delete(`/water-sources/${srcId}`),
    ])
      expect(res.status()).toBe(404);
    expect((await (await a.get(`/water-sources/${srcId}`)).json()).name).toBe(
      BASIN.name
    );
    // Leave farmer A as we found it (the water scenario runs on A too).
    expect((await a.delete(`/water-sources/${srcId}`)).status()).toBe(204);
    // The sector stays: deleting needs access level "admin" and a default
    // farmer is "editor" (RBAC #444); global teardown removes the tenant.
  });

  test('a technician reads only the granted zones and cannot write', async ({
    seed,
  }) => {
    const tech = await apiAs(seed.users.tech);
    const zones = await (await tech.get('/zones')).json();
    // Zone-scoped grant: A1 only, A2 of the same owner stays hidden.
    expect(zones.map((z: { id: number }) => z.id)).toEqual(
      seed.users.tech.zones!.map((z) => z.id)
    );
    const hidden = seed.users.a.zones![1].id;
    const res = await tech.get(`/sensors/soilmoisturelow?zone=${hidden}`);
    expect([200, 403, 404]).toContain(res.status());
    if (res.status() === 200) expect(await res.json()).toEqual([]);
    expect(
      (await tech.post('/sectors', { data: { name: 'x' } })).status()
    ).toBe(403);
    expect((await tech.post('/water-sources', { data: BASIN })).status()).toBe(
      403
    );
  });
});
