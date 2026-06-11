/**
 * v1 notification decision rules (ET0, soil humidity, Kc, thresholds).
 * @see docs/NOTIFICATION_ENGINE_V1.md
 */

export type NotificationDecisionLevel = 'ok' | 'advisory' | 'critical';

export interface NotificationThresholds {
  /** Soil humidity % — at or below → critical (irrigation stress). */
  humidityCriticalPct: number;
  /** ET0×Kc (mm) — at or above → advisory (elevated crop water demand). */
  et0KcAdvisoryMm: number;
}

export interface DecisionEngineInput {
  et0Mm: number;
  soilHumidityPct: number;
  kc: number;
  thresholds: NotificationThresholds;
}

export interface DecisionEngineResult {
  decision: NotificationDecisionLevel;
  et0TimesKc: number;
  logs: string[];
  rulesFired: string[];
}

export const DEFAULT_NOTIFICATION_THRESHOLDS: NotificationThresholds = {
  humidityCriticalPct: 20,
  et0KcAdvisoryMm: 4,
};

const EPS = 1e-6;

export function parseNumericSensor(
  raw: string | number | undefined | null
): number {
  if (raw == null) return NaN;
  if (typeof raw === 'number') return raw;
  const n = parseFloat(
    String(raw)
      .replace(',', '.')
      .replace(/[^\d.-]/g, '')
  );
  return Number.isFinite(n) ? n : NaN;
}

export function evaluateV1NotificationDecision(
  input: DecisionEngineInput
): DecisionEngineResult {
  const logs: string[] = [];
  const rulesFired: string[] = [];
  const { et0Mm, soilHumidityPct, kc, thresholds } = input;

  logs.push(
    `[v1] inputs: ET0=${et0Mm} mm, soil_humidity=${soilHumidityPct} %, Kc=${kc}`
  );
  logs.push(
    `[v1] thresholds: humidity_critical<=${thresholds.humidityCriticalPct} %, et0_kc_advisory>=${thresholds.et0KcAdvisoryMm} mm`
  );

  const et0TimesKc = et0Mm * kc;
  logs.push(`[v1] derived: ET0×Kc=${et0TimesKc.toFixed(4)} mm`);

  if (
    !Number.isFinite(et0Mm) ||
    !Number.isFinite(soilHumidityPct) ||
    !Number.isFinite(kc)
  ) {
    rulesFired.push('R0_invalid_numeric_input');
    logs.push('[v1] R0: non-finite input → advisory (cannot classify)');
    return {
      decision: 'advisory',
      et0TimesKc: Number.isFinite(et0TimesKc) ? et0TimesKc : NaN,
      logs,
      rulesFired,
    };
  }

  if (soilHumidityPct <= thresholds.humidityCriticalPct + EPS) {
    rulesFired.push('R1_humidity_at_or_below_critical');
    logs.push(
      `[v1] R1: soil humidity ${soilHumidityPct} <= ${thresholds.humidityCriticalPct} → critical`
    );
    return { decision: 'critical', et0TimesKc, logs, rulesFired };
  }

  if (et0TimesKc >= thresholds.et0KcAdvisoryMm - EPS) {
    rulesFired.push('R2_et0_kc_above_advisory');
    logs.push(
      `[v1] R2: ET0×Kc ${et0TimesKc.toFixed(4)} >= ${thresholds.et0KcAdvisoryMm} → advisory`
    );
    return { decision: 'advisory', et0TimesKc, logs, rulesFired };
  }

  rulesFired.push('R3_nominal');
  logs.push('[v1] R3: within bounds → ok');
  return { decision: 'ok', et0TimesKc, logs, rulesFired };
}

export function logDecisionToConsole(
  result: DecisionEngineResult,
  context?: string
): void {
  const prefix = context
    ? `[notification-engine] ${context}`
    : '[notification-engine]';
  result.logs.forEach((line) => console.info(prefix, line));
}
