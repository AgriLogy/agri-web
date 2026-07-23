/**
 * Read-only history endpoints for the Reports / Historique page (agri-web #102,
 * RPT-1): the alert events that fired and the irrigation decisions the engine
 * took, both owner-scoped server-side.
 *
 * Keep in sync with agri-api `fastapp/routers/reports.py`.
 *
 * Both endpoints share one envelope shape ({@link ReportEnvelope}): a page of
 * `results` (newest first) plus the paging counters and a `schema_available`
 * flag. The tables that back these endpoints exist in production, but the flag
 * is honoured so the UI degrades honestly if they are ever absent — see
 * {@link reportsModel}'s availability detection rather than treating an empty
 * page as proof the feature works.
 *
 * This module is a thin axios wrapper only: every rule about turning the page's
 * filters into query params, splitting a decision's outcome from its
 * water-balance inputs, and formatting values lives in the dependency-free
 * `reportsModel.ts` so it stays unit-testable.
 */
import api from './api';

/** The common paging envelope both report endpoints answer with. */
export interface ReportEnvelope<T> {
  /** Total rows matching the filter (across all pages), for the pager. */
  count: number;
  limit: number;
  offset: number;
  /**
   * `false` only when the backing tables are not deployed. In that window the
   * server also returns an empty `results`, so an empty page is NOT proof the
   * feature is healthy — the UI must read this flag to tell the two apart.
   */
  schema_available: boolean;
  results: T[];
}

/** One row of the alert-event history. */
export interface AlertEvent {
  /** When the rule fired (ISO-8601, UTC). */
  triggered_at: string;
  /** The rule's human name, e.g. "Gel nocturne". */
  alert_name: string;
  /** The comparison that tripped, e.g. "lt" / "gt" (enum, translated in UI). */
  condition: string;
  threshold_value: number | null;
  observed_value: number | null;
  unit: string | null;
  sensor_key: string;
  zone_id: number | null;
  /** Channels the notification went out on, e.g. ["email", "whatsapp"]. */
  notified_channels: string[];
  /** When the reading that tripped the rule was taken (ISO-8601, UTC). */
  reading_at: string | null;
}

/**
 * The water-balance inputs behind one irrigation decision. Open-ended on
 * purpose — agri-api may add terms — so besides the known columns any extra
 * numeric field is preserved and rendered in the detail view.
 */
export interface IrrigationDecisionInputs {
  et0_mm?: number | null;
  etc_mm?: number | null;
  dr_today_mm?: number | null;
  soil_moisture_pct?: number | null;
  [key: string]: number | null | undefined;
}

/** One row of the irrigation-decision history. */
export interface IrrigationDecision {
  /** When the decision was taken (ISO-8601, UTC). */
  decided_at: string;
  zone_id: number | null;
  /** What drove the decision, e.g. "water_balance" / "manual" / "scheduled". */
  source: string;
  irrigate: boolean;
  /** Machine reason enum, e.g. "sufficient_moisture" (translated in UI). */
  reason: string;
  net_mm: number | null;
  gross_mm: number | null;
  volume_m3: number | null;
  duration_hr: number | null;
  /** Free-text one-line summary the backend composed. */
  summary: string;
  /** The water-balance terms — shown behind an expandable detail, not columns. */
  inputs: IrrigationDecisionInputs | null;
}

/**
 * Query params for `/reports/alert-events`, already in the snake_case shape the
 * router expects. Built from the page's filters by
 * `buildAlertEventParams` in `reportsModel.ts` — this type is only the wire
 * contract, so empty filters must be dropped before they reach here.
 */
export interface AlertEventQuery {
  start?: string;
  end?: string;
  zone_id?: number;
  sensor_key?: string;
  limit?: number;
  offset?: number;
}

/** Query params for `/reports/irrigation-decisions`. */
export interface IrrigationDecisionQuery {
  start?: string;
  end?: string;
  zone_id?: number;
  source?: string;
  irrigate?: boolean;
  limit?: number;
  offset?: number;
}

export const reportsApi = {
  /** A page of fired-alert history, newest first. */
  alertEvents: (
    params: AlertEventQuery = {}
  ): Promise<ReportEnvelope<AlertEvent>> =>
    api
      .get<ReportEnvelope<AlertEvent>>('/reports/alert-events', { params })
      .then((r) => r.data),

  /** A page of irrigation-decision history, newest first. */
  irrigationDecisions: (
    params: IrrigationDecisionQuery = {}
  ): Promise<ReportEnvelope<IrrigationDecision>> =>
    api
      .get<ReportEnvelope<IrrigationDecision>>('/reports/irrigation-decisions', {
        params,
      })
      .then((r) => r.data),
};
