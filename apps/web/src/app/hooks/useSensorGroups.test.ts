import { shouldProbeSensorGroups } from './useSensorGroups';

const base = {
  probe: true,
  loading: false,
  error: false,
  groupCount: 0,
  availability: 'unknown' as const,
};

describe('shouldProbeSensorGroups (A5)', () => {
  it('probes only an editor screen with an empty, unsettled list', () => {
    expect(shouldProbeSensorGroups(base)).toBe(true);
  });

  it('never probes for a read-only caller / read-only screen', () => {
    expect(shouldProbeSensorGroups({ ...base, probe: false })).toBe(false);
  });

  it('does not probe while loading, after an error, or once groups exist', () => {
    expect(shouldProbeSensorGroups({ ...base, loading: true })).toBe(false);
    expect(shouldProbeSensorGroups({ ...base, error: true })).toBe(false);
    expect(shouldProbeSensorGroups({ ...base, groupCount: 2 })).toBe(false);
  });

  it('does not probe again once availability is settled', () => {
    expect(
      shouldProbeSensorGroups({ ...base, availability: 'available' })
    ).toBe(false);
    expect(
      shouldProbeSensorGroups({ ...base, availability: 'unavailable' })
    ).toBe(false);
  });
});
