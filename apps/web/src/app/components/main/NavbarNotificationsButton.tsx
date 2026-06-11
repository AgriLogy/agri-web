'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Portal,
  Spinner,
  Text,
  VStack,
  Divider,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { BellIcon } from '@chakra-ui/icons';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import api from '@/app/lib/api';
import NotificationDetailFrench from '@/app/components/notifications/NotificationDetailFrench';
import type { NotificationPayload } from '@/app/components/notifications/Notification';
import {
  markAllNotificationsReadInCache,
  mergeNotificationsForStorage,
  normalizeApiNotificationsList,
  NOTIFICATIONS_CACHE_UPDATED_EVENT,
  readNotificationsFromCache,
  writeNotificationsToCache,
} from '@/app/lib/notificationsCacheStorage';
import { useNotificationBellCounts } from '@/app/hooks/useNotificationBellCounts';
import {
  deleteNotificationConfigById,
  getNotificationConfigById,
  resolveStoredNotificationConfigId,
} from '@/app/lib/zoneNotificationConfigStorage';

type PopupNotification = {
  id: number;
  is_read: boolean;
  zone_id?: number;
  notification?: {
    notification_date?: string;
    yesterday_temperature?: string;
    today_temperature?: string;
    soil_humidity?: string;
    ET0?: string;
    zone_name?: string;
  };
  zone_name?: string;
};

type PopupNotificationBody = PopupNotification['notification'] & {
  template_summary?: string;
};

function cacheRowToNotificationProps(row: unknown): {
  id: number;
  notification: NotificationPayload;
  is_read: boolean;
  read_at: string | null;
} | null {
  if (
    !row ||
    typeof row !== 'object' ||
    typeof (row as { id?: unknown }).id !== 'number'
  ) {
    return null;
  }
  const r = row as {
    id: number;
    is_read?: boolean;
    read_at?: string | null;
    zone_id?: number;
    zone_name?: string;
    notification?: Record<string, unknown>;
  };
  const n = r.notification ?? {};
  const str = (v: unknown, fallback = '—') =>
    v != null && String(v).trim() !== '' ? String(v) : fallback;

  const resolvedCfgId = resolveStoredNotificationConfigId(row);

  const notification: NotificationPayload = {
    yesterday_temperature: str(n.yesterday_temperature),
    today_temperature: str(n.today_temperature),
    yesterday_humidity: str(n.yesterday_humidity),
    today_humidity: str(n.today_humidity),
    ET0: str(n.ET0),
    soil_humidity: str(n.soil_humidity),
    soil_temperature: str(n.soil_temperature),
    soil_ph: str(n.soil_ph),
    perfect_irrigation_period: str(n.perfect_irrigation_period),
    last_irrigation_date: str(n.last_irrigation_date),
    last_start_irrigation_hour: str(n.last_start_irrigation_hour),
    last_finish_irrigation_hour: str(n.last_finish_irrigation_hour),
    used_water_irrigation: str(n.used_water_irrigation),
    notification_date:
      n.notification_date != null && String(n.notification_date).trim() !== ''
        ? String(n.notification_date)
        : new Date().toISOString(),
    zone_id:
      typeof r.zone_id === 'number'
        ? r.zone_id
        : typeof n.zone_id === 'number'
          ? n.zone_id
          : undefined,
    zone_name:
      typeof r.zone_name === 'string' && r.zone_name
        ? r.zone_name
        : typeof n.zone_name === 'string'
          ? n.zone_name
          : undefined,
    template_summary:
      typeof n.template_summary === 'string' ? n.template_summary : undefined,
    notification_config_id: resolvedCfgId,
    notification_name:
      typeof n.notification_name === 'string' ? n.notification_name : undefined,
  };

  return {
    id: r.id,
    notification,
    is_read: r.is_read === true,
    read_at: r.read_at ?? null,
  };
}

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

const NavbarNotificationsButton: React.FC = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const { hoverColor, headerBarBorder, textColor, headerBarBg } =
    useColorModeStyles();
  const { totalUnread, refresh } = useNotificationBellCounts();
  const [items, setItems] = useState<PopupNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose,
  } = useDisclosure();
  const [detailRow, setDetailRow] = useState<unknown>(null);

  const closeDetail = useCallback(() => {
    onDetailClose();
    setDetailRow(null);
  }, [onDetailClose]);

  const openDetail = useCallback(
    (row: unknown) => {
      setDetailRow(row);
      onDetailOpen();
    },
    [onDetailOpen]
  );

  const detailProps = detailRow ? cacheRowToNotificationProps(detailRow) : null;
  const detailZoneId = detailProps?.notification.zone_id ?? null;
  const detailRawNested = useMemo((): Record<string, unknown> | undefined => {
    if (!detailRow || typeof detailRow !== 'object') return undefined;
    const n = (detailRow as { notification?: unknown }).notification;
    return n && typeof n === 'object'
      ? (n as Record<string, unknown>)
      : undefined;
  }, [detailRow]);
  const detailConfigId = detailRow
    ? resolveStoredNotificationConfigId(detailRow)
    : undefined;

  const [deleteTargetConfigId, setDeleteTargetConfigId] = useState<
    string | null
  >(null);

  const goModifyZoneNotification = useCallback(() => {
    closeDetail();
    if (detailConfigId) {
      router.push(
        `/notifications?configId=${encodeURIComponent(detailConfigId)}`
      );
      return;
    }
    if (detailZoneId != null) {
      router.push(`/notifications?zoneId=${detailZoneId}`);
    }
  }, [closeDetail, detailConfigId, detailZoneId, router]);

  const confirmDeleteZoneNotification = useCallback(() => {
    if (deleteTargetConfigId == null) return;
    deleteNotificationConfigById(deleteTargetConfigId);
    setDeleteTargetConfigId(null);
    closeDetail();
    void refresh();
    toast({
      title: t('shell.notifications.deletedToastTitle'),
      description: t('shell.notifications.deletedToastBody'),
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
  }, [closeDetail, deleteTargetConfigId, refresh, toast]);

  useEffect(() => {
    const sync = () => {
      setItems(readNotificationsFromCache() as PopupNotification[]);
    };
    window.addEventListener(NOTIFICATIONS_CACHE_UPDATED_EVENT, sync);
    return () =>
      window.removeEventListener(NOTIFICATIONS_CACHE_UPDATED_EVENT, sync);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ notifications?: PopupNotification[] }>(
        '/notifications'
      );
      const apiRows = normalizeApiNotificationsList(res.data?.notifications);
      const merged = mergeNotificationsForStorage(apiRows);
      writeNotificationsToCache(merged);
    } catch {
      /* use existing cache */
    } finally {
      markAllNotificationsReadInCache();
      setItems(readNotificationsFromCache() as PopupNotification[]);
      setLoading(false);
      void refresh();
    }
  }, [refresh]);

  return (
    <Box
      position="relative"
      display="inline-flex"
      alignItems="center"
      flexShrink={0}
    >
      {totalUnread > 0 && (
        <Box
          position="absolute"
          top="6px"
          left="8px"
          w="10px"
          h="10px"
          borderRadius="full"
          bg="red.500"
          border="2px solid"
          borderColor={headerBarBg}
          zIndex={2}
          pointerEvents="none"
        />
      )}
      <Popover
        placement="bottom-end"
        closeOnBlur
        onOpen={() => void loadList()}
      >
        <PopoverTrigger>
          <IconButton
            icon={<BellIcon boxSize={5} />}
            aria-label={t('shell.notifications.openAria')}
            title={t('shell.notifications.title')}
            variant="ghost"
            size="md"
            borderRadius="xl"
            _hover={{ bg: 'blackAlpha.50', color: hoverColor }}
            _dark={{ _hover: { bg: 'whiteAlpha.100', color: hoverColor } }}
          />
        </PopoverTrigger>
        <Portal>
          <PopoverContent
            w="min(100vw - 24px, 380px)"
            border="1px solid"
            borderColor={headerBarBorder}
            boxShadow="lg"
            borderRadius="xl"
            _focus={{ outline: 'none' }}
          >
            <PopoverArrow />
            <PopoverHeader
              borderBottomWidth="1px"
              fontWeight="bold"
              fontSize="sm"
              py={3}
            >
              {t('shell.notifications.title')}
            </PopoverHeader>
            <PopoverBody p={0} maxH="min(60vh, 360px)" overflowY="auto">
              {loading ? (
                <Box py={8} textAlign="center">
                  <Spinner size="sm" mr={2} />
                  <Text as="span" fontSize="sm" color="gray.500">
                    {t('shell.notifications.loading')}
                  </Text>
                </Box>
              ) : items.length === 0 ? (
                <Text fontSize="sm" color="gray.500" py={6} px={4}>
                  {t('shell.notifications.empty')}
                </Text>
              ) : (
                <VStack spacing={0} align="stretch">
                  {items.slice(0, 12).map((row) => {
                    const n = (row.notification ?? {}) as PopupNotificationBody;
                    const template = n.template_summary;
                    const when = n.notification_date
                      ? new Date(n.notification_date).toLocaleString(
                          localeTag(locale),
                          {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }
                        )
                      : '—';
                    const zone = row.zone_name ?? n.zone_name ?? '';
                    const cfgId = resolveStoredNotificationConfigId(
                      row as unknown
                    );
                    const cfg = cfgId
                      ? getNotificationConfigById(cfgId)
                      : undefined;
                    const cfgName = cfg?.notificationName?.trim() ?? '';
                    const rowTitle =
                      cfgName.length > 0
                        ? cfgName
                        : zone || t('shell.notifications.title');
                    return (
                      <Box
                        key={row.id}
                        as="button"
                        type="button"
                        w="100%"
                        textAlign="left"
                        px={4}
                        py={3}
                        borderBottomWidth="1px"
                        borderColor={headerBarBorder}
                        opacity={row.is_read ? 0.75 : 1}
                        cursor="pointer"
                        transition="background 0.15s ease"
                        _hover={{
                          bg: 'blackAlpha.50',
                          _dark: { bg: 'whiteAlpha.100' },
                        }}
                        onClick={() => openDetail(row)}
                      >
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color={textColor}
                        >
                          {rowTitle}
                        </Text>
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          {when}
                        </Text>
                        {template ? (
                          <Text fontSize="xs" mt={2} noOfLines={4}>
                            {template}
                          </Text>
                        ) : (
                          <Text fontSize="xs" mt={2} noOfLines={2}>
                            {t('shell.notifications.compactSummary', {
                              temperature: n.today_temperature ?? '—',
                              soilHumidity: n.soil_humidity ?? '—',
                              et0: n.ET0 ?? '—',
                            })}
                          </Text>
                        )}
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </PopoverBody>
            <PopoverFooter
              borderTopWidth="1px"
              py={2}
              display="flex"
              flexDirection="column"
              gap={2}
            >
              <Divider />
              <Button
                as={Link}
                href="/notifications"
                size="sm"
                variant="outline"
                width="full"
                borderRadius="lg"
              >
                {t('shell.notifications.seeAll')}
              </Button>
            </PopoverFooter>
          </PopoverContent>
        </Portal>
      </Popover>

      <Modal
        isOpen={isDetailOpen}
        onClose={closeDetail}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent
          borderRadius="xl"
          mx={{ base: 2, md: 4 }}
          maxW="min(900px, 100vw - 16px)"
        >
          <ModalHeader
            fontSize="lg"
            pb={1}
            display="flex"
            alignItems="center"
            gap={2}
          >
            <BellIcon color="primary.400" />
            {t('shell.notifications.detailTitle')}
          </ModalHeader>
          <ModalCloseButton borderRadius="full" />
          <ModalBody pb={4}>
            {detailProps && (
              <NotificationDetailFrench
                key={detailProps.id}
                id={detailProps.id}
                notification={detailProps.notification}
                rawNested={detailRawNested}
              />
            )}
          </ModalBody>
          {(detailZoneId != null || detailConfigId != null) && (
            <ModalFooter
              borderTopWidth="1px"
              flexDirection={{ base: 'column', sm: 'row' }}
              gap={3}
            >
              <Button
                size="sm"
                colorScheme="brand"
                variant="solid"
                borderRadius="lg"
                onClick={goModifyZoneNotification}
                w={{ base: 'full', sm: 'auto' }}
              >
                {t('shell.notifications.modify')}
              </Button>
              {detailConfigId ? (
                <Button
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  borderRadius="lg"
                  onClick={() => setDeleteTargetConfigId(detailConfigId)}
                  w={{ base: 'full', sm: 'auto' }}
                >
                  {t('shell.notifications.delete')}
                </Button>
              ) : null}
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={deleteTargetConfigId != null}
        leastDestructiveRef={deleteCancelRef}
        onClose={() => setDeleteTargetConfigId(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('shell.notifications.deleteConfirmTitle')}
            </AlertDialogHeader>
            <AlertDialogBody>
              {t('shell.notifications.deleteConfirmBody')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={deleteCancelRef}
                onClick={() => setDeleteTargetConfigId(null)}
              >
                {t('shell.admin.cancel')}
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDeleteZoneNotification}
                ml={3}
              >
                {t('shell.notifications.deleteConfirmOk')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {totalUnread > 0 && (
        <Badge
          position="absolute"
          bottom="-4px"
          right="-2px"
          colorScheme="green"
          borderRadius="full"
          fontSize="0.7em"
          minW="1.6em"
          textAlign="center"
          pointerEvents="none"
          zIndex={2}
          boxShadow="sm"
        >
          {totalUnread > 99 ? '99+' : totalUnread}
        </Badge>
      )}
    </Box>
  );
};

export default NavbarNotificationsButton;
