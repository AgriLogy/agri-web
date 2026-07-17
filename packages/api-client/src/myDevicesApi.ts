/**
 * The caller's own registered devices with their GPS coordinates, for plotting
 * each sensor at its real location on the farmer map (MAP-1). Backed by the
 * farmer-scoped `GET /my-devices` endpoint (agri-api).
 */
import api from './api';

export interface MyDevice {
  id: number;
  device_type: string;
  serial: string;
  name: string;
  zone: number | null;
  /** WGS-84 decimal degrees; null until an admin captures the device's position. */
  latitude: number | null;
  longitude: number | null;
}

export const myDevicesApi = {
  list: (): Promise<MyDevice[]> =>
    api.get<MyDevice[]>('/my-devices').then((r) => r.data),
};

/** Devices that actually have a plottable position. */
export function devicesWithCoords(devices: MyDevice[]): MyDevice[] {
  return devices.filter(
    (d) =>
      typeof d.latitude === 'number' &&
      typeof d.longitude === 'number' &&
      Number.isFinite(d.latitude) &&
      Number.isFinite(d.longitude)
  );
}

/** Build a GeoJSON FeatureCollection for the device markers layer. */
export function devicesToGeoJSON(
  devices: MyDevice[]
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: devicesWithCoords(devices).map((d) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [d.longitude as number, d.latitude as number],
      },
      properties: {
        id: d.id,
        name: d.name || d.serial,
        serial: d.serial,
        device_type: d.device_type,
        zone: d.zone,
      },
    })),
  };
}
