import { renderHook, waitFor } from '@testing-library/react';

// jest hoists jest.mock above these — names must start with "mock" to be
// allowed as out-of-scope references inside the factory.
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockCheckAuthTokens = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));
jest.mock('@agri/api-client/checkAuthTokens', () => ({
  checkAuthTokens: () => mockCheckAuthTokens(),
}));

import { useRequireAuth } from './useRequireAuth';

describe('useRequireAuth', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockCheckAuthTokens.mockReset();
  });

  it('stays false and redirects to /login when unauthenticated (no flash)', async () => {
    mockCheckAuthTokens.mockReturnValue(false);
    const { result } = renderHook(() => useRequireAuth());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    // ready never became true → the gated UI never renders.
    expect(result.current).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('becomes true and does not redirect when authenticated', async () => {
    mockCheckAuthTokens.mockReturnValue(true);
    const { result } = renderHook(() => useRequireAuth());
    await waitFor(() => expect(result.current).toBe(true));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to a custom login path when provided', async () => {
    mockCheckAuthTokens.mockReturnValue(false);
    renderHook(() =>
      useRequireAuth('https://identity.agrogo-datafarm.com/login')
    );
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        'https://identity.agrogo-datafarm.com/login'
      )
    );
  });
});
