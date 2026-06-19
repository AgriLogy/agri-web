'use client';

import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';

const IMPERSONATION_KEY = 'impersonation';

/**
 * Persistent top banner shown while the app is being viewed through a read-only
 * admin "view-as" session (flagged by `localStorage.impersonation`, set by the
 * /view-as handoff route). Mutations are already blocked server-side by the
 * read-only token; this banner makes the mode obvious and offers an Exit that
 * clears the session and returns to the admin console.
 */
export default function ImpersonationBanner() {
  const t = useTranslations('impersonation');
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    try {
      setUser(localStorage.getItem(IMPERSONATION_KEY));
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  if (!user) return null;

  const exit = () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(IMPERSONATION_KEY);
    } catch {
      /* ignore */
    }
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '/';
    window.location.href = adminUrl;
  };

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '8px 16px',
        background: '#d97706',
        color: '#fff',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      <EyeOutlined />
      <span>{t('banner', { user })}</span>
      <Button size="small" onClick={exit}>
        {t('exit')}
      </Button>
    </div>
  );
}
