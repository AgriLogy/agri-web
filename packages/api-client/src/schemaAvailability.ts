/**
 * One mechanism for "this feature's tables are not deployed yet".
 *
 * Several agri-web features ship ahead of their agri-db migration. agri-api
 * answers them the same way in that window: reads degrade to an empty/default
 * answer (indistinguishable from "nothing configured"), and WRITES are refused
 * with 400 whose `detail` names the missing table and the migration to apply.
 *
 * Extracted from `sensorGroupModel.ts` (agri-web #95) when per-sensor
 * calibration (#97) needed exactly the same thing — generalised rather than
 * duplicated, so a change of wording is handled in one place.
 */

/** Whether a feature can actually be persisted on this deployment. */
export type SchemaAvailability = 'available' | 'unavailable' | 'unknown';

/** Best-effort read of the server's `detail` string, whatever shape it took. */
export function errorDetail(error: unknown): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string') return data;
  const detail = (data as { detail?: unknown })?.detail;
  if (typeof detail === 'string') return detail;
  return '';
}

export function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

/**
 * Does this rejection mean "the schema for this feature is not deployed"?
 *
 * Decided from the server's own words rather than assumed: only a 400 whose
 * detail contains one of `markers` (the migration revision, or a table name)
 * counts. An ordinary 400 — duplicate name, `scale_a = 0` — is left alone, so
 * a real validation error is never mistaken for a missing migration.
 */
export function isSchemaUnavailableError(
  error: unknown,
  markers: string[]
): boolean {
  if (errorStatus(error) !== 400) return false;
  const detail = errorDetail(error).toLowerCase();
  if (!detail) return false;
  return markers.some((marker) => detail.includes(marker.toLowerCase()));
}

/**
 * Classify the outcome of a side-effect-free probe call.
 *
 * A reply that reached the router at all (404 not-found, 403 read-only, 400
 * for another reason) proves the tables are there. Anything else — network
 * down, 5xx, a 401 already handled by the axios interceptor — stays `unknown`
 * so the UI does not accuse the backend of being broken.
 */
export function classifyProbeError(
  error: unknown,
  markers: string[]
): SchemaAvailability {
  if (isSchemaUnavailableError(error, markers)) return 'unavailable';
  const status = errorStatus(error);
  if (status === 404 || status === 403 || status === 400) return 'available';
  return 'unknown';
}
