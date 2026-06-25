'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { managerAffirmationApi } from '@agri/api-client/managerAffirmationApi';

/**
 * Lightweight top banner shown across pages while the current user has manager
 * affirmation requests still awaiting a decision (status === 'pending'). It
 * renders nothing when there is nothing pending, so it stays invisible for the
 * common case.
 */
export default function ManagerAffirmationBanner() {
  const t = useTranslations('managerAffirmation');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    managerAffirmationApi
      .list('pending')
      .then((items) => {
        if (active) setPending(items.length);
      })
      .catch(() => {
        /* silent: banner is best-effort */
      });
    return () => {
      active = false;
    };
  }, []);

  if (pending <= 0) return null;

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
        padding: '6px 16px',
        background: '#f59e0b',
        color: '#1f2937',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <span>{t('banner', { count: pending })}</span>
    </div>
  );
}
