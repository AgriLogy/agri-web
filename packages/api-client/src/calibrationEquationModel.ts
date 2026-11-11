/**
 * Pure logic behind EQUATION calibration (agri-api #460).
 *
 * The general way to calibrate a sensor: the technician writes the
 * calibration equation in `x` — the value the sensor CAPTURED — and gives
 * reference points `(captured, real)`: what the sensor said next to what a
 * reference instrument / certified standard said. Every name in the equation
 * other than `x` is a coefficient, fitted by the SERVER (least squares,
 * agri-core `fit_equation`) so the curve passes as close as possible to the
 * points.
 *
 * Examples: `a*x + b` (linear), `a*x^2 + b*x + c` (soil-moisture curve),
 * `a*exp(b*x)`, `(x - 4) / 16 * 100` (4-20 mA → %, nothing to fit),
 * `(x + a) % 360` (wind-vane offset).
 *
 * The parser, the fit and the evaluation are NOT ported here on purpose:
 * agri-core is the single implementation, reached through
 * `POST /sensor-calibrations/fit`. A second parser in the browser could
 * accept an equation the server refuses (or compute a different preview).
 * This module only holds what the form needs: presets, the light coefficient
 * name scan that labels inputs before the first fit, and point parsing.
 *
 * Dependency-free so it is unit-testable without a DOM or next-intl.
 */

/** The captured (raw) value inside an equation. */
export const EQUATION_VARIABLE = 'x';

/** Mirrors agri-core `FUNCTIONS` + `CONSTANTS` — names that are NOT coefficients. */
export const EQUATION_RESERVED_NAMES: readonly string[] = [
  'x',
  'pi',
  'e',
  'sqrt',
  'exp',
  'ln',
  'log',
  'log10',
  'log2',
  'abs',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'radians',
  'degrees',
  'floor',
  'ceil',
  'round',
  'pow',
  'min',
  'max',
];

export interface EquationPreset {
  /** Stable id, also the i18n key suffix (`settings.calibration.presets.<id>`). */
  id: string;
  equation: string;
  /** Starting values that make the non-linear presets converge. */
  initial?: Record<string, number>;
}

export const EQUATION_PRESETS: readonly EquationPreset[] = [
  { id: 'linear', equation: 'a*x + b' },
  { id: 'offset', equation: 'x + b' },
  { id: 'quadratic', equation: 'a*x^2 + b*x + c' },
  { id: 'cubic', equation: 'a*x^3 + b*x^2 + c*x + d' },
  { id: 'exponential', equation: 'a*exp(b*x)', initial: { a: 1, b: 0.01 } },
  { id: 'power', equation: 'a*x^b', initial: { a: 1, b: 1 } },
  { id: 'logarithmic', equation: 'a*ln(x) + b' },
  { id: 'current420', equation: '(x - 4) / 16 * span + zero' },
  { id: 'circular', equation: '(x + a) % 360', initial: { a: 0 } },
];

/**
 * Coefficient names in `equation`, in order of first appearance — the order
 * agri-core reports them in. A light scan (identifiers minus reserved names),
 * used only to label the coefficient inputs before the server has answered;
 * the server's `coefficient_names` replaces it after every fit.
 */
export function scanCoefficientNames(equation: string): string[] {
  const names: string[] = [];
  const reserved = new Set(EQUATION_RESERVED_NAMES);
  // Skip numbers like 1e-5 so their `e` is not read as an identifier.
  const stripped = (equation ?? '').replace(
    /\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?/g,
    ' '
  );
  for (const match of stripped.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
    const name = match[0];
    if (!reserved.has(name) && !names.includes(name)) names.push(name);
  }
  return names;
}

/** One editable row of the reference-point table (raw text, not numbers). */
export interface ReferencePointDraft {
  captured: string;
  real: string;
}

export interface ReferencePoint {
  captured: number;
  real: number;
}

export interface ParsedReferencePoints {
  points: ReferencePoint[];
  /** 0-based indexes of rows that are half-filled or not numbers. */
  invalidRows: number[];
}

const parseNumber = (text: string): number | null => {
  // Accept a decimal comma — French/Arabic keyboards type 12,5.
  const normalised = text.trim().replace(',', '.');
  if (normalised === '') return null;
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
};

/**
 * Turn the table into points. Fully empty rows are ignored (the trailing
 * "add a row" line); a row with only one side, or a non-number, is reported
 * so the form can flag it instead of silently dropping a measurement.
 */
export function parseReferencePoints(
  rows: readonly ReferencePointDraft[]
): ParsedReferencePoints {
  const points: ReferencePoint[] = [];
  const invalidRows: number[] = [];
  rows.forEach((row, index) => {
    const capturedBlank = row.captured.trim() === '';
    const realBlank = row.real.trim() === '';
    if (capturedBlank && realBlank) return;
    const captured = parseNumber(row.captured);
    const real = parseNumber(row.real);
    if (captured == null || real == null) {
      invalidRows.push(index);
      return;
    }
    points.push({ captured, real });
  });
  return { points, invalidRows };
}

export function referencePointsToDrafts(
  points: readonly ReferencePoint[] | null | undefined
): ReferencePointDraft[] {
  return (points ?? []).map((p) => ({
    captured: String(p.captured),
    real: String(p.real),
  }));
}

/** Why an equation draft cannot be fitted/saved yet. `null` = it can. */
export type EquationDraftError =
  | 'equationEmpty'
  | 'equationNoVariable'
  | 'invalidPoints'
  | 'notEnoughPoints'
  | 'coefficientMissing';

export interface EquationDraft {
  equation: string;
  points: ReferencePointDraft[];
  /** Coefficient text inputs — used when there are no points to fit from. */
  coefficients: Record<string, string>;
}

/**
 * Client-side gate mirroring what agri-api refuses, so the reason shows next
 * to the field. The SERVER remains the judge of the equation's syntax.
 */
export function validateEquationDraft(
  draft: EquationDraft
): EquationDraftError | null {
  const equation = draft.equation.trim();
  if (!equation) return 'equationEmpty';
  if (!/(^|[^A-Za-z0-9_])x([^A-Za-z0-9_]|$)/.test(equation)) {
    return 'equationNoVariable';
  }
  const { points, invalidRows } = parseReferencePoints(draft.points);
  if (invalidRows.length > 0) return 'invalidPoints';
  const names = scanCoefficientNames(equation);
  if (points.length > 0) {
    return points.length < names.length ? 'notEnoughPoints' : null;
  }
  const missing = names.some(
    (name) => parseNumber(draft.coefficients[name] ?? '') == null
  );
  return missing ? 'coefficientMissing' : null;
}

/** Numeric coefficient values typed in the form (unparseable ones skipped). */
export function parseCoefficientInputs(
  inputs: Record<string, string>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, text] of Object.entries(inputs)) {
    const value = parseNumber(text);
    if (value != null) out[name] = value;
  }
  return out;
}

/** Fit quality as agri-core reports it (`FitResult.metrics()`). */
export interface FitMetrics {
  n_points: number;
  rmse: number;
  mae: number;
  max_abs_error: number;
  /** `null` when every reference value is identical (zero variance). */
  r2: number | null;
  degrees_of_freedom: number;
  converged: boolean;
  iterations: number;
  warnings: string[];
}

export type FitQuality = 'excellent' | 'good' | 'poor' | 'unverified';

/**
 * A one-word verdict for the badge next to R². Exact interpolation
 * (as many points as coefficients) proves nothing about accuracy, so it is
 * `unverified`, never `excellent`.
 */
export function fitQuality(metrics: FitMetrics | null | undefined): FitQuality {
  if (!metrics || metrics.r2 == null) return 'unverified';
  if (metrics.degrees_of_freedom <= 0) return 'unverified';
  if (metrics.r2 >= 0.99) return 'excellent';
  if (metrics.r2 >= 0.95) return 'good';
  return 'poor';
}

/** Readable number for coefficients and metrics: 6 significant digits. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  if (magnitude >= 1e6 || magnitude < 1e-4) return value.toExponential(4);
  return String(Number(value.toPrecision(6)));
}

/**
 * Errors and fit metrics (residual, RMSE, MAE, max error): an exact fit leaves
 * float noise like `-4.44e-16`, which must read as `0`, not as a scary
 * exponent. Coefficients use {@link formatNumber} instead — a genuine
 * coefficient on raw ADC counts can be as small as 1e-10.
 */
export function formatMeasure(value: number | null | undefined): string {
  if (value != null && Number.isFinite(value) && Math.abs(value) < 1e-9) {
    return '0';
  }
  return formatNumber(value);
}
