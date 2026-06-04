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
import { useTranslations } from 'next-intl';

import { adminUserApi, type ActivityEvent } from '@/app/lib/adminUserApi';

const ICONS: Record<string, React.ReactNode> = {
  joined: <UserAddOutlined />,
  login: <LoginOutlined />,
  notified: <BellOutlined />,
  zones: <EnvironmentOutlined />,
  alert: <AlertOutlined />,
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return iso;
  }
};

export type ActivityTabProps = { username: string };

export function ActivityTab({ username }: ActivityTabProps) {
  const t = useTranslations();
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
              <small style={{ opacity: 0.7 }}>{formatDate(event.at)}</small>
            )}
          </div>
        ),
      }))}
    />
  );
}

export default ActivityTab;
