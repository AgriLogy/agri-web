/**
 * UNIT tests for the pure calibration maths (agri-web #97, CAL-1).
 *
 * No DOM, no axios, no next-intl — `sensorCalibrationModel` is dependency-free
 * on purpose, so every rule below is checked directly against hand-computed
 * numbers rather than through a rendered component.
 *
 * The expected values here are derived from agri-core's `calibration.py`
 * (`conversion_coefficients`, `calibration_in_unit`), which is the
 * authoritative implementation. If this file and agri-core ever disagree,
 * agri-core wins and this port is the bug.
 */

import {
  IDENTITY_CALIBRATION,
  SENSOR_CALIBRATION_MIGRATION,
  UnitConversionError,
  applyCalibration,
  calibrationInUnit,
  calibrationKey,
  conversionCoefficients,
  convertValue,
  isIdentityCalibration,
  isKnownUnit,
  isSensorCalibrationUnavailableError,
  normalizeUnit,
  previewCalibration,
  roundCoefficient,
  unitDimension,
  unitOptionsFor,
  validateCalibrationDraft,
  type Calibration,
} from '@agri/api-client/sensorCalibrationModel';
import { sensorIdentity } from '@agri/api-client/sensorGroupModel';

const cal = (over: Partial<Calibration> = {}): Calibration => ({
  ...IDENTITY_CALIBRATION,
  ...over,
});

describe('sensor identity', () => {
  it('is the sensor-groups identity, not a second definition', () => {
    expect(calibrationKey(10, 'soil_temperature')).toBe(
      sensorIdentity(10, 'soil_temperature')
    );
    // Two devices reporting the same key are two different sensors.
    expect(calibrationKey(10, 'soil_temperature')).not.toBe(
      calibrationKey(20, 'soil_temperature')
    );
  });
});

describe('identity defaults', () => {
  it('is a=1, b=0, no unit, active — an un-calibrated sensor', () => {
    expect(IDENTITY_CALIBRATION).toEqual({
      scaleA: 1,
      offsetB: 0,
      unit: '',
      isActive: true,
      note: '',
    });
    expect(isIdentityCalibration(IDENTITY_CALIBRATION)).toBe(true);
    expect(isIdentityCalibration(cal({ scaleA: 2 }))).toBe(false);
    expect(isIdentityCalibration(cal({ offsetB: -1 }))).toBe(false);
  });

  it('leaves every reading untouched', () => {
    expect(applyCalibration(21.5, IDENTITY_CALIBRATION)).toBe(21.5);
  });
});

describe('applyCalibration — real = raw × a + b', () => {
  it('applies the affine correction', () => {
    expect(applyCalibration(10, cal({ scaleA: 2, offsetB: 1 }))).toBe(21);
    expect(applyCalibration(0, cal({ scaleA: 3, offsetB: -0.5 }))).toBe(-0.5);
  });

  it('keeps a missing reading missing instead of fabricating offset_b', () => {
    expect(applyCalibration(null, cal({ scaleA: 2, offsetB: 7 }))).toBeNull();
  });

  it('returns the raw value when there is no calibration at all', () => {
    expect(applyCalibration(12, null)).toBe(12);
  });

  it('is_active=false disables the correction but keeps the coefficients', () => {
    const paused = cal({ scaleA: 2, offsetB: 1, isActive: false });
    expect(applyCalibration(10, paused)).toBe(10);
    // …and the coefficients are still there, ready to be switched back on.
    expect(paused.scaleA).toBe(2);
    expect(paused.offsetB).toBe(1);
    expect(applyCalibration(10, { ...paused, isActive: true })).toBe(21);
  });
});

describe('unit normalisation and the unit table', () => {
  it('resolves aliases to the canonical spelling', () => {
    expect(normalizeUnit(' uS/cm ')).toBe('μS/cm');
    expect(normalizeUnit('µS/cm')).toBe('μS/cm'); // micro sign → greek mu
    expect(normalizeUnit('degC')).toBe('°C');
    expect(normalizeUnit('kph')).toBe('km/h');
    expect(normalizeUnit('mg/l')).toBe('mg/L');
  });

  it('treats blank as "no unit stored"', () => {
    expect(normalizeUnit(null)).toBe('');
    expect(normalizeUnit('   ')).toBe('');
  });

  it('places units in their physical dimension', () => {
    expect(unitDimension('°F')).toBe('temperature');
    expect(unitDimension('bar')).toBe('pressure');
    expect(unitDimension('pH')).toBe('acidity');
    expect(unitDimension('parsec')).toBeNull();
    expect(isKnownUnit('W/m²')).toBe(true);
    expect(isKnownUnit('parsec')).toBe(false);
  });

  it('offers only same-dimension targets, current unit first', () => {
    const options = unitOptionsFor('°C');
    expect(options[0]).toBe('°C');
    expect(options).toEqual(expect.arrayContaining(['K', '°F']));
    expect(options).not.toContain('bar');
  });

  it('offers no alternative for a unit that has no safe conversion', () => {
    // pH and % are known but alone in their dimension: relabelling them would
    // be silently wrong, so the UI is given nothing to pick.
    expect(unitOptionsFor('pH')).toEqual(['pH']);
    expect(unitOptionsFor('%')).toEqual(['%']);
    // An unknown unit yields itself only, never a guess.
    expect(unitOptionsFor('m³/ha')).toEqual(['m³/ha']);
  });
});

describe('conversionCoefficients — (m, c) with value_to = value_from × m + c', () => {
  it('°C → °F is (1.8, 32)', () => {
    const { scale, offset } = conversionCoefficients('°C', '°F');
    expect(scale).toBeCloseTo(1.8, 12);
    expect(offset).toBeCloseTo(32, 10);
  });

  it('°C → K is (1, 273.15)', () => {
    expect(conversionCoefficients('°C', 'K')).toEqual({
      scale: 1,
      offset: 273.15,
    });
  });

  it('m/s → km/h is (3.6, 0)', () => {
    const { scale, offset } = conversionCoefficients('m/s', 'km/h');
    expect(scale).toBeCloseTo(3.6, 12);
    expect(offset).toBe(0);
  });

  it('μS/cm → mS/cm is (0.001, 0)', () => {
    const { scale, offset } = conversionCoefficients('uS/cm', 'mS/cm');
    expect(scale).toBeCloseTo(0.001, 12);
    expect(offset).toBe(0);
  });

  it('is the identity for the same unit, even outside the table', () => {
    expect(conversionCoefficients('m³/ha', 'm³/ha')).toEqual({
      scale: 1,
      offset: 0,
    });
  });

  it('round-trips: converting back gives the original reading', () => {
    const f = convertValue(25, '°C', '°F');
    expect(f).toBeCloseTo(77, 10);
    expect(convertValue(f, '°F', '°C')).toBeCloseTo(25, 10);
  });

  it('keeps a missing reading missing', () => {
    expect(convertValue(null, '°C', '°F')).toBeNull();
  });

  it('throws rather than silently leave a value unconverted', () => {
    expect(() => conversionCoefficients('°C', 'bar')).toThrow(
      UnitConversionError
    );
    expect(() => conversionCoefficients('°C', 'parsec')).toThrow(
      UnitConversionError
    );
  });
});

describe('calibrationInUnit — a RECOMPUTATION, not a relabel', () => {
  it('°C → °F takes (a, b) to (1.8a, 1.8b + 32)', () => {
    const moved = calibrationInUnit(
      cal({ scaleA: 2, offsetB: 5, unit: '°C' }),
      '°F'
    );
    expect(moved.scaleA).toBeCloseTo(3.6, 10); // 1.8 × 2
    expect(moved.offsetB).toBeCloseTo(41, 10); // 1.8 × 5 + 32
    expect(moved.unit).toBe('°F');
  });

  it('agrees with converting the corrected value directly', () => {
    // The whole point: `raw → correct → convert` must equal
    // `raw → correct-in-target-unit`, for any raw value.
    const source = cal({ scaleA: 2, offsetB: 5, unit: '°C' });
    const moved = calibrationInUnit(source, '°F');
    for (const raw of [-40, 0, 3.7, 21.5, 100]) {
      const viaConversion = convertValue(
        applyCalibration(raw, source),
        '°C',
        '°F'
      );
      expect(applyCalibration(raw, moved)).toBeCloseTo(
        viaConversion as number,
        10
      );
    }
  });

  it('scales b as well as a — a plain relabel would leave b wrong', () => {
    const relabelled = { ...cal({ scaleA: 1, offsetB: 5, unit: '°C' }) };
    const recomputed = calibrationInUnit(relabelled, '°F');
    expect(recomputed.offsetB).not.toBeCloseTo(relabelled.offsetB, 6);
    expect(recomputed.offsetB).toBeCloseTo(41, 10);
  });

  it('m/s → km/h scales both coefficients by 3.6 and shifts by 0', () => {
    const moved = calibrationInUnit(
      cal({ scaleA: 1.05, offsetB: -0.2, unit: 'm/s' }),
      'km/h'
    );
    expect(moved.scaleA).toBeCloseTo(3.78, 10); // 1.05 × 3.6
    expect(moved.offsetB).toBeCloseTo(-0.72, 10); // -0.2 × 3.6 + 0
  });

  it('is exactly reversible (up to float precision)', () => {
    const source = cal({ scaleA: 2, offsetB: 5, unit: '°C' });
    const there = calibrationInUnit(source, '°F');
    const back = calibrationInUnit(there, '°C');
    expect(back.scaleA).toBeCloseTo(source.scaleA, 10);
    expect(back.offsetB).toBeCloseTo(source.offsetB, 10);
    expect(back.unit).toBe('°C');
  });

  it('retargets an inactive calibration too — the coefficients stay meaningful', () => {
    const moved = calibrationInUnit(
      cal({ scaleA: 2, offsetB: 5, unit: '°C', isActive: false }),
      '°F'
    );
    expect(moved.isActive).toBe(false);
    expect(moved.scaleA).toBeCloseTo(3.6, 10);
    // …while the correction itself is still switched off.
    expect(applyCalibration(10, moved)).toBe(10);
  });

  it('falls back to the catalogue unit when nothing is stored', () => {
    const moved = calibrationInUnit(cal({ unit: '' }), '°F', '°C');
    expect(moved.scaleA).toBeCloseTo(1.8, 10);
    expect(moved.offsetB).toBeCloseTo(32, 10);
  });

  it('refuses to guess when neither the stored nor a fallback unit is known', () => {
    expect(() => calibrationInUnit(cal({ unit: '' }), '°F')).toThrow(
      UnitConversionError
    );
  });

  it('refuses a cross-dimension move rather than relabel', () => {
    expect(() => calibrationInUnit(cal({ unit: '°C' }), 'bar')).toThrow(
      UnitConversionError
    );
  });
});

describe('validateCalibrationDraft — zero scale is rejected client-side', () => {
  const draft = {
    scaleA: 1,
    offsetB: 0,
    unit: '°C',
    isActive: true,
    note: '',
  };

  it('accepts an ordinary draft', () => {
    expect(validateCalibrationDraft(draft)).toBeNull();
    expect(validateCalibrationDraft({ ...draft, scaleA: -1 })).toBeNull();
  });

  it('rejects scale_a = 0 before the API has to', () => {
    // a = 0 collapses every raw value onto b: the sensor stops being a sensor
    // and the correction is no longer invertible.
    expect(validateCalibrationDraft({ ...draft, scaleA: 0 })).toBe('scaleZero');
  });

  it('rejects non-numeric coefficients', () => {
    expect(validateCalibrationDraft({ ...draft, scaleA: NaN })).toBe(
      'scaleNotANumber'
    );
    expect(validateCalibrationDraft({ ...draft, offsetB: NaN })).toBe(
      'offsetNotANumber'
    );
  });
});

describe('previewCalibration — "raw X → corrected Y"', () => {
  const draft = {
    scaleA: 2,
    offsetB: 1,
    unit: '°C',
    isActive: true,
    note: '',
  };

  it('computes the corrected value from a typed raw value', () => {
    expect(previewCalibration('10', draft)).toEqual({
      raw: 10,
      corrected: 21,
      disabled: false,
    });
  });

  it('previews what the coefficients DO even while they are switched off', () => {
    // Otherwise toggling is_active would show "no change" and the farmer could
    // not sanity-check the numbers before re-enabling them.
    expect(previewCalibration('10', { ...draft, isActive: false })).toEqual({
      raw: 10,
      corrected: 21,
      disabled: true,
    });
  });

  it('shows nothing for an empty or non-numeric raw value', () => {
    expect(previewCalibration('', draft)).toBeNull();
    expect(previewCalibration(null, draft)).toBeNull();
    expect(previewCalibration('abc', draft)).toBeNull();
  });

  it('shows nothing for a draft that could not be saved', () => {
    expect(previewCalibration('10', { ...draft, scaleA: 0 })).toBeNull();
  });
});

describe('roundCoefficient', () => {
  it('trims the float noise a unit change leaves behind', () => {
    expect(roundCoefficient(0.1 * 3)).toBe(0.3);
    expect(roundCoefficient(1.8 * 2)).toBe(3.6);
    expect(roundCoefficient(Number.NaN)).toBeNaN();
  });
});

describe('degraded-schema detection', () => {
  const refusal = (detail: string, status = 400) => ({
    response: { status, data: { detail } },
  });

  it('recognises the refusal naming the migration', () => {
    expect(
      isSensorCalibrationUnavailableError(
        refusal(
          `analytics_sensorcalibration does not exist. Apply ${SENSOR_CALIBRATION_MIGRATION}.`
        )
      )
    ).toBe(true);
  });

  it('recognises it from the table name alone (wording may change)', () => {
    expect(
      isSensorCalibrationUnavailableError(
        refusal('relation "analytics_sensorcalibration" is missing')
      )
    ).toBe(true);
  });

  it('leaves an ORDINARY 400 alone', () => {
    // This is the important one: `scale_a = 0` is a validation error, not a
    // missing migration. Confusing the two would tell the farmer the feature
    // is unavailable when they simply typed a bad number.
    expect(
      isSensorCalibrationUnavailableError(refusal('scale_a must not be 0.'))
    ).toBe(false);
  });

  it('ignores other statuses and non-HTTP failures', () => {
    expect(
      isSensorCalibrationUnavailableError(
        refusal('analytics_sensorcalibration missing', 500)
      )
    ).toBe(false);
    expect(isSensorCalibrationUnavailableError(new Error('offline'))).toBe(
      false
    );
    expect(isSensorCalibrationUnavailableError(undefined)).toBe(false);
  });

  it('reads a plain-string body as well as a {detail} body', () => {
    expect(
      isSensorCalibrationUnavailableError({
        response: { status: 400, data: 'migration f4b6d2e8c1a9 not applied' },
      })
    ).toBe(true);
  });
});
