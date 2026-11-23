/**
 * Pure helpers for the KML import dialog and the shape-history list
 * (agri-api#459 phase 3). No React, no next-intl — testable under jest.
 */

import type {
  GeometryRevision,
  KmlImportResult,
} from '@agri/api-client/farmMapApi';
import { isNum } from './insights';

/** Server limit for an uploaded .kml / .kmz. */
export const KML_MAX_BYTES = 2 * 1024 * 1024;
export const KML_ACCEPT =
  '.kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz';

export type KmlFileProblem = 'bad_extension' | 'too_large' | 'empty';

/** Client-side pre-check so an obviously wrong file never hits the API. */
export function checkKmlFile(file: {
  name: string;
  size: number;
}): KmlFileProblem | null {
  if (!/\.(kml|kmz)$/i.test(file.name.trim())) return 'bad_extension';
  if (file.size <= 0) return 'empty';
  if (file.size > KML_MAX_BYTES) return 'too_large';
  return null;
}

export const KML_SKIP_REASONS = [
  'not_a_polygon',
  'invalid_geometry',
  'duplicate_name',
] as const;

/** Total area of the sectors a preview would create (ha), null if unknown. */
export function previewTotalArea(result: KmlImportResult): number | null {
  const areas = result.sectors.map((s) => s.area_ha).filter(isNum);
  if (!areas.length) return null;
  return Math.round(areas.reduce((a, b) => a + b, 0) * 100) / 100;
}

/** Ids the confirmed import created (dry_run=false fills them in). */
export function createdIds(result: KmlImportResult): number[] {
  return result.sectors.map((s) => s.id).filter(isNum);
}

/** `detail` of a 400 (unreadable file), else null. */
export function apiDetail(e: unknown): string | null {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response
    ?.data?.detail;
  return typeof d === 'string' && d.trim() ? d : null;
}

export function httpStatus(e: unknown): number | null {
  const s = (e as { response?: { status?: unknown } })?.response?.status;
  return typeof s === 'number' ? s : null;
}

/** Revisions newest first, whatever order the server used. */
export function sortRevisions(revs: GeometryRevision[]): GeometryRevision[] {
  return [...revs].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
