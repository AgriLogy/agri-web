'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuthTokens } from '@agri/api-client/checkAuthTokens';

/**
 * Client-side route guard that avoids the "dashboard flashes then redirects"
 * problem. Auth lives in localStorage, so it can't be checked during SSR or in
 * middleware — the check must run on the client. The fix is to gate rendering
 * on the result instead of redirecting after the page has already painted.
 *
 * Usage:
 *   const ready = useRequireAuth();
 *   if (!ready) return null;        // (or a splash) — protected UI never paints
 *   return <Dashboard />;
 *
 * Returns false until auth is confirmed; redirects (replace, so Back doesn't
 * return to the gated page) to the login path when unauthenticated.
 */
export function useRequireAuth(
  loginPath: string = process.env.NEXT_PUBLIC_LOGIN_PATH || '/login'
): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (checkAuthTokens()) {
      setReady(true);
    } else {
      router.replace(loginPath);
    }
  }, [router, loginPath]);

  return ready;
}
