'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Divider, HStack, Text } from '@chakra-ui/react';
import { useLocale, useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import {
  evaluateV1NotificationDecision,
  logDecisionToConsole,
  parseNumericSensor,
  type DecisionEngineResult,
  type NotificationDecisionLevel,
} from '@/app/lib/notificationDecisionEngine';
import {
  findNotificationConfigForZoneRow,
  getNotificationConfigById,
  thresholdsFromConfig,
  ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT,
} from '@/app/lib/zoneNotificationConfigStorage';

export interface NotificationPayload {
  yesterday_temperature: string;
  today_temperature: string;
  yesterday_humidity: string;
  today_humidity: string;
  ET0: string;
  soil_humidity: string;
  soil_temperature: string;
  soil_ph: string;
  perfect_irrigation_period: string;
  last_irrigation_date: string;
  last_start_irrigation_hour: string;
  last_finish_irrigation_hour: string;
  used_water_irrigation: string;
  notification_date: string;
  /** When present (API), binds this card to stored zone notification config & bell counts. */
  zone_id?: number;
  zone_name?: string;
  /** Binds this row to one stored notification configuration (secteur). */
  notification_config_id?: string;
  /** Optional API field to disambiguate when several configs share a zone. */
  notification_name?: string;
  /** Local confirmation row after saving zone notification config. */
  template_summary?: string;
}

interface NotificationProps {
  id: number;
  notification: NotificationPayload;
  is_read: boolean;
  read_at: string | null;
  /** Ouvre l’édition de la configuration correspondant à cette carte. */
  onEditZone?: () => void;
  /** Demande la suppression de la configuration locale pour cette carte. */
  onDeleteZone?: () => void;
}

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

const decisionBadgeColor = (d: NotificationDecisionLevel) => {
  if (d === 'critical') return 'red';
  if (d === 'advisory') return 'orange';
  return 'green';
};

const Notification: React.FC<NotificationProps> = ({
  id,
  notification,
  is_read: _isRead,
  onEditZone,
  onDeleteZone,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const decisionLabelFr = (d: NotificationDecisionLevel) => {
    if (d === 'critical') return t('notifications.card.decisionCritical');
    if (d === 'advisory') return t('notifications.card.decisionAdvisory');
    return t('notifications.card.decisionOk');
  };
  const { bg, textColor, hoverColor } = useColorModeStyles();
  const notificationDate = new Date(notification.notification_date);
  const formattedDate = notificationDate.toLocaleString(localeTag(locale));
  const [engineResult, setEngineResult] = useState<DecisionEngineResult | null>(
    null
  );

  const zoneId = notification.zone_id;
  const [configRev, setConfigRev] = useState(0);

  useEffect(() => {
    const bump = () => setConfigRev((n) => n + 1);
    window.addEventListener(ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT, bump);
    return () =>
      window.removeEventListener(ZONE_NOTIFICATION_CONFIG_UPDATED_EVENT, bump);
  }, []);

  const config = useMemo(() => {
    const cid = notification.notification_config_id?.trim();
    if (cid) return getNotificationConfigById(cid);
    if (zoneId == null) return undefined;
    return findNotificationConfigForZoneRow(
      zoneId,
      notification.notification_name
    );
  }, [
    zoneId,
    notification.notification_config_id,
    notification.notification_name,
    configRev,
  ]);

  const configName = config?.notificationName?.trim() ?? '';
  const secteur = config?.secteurLabel?.trim() ?? '';
  const zoneNotifName =
    configName.length > 0
      ? secteur
        ? `${configName} — ${secteur}`
        : configName
      : zoneId != null
        ? t('notifications.card.unnamedConfig')
        : '—';
  const notificationTitle =
    configName.length > 0
      ? configName
      : notification.zone_name?.trim() ||
        (zoneId != null
          ? t('notifications.card.zoneNumber', { id: zoneId })
          : t('notifications.card.notificationFallback'));

  const showLocationSub =
    Boolean(notification.zone_name?.trim()) &&
    notificationTitle !== notification.zone_name?.trim();

  useEffect(() => {
    if (notification.template_summary) {
      setEngineResult(null);
      return;
    }
    const kc = config?.kc ?? 1;
    const thresholds = thresholdsFromConfig(config);
    const result = evaluateV1NotificationDecision({
      et0Mm: parseNumericSensor(notification.ET0),
      soilHumidityPct: parseNumericSensor(notification.soil_humidity),
      kc,
      thresholds,
    });
    logDecisionToConsole(result, `notification id=${id}`);
    setEngineResult(result);
  }, [
    id,
    notification.ET0,
    notification.soil_humidity,
    zoneId,
    config?.kc,
    config?.criticalThresholdPct,
    config?.et0KcAdvisoryMm,
    notification.template_summary,
  ]);

  return (
    <Box
      bg={bg}
      p={4}
      borderWidth="1px"
      borderRadius="xl"
      boxShadow="md"
      _hover={{ borderColor: hoverColor }}
      color={textColor}
    >
      {zoneId != null ? (
        <Text fontSize="sm" mb={2} lineHeight="short">
          <Text
            as="span"
            fontWeight="semibold"
            color="gray.600"
            _dark={{ color: 'gray.400' }}
          >
            {t('notifications.card.nameLabel')}{' '}
          </Text>
          <Text as="span" fontWeight="bold" fontSize="md">
            {zoneNotifName}
          </Text>
        </Text>
      ) : (
        <Text fontWeight="bold" fontSize="md">
          {notificationTitle}
        </Text>
      )}
      {showLocationSub && (
        <Text fontSize="sm" mt={1} opacity={0.9}>
          📍 {notification.zone_name}
        </Text>
      )}
      <Text fontSize="sm" mt={2}>
        📅 {formattedDate}
      </Text>

      {notification.template_summary && (
        <Box
          mt={3}
          p={3}
          borderRadius="md"
          bg="blue.50"
          _dark={{ bg: 'whiteAlpha.100' }}
          borderWidth="1px"
          borderColor="blue.100"
        >
          <Badge colorScheme="brand" mb={2}>
            {t('notifications.card.zoneConfirmation')}
          </Badge>
          <Text fontSize="sm">{notification.template_summary}</Text>
        </Box>
      )}

      {engineResult && (
        <Box mt={3}>
          <Badge colorScheme={decisionBadgeColor(engineResult.decision)} mr={2}>
            {t('notifications.card.engineV1')} —{' '}
            {engineResult.decision.toUpperCase()}
          </Badge>
          <Text fontSize="sm" mt={2}>
            {decisionLabelFr(engineResult.decision)} — ETo×Kc ={' '}
            {Number.isFinite(engineResult.et0TimesKc)
              ? engineResult.et0TimesKc.toFixed(3)
              : '—'}{' '}
            mm ({t('notifications.card.kcUsed', { kc: config?.kc ?? 1 })})
          </Text>
          <Text fontSize="xs" color="gray.500" mt={1}>
            {t('notifications.card.rulesLabel')}{' '}
            {engineResult.rulesFired.join(', ')}
          </Text>
        </Box>
      )}

      <Box mt={4}>
        <Text fontWeight="bold" fontSize="md">
          🌡️ {t('notifications.card.temperature')}
        </Text>
        <Text>
          • {t('time.yesterday')} : {notification.yesterday_temperature} °C
        </Text>
        <Text>
          • {t('time.today')} : {notification.today_temperature} °C
        </Text>
      </Box>

      <Box mt={3}>
        <Text fontWeight="bold" fontSize="md">
          💧 {t('notifications.card.humidity')}
        </Text>
        <Text>
          • {t('time.yesterday')} : {notification.yesterday_humidity} %
        </Text>
        <Text>
          • {t('time.today')} : {notification.today_humidity} %
        </Text>
      </Box>

      <Box mt={3}>
        <Text fontWeight="bold" fontSize="md">
          🔎 ET0
        </Text>
        <Text>{notification.ET0} mm</Text>
      </Box>

      <Box mt={3}>
        <Text fontWeight="bold" fontSize="md">
          🌱 {t('notifications.card.soil')}
        </Text>
        <Text>
          • {t('notifications.card.humidityLabel')} :{' '}
          {notification.soil_humidity} %
        </Text>
        <Text>
          • {t('notifications.card.temperatureLabel')} :{' '}
          {notification.soil_temperature} °C
        </Text>
        <Text>
          • {t('units.ph')} : {notification.soil_ph}
        </Text>
      </Box>

      <Box mt={3}>
        <Text fontWeight="bold" fontSize="md">
          🚰 {t('notifications.card.irrigation')}
        </Text>
        <Text>
          • {t('notifications.card.idealPeriod')} :{' '}
          {notification.perfect_irrigation_period}
        </Text>
        <Text>
          • {t('notifications.card.lastDate')} :{' '}
          {notification.last_irrigation_date}
        </Text>
        <Text>
          • {t('notifications.card.usedWater')} :{' '}
          {notification.used_water_irrigation} L
        </Text>
      </Box>

      {zoneId != null && (onEditZone || onDeleteZone) && (
        <>
          <Divider
            my={4}
            borderColor="gray.200"
            _dark={{ borderColor: 'whiteAlpha.300' }}
          />
          <HStack spacing={3} flexWrap="wrap">
            {onEditZone && (
              <Button
                size="sm"
                colorScheme="brand"
                variant="solid"
                borderRadius="lg"
                onClick={() => onEditZone()}
              >
                {t('notifications.card.editNotification')}
              </Button>
            )}
            {onDeleteZone && (
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                borderRadius="lg"
                onClick={() => onDeleteZone()}
              >
                {t('notifications.card.deleteNotification')}
              </Button>
            )}
          </HStack>
        </>
      )}
    </Box>
  );
};

export default Notification;
