/**
 * Thin axios wrapper around GET /weather/et-forecast (agrilogy-front #18).
 *
 * Returns a per-day reference-ET0 forecast for a zone. The backend's weather
 * provider is mock-first today (deterministic), so values are stable; a real
 * provider can be swapped server-side without any frontend change.
 *
 * Pure display helpers (peakEtDay / totalEtMm) live in
 * apps/web/src/app/lib/etForecast.ts so they're unit-testable without axios.
 */

import api from './api';

export interface EtForecastDay {
  /** ISO date, e.g. "2026-07-01". */
  date: string;
  /** Reference ET0 for the day, mm. */
  et0_mm: number;
}

export interface EtForecastResponse {
  zone_id: number;
  /** Which provider served this — "mock" until a real one is wired. */
  provider: string;
  days: EtForecastDay[];
}

/** Fetch the N-day ET0 forecast for a zone (default 7, backend clamps to 14). */
export async function getEtForecast(
  zoneId: number,
  days = 7
): Promise<EtForecastResponse> {
  const res = await api.get<EtForecastResponse>('/weather/et-forecast', {
    params: { zone_id: zoneId, days },
  });
  return res.data;
}
