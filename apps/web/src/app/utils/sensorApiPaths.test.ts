import {
  getSensorEndpointSpec,
  hasSensorEndpoint,
  listSensorEndpointPaths,
} from '@agri/sensor-catalog';

/**
 * Slugs agri-api serves on `GET /sensors/{slug}` (fastapp/sensors.py
 * SENSOR_SPEC). Every path the catalog requests must be one of them, or the
 * page fires a guaranteed 404 (QA tour, A6).
 */
const API_SLUGS = new Set([
  'precipitationrate',
  'humidityweather',
  'windspeed',
  'solarradiation',
  'pressureweather',
  'winddirection',
  'temperatureweather',
  'ecsoilmedium',
  'soiltemperaturemedium',
  'ecsoilhigh',
  'ecsoillow',
  'soilmoisturemedium',
  'soilmoisturehigh',
  'soilmoisturelow',
  'phsoil',
  'soiltemperaturelow',
  'soiltemperaturehigh',
  'waterflow',
  'waterec',
  'phwater',
  'electricityconsumption',
  'leafmoisture',
  'multidepthsoilmoisture',
  'largefruitdiameter',
  'waterlevel',
  'soilconductivity',
  'et0weather',
  'et0calculated',
  'vpdweather',
  'leaftemperature',
  'soilsalinity',
  'npk',
  'fruitsize',
  'ecsalinity',
  'waterpressure',
  'battery',
  'signal',
  'forage',
]);

describe('sensor catalog endpoint paths (A6)', () => {
  it('only requests slugs agri-api actually serves', () => {
    const unknown = listSensorEndpointPaths().filter(
      (p) => !API_SLUGS.has(p.replace(/^\/sensors\//, ''))
    );
    expect(unknown).toEqual([]);
  });

  it('reads VPD from /sensors/vpdweather', () => {
    expect(getSensorEndpointSpec('vpd')).toEqual({
      kind: 'single',
      path: '/sensors/vpdweather',
    });
  });

  it.each(['wind_gust', 'irrigation_cumulative'])(
    'marks %s unavailable (no API slug) instead of requesting it',
    (key) => {
      expect(getSensorEndpointSpec(key)).toEqual({ kind: 'unavailable' });
      expect(hasSensorEndpoint(key)).toBe(false);
    }
  );

  it('still reports real keys as available', () => {
    expect(hasSensorEndpoint('wind_speed')).toBe(true);
    expect(hasSensorEndpoint('et0')).toBe(true);
    expect(hasSensorEndpoint('npk_n')).toBe(true);
    expect(hasSensorEndpoint('not_a_key')).toBe(false);
  });
});
