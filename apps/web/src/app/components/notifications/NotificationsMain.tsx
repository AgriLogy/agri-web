'use client';
import React, { useEffect, useState } from 'react';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import { App, Button, Modal, Space } from 'antd';
import { PlusOutlined, BellOutlined } from '@ant-design/icons';
import NotificationListItem from '../notifications/NotificationListItem';
import EmptyBox from '../common/EmptyBox';
import axiosInstance from '@agri/api-client/api';
import {
  markNotificationReadInCache,
  mergeNotificationsForStorage,
  normalizeApiNotificationsList,
  NOTIFICATIONS_CACHE_UPDATED_EVENT,
  notificationRowZoneId,
  readNotificationsFromCache,
  removeNotificationFromCacheById,
  writeNotificationsToCache,
} from '@agri/api-client/notificationsCacheStorage';
import { useTranslations } from 'next-intl';
import { useNotificationBellCounts } from '@/app/hooks/useNotificationBellCounts';
import ZoneNotificationConfigureForm from '@/app/components/notifications/ZoneNotificationConfigureForm';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getNotificationConfigById,
  getNotificationConfigsForZone,
  resolveStoredNotificationConfigId,
} from '@agri/api-client/zoneNotificationConfigStorage';

const NotificationsMain: React.FC = () => {
  const t = useTranslations();
  const { message } = App.useApp();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { refresh: refreshBell } = useNotificationBellCounts();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [configureInitialZoneId, setConfigureInitialZoneId] = useState<
    number | undefined
  >(undefined);
  const [configureConfigId, setConfigureConfigId] = useState<
    string | undefined
  >(undefined);
  const [deleteNotifId, setDeleteNotifId] = useState<number | null>(null);
  const [configureIntent, setConfigureIntent] = useState<'create' | 'edit'>(
    'create'
  );
  const searchParams = useSearchParams();
  const router = useRouter();

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const stripConfigureParamsFromUrl = () => {
    if (searchParams.get('zoneId') || searchParams.get('configId')) {
      router.replace('/notifications', { scroll: false });
    }
  };

  const closeConfigureModal = () => {
    setConfigureIntent('create');
    setConfigureInitialZoneId(undefined);
    setConfigureConfigId(undefined);
    stripConfigureParamsFromUrl();
    onClose();
  };

  const refetchNotifications = () => {
    void axiosInstance
      .get('/notifications')
      .then((r) => {
        const apiRows = normalizeApiNotificationsList(r.data?.notifications);
        const merged = mergeNotificationsForStorage(apiRows);
        setNotifications(merged as any[]);
        writeNotificationsToCache(merged);
      })
      .catch(() => {
        setNotifications(readNotificationsFromCache() as any[]);
      });
  };

  const syncNotificationsFromCache = () => {
    setNotifications(readNotificationsFromCache() as any[]);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosInstance.get('/notifications');
        const apiRows = normalizeApiNotificationsList(
          response.data?.notifications
        );
        const merged = mergeNotificationsForStorage(apiRows);
        setNotifications(merged as any[]);
        writeNotificationsToCache(merged);
      } catch {
        setNotifications(readNotificationsFromCache() as any[]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const syncFromCache = () => {
      setNotifications(readNotificationsFromCache() as any[]);
    };
    window.addEventListener(NOTIFICATIONS_CACHE_UPDATED_EVENT, syncFromCache);
    return () =>
      window.removeEventListener(
        NOTIFICATIONS_CACHE_UPDATED_EVENT,
        syncFromCache
      );
  }, []);

  useEffect(() => {
    if (
      isOpen &&
      configureIntent === 'edit' &&
      !configureConfigId &&
      configureInitialZoneId != null
    ) {
      const list = getNotificationConfigsForZone(configureInitialZoneId);
      if (list.length === 1) {
        setConfigureConfigId(list[0].configId);
      }
    }
  }, [isOpen, configureIntent, configureConfigId, configureInitialZoneId]);

  useEffect(() => {
    const cid = searchParams.get('configId')?.trim();
    const z = searchParams.get('zoneId');
    if (cid) {
      setConfigureIntent('edit');
      setConfigureConfigId(cid);
      const cfg = getNotificationConfigById(cid);
      setConfigureInitialZoneId(cfg?.zoneId);
      onOpen();
      return;
    }
    if (!z) return;
    const id = Number(z);
    if (!Number.isFinite(id)) return;
    const list = getNotificationConfigsForZone(id);
    if (list.length === 1) {
      setConfigureIntent('edit');
      setConfigureConfigId(list[0].configId);
      setConfigureInitialZoneId(id);
    } else {
      setConfigureIntent('create');
      setConfigureConfigId(undefined);
      setConfigureInitialZoneId(id);
    }
    onOpen();
  }, [searchParams]);

  const openConfigure = () => {
    setConfigureIntent('create');
    setConfigureInitialZoneId(undefined);
    setConfigureConfigId(undefined);
    stripConfigureParamsFromUrl();
    onOpen();
  };

  const openEditZone = (zoneId: number, configId?: string) => {
    if (configId?.trim()) {
      setConfigureIntent('edit');
      setConfigureConfigId(configId.trim());
      setConfigureInitialZoneId(zoneId);
      onOpen();
      return;
    }
    const list = getNotificationConfigsForZone(zoneId);
    if (list.length === 1) {
      setConfigureIntent('edit');
      setConfigureConfigId(list[0].configId);
      setConfigureInitialZoneId(zoneId);
      onOpen();
      return;
    }
    setConfigureIntent('create');
    setConfigureConfigId(undefined);
    setConfigureInitialZoneId(zoneId);
    onOpen();
  };

  const markNotificationRead = (id: number) => {
    markNotificationReadInCache(id);
    void refreshBell();
  };

  const confirmDeleteNotification = () => {
    if (deleteNotifId == null) return;
    const id = deleteNotifId;
    setDeleteNotifId(null);
    removeNotificationFromCacheById(id);
    setNotifications(readNotificationsFromCache() as any[]);
    void refreshBell();
    message.success({
      content: `${t('notifications.main.deletedToastTitle')} — ${t('notifications.main.deletedToastDescription')}`,
      duration: 4,
    });
  };

  if (loading) return <EmptyBox variant="loading" />;

  return (
    <div style={{ padding: 16 }}>
      <PageInfoBar
        title={t('notifications.main.title')}
        subtitle={t('notifications.main.subtitle')}
        actions={
          <Space wrap>
            <Button
              icon={<BellOutlined />}
              size="small"
              onClick={() => router.push('/notification-zones')}
            >
              {t('notificationZones.manage')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={openConfigure}
              data-testid="add-zone-notif"
            >
              {t('notifications.main.addZoneNotification')}
            </Button>
          </Space>
        }
      />

      {notifications.length === 0 ? (
        <EmptyBox variant="empty" text={t('notifications.list.empty')} />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: '100%',
          }}
        >
          {notifications.map((notification) => {
            const zid = notificationRowZoneId(notification);
            const rowCfgId = resolveStoredNotificationConfigId(notification);
            return (
              <NotificationListItem
                key={notification.id}
                id={notification.id}
                notification={{
                  ...notification.notification,
                  zone_id: zid,
                  zone_name: notification.zone_name,
                  notification_config_id: rowCfgId,
                  notification_name:
                    notification.notification?.notification_name,
                }}
                rawNested={notification.notification}
                is_read={notification.is_read}
                onOpen={() => markNotificationRead(notification.id)}
                onEditZone={
                  zid != null ? () => openEditZone(zid, rowCfgId) : undefined
                }
                onDeleteZone={
                  notification.id != null
                    ? () => setDeleteNotifId(notification.id)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      <Modal
        open={isOpen}
        onCancel={closeConfigureModal}
        footer={null}
        destroyOnHidden
        width="min(1200px, 100vw - 16px)"
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BellOutlined />
            {configureIntent === 'edit'
              ? t('notifications.main.editModalTitle')
              : t('notifications.main.newModalTitle')}
          </span>
        }
      >
        {isOpen && (
          <ZoneNotificationConfigureForm
            key={`${configureIntent}-${configureInitialZoneId ?? 'z'}-${configureConfigId ?? 'new'}`}
            intent={configureIntent}
            initialZoneId={configureInitialZoneId ?? null}
            initialConfigId={configureConfigId ?? null}
            onClose={closeConfigureModal}
            onSaved={() => {
              syncNotificationsFromCache();
              void refreshBell();
              refetchNotifications();
            }}
          />
        )}
      </Modal>

      <Modal
        open={deleteNotifId != null}
        onCancel={() => setDeleteNotifId(null)}
        onOk={confirmDeleteNotification}
        okText={t('notifications.main.delete')}
        cancelText={t('notifications.main.cancel')}
        okButtonProps={{ danger: true }}
        title={t('notifications.main.deleteDialogTitle')}
      >
        {t('notifications.main.deleteDialogBody')}
      </Modal>
    </div>
  );
};

export default NotificationsMain;
