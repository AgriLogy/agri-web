'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * Read-only "view-as" handoff target. The admin console opens this route with
 * the impersonation token in the URL hash:
 *   /view-as#token=<access>&user=<username>
 *
 * We read the hash (kept out of server logs / query strings), store the token
 * as the active session, flag impersonation mode (consumed by
 * ImpersonationBanner), strip the hash, and redirect to the dashboard. The
 * token is read-only — the backend rejects any mutation made with it.
 */
export default function ViewAsPage() {
  const router = useRouter();
  const t = useTranslations('impersonation');

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const user = params.get('user');

    if (token) {
      try {
        localStorage.setItem('accessToken', token);
        // No refresh token for read-only sessions; drop any stale one.
        localStorage.removeItem('refreshToken');
        if (user) localStorage.setItem('impersonation', user);
      } catch {
        /* localStorage unavailable */
      }
    }

    // Strip the token from the URL before navigating away.
    window.history.replaceState(null, '', window.location.pathname);
    router.replace('/');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '60vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {t('loading')}
    </div>
  );
}
