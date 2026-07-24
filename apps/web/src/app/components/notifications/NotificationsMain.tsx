'use client';
import React, { useEffect, useRef, useState } from 'react';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react';
import { FaBell, FaPlus } from 'react-icons/fa';
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
  const toast = useToast();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
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
    toast({
      status: 'success',
      title: t('notifications.main.deletedToastTitle'),
      description: t('notifications.main.deletedToastDescription'),
      duration: 4000,
      isClosable: true,
    });
  };

  if (loading) return <EmptyBox variant="loading" />;

  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar
        title={t('notifications.main.title')}
        subtitle={t('notifications.main.subtitle')}
        actions={
          <HStack spacing={2}>
            <Button
              size="sm"
              variant="outline"
              colorScheme="brand"
              leftIcon={<FaBell />}
              onClick={() => router.push('/notification-zones')}
            >
              {t('notificationZones.manage')}
            </Button>
            <Button
              size="sm"
              colorScheme="brand"
              leftIcon={<FaPlus />}
              onClick={openConfigure}
              data-testid="add-zone-notif"
            >
              {t('notifications.main.addZoneNotification')}
            </Button>
          </HStack>
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
        isOpen={isOpen}
        onClose={closeConfigureModal}
        size={{ base: 'full', md: '4xl' }}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2}>
              <Icon as={FaBell} />
              <span>
                {configureIntent === 'edit'
                  ? t('notifications.main.editModalTitle')
                  : t('notifications.main.newModalTitle')}
              </span>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
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
          </ModalBody>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={deleteNotifId != null}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => setDeleteNotifId(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('notifications.main.deleteDialogTitle')}
            </AlertDialogHeader>
            <AlertDialogBody>
              {t('notifications.main.deleteDialogBody')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelDeleteRef}
                onClick={() => setDeleteNotifId(null)}
              >
                {t('notifications.main.cancel')}
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDeleteNotification}
                ml={3}
              >
                {t('notifications.main.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default NotificationsMain;
