// Full single-logout. Revokes the session server-side so EVERY Agrogo app
// sharing the SSO session is logged out — not just this browser — then clears
// local state and leaves to the gateway login.
//
// Clearing the shared cookie (clearSsoSession) only stops re-hydration on this
// device; the sibling apps already copied the tokens into their own
// localStorage and those stay valid until expiry. DELETE /auth/sessions bumps
// the user's sessions_revoked_at so those tokens are rejected on their next
// request — that is what makes logout actually global.
//
// The server call is best-effort: logout must never be blocked by a network
// error or an already-dead session, so we always fall through to local cleanup.

import api from './api';
import { clearSsoSession } from './clearSsoSession';

export const logoutEverywhere = async (redirectTo?: string): Promise<void> => {
  try {
    await api.delete('/auth/sessions');
  } catch {
    // Ignore — proceed to local cleanup regardless of the server result.
  }
  clearSsoSession();
  if (typeof window !== 'undefined') {
    window.location.href =
      redirectTo || process.env.NEXT_PUBLIC_LOGIN_PATH || '/login';
  }
};
