/**
 * Invented Open-Meteo forecast for the weather stories (agri-web #195,
 * group B). Dates are built relative to now so the stories never go stale.
 * Values are plausible for an inland Moroccan farm in late autumn; they are
 * not tied to any real place.
 */
import { http, HttpResponse } from 'msw';
import {
  parseOpenMeteoResponse,
  type WeatherData,
} from '@/app/utils/openMeteoResponse';

const pad = (n: number) => String(n).padStart(2, '0');

/** Open-Meteo style local time, e.g. "2026-11-25T14:00" (no zone). */
const localIso = (d: Date, withTime = true) => {
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}` : day;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Raw `GET https://api.open-meteo.com/v1/forecast` body, 48 h + 7 days. */
export function fakeOpenMeteoBody() {
  const today = startOfToday();
  const now = new Date();
  now.setMinutes(0, 0, 0);

  const hours = Array.from({ length: 48 }, (_, i) => {
    const d = new Date(today.getTime() + i * 3600_000);
    const h = d.getHours();
    // Daily cycle: ~8 °C before dawn, ~20 °C mid-afternoon.
    const temp = 14 - 6 * Math.cos(((h - 3) / 24) * 2 * Math.PI);
    const sun = h >= 8 && h <= 17 ? Math.sin(((h - 7) / 11) * Math.PI) : 0;
    return { d, h, temp, sun };
  });

  const days = Array.from(
    { length: 7 },
    (_, i) => new Date(today.getTime() + i * 86_400_000)
  );
  const rainyDay = 3; // one wet day mid-week

  return {
    latitude: 0,
    longitude: 0,
    timezone: 'Africa/Casablanca',
    current: {
      time: localIso(now),
      temperature_2m: 17.4,
      relative_humidity_2m: 58,
      apparent_temperature: 16.1,
      precipitation: 0,
      weather_code: 1,
      wind_speed_10m: 14.2,
      wind_direction_10m: 285,
      wind_gusts_10m: 27.5,
      pressure_msl: 1018.3,
      cloud_cover: 22,
    },
    hourly: {
      time: hours.map((x) => localIso(x.d)),
      temperature_2m: hours.map((x) => round1(x.temp)),
      precipitation_probability: hours.map((x) => (x.h > 18 ? 15 : 5)),
      precipitation: hours.map(() => 0),
      uv_index: hours.map((x) => round1(x.sun * 4.2)),
      wind_speed_10m: hours.map((x) => round1(8 + x.sun * 10)),
      wind_gusts_10m: hours.map((x) => round1(15 + x.sun * 16)),
      relative_humidity_2m: hours.map((x) => Math.round(82 - x.sun * 35)),
      dew_point_2m: hours.map(() => 7.8),
      soil_temperature_6cm: hours.map((x) => round1(11 + x.sun * 6)),
      soil_moisture_3_to_9cm: hours.map(() => 0.21),
      et0_fao_evapotranspiration: hours.map((x) => round1(x.sun * 0.32)),
    },
    daily: {
      time: days.map((d) => localIso(d, false)),
      weather_code: days.map((_, i) =>
        i === rainyDay ? 61 : i === rainyDay + 1 ? 3 : i % 2 ? 1 : 0
      ),
      temperature_2m_max: days.map((_, i) =>
        i === rainyDay ? 15.2 : round1(20 - i * 0.4)
      ),
      temperature_2m_min: days.map((_, i) => round1(8 + (i % 3) * 0.7)),
      sunrise: days.map((d) => `${localIso(d, false)}T07:28`),
      sunset: days.map((d) => `${localIso(d, false)}T17:41`),
      uv_index_max: days.map((_, i) => (i === rainyDay ? 2.1 : 4.3)),
      precipitation_sum: days.map((_, i) =>
        i === rainyDay ? 8.4 : i === rainyDay + 1 ? 1.2 : 0
      ),
      precipitation_probability_max: days.map((_, i) =>
        i === rainyDay ? 85 : i === rainyDay + 1 ? 40 : 5
      ),
      wind_speed_10m_max: days.map((_, i) => (i === rainyDay ? 32 : 18)),
      wind_gusts_10m_max: days.map((_, i) => (i === rainyDay ? 58 : 34)),
      wind_direction_10m_dominant: days.map((_, i) =>
        i === rainyDay ? 250 : 300
      ),
      et0_fao_evapotranspiration: days.map((_, i) =>
        i === rainyDay ? 1.1 : round1(2.6 - i * 0.05)
      ),
      sunshine_duration: days.map((_, i) => (i === rainyDay ? 7200 : 32400)),
    },
  };
}

/** Same forecast, already normalized (what the details modal receives). */
export function fakeWeatherData(): WeatherData {
  const parsed = parseOpenMeteoResponse(true, fakeOpenMeteoBody());
  if (!parsed) throw new Error('fake Open-Meteo body did not parse');
  return parsed;
}

/**
 * A forecast where Open-Meteo left many variables out: every missing value
 * must show "—" instead of crashing.
 */
export function sparseOpenMeteoBody() {
  const full = fakeOpenMeteoBody();
  return {
    current: {
      time: full.current.time,
      temperature_2m: 17.4,
      weather_code: null,
    },
    daily: {
      time: full.daily.time,
      temperature_2m_max: full.daily.temperature_2m_max.map((v, i) =>
        i % 2 ? null : v
      ),
    },
  };
}

/** Open-Meteo's rate-limit answer: no `current`, no `daily`. */
export const openMeteoRateLimited = {
  error: true,
  reason: 'Daily API request limit exceeded. Please try again tomorrow.',
};

/** Invented label for the reverse-geocode call (never a real place). */
export const fakeCity = { city: 'Commune démo' };

/**
 * The three keyless third-party hosts the weather UI calls from the browser.
 * Real hosts must never be reached from Storybook: these answer instead.
 */
export const weatherHandlers = {
  openMeteo: [
    http.get('https://api.open-meteo.com/*', () =>
      HttpResponse.json(fakeOpenMeteoBody())
    ),
  ],
  geocoding: [
    http.get('https://geocoding-api.open-meteo.com/*', () =>
      HttpResponse.json({
        results: [
          {
            id: 1,
            name: 'Commune démo',
            latitude: 0,
            longitude: 0,
            country: 'Maroc',
            admin1: 'Région démo',
          },
        ],
      })
    ),
  ],
  reverseGeocode: [
    http.get('https://api.bigdatacloud.net/*', () =>
      HttpResponse.json(fakeCity)
    ),
  ],
};
