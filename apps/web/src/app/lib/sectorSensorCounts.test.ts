/**
 * Unit tests for the per-sector sensor count used in the map labels (MAP-2:
 * each drawn zone shows its name AND its data — how many sensors it contains).
 */
import { sensorCountsBySector } from '@/app/utils/sectorSensorCounts';

const s = (zoneName?: string) => ({ properties: { zoneName } });

describe('sensorCountsBySector', () => {
  it('counts sensors grouped by their containing secteur name', () => {
    const counts = sensorCountsBySector([
      s('Secteur 1'),
      s('Secteur 1'),
      s('Secteur 2'),
      s('Secteur 1'),
    ]);
    expect(counts.get('Secteur 1')).toBe(3);
    expect(counts.get('Secteur 2')).toBe(1);
  });

  it('ignores sensors not inside any secteur (empty / missing zoneName)', () => {
    const counts = sensorCountsBySector([
      s(''),
      s(undefined),
      { properties: null },
      s('  '),
      s('Secteur 3'),
    ]);
    expect(counts.get('Secteur 3')).toBe(1);
    expect(counts.has('')).toBe(false);
    expect([...counts.keys()]).toEqual(['Secteur 3']);
  });

  it('returns an empty map for no sensors', () => {
    expect(sensorCountsBySector([]).size).toBe(0);
  });
});
