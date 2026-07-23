// Tears down a single-sign-on session everywhere this browser can reach.
// Clears the local tokens AND expires the shared cross-subdomain cookie the
// identity gateway dropped, so no sibling *.agrogo-datafarm.com app — nor this
// one on its next load — can silently re-hydrate from it. Without this, "log
// out" is instantly undone by the next hydrateSsoSession() call.

const SSO_COOKIE_NAME = process.env.NEXT_PUBLIC_SSO_COOKIE_NAME || 'agrogo_sso';
const SSO_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_SSO_COOKIE_DOMAIN || '';

function expireCookie(domain?: string): void {
  document.cookie =
    `${SSO_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax` +
    (domain ? `; Domain=${domain}` : '');
}

// Safe to call repeatedly and on the server (no-ops without window).
export const clearSsoSession = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('isTechnician');
  localStorage.removeItem('accessLevel');
  // Expire both the host-only and parent-domain variants so the cookie is gone
  // regardless of how it was scoped (prod = shared parent domain; dev = host).
  expireCookie();
  if (SSO_COOKIE_DOMAIN) expireCookie(SSO_COOKIE_DOMAIN);
};
