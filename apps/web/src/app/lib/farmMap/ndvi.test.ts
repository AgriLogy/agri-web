import {
  bboxCorners,
  latestChange,
  legendGradient,
  ndviClass,
  persistentDecline,
  statAt,
  usableStats,
} from './ndvi';

const stat = (date: string, mean: number, valid = 1) => ({
  date,
  mean,
  min: null,
  max: null,
  std: null,
  valid_fraction: valid,
});

describe('bboxCorners', () => {
  it('returns TL, TR, BR, BL of the polygon bbox', () => {
    const g = {
      type: 'Polygon',
      coordinates: [
        [
          [-6.915, 32.889],
          [-6.913, 32.889],
          [-6.913, 32.891],
          [-6.915, 32.889],
        ],
      ],
    };
    expect(bboxCorners(g)).toEqual([
      [-6.915, 32.891],
      [-6.913, 32.891],
      [-6.913, 32.889],
      [-6.915, 32.889],
    ]);
  });

  it('is null for missing or degenerate shapes', () => {
    expect(bboxCorners(null)).toBeNull();
    expect(
      bboxCorners({ type: 'Polygon', coordinates: [[[0, 0], null]] })
    ).toBeNull();
    expect(
      bboxCorners({
        type: 'Polygon',
        coordinates: [
          [
            [1, 1],
            [1, 1],
            [1, 1],
          ],
        ],
      })
    ).toBeNull();
  });
});

describe('ndvi classes and series', () => {
  it('classifies vigour', () => {
    expect(ndviClass(0.1)).toBe('bare');
    expect(ndviClass(0.3)).toBe('low');
    expect(ndviClass(0.5)).toBe('moderate');
    expect(ndviClass(0.7)).toBe('high');
  });

  it('ignores mostly-cloudy dates for the trend', () => {
    const s = [
      stat('2026-10-01', 0.5),
      stat('2026-10-04', 0.2, 0.3),
      stat('2026-10-06', 0.62),
    ];
    expect(usableStats(s).map((x) => x.date)).toEqual([
      '2026-10-01',
      '2026-10-06',
    ]);
    expect(latestChange(s)).toMatchObject({ delta: 0.12 });
    expect(latestChange([stat('2026-10-01', 0.5)])).toBeNull();
  });

  it('builds a legend gradient', () => {
    expect(
      legendGradient([
        { value: -0.2, color: '#a00' },
        { value: 0.8, color: '#0a0' },
      ])
    ).toBe('linear-gradient(to right, #a00 0%, #0a0 100%)');
  });
});

describe('persistentDecline and statAt', () => {
  it('needs two earlier clear dates as a baseline', () => {
    expect(
      persistentDecline([stat('a', 0.6), stat('b', 0.3), stat('c', 0.3)])
    ).toBeNull();
  });

  it('flags two clear dates in a row well below the baseline', () => {
    const s = [
      stat('2026-09-01', 0.62),
      stat('2026-09-11', 0.6),
      stat('2026-09-21', 0.2, 0.2), // cloudy: ignored
      stat('2026-10-01', 0.45),
      stat('2026-10-11', 0.44),
    ];
    expect(persistentDecline(s)).toEqual({ baseline: 0.61, latest: 0.44 });
  });

  it('does not flag a single bad date', () => {
    const s = [stat('a', 0.6), stat('b', 0.6), stat('c', 0.4), stat('d', 0.58)];
    expect(persistentDecline(s)).toBe(false);
  });

  it('finds the stat for a date', () => {
    expect(statAt([stat('2026-10-01', 0.5)], '2026-10-01')?.mean).toBe(0.5);
    expect(statAt([stat('2026-10-01', 0.5)], '2026-10-02')).toBeNull();
  });
});
