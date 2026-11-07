import {
  distanceM,
  formatAreaM2,
  formatDistance,
  pathLengthM,
  polygonAreaM2,
} from './measure';

describe('measure', () => {
  it('measures distances on the ground', () => {
    // 0.001° of latitude ≈ 111.2 m anywhere.
    expect(distanceM([-6.9, 32.88], [-6.9, 32.881])).toBeCloseTo(111.2, 0);
    expect(
      pathLengthM([
        [-6.9, 32.88],
        [-6.9, 32.881],
        [-6.9, 32.882],
      ])
    ).toBeCloseTo(222.4, 0);
    expect(pathLengthM([[-6.9, 32.88]])).toBe(0);
  });

  it('measures a 100 m x 100 m square as ~1 ha', () => {
    const dLat = 100 / 111_195;
    const dLon = 100 / (111_195 * Math.cos((32.88 * Math.PI) / 180));
    const sq: [number, number][] = [
      [-6.9, 32.88],
      [-6.9 + dLon, 32.88],
      [-6.9 + dLon, 32.88 + dLat],
      [-6.9, 32.88 + dLat],
    ];
    expect(polygonAreaM2(sq)).toBeGreaterThan(9_950);
    expect(polygonAreaM2(sq)).toBeLessThan(10_050);
    expect(polygonAreaM2(sq.slice(0, 2))).toBe(0);
  });

  it('formats', () => {
    expect(formatDistance(842.4)).toBe('842 m');
    expect(formatDistance(1530)).toBe('1.53 km');
    expect(formatAreaM2(950)).toBe('950 m²');
    expect(formatAreaM2(64_200)).toBe('6.42 ha');
  });
});
