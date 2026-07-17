/**
 * Unit tests for the device-map helpers (MAP-1 step 4b). Pure functions — no
 * network, no Mapbox. The map render itself is exercised in the browser.
 */
import {
  devicesWithCoords,
  devicesToGeoJSON,
  type MyDevice,
} from '@agri/api-client/myDevicesApi';

const dev = (over: Partial<MyDevice>): MyDevice => ({
  id: 1,
  device_type: 'lora',
  serial: 'S1',
  name: 'Sensor',
  zone: null,
  latitude: null,
  longitude: null,
  ...over,
});

describe('devicesWithCoords', () => {
  it('keeps only devices that have finite lat/long', () => {
    const list = [
      dev({ id: 1, latitude: 33.5, longitude: -7.5 }),
      dev({ id: 2, latitude: null, longitude: -7.5 }), // no lat
      dev({ id: 3, latitude: 34, longitude: null }), // no lon
      dev({ id: 4, latitude: 35.1, longitude: -6.2 }),
    ];
    expect(devicesWithCoords(list).map((d) => d.id)).toEqual([1, 4]);
  });
});

describe('devicesToGeoJSON', () => {
  it('builds Point features [lng, lat] only for located devices', () => {
    const fc = devicesToGeoJSON([
      dev({ id: 1, name: 'A', serial: 'SA', latitude: 33.5, longitude: -7.5 }),
      dev({ id: 2, latitude: null, longitude: null }),
    ]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(1);
    const f = fc.features[0];
    expect(f.geometry).toEqual({ type: 'Point', coordinates: [-7.5, 33.5] });
    expect(f.properties?.name).toBe('A');
    expect(f.properties?.serial).toBe('SA');
  });

  it('falls back to the serial when the device has no name', () => {
    const fc = devicesToGeoJSON([
      dev({ name: '', serial: 'SN-9', latitude: 1, longitude: 2 }),
    ]);
    expect(fc.features[0].properties?.name).toBe('SN-9');
  });

  it('returns an empty collection when nothing is located', () => {
    expect(devicesToGeoJSON([dev({})]).features).toEqual([]);
  });
});
