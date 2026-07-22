/**
 * Unit tests for the `notificationZoneId` field added to the locally stored
 * zone notification config (agri-web #62).
 *
 * The field must survive a save -> read round-trip (otherwise editing a config
 * bound to a custom notification zone would silently fall back to a farm zone),
 * and configs written BEFORE the field existed must keep loading unchanged.
 */

import {
  getAllZoneNotificationConfigs,
  getNotificationConfigById,
  getNotificationConfigsForZone,
  saveZoneNotificationConfig,
  type ZoneNotificationConfig,
} from '@agri/api-client/zoneNotificationConfigStorage';

const STORAGE_KEY = 'agrilogy_zone_notification_configs_v1';

function makeConfig(
  over: Partial<ZoneNotificationConfig> = {}
): ZoneNotificationConfig {
  return {
    configId: 'cfg-1',
    zoneId: 4,
    secteurLabel: 'Secteur A',
    notificationName: 'Oliviers',
    soilType: 'light',
    soilTawMm: 100,
    soilRawMm: 50,
    soilFcPct: 30,
    soilWpPct: 12,
    soilMoistureSource: 'soil_moisture_medium',
    kcMode: 'manual',
    kc: 0.9,
    kcProtocolName: '',
    kcStages: [],
    kcSensorHumidityLow: false,
    kcSensorHumidityMid: true,
    kcSensorHumidityHigh: false,
    et0Source: 'calculated',
    precipSource: 'weather_station',
    krFactor: 1,
    zoneAreaHa: 2,
    cropType: 'olive',
    flowRateM3h: 12,
    irrigationMethod: 'drip',
    intervalMinutes: 60,
    deliveryRate: { amount: 1, unit: 'hour' },
    soilPermeabilityPct: 40,
    valveMode: 'manual',
    vpdThresholdKpa: 1.2,
    rootMonitoring: 'off',
    criticalThresholdPct: 25,
    et0KcAdvisoryMm: 4,
    maxWaterM3: 500,
    notifyEmail: false,
    notifySms: false,
    notifyWhatsapp: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('zoneNotificationConfigStorage — notificationZoneId round-trip', () => {
  it('persists notificationZoneId alongside the derived farm zoneId', () => {
    saveZoneNotificationConfig(
      makeConfig({ configId: 'cfg-notif', zoneId: 4, notificationZoneId: 9 })
    );

    const read = getNotificationConfigById('cfg-notif');
    expect(read).toBeDefined();
    expect(read!.notificationZoneId).toBe(9);
    // The farm zone the sensors resolve to is kept independently.
    expect(read!.zoneId).toBe(4);
    // Still indexed by the farm zone, so the existing per-zone lookups work.
    expect(getNotificationConfigsForZone(4).map((c) => c.configId)).toEqual([
      'cfg-notif',
    ]);
  });

  it('keeps an explicit null when the user picked a farm zone', () => {
    saveZoneNotificationConfig(
      makeConfig({ configId: 'cfg-farm', notificationZoneId: null })
    );
    expect(
      getNotificationConfigById('cfg-farm')!.notificationZoneId
    ).toBeNull();
  });

  it('survives a raw localStorage round-trip (JSON serialisable)', () => {
    saveZoneNotificationConfig(
      makeConfig({ configId: 'cfg-json', notificationZoneId: 42 })
    );
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
    expect(raw['cfg-json'].notificationZoneId).toBe(42);
  });

  it('reads back a config saved BEFORE the field existed (back-compat)', () => {
    // Simulate a pre-#62 payload: no `notificationZoneId` key at all.
    const legacy = {
      ...makeConfig({ configId: 'cfg-legacy', zoneId: 2 }),
    } as unknown as Record<string, unknown>;
    delete legacy.notificationZoneId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'cfg-legacy': legacy }));

    const read = getNotificationConfigById('cfg-legacy');
    expect(read).toBeDefined();
    expect(read!.zoneId).toBe(2);
    expect(read!.notificationZoneId).toBeUndefined();
    expect(getAllZoneNotificationConfigs()).toHaveLength(1);
  });

  it('lets an edit attach a notification zone to a legacy config', () => {
    const legacy = {
      ...makeConfig({ configId: 'cfg-upgrade' }),
    } as unknown as Record<string, unknown>;
    delete legacy.notificationZoneId;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 'cfg-upgrade': legacy })
    );

    const loaded = getNotificationConfigById('cfg-upgrade')!;
    saveZoneNotificationConfig({ ...loaded, notificationZoneId: 3 });

    expect(getNotificationConfigById('cfg-upgrade')!.notificationZoneId).toBe(
      3
    );
  });
});
