'use client';

import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Box,
  Flex,
  HStack,
  Text,
  VStack,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import { BellIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/navigation';
import axiosInstance from '@agri/api-client/api';
import {
  mergeNotificationsForStorage,
  normalizeApiNotificationsList,
  NOTIFICATIONS_CACHE_UPDATED_EVENT,
  readNotificationsFromCache,
  writeNotificationsToCache,
} from '@agri/api-client/notificationsCacheStorage';
import DashboardCard from '@component/dashboard/DashboardCard';
import Loading from '@component/common/Loading';

const MAX_ROWS = 5;

type NotificationRow = {
  id?: number;
  notification_date?: string;
  notification_name?: string;
  zone_name?: string;
  template_summary?: string;
};

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

const rowTime = (row: NotificationRow): number => {
  const ts = row?.notification_date ? Date.parse(row.notification_date) : NaN;
  return Number.isFinite(ts) ? ts : 0;
};

const RecentNotificationsCard = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const tableBg = useColorModeValue('white', 'gray.800');
  const itemBg = useColorModeValue('gray.50', 'gray.700');
  const titleColor = useColorModeValue('gray.800', 'gray.100');
  const metaColor = useColorModeValue('gray.500', 'gray.400');
  const linkColor = useColorModeValue('brand.600', 'brand.300');
  const p = useBreakpointValue({ base: 2, md: 4 });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axiosInstance.get('/notifications');
        if (cancelled) return;
        const apiRows = normalizeApiNotificationsList(res.data?.notifications);
        const merged = mergeNotificationsForStorage(apiRows);
        writeNotificationsToCache(merged);
        setRows(merged as NotificationRow[]);
      } catch {
        if (!cancelled)
          setRows(readNotificationsFromCache() as NotificationRow[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sync = () =>
      setRows(readNotificationsFromCache() as NotificationRow[]);
    window.addEventListener(NOTIFICATIONS_CACHE_UPDATED_EVENT, sync);
    return () =>
      window.removeEventListener(NOTIFICATIONS_CACHE_UPDATED_EVENT, sync);
  }, []);

  const recent = [...rows]
    .sort((a, b) => rowTime(b) - rowTime(a))
    .slice(0, MAX_ROWS);

  const content = loading ? (
    <Loading />
  ) : recent.length === 0 ? (
    <Text fontSize="sm" color={metaColor} py={4}>
      {t('shell.dashboard.recentNotificationsEmpty')}
    </Text>
  ) : (
    <VStack spacing={2} align="stretch">
      {recent.map((row, idx) => {
        const title =
          row.notification_name?.trim() ||
          row.zone_name?.trim() ||
          t('shell.dashboard.recentNotifications');
        const when = row.notification_date
          ? new Date(row.notification_date).toLocaleString(localeTag(locale), {
              dateStyle: 'short',
              timeStyle: 'short',
            })
          : '';
        return (
          <Box
            key={row.id ?? `${title}-${idx}`}
            bg={itemBg}
            borderRadius="md"
            px={3}
            py={2}
            cursor="pointer"
            _hover={{ opacity: 0.85 }}
            onClick={() => router.push('/notifications')}
          >
            <HStack align="start" spacing={2}>
              <BellIcon color={linkColor} mt={1} />
              <Box minW={0} flex={1}>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={titleColor}
                  noOfLines={1}
                >
                  {title}
                </Text>
                {row.zone_name && (
                  <Text fontSize="xs" color={metaColor} noOfLines={1}>
                    📍 {row.zone_name}
                  </Text>
                )}
                {when && (
                  <Text fontSize="xs" color={metaColor}>
                    {when}
                  </Text>
                )}
              </Box>
            </HStack>
          </Box>
        );
      })}
    </VStack>
  );

  return (
    <Box
      width="100%"
      height="100%"
      bg={tableBg}
      borderRadius="md"
      p={p}
      overflowX="auto"
    >
      <DashboardCard
        title={t('shell.dashboard.recentNotifications')}
        titleAddon={
          <Flex
            as="button"
            align="center"
            color={linkColor}
            fontSize="sm"
            fontWeight="medium"
            onClick={() => router.push('/notifications')}
          >
            {t('shell.dashboard.viewAll')}
          </Flex>
        }
        content={content}
      />
    </Box>
  );
};

export default RecentNotificationsCard;
