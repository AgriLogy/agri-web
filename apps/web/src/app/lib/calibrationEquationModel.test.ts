/**
 * Unit tests for the equation-calibration form logic (agri-api #460).
 * The parser and the fit are server-side; these cover only what the form owns.
 */
import {
  EQUATION_PRESETS,
  fitQuality,
  formatMeasure,
  formatNumber,
  parseCoefficientInputs,
  parseReferencePoints,
  referencePointsToDrafts,
  scanCoefficientNames,
  validateEquationDraft,
  type EquationDraft,
  type FitMetrics,
} from '@agri/api-client/calibrationEquationModel';

describe('scanCoefficientNames', () => {
  it.each([
    ['a*x + b', ['a', 'b']],
    ['a*x^2 + b*x + c', ['a', 'b', 'c']],
    ['c + b*x', ['c', 'b']],
    ['(x - 4) / 16 * 100', []],
    ['a*exp(b*x)', ['a', 'b']],
    ['k * pi * x + e', ['k']],
    ['gain * 1e-5 * x + zero', ['gain', 'zero']],
    ['sqrt(x) * slope', ['slope']],
  ])('%s → %j', (equation, names) => {
    expect(scanCoefficientNames(equation)).toEqual(names);
  });

  it('every preset parses to at most 4 coefficients', () => {
    for (const preset of EQUATION_PRESETS) {
      expect(scanCoefficientNames(preset.equation).length).toBeLessThanOrEqual(
        4
      );
    }
  });
});

describe('parseReferencePoints', () => {
  it('parses numbers, accepts a decimal comma, skips empty rows', () => {
    expect(
      parseReferencePoints([
        { captured: '1', real: '2.5' },
        { captured: '', real: '' },
        { captured: ' 3,5 ', real: '-4' },
      ])
    ).toEqual({
      points: [
        { captured: 1, real: 2.5 },
        { captured: 3.5, real: -4 },
      ],
      invalidRows: [],
    });
  });

  it('reports half-filled and non-numeric rows', () => {
    expect(
      parseReferencePoints([
        { captured: '1', real: '' },
        { captured: 'abc', real: '2' },
        { captured: '1', real: '1' },
      ]).invalidRows
    ).toEqual([0, 1]);
  });

  it('round-trips through drafts', () => {
    const points = [{ captured: 1.5, real: 2 }];
    expect(
      parseReferencePoints(referencePointsToDrafts(points)).points
    ).toEqual(points);
    expect(referencePointsToDrafts(null)).toEqual([]);
  });
});

describe('validateEquationDraft', () => {
  const points = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      captured: String(i),
      real: String(i * 2),
    }));

  it.each([
    [{ equation: ' ', points: [], coefficients: {} }, 'equationEmpty'],
    [{ equation: 'a*b', points: [], coefficients: {} }, 'equationNoVariable'],
    [
      { equation: 'max + a', points: [], coefficients: {} },
      'equationNoVariable',
    ],
    [
      {
        equation: 'a*x',
        points: [{ captured: '1', real: '' }],
        coefficients: {},
      },
      'invalidPoints',
    ],
    [
      { equation: 'a*x^2+b*x+c', points: points(2), coefficients: {} },
      'notEnoughPoints',
    ],
    [
      { equation: 'a*x + b', points: [], coefficients: { a: '1' } },
      'coefficientMissing',
    ],
  ])('%j → %s', (draft: EquationDraft, error) => {
    expect(validateEquationDraft(draft)).toBe(error);
  });

  it.each<EquationDraft>([
    { equation: 'a*x + b', points: points(2), coefficients: {} },
    { equation: 'a*x + b', points: [], coefficients: { a: '2', b: '0,5' } },
    { equation: '(x - 4) / 16 * 100', points: [], coefficients: {} },
  ])('accepts %j', (draft) => {
    expect(validateEquationDraft(draft)).toBeNull();
  });
});

describe('parseCoefficientInputs', () => {
  it('keeps the numbers and skips the rest', () => {
    expect(parseCoefficientInputs({ a: '2', b: '0,5', c: '', d: 'x' })).toEqual(
      { a: 2, b: 0.5 }
    );
  });
});

describe('fitQuality', () => {
  const metrics = (r2: number | null, dof = 2): FitMetrics => ({
    n_points: 4,
    rmse: 0,
    mae: 0,
    max_abs_error: 0,
    r2,
    degrees_of_freedom: dof,
    converged: true,
    iterations: 1,
    warnings: [],
  });

  it('grades by R²', () => {
    expect(fitQuality(metrics(0.999))).toBe('excellent');
    expect(fitQuality(metrics(0.97))).toBe('good');
    expect(fitQuality(metrics(0.5))).toBe('poor');
  });

  it('never calls an exact interpolation excellent', () => {
    expect(fitQuality(metrics(1, 0))).toBe('unverified');
    expect(fitQuality(metrics(null))).toBe('unverified');
    expect(fitQuality(null)).toBe('unverified');
  });
});

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [2.0000000001, '2'],
    [0.30000000000000004, '0.3'],
    [-1.23456789, '-1.23457'],
    [1.2e-6, '1.2000e-6'],
    [NaN, '—'],
    [null, '—'],
  ])('%p → %s', (value, text) => {
    expect(formatNumber(value as number | null)).toBe(text);
  });
});

describe('formatMeasure', () => {
  it('reads float noise from an exact fit as 0', () => {
    expect(formatMeasure(-4.440892098500626e-16)).toBe('0');
    expect(formatMeasure(1.986e-16)).toBe('0');
  });
  it('keeps real errors', () => {
    expect(formatMeasure(0.25)).toBe('0.25');
    expect(formatMeasure(-1.5e-6)).toBe('-1.5000e-6');
    expect(formatMeasure(null)).toBe('—');
  });
});
