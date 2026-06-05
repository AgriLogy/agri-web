'use client';

import { App, Skeleton, Tabs } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@chakra-ui/react';

import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import { adminUserApi, type AdminUserDetail } from '@/app/lib/adminUserApi';
import ActivityTab from './ActivityTab';
import AlertsNotifsTab from './AlertsNotifsTab';
import GraphsTab from './GraphsTab';
import ParamsTab from './ParamsTab';
import ProfileTab from './ProfileTab';
import SoilDataTab from './SoilDataTab';
import StationDataTab from './StationDataTab';
import UserHeaderActions from './UserHeaderActions';
import UserStatusLine from './UserStatusLine';
import ZonesTab from './ZonesTab';

type TabKey =
  | 'profile'
  | 'zones'
  | 'params'
  | 'graphs'
  | 'soil-data'
  | 'station-data'
  | 'alerts'
  | 'activity';

const KNOWN_TABS: TabKey[] = [
  'profile',
  'zones',
  'params',
  'graphs',
  'soil-data',
  'station-data',
  'alerts',
  'activity',
];

export type UserDetailShellProps = {
  username: string;
};

export function UserDetailShell({ username }: UserDetailShellProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get('tab') ?? 'profile';
  const activeTab: TabKey = (KNOWN_TABS as string[]).includes(rawTab)
    ? (rawTab as TabKey)
    : 'profile';

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await adminUserApi.retrieve(username);
      setUser(next);
    } catch {
      message.error(t('admin.userDetail.loadUserError'));
    } finally {
      setLoading(false);
    }
  }, [message, username]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleTabChange = (key: string) => {
    router.replace(`/admin/users/${encodeURIComponent(username)}?tab=${key}`);
  };

  const subtitle = useMemo(() => {
    if (loading || !user) return t('admin.userDetail.loading');
    return <UserStatusLine user={user} />;
  }, [loading, user, t]);

  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar
        title={user ? `${user.firstname} ${user.lastname}` : username}
        subtitle={subtitle}
        actions={
          user ? <UserHeaderActions user={user} onChange={setUser} /> : null
        }
      />

      <Box
        bg="app.surface"
        borderWidth="1px"
        borderColor="app.border"
        borderRadius="lg"
        px={{ base: 3, md: 4 }}
        py={{ base: 3, md: 4 }}
        minW={0}
      >
        {loading || !user ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            destroyOnHidden
            items={[
              {
                key: 'profile',
                label: t('admin.userDetail.tabProfile'),
                children: <ProfileTab user={user} onChange={setUser} />,
              },
              {
                key: 'zones',
                label: t('admin.userDetail.tabZones'),
                children: <ZonesTab username={username} />,
              },
              {
                key: 'params',
                label: t('admin.userDetail.tabParams'),
                children: <ParamsTab username={username} />,
              },
              {
                key: 'graphs',
                label: t('admin.userDetail.tabGraphs'),
                children: <GraphsTab username={username} />,
              },
              {
                key: 'soil-data',
                label: t('admin.userDetail.tabSoilData'),
                children: <SoilDataTab username={username} />,
              },
              {
                key: 'station-data',
                label: t('admin.userDetail.tabStationData'),
                children: <StationDataTab username={username} />,
              },
              {
                key: 'alerts',
                label: t('admin.userDetail.tabAlerts'),
                children: <AlertsNotifsTab username={username} />,
              },
              {
                key: 'activity',
                label: t('admin.userDetail.tabActivity'),
                children: <ActivityTab username={username} />,
              },
            ]}
          />
        )}
      </Box>
    </Box>
  );
}

export default UserDetailShell;
