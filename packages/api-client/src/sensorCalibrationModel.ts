/**
 * Pure logic behind per-sensor calibration (agri-web #97, CAL-1 frontend).
 *
 * A *sensor* is the pair `(device_id, sensor_key)` — the same identity sensor
 * groups use, so {@link sensorIdentity} is imported from `sensorGroupModel`
 * rather than redefined here.
 *
 * Dependency-free on purpose (the only import is a type-safe pure function
 * from a sibling pure module) so every rule below is unit-testable without a
 * DOM, axios or next-intl — the same split as `sensorGroupModel.ts`.
 *
 * ── Mirror of agri-core ──────────────────────────────────────────────────────
 * `agri.core.calibration` is the AUTHORITATIVE implementation: it is what the
 * server will use once the read path applies corrections. This module is a
 * faithful port of the parts the editor needs, keeping the same names and the
 * same derivations:
 *
 *   • `UNIT_DIMENSIONS` — each physical dimension declares a base unit and,
 *     for every unit in it, the affine map to that base
 *     (`value_base = value_unit * to_base_scale + to_base_offset`). Two maps
 *     are enough to convert any pair inside a dimension, so the table stays
 *     O(n) and adding a unit is ONE line that touches no calibration logic.
 *   • `conversionCoefficients` — `(m, c)` with `value_to = value_from*m + c`.
 *   • `applyCalibration` — `real = raw * scale_a + offset_b`.
 *   • `calibrationInUnit` — the closed form `a' = a·m`, `b' = b·m + c`.
 *
 * This is the ONE module holding the unit list for the calibration editor: no
 * component may hard-code a unit string, so a server-provided list can replace
 * {@link UNIT_DIMENSIONS} / {@link UNIT_ALIASES} later without touching the UI.
 * (`utils/sensorUnitConversion.ts` is a different, older thing: the graph
 * behind the DEVICE-LOCAL display overrides of `SensorReadingsSettings`. It is
 * deliberately not reused — it is not the server's model, and this editor is
 * about what the server stores.)
 *
 * ── What this module does NOT do ─────────────────────────────────────────────
 * It never rewrites displayed readings. Alerts and reports are computed
 * server-side, so applying a correction client-side would make the dashboard
 * disagree with the alert that fired on the very same sensor. Read-path
 * application is a separate backend ticket. {@link applyCalibration} exists
 * only to power the editor's "raw X → corrected Y" preview.
 */

// `sensorIdentity` is imported, never redefined: a calibration and a group
// membership must agree on what "the same sensor" means. It is NOT re-exported
// here — `sensorGroupModel` stays its single owner.
import { sensorIdentity } from './sensorGroupModel';
import { isSchemaUnavailableError } from './schemaAvailability';

/**
 * Key for one sensor's calibration — the pair `(device_id, sensor_key)`,
 * delegated to sensor groups' {@link sensorIdentity} so a calibration and a
 * group membership can never disagree about what "the same sensor" is.
 */
export function calibrationKey(
  deviceId: number | null | undefined,
  sensorKey: string
): string {
  return sensorIdentity(deviceId, sensorKey);
}

// ---------------------------------------------------------------------------
// 1. The unit table (mirrors agri.core.calibration.UNIT_DIMENSIONS)
// ---------------------------------------------------------------------------

/** One unit's affine map to its dimension's base unit. */
export interface UnitDefinition {
  toBaseScale: number;
  toBaseOffset: number;
}

/** A physical dimension: a base unit plus every unit expressed in it. */
export interface Dimension {
  base: string;
  units: Record<string, UnitDefinition>;
}

const u = (toBaseScale: number, toBaseOffset = 0): UnitDefinition => ({
  toBaseScale,
  toBaseOffset,
});

/**
 * Units the platform reads but that have no meaningful conversion partner
 * (`%`, `pH`, `°`, `dBm`) sit in single-unit dimensions on purpose: they
 * resolve as KNOWN units whose only legal target is themselves, so a bogus
 * `pH → °C` fails instead of silently succeeding.
 *
 * `dBm` is listed alone for a second reason: dBm→mW is logarithmic, not
 * affine, so composing it with an affine calibration would not be affine and
 * would break the whole storage model.
 */
export const UNIT_DIMENSIONS: Record<string, Dimension> = {
  // Temperature: base kelvin. The only dimension with non-zero offsets.
  temperature: {
    base: 'K',
    units: {
      K: u(1),
      '°C': u(1, 273.15),
      // K = (°F + 459.67) × 5/9 = °F × 5/9 + 255.3722…
      '°F': u(5 / 9, (459.67 * 5) / 9),
    },
  },
  pressure: {
    base: 'kPa',
    units: {
      kPa: u(1),
      Pa: u(0.001),
      hPa: u(0.1),
      mbar: u(0.1),
      bar: u(100),
      MPa: u(1000),
      psi: u(6.894757293168361), // NIST: 1 psi = 6894.757 Pa
      atm: u(101.325),
    },
  },
  conductivity: {
    base: 'μS/cm',
    units: {
      'μS/cm': u(1),
      'mS/cm': u(1000),
      'dS/m': u(1000),
      'S/m': u(10000),
    },
  },
  length: {
    base: 'mm',
    units: {
      mm: u(1),
      cm: u(10),
      m: u(1000),
      in: u(25.4), // exact by definition
      ft: u(304.8),
    },
  },
  speed: {
    base: 'm/s',
    units: {
      'm/s': u(1),
      'km/h': u(1 / 3.6),
      mph: u(0.44704), // exact: 1609.344 m / 3600 s
      kn: u(1852 / 3600),
    },
  },
  depth_rate: {
    base: 'mm/h',
    units: {
      'mm/h': u(1),
      'mm/day': u(1 / 24),
      'cm/h': u(10),
      'in/h': u(25.4),
      'in/day': u(25.4 / 24),
    },
  },
  volume_flow: {
    base: 'm³/h',
    units: {
      'm³/h': u(1),
      'm³/s': u(3600),
      'L/h': u(0.001),
      'L/min': u(0.06),
      'L/s': u(3.6),
    },
  },
  // ppm ≡ mg/L holds for dilute aqueous solutions, the only regime these
  // probes report in.
  mass_concentration: {
    base: 'mg/L',
    units: {
      'mg/L': u(1),
      ppm: u(1),
      'μg/L': u(0.001),
      'g/L': u(1000),
      ppt: u(1000),
    },
  },
  // MJ/m²/h is an hourly energy total; ÷3600 s gives the mean power over that
  // hour, so 1 MJ/m²/h = 1e6/3600 W/m².
  irradiance: {
    base: 'W/m²',
    units: {
      'W/m²': u(1),
      'kW/m²': u(1000),
      'MJ/m²/h': u(1e6 / 3600),
    },
  },
  energy: {
    base: 'kWh',
    units: {
      kWh: u(1),
      Wh: u(0.001),
      MWh: u(1000),
      MJ: u(1 / 3.6), // 1 kWh = 3.6 MJ
      J: u(1 / 3.6e6),
    },
  },
  voltage: { base: 'V', units: { V: u(1), mV: u(0.001) } },
  // Single-unit dimensions: known, but convertible only to themselves.
  ratio: { base: '%', units: { '%': u(1) } },
  acidity: { base: 'pH', units: { pH: u(1) } },
  angle: { base: '°', units: { '°': u(1) } },
  signal_power: { base: 'dBm', units: { dBm: u(1) } },
};

/**
 * Spelling variants → the canonical unit string used in {@link UNIT_DIMENSIONS}.
 * Extension point #1: a new spelling costs one line.
 *
 * MICRO SIGN (U+00B5) and GREEK SMALL LETTER MU (U+03BC) are both typed in the
 * wild; agri-core's registry uses the greek mu, so that is canonical here too.
 */
export const UNIT_ALIASES: Record<string, string> = {
  'µS/cm': 'μS/cm',
  'uS/cm': 'μS/cm',
  'us/cm': 'μS/cm',
  'µg/L': 'μg/L',
  'ug/L': 'μg/L',
  C: '°C',
  degC: '°C',
  celsius: '°C',
  F: '°F',
  degF: '°F',
  fahrenheit: '°F',
  kelvin: 'K',
  inch: 'in',
  inches: 'in',
  kph: 'km/h',
  'km/hr': 'km/h',
  knot: 'kn',
  kt: 'kn',
  'm3/h': 'm³/h',
  'm3/s': 'm³/s',
  'W/m2': 'W/m²',
  'kW/m2': 'kW/m²',
  'l/h': 'L/h',
  'l/min': 'L/min',
  'l/s': 'L/s',
  percent: '%',
  pct: '%',
  deg: '°',
  'mm/d': 'mm/day',
  'in/d': 'in/day',
  // The web sensor catalogue spells these in lower case.
  'mg/l': 'mg/L',
  'µg/l': 'μg/L',
  'g/l': 'g/L',
};

/**
 * `(from, to) → (scale, offset)` pairs the dimension table cannot express —
 * vendor-specific or sensor-specific conversions. Extension point #2; entries
 * win over the dimension table and stay affine, so the composition rule in
 * {@link calibrationInUnit} still holds.
 */
export const UNIT_CONVERSION_OVERRIDES: Record<
  string,
  { scale: number; offset: number }
> = {};

const overrideKey = (from: string, to: string) => `${from}→${to}`;

/**
 * Canonicalise a unit string: trim, then resolve aliases.
 * `''` means "no unit stored" — by the storage convention the caller falls
 * back to the sensor's catalogue default.
 */
export function normalizeUnit(unit: string | null | undefined): string {
  if (unit == null) return '';
  const trimmed = unit.trim();
  if (!trimmed) return '';
  return UNIT_ALIASES[trimmed] ?? trimmed;
}

/** Name of the dimension `unit` belongs to, or `null` when unknown. */
export function unitDimension(unit: string): string | null {
  const canonical = normalizeUnit(unit);
  if (!canonical) return null;
  for (const [name, dimension] of Object.entries(UNIT_DIMENSIONS)) {
    if (canonical in dimension.units) return name;
  }
  return null;
}

/** True when `unit` appears in the table (after alias resolution). */
export function isKnownUnit(unit: string): boolean {
  return unitDimension(unit) !== null;
}

/**
 * Every unit a calibration in `unit` may be retargeted to, `unit` first.
 *
 * An unknown unit (or one alone in its dimension) yields just itself — the UI
 * then offers no alternative rather than inventing an unsafe conversion.
 */
export function unitOptionsFor(unit: string): string[] {
  const canonical = normalizeUnit(unit);
  const dimension = unitDimension(canonical);
  if (!dimension) return canonical ? [canonical] : [];
  const all = Object.keys(UNIT_DIMENSIONS[dimension].units);
  return [canonical, ...all.filter((name) => name !== canonical)];
}

export interface LinearStep {
  scale: number;
  offset: number;
}

/** Both units are known but belong to different dimensions, or are unknown. */
export class UnitConversionError extends Error {}

/**
 * Affine coefficients `(m, c)` with `value_to = value_from × m + c`.
 *
 * Derivation — inside a dimension every unit declares its map to the base `B`:
 *
 *     base = from × s_f + o_f
 *     base = to   × s_t + o_t
 *
 * Eliminating `base` and solving for `to`:
 *
 *     to = from × (s_f / s_t) + (o_f - o_t) / s_t
 *
 * hence `m = s_f/s_t` and `c = (o_f - o_t)/s_t`. Both are constants, so the
 * conversion is itself affine — which is what makes composing it with an
 * affine calibration closed (see {@link calibrationInUnit}).
 *
 * `conversionCoefficients('°C', '°F')` is `{ scale: 1.8, offset: 32 }`.
 *
 * Identity is returned when the two units are the same string, even outside
 * the table: "express this in the unit it is already in" is always defined and
 * must not throw. Anything else throws rather than silently returning the
 * unconverted value — a wrong number in front of a farmer is the worst
 * possible outcome.
 */
export function conversionCoefficients(
  fromUnit: string,
  toUnit: string
): LinearStep {
  const source = normalizeUnit(fromUnit);
  const target = normalizeUnit(toUnit);
  if (source === target) return { scale: 1, offset: 0 };

  const override = UNIT_CONVERSION_OVERRIDES[overrideKey(source, target)];
  if (override) return override;

  const sourceDim = unitDimension(source);
  const targetDim = unitDimension(target);
  if (sourceDim === null) {
    throw new UnitConversionError(`Unknown unit "${fromUnit}".`);
  }
  if (targetDim === null) {
    throw new UnitConversionError(`Unknown unit "${toUnit}".`);
  }
  if (sourceDim !== targetDim) {
    throw new UnitConversionError(
      `No conversion from "${source}" (${sourceDim}) to "${target}" (${targetDim}): different physical dimensions.`
    );
  }
  const from = UNIT_DIMENSIONS[sourceDim].units[source];
  const to = UNIT_DIMENSIONS[targetDim].units[target];
  return {
    scale: from.toBaseScale / to.toBaseScale,
    offset: (from.toBaseOffset - to.toBaseOffset) / to.toBaseScale,
  };
}

/** Convert one reading. `null` in → `null` out — a missing reading stays missing. */
export function convertValue(
  value: number | null,
  fromUnit: string,
  toUnit: string
): number | null {
  if (value == null) return null;
  const { scale, offset } = conversionCoefficients(fromUnit, toUnit);
  return value * scale + offset;
}

// ---------------------------------------------------------------------------
// 2. The calibration itself
// ---------------------------------------------------------------------------

/**
 * Affine correction of one sensor stream: `real = raw × scale_a + offset_b`.
 * Mirrors `analytics_sensorcalibration` minus the keys — the caller already
 * knows which `(device_id, sensor_key)` it fetched.
 */
export interface Calibration {
  scaleA: number;
  offsetB: number;
  /** Unit `real` is expressed in. `''` = "the sensor's catalogue default". */
  unit: string;
  /** `false` disables the correction while KEEPING the coefficients. */
  isActive: boolean;
  note: string;
}

/** The no-op calibration: what an un-calibrated sensor behaves like. */
export const IDENTITY_CALIBRATION: Calibration = {
  scaleA: 1,
  offsetB: 0,
  unit: '',
  isActive: true,
  note: '',
};

/** True when the correction leaves every value unchanged. */
export function isIdentityCalibration(calibration: Calibration): boolean {
  return calibration.scaleA === 1 && calibration.offsetB === 0;
}

/**
 * `real = raw × scale_a + offset_b`, with the edges agri-core defines:
 *
 *   • `raw == null` → `null`. A missing reading stays missing; turning it into
 *     `offset_b` would fabricate data.
 *   • `calibration == null` → `raw`. No row stored = no correction.
 *   • `isActive === false` → `raw`. The correction is disabled, not deleted.
 *   • identity (`a=1, b=0`) → `raw`, with no float round-trip.
 *
 * Used ONLY for the editor's preview — see the module header.
 */
export function applyCalibration(
  raw: number | null,
  calibration: Calibration | null
): number | null {
  if (raw == null) return null;
  if (
    calibration == null ||
    !calibration.isActive ||
    isIdentityCalibration(calibration)
  ) {
    return raw;
  }
  return raw * calibration.scaleA + calibration.offsetB;
}

/**
 * Re-express `calibration` so its corrected value comes out in `targetUnit`,
 * recomputing `scale_a` and `offset_b` — NOT a relabel.
 *
 * Derivation. The calibration is affine in the current unit `u₁`:
 *
 *     real_u₁ = raw × a + b
 *
 * and the unit conversion `u₁ → u₂` is affine too:
 *
 *     v_u₂ = v_u₁ × m + c
 *
 * Substituting:
 *
 *     real_u₂ = (raw × a + b) × m + c = raw × (a×m) + (b×m + c)
 *
 * which is again `raw × a' + b'` — the composition of two affine maps is
 * affine — with
 *
 *     a' = a × m
 *     b' = b × m + c
 *
 * Note `b` is scaled AND shifted while `a` is only scaled, so °C→°F takes
 * `(a, b)` to `(1.8a, 1.8b + 32)`.
 *
 * `sourceUnit` is the calibration's own unit, or `fallbackUnit` (the sensor's
 * catalogue default) when it is blank. If neither resolves, this throws rather
 * than guess: a guessed scale factor is a silently wrong number.
 *
 * An inactive calibration is retargeted the same way — the coefficients stay
 * meaningful for when it is switched back on.
 */
export function calibrationInUnit(
  calibration: Calibration,
  targetUnit: string,
  fallbackUnit = ''
): Calibration {
  const sourceUnit =
    normalizeUnit(calibration.unit) || normalizeUnit(fallbackUnit);
  if (!sourceUnit) {
    throw new UnitConversionError(
      'Cannot determine the calibration current unit: it is blank and no fallback unit was given.'
    );
  }
  const { scale, offset } = conversionCoefficients(sourceUnit, targetUnit);
  return {
    ...calibration,
    scaleA: calibration.scaleA * scale,
    offsetB: calibration.offsetB * scale + offset,
    unit: normalizeUnit(targetUnit),
  };
}

// ---------------------------------------------------------------------------
// 3. Editor-side validation and preview
// ---------------------------------------------------------------------------

/** Why a draft cannot be saved. `null` = it can. */
export type CalibrationDraftError =
  | 'scaleNotANumber'
  | 'scaleZero'
  | 'offsetNotANumber';

export interface CalibrationDraft {
  scaleA: number;
  offsetB: number;
  unit: string;
  isActive: boolean;
  note: string;
}

/**
 * Client-side gate, refusing what agri-api would refuse anyway.
 *
 * `scale_a = 0` collapses every raw value onto `offset_b`: the sensor stops
 * being a sensor, and the correction can no longer be inverted. The server
 * rejects it; catching it here means the farmer sees why next to the field
 * instead of a bare 400 after a round-trip.
 */
export function validateCalibrationDraft(
  draft: CalibrationDraft
): CalibrationDraftError | null {
  if (!Number.isFinite(draft.scaleA)) return 'scaleNotANumber';
  if (draft.scaleA === 0) return 'scaleZero';
  if (!Number.isFinite(draft.offsetB)) return 'offsetNotANumber';
  return null;
}

export interface CalibrationPreview {
  raw: number;
  corrected: number;
  /** True when the stored coefficients are currently switched off. */
  disabled: boolean;
}

/**
 * "raw X → corrected Y" for the editor, so the coefficients can be
 * sanity-checked BEFORE saving.
 *
 * Returns `null` for a raw input that is not a number, and for a draft that
 * would not be saveable — previewing an invalid calibration would suggest it
 * works.
 */
export function previewCalibration(
  rawInput: string | number | null | undefined,
  draft: CalibrationDraft
): CalibrationPreview | null {
  if (rawInput == null || rawInput === '') return null;
  const raw = typeof rawInput === 'number' ? rawInput : Number(rawInput);
  if (!Number.isFinite(raw)) return null;
  if (validateCalibrationDraft(draft) !== null) return null;
  const corrected = applyCalibration(raw, {
    ...draft,
    // Preview what the coefficients DO, even while they are switched off —
    // `disabled` tells the UI to say so.
    isActive: true,
  });
  return {
    raw,
    corrected: corrected as number,
    disabled: !draft.isActive,
  };
}

/** Trim the float noise `a' = a·m` leaves behind (0.30000000000000004). */
export function roundCoefficient(value: number, decimals = 6): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// ---------------------------------------------------------------------------
// 4. Degradation
// ---------------------------------------------------------------------------

/** The agri-db revision that creates `analytics_sensorcalibration`. */
export const SENSOR_CALIBRATION_MIGRATION = 'f4b6d2e8c1a9';

/** Table names the server may name in its refusal. */
export const SENSOR_CALIBRATION_TABLES = ['analytics_sensorcalibration'];

/**
 * Does this rejection mean "the schema for calibration is not deployed"?
 *
 * Same mechanism as sensor groups — {@link isSchemaUnavailableError} — read
 * off the server's own words: agri-api answers such calls with 400 and a
 * `detail` naming the missing table AND the migration. An ordinary 400
 * (`scale_a = 0`, bad unit) is left alone.
 */
export function isSensorCalibrationUnavailableError(error: unknown): boolean {
  return isSchemaUnavailableError(error, [
    SENSOR_CALIBRATION_MIGRATION,
    ...SENSOR_CALIBRATION_TABLES,
  ]);
}
