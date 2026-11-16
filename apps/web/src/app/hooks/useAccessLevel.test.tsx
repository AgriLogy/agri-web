import { act, renderHook, waitFor } from '@testing-library/react';

const mockGet = jest.fn();
jest.mock('@agri/api-client/userProfileApi', () => ({
  userProfileApi: { get: () => mockGet() },
}));

import { __resetAccessLevelCache, useCan } from './useAccessLevel';

describe('useCan', () => {
  beforeEach(() => {
    __resetAccessLevelCache();
    window.localStorage.clear();
    mockGet.mockReset();
  });

  it('follows the tier for a farmer', async () => {
    mockGet.mockResolvedValue({ access_level: 'admin' });
    const { result } = renderHook(() => useCan());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({
      level: 'admin',
      canEdit: true,
      canDelete: true,
      canManageUsers: true,
    });
  });

  it('an editor can edit but not delete', async () => {
    mockGet.mockResolvedValue({ access_level: 'editor' });
    const { result } = renderHook(() => useCan());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canEdit).toBe(true);
    expect(result.current.canDelete).toBe(false);
  });

  it('a technician is read-only whatever its tier', async () => {
    window.localStorage.setItem('isTechnician', '1');
    mockGet.mockResolvedValue({ access_level: 'admin' });
    const { result } = renderHook(() => useCan());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.level).toBe('admin');
    expect(result.current).toMatchObject({
      canEdit: false,
      canDelete: false,
      canManageUsers: false,
    });
  });

  it('reacts when the technician flag changes in another tab', async () => {
    mockGet.mockResolvedValue({ access_level: 'editor' });
    const { result } = renderHook(() => useCan());
    await waitFor(() => expect(result.current.canEdit).toBe(true));
    act(() => {
      window.localStorage.setItem('isTechnician', '1');
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'isTechnician' })
      );
    });
    expect(result.current.canEdit).toBe(false);
  });

  it('stays closed when the profile cannot be loaded', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useCan());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.level).toBe('monitor');
    expect(result.current.canEdit).toBe(false);
  });
});
