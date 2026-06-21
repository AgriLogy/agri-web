// Single-sign-on bridge. The identity gateway (identity.agrogo-datafarm.com)
// drops a cookie on the shared parent domain after one login. Here we copy that
// cookie into the localStorage keys this app already uses, so the rest of the
// auth flow (Bearer header, 401 refresh, guards) works exactly as before.
//
// The cookie is intentionally readable by JS (not httpOnly); these tokens
// already live in localStorage, so this is no additional exposure.

const SSO_COOKIE_NAME = process.env.NEXT_PUBLIC_SSO_COOKIE_NAME || 'agrogo_sso';

interface SsoSession {
  access?: string;
  refresh?: string;
  is_staff?: boolean;
  is_technician?: boolean;
}

function readSsoCookie(): SsoSession | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SSO_COOKIE_NAME}=`));
  if (!match) return null;
  try {
    return JSON.parse(
      decodeURIComponent(match.split('=').slice(1).join('='))
    ) as SsoSession;
  } catch {
    return null;
  }
}

// Returns true if a session is available locally (already present, or just
// hydrated from the SSO cookie). Safe to call repeatedly and on the server.
export const hydrateSsoSession = (): boolean => {
  if (typeof window === 'undefined') return false;

  if (
    localStorage.getItem('accessToken') &&
    localStorage.getItem('refreshToken')
  ) {
    return true;
  }

  const session = readSsoCookie();
  if (session?.access && session?.refresh) {
    localStorage.setItem('accessToken', session.access);
    localStorage.setItem('refreshToken', session.refresh);
    localStorage.setItem('isTechnician', session.is_technician ? '1' : '0');
    return true;
  }

  return false;
};
