import { hydrateSsoSession } from './hydrateSsoSession';

export const checkAuthTokens = (): boolean => {
  // First chance: adopt a single-sign-on session handed over by the identity
  // gateway via the shared cookie. No-op once tokens are already in storage.
  hydrateSsoSession();

  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  return Boolean(accessToken && refreshToken);
};
