'use client';

import { useEffect } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { FORBIDDEN_EVENT } from '@agri/api-client/api';

/**
 * The single place a server 403 becomes a readable message (agri-web #99).
 *
 * The API client dispatches {@link FORBIDDEN_EVENT} on any forbidden response
 * (see `api.ts`); this listener — mounted once inside the AntD `App` context —
 * turns it into a localized notification. So if a caller's tier changes
 * mid-session and the UI still shows a control it should not, the write fails
 * with an explanation instead of a raw error.
 */
export default function ForbiddenNotifier() {
  const t = useTranslations();
  const { notification } = App.useApp();

  useEffect(() => {
    const handler = () => {
      notification.warning({
        key: 'agri-forbidden',
        message: t('access.forbiddenTitle'),
        description: t('access.forbiddenBody'),
        duration: 5,
      });
    };
    window.addEventListener(FORBIDDEN_EVENT, handler);
    return () => window.removeEventListener(FORBIDDEN_EVENT, handler);
  }, [notification, t]);

  return null;
}
