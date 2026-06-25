/**
 * Self-service weather location: the farmer-picked coordinates the weather
 * dashboard forecast is anchored to. Persisted client-side (localStorage) so it
 * survives reloads without a backend round-trip; SSR-safe (no-op on the server).
 */

const STORAGE_KEY = 'agrilogy_weather_location';

export interface WeatherLocation {
  lat: number;
  lon: number;
  /** User-picked label; when null the coordinates are reverse-geocoded. */
  label: string | null;
}

/** Fired when the saved weather location changes locally. */
export const WEATHER_LOCATION_UPDATED_EVENT =
  'agrilogy-weather-location-updated';

function notifyWeatherLocationChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WEATHER_LOCATION_UPDATED_EVENT));
}

export function readWeatherLocation(): WeatherLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (typeof saved?.lat === 'number' && typeof saved?.lon === 'number') {
      return { lat: saved.lat, lon: saved.lon, label: saved.label ?? null };
    }
    return null;
  } catch {
    /* ignore malformed storage */
    return null;
  }
}

export function writeWeatherLocation(location: WeatherLocation): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    notifyWeatherLocationChanged();
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearWeatherLocation(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyWeatherLocationChanged();
  } catch {
    /* ignore */
  }
}
