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
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, BellIcon } from '@chakra-ui/icons';
import Notification from '../notifications/Notification';
import axiosInstance from '@/app/lib/api';
import {
  mergeNotificationsForStorage,
  normalizeApiNotificationsList,
  NOTIFICATIONS_CACHE_UPDATED_EVENT,
  notificationRowZoneId,
  readNotificationsFromCache,
  writeNotificationsToCache,
} from '@/app/lib/notificationsCacheStorage';
import EmptyBox from '../common/EmptyBox';
import { useTranslations } from 'next-intl';
import { useNotificationBellCounts } from '@/app/hooks/useNotificationBellCounts';
import ZoneNotificationConfigureForm from '@/app/components/notifications/ZoneNotificationConfigureForm';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  deleteNotificationConfigById,
  getNotificationConfigById,
  getNotificationConfigsForZone,
  resolveStoredNotificationConfigId,
} from '@/app/lib/zoneNotificationConfigStorage';

const NotificationsMain: React.FC = () => {
  const t = useTranslations();
  const toast = useToast();
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { refresh: refreshBell } = useNotificationBellCounts();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [configureInitialZoneId, setConfigureInitialZoneId] = useState<
    number | undefined
  >(undefined);
  const [configureConfigId, setConfigureConfigId] = useState<
    string | undefined
  >(undefined);
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);
  const [configureIntent, setConfigureIntent] = useState<'create' | 'edit'>(
    'create'
  );
  const searchParams = useSearchParams();
  const router = useRouter();

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
  }, [searchParams, onOpen]);

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

  const confirmDeleteNotificationConfig = () => {
    if (deleteConfigId == null) return;
    const id = deleteConfigId;
    setDeleteConfigId(null);
    deleteNotificationConfigById(id);
    setNotifications(readNotificationsFromCache() as any[]);
    void refreshBell();
    toast({
      title: t('notifications.main.deletedToastTitle'),
      description: t('notifications.main.deletedToastDescription'),
      status: 'success',
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
          <Button
            colorScheme="brand"
            leftIcon={<AddIcon />}
            size="sm"
            onClick={openConfigure}
          >
            {t('notifications.main.addZoneNotification')}
          </Button>
        }
      />

      <SimpleGrid
        spacing={{ base: 3, md: 4 }}
        columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
      >
        {notifications.map((notification) => {
          const zid = notificationRowZoneId(notification);
          const rowCfgId = resolveStoredNotificationConfigId(notification);
          return (
            <Box key={notification.id}>
              <Notification
                id={notification.id}
                notification={{
                  ...notification.notification,
                  zone_id: zid,
                  zone_name: notification.zone_name,
                  notification_config_id: rowCfgId,
                  notification_name:
                    notification.notification?.notification_name,
                }}
                is_read={notification.is_read}
                read_at={notification.read_at}
                onEditZone={
                  zid != null ? () => openEditZone(zid, rowCfgId) : undefined
                }
                onDeleteZone={
                  zid != null && rowCfgId
                    ? () => setDeleteConfigId(rowCfgId)
                    : undefined
                }
              />
            </Box>
          );
        })}
      </SimpleGrid>

      <Modal
        isOpen={isOpen}
        onClose={closeConfigureModal}
        size="6xl"
        scrollBehavior="inside"
        blockScrollOnMount={false}
      >
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent
          borderRadius="xl"
          mx={{ base: 2, md: 4 }}
          maxW="min(1200px, 100vw - 16px)"
        >
          <ModalHeader
            display="flex"
            alignItems="center"
            gap={2}
            fontSize="lg"
            pb={1}
          >
            <BellIcon color="primary.400" />
            {configureIntent === 'edit'
              ? t('notifications.main.editModalTitle')
              : t('notifications.main.newModalTitle')}
          </ModalHeader>
          <ModalCloseButton borderRadius="full" onClick={closeConfigureModal} />
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
        isOpen={deleteConfigId != null}
        leastDestructiveRef={deleteCancelRef}
        onClose={() => setDeleteConfigId(null)}
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
                ref={deleteCancelRef}
                onClick={() => setDeleteConfigId(null)}
              >
                {t('notifications.main.cancel')}
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDeleteNotificationConfig}
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
