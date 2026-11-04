import type { SensorInstallation } from '@agri/api-client/farmMapApi';
import {
  applyStatusToFeatures,
  BASEMAPS,
  boundsOf,
  DEFAULT_SENSOR_KEY,
  formatArea,
  formatPerimeter,
  formatReading,
  GeoJSONImportError,
  installationToFeature,
  isBasemap,
  legacySensorsToWrites,
  parseSectorImport,
  readingAge,
  sectorsToGeoJSON,
  statusColorExpression,
  STATUS_COLORS,
} from './mapModel';

const poly: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-7, 32],
      [-6.99, 32],
      [-6.99, 32.01],
      [-7, 32.01],
      [-7, 32],
    ],
  ],
};

const inst = (over: Partial<SensorInstallation> = {}): SensorInstallation => ({
  id: 5,
  name: 'SM-01',
  sensor_type: 'soil_moisture',
  sensor_key: 'soil_moisture_medium',
  latitude: 32.005,
  longitude: -6.995,
  sector_id: 3,
  zone_id: null,
  device_id: null,
  installation_depth_cm: null,
  model: null,
  serial_number: null,
  node_id: null,
  installation_date: null,
  calibration_profile: null,
  notes: null,
  maintenance_status: null,
  client_ref: null,
  created_at: null,
  updated_at: null,
  ...over,
});

describe('basemaps', () => {
  it('uses Mapbox Standard Satellite for both satellite options', () => {
    expect(BASEMAPS.satellite_labels.style).toBe(
      'mapbox://styles/mapbox/standard-satellite'
    );
    expect(BASEMAPS.satellite.style).toBe(BASEMAPS.satellite_labels.style);
    expect(BASEMAPS.satellite.config?.showPlaceLabels).toBe(false);
    expect(BASEMAPS.satellite_labels.config?.showPlaceLabels).toBe(true);
  });

  it('validates basemap ids', () => {
    expect(isBasemap('streets')).toBe(true);
    expect(isBasemap('google')).toBe(false);
  });
});

describe('status colours', () => {
  it('follows the spec palette', () => {
    expect(STATUS_COLORS.normal).toMatch(/^#/);
    expect(STATUS_COLORS.no_data).toBe(STATUS_COLORS.unlinked);
    const expr = statusColorExpression();
    expect(expr[0]).toBe('match');
    expect(expr).toContain('critical');
    // falls back to grey for an unknown status
    expect(expr[expr.length - 1]).toBe(STATUS_COLORS.no_data);
  });
});

describe('formatReading / readingAge', () => {
  it('formats values with their unit and sensible precision', () => {
    expect(formatReading({ value: 12.345, unit: '%', timestamp: '' })).toBe(
      '12.3 %'
    );
    expect(formatReading({ value: 3.712, unit: 'V', timestamp: '' })).toBe(
      '3.71 V'
    );
    expect(formatReading({ value: 1013.4, unit: 'hPa', timestamp: '' })).toBe(
      '1013 hPa'
    );
  });

  it('never invents a value', () => {
    expect(formatReading(null)).toBeNull();
    expect(formatReading({ value: null, unit: '%', timestamp: '' })).toBeNull();
  });

  it('buckets reading age', () => {
    const now = Date.parse('2026-11-04T12:00:00Z');
    expect(readingAge('2026-11-04T11:55:00Z', now)).toEqual({
      value: 5,
      unit: 'minute',
    });
    expect(readingAge('2026-11-04T09:00:00Z', now)).toEqual({
      value: 3,
      unit: 'hour',
    });
    expect(readingAge('2026-11-01T12:00:00Z', now)).toEqual({
      value: 3,
      unit: 'day',
    });
    expect(readingAge(null, now)).toBeNull();
    expect(readingAge('garbage', now)).toBeNull();
  });
});

describe('installation features + status', () => {
  it('maps a server row to a map feature in its sector', () => {
    const f = installationToFeature(
      inst(),
      new Map([[3, 'draw-3']]),
      new Map([[3, 'Block A']])
    );
    expect(f.id).toBe('5');
    expect(f.geometry.coordinates).toEqual([-6.995, 32.005]);
    expect(f.properties).toMatchObject({
      zoneId: 'draw-3',
      zoneName: 'Block A',
      status: 'no_data',
    });
  });

  it('marks sensors without a reading stream as unlinked', () => {
    const f = installationToFeature(
      inst({ sensor_key: null }),
      new Map(),
      new Map()
    );
    expect(f.properties.status).toBe('unlinked');
    expect(f.properties.zoneId).toBe('');
  });

  it('copies live status and formatted value onto features', () => {
    const f = installationToFeature(inst(), new Map(), new Map());
    applyStatusToFeatures(
      [f],
      [
        {
          id: 5,
          status: 'normal',
          latest: { value: 21.5, unit: '%', timestamp: '2026-11-04T11:00:00Z' },
          battery: null,
          signal: null,
          alerts: [],
        },
      ]
    );
    expect(f.properties.status).toBe('normal');
    expect(f.properties.valueText).toBe('21.5 %');
  });
});

describe('boundsOf', () => {
  it('spans polygons and points', () => {
    expect(
      boundsOf([poly, { type: 'Point', coordinates: [-6.5, 31.9] }])
    ).toEqual([
      [-7, 31.9],
      [-6.5, 32.01],
    ]);
  });

  it('is null when nothing is drawn', () => {
    expect(boundsOf([])).toBeNull();
    expect(boundsOf([null, undefined])).toBeNull();
  });
});

describe('area / perimeter formatting', () => {
  it('formats hectares and metres', () => {
    expect(formatArea(6.4213)).toBe('6.42 ha');
    expect(formatArea(12.34)).toBe('12.3 ha');
    expect(formatArea(null)).toBeNull();
    expect(formatPerimeter(812.6)).toBe('813 m');
    expect(formatPerimeter(2450)).toBe('2.45 km');
  });
});

describe('GeoJSON import / export', () => {
  it('exports only drawn sectors with their details', () => {
    const fc = sectorsToGeoJSON([
      {
        id: 1,
        name: 'A',
        zone_count: 0,
        geometry: poly,
        area_ha: 1.2,
        crop: 'Avocado',
      },
      { id: 2, name: 'B', zone_count: 0, geometry: null },
    ]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties).toMatchObject({
      name: 'A',
      crop: 'Avocado',
    });
  });

  it('round-trips an export', () => {
    const text = JSON.stringify(
      sectorsToGeoJSON([
        { id: 1, name: 'A', zone_count: 0, geometry: poly, color: '#16a34a' },
      ])
    );
    expect(parseSectorImport(text)).toEqual([
      { name: 'A', geometry: poly, color: '#16a34a' },
    ]);
  });

  it('accepts a bare polygon and names it', () => {
    const [s] = parseSectorImport(JSON.stringify(poly));
    expect(s.name).toBe('Secteur importé 1');
  });

  it('skips non-polygon features and rejects files with none', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
      ],
    };
    expect(() => parseSectorImport(JSON.stringify(fc))).toThrow(
      GeoJSONImportError
    );
    expect(() => parseSectorImport('{not json')).toThrow(GeoJSONImportError);
    expect(() => parseSectorImport('{"type":"Topology"}')).toThrow(
      GeoJSONImportError
    );
  });
});

describe('legacySensorsToWrites', () => {
  it('converts browser-stored sensors, keeping their id as client_ref', () => {
    const writes = legacySensorsToWrites(
      {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'sensor-1-abc',
            properties: {
              name: 'Humidité sol 1',
              sensorType: 'soil_moisture',
              zoneId: 'old-sector',
            },
            geometry: { type: 'Point', coordinates: [-6.9, 32.9] },
          },
          {
            type: 'Feature',
            id: 'bad',
            properties: {},
            geometry: { type: 'Point', coordinates: [NaN, 0] },
          },
        ],
      },
      new Map([['old-sector', 42]])
    );
    expect(writes).toEqual([
      {
        name: 'Humidité sol 1',
        sensor_type: 'soil_moisture',
        sensor_key: DEFAULT_SENSOR_KEY.soil_moisture,
        latitude: 32.9,
        longitude: -6.9,
        sector_id: 42,
        client_ref: 'sensor-1-abc',
      },
    ]);
  });

  it('handles a missing collection', () => {
    expect(legacySensorsToWrites(null, new Map())).toEqual([]);
  });
});
