'use client';

import {
  AlertOutlined,
  BellOutlined,
  EnvironmentOutlined,
  LoginOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { App, Empty, Skeleton, Timeline } from 'antd';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  adminUserApi,
  type ActivityEvent,
} from '@agri/api-client/adminUserApi';

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

const ICONS: Record<string, React.ReactNode> = {
  joined: <UserAddOutlined />,
  login: <LoginOutlined />,
  notified: <BellOutlined />,
  zones: <EnvironmentOutlined />,
  alert: <AlertOutlined />,
};

const formatDate = (iso: string | null, tag: string): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(tag);
  } catch {
    return iso;
  }
};

export type ActivityTabProps = { username: string };

export function ActivityTab({ username }: ActivityTabProps) {
  const t = useTranslations();
  const tag = localeTag(useLocale());
  const { message } = App.useApp();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const rows = await adminUserApi.activity(username);
        setEvents(rows);
      } catch {
        message.error(t('admin.activity.loadError'));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [message, t, username]);

  if (loading) return <Skeleton active paragraph={{ rows: 5 }} />;
  if (events.length === 0) {
    return <Empty description={t('admin.activity.empty')} />;
  }

  return (
    <Timeline
      mode="left"
      items={events.map((event, idx) => ({
        key: `${event.kind}-${idx}`,
        dot: ICONS[event.kind],
        children: (
          <div>
            <div>{event.label}</div>
            {event.at && (
              <small style={{ opacity: 0.7 }}>
                {formatDate(event.at, tag)}
              </small>
            )}
          </div>
        ),
      }))}
    />
  );
}

export default ActivityTab;
