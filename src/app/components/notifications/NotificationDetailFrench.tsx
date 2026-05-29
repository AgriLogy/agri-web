'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Divider, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import {
  FaBolt,
  FaCalendarAlt,
  FaFaucet,
  FaLightbulb,
  FaLeaf,
  FaSeedling,
  FaSun,
  FaTint,
  FaThermometerHalf,
} from 'react-icons/fa';
import api from '@/app/lib/api';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import {
  evaluateV1NotificationDecision,
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
import type { NotificationPayload } from '@/app/components/notifications/Notification';

function formatDateShortFr(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDateTimeFr(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function pickExtra(
  raw: Record<string, unknown> | undefined,
  keys: string[]
): string {
  if (!raw) return '—';
  for (const k of keys) {
    const v = raw[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '—';
}

const decisionBadgeColor = (d: NotificationDecisionLevel) => {
  if (d === 'critical') return 'red.500';
  if (d === 'advisory') return 'orange.400';
  return 'green.500';
};

const decisionShortFr = (d: NotificationDecisionLevel) => {
  if (d === 'critical') return 'Action irrigation recommandée (seuil critique)';
  if (d === 'advisory') return 'Surveillance renforcée (ETo×Kc élevé)';
  return 'Aucune action urgente (dans les seuils)';
};

function Row({
  icon,
  label,
  value,
  boldValue,
  textColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  boldValue?: boolean;
  textColor: string;
}) {
  return (
    <HStack align="flex-start" spacing={2} py={1}>
      <Icon as={icon} mt={0.5} color="teal.500" boxSize={4} flexShrink={0} />
      <Text fontSize="sm" color={textColor}>
        {label ? (
          <>
            <Text as="span" fontWeight="semibold">
              {label}
            </Text>{' '}
          </>
        ) : null}
        <Text as="span" fontWeight={boldValue ? 'bold' : 'medium'}>
          {value}
        </Text>
      </Text>
    </HStack>
  );
}

function SectionTitle({
  children,
  textColor,
}: {
  children: React.ReactNode;
  textColor: string;
}) {
  return (
    <Text fontWeight="bold" fontSize="md" color={textColor} mt={1} mb={2}>
      {children}
    </Text>
  );
}

export interface NotificationDetailFrenchProps {
  id: number;
  notification: NotificationPayload;
  /** Raw API `notification` object for optional fields (CE, salinité, NPK, …). */
  rawNested?: Record<string, unknown>;
}

const NotificationDetailFrench: React.FC<NotificationDetailFrenchProps> = ({
  id,
  notification,
  rawNested,
}) => {
  const { textColor, mutedTextColor } = useColorModeStyles();
  const [userSalutation, setUserSalutation] = useState<string>('');

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
  const zoneLabel =
    configName.length > 0
      ? configName
      : notification.zone_name?.trim() ||
        (zoneId != null ? `Zone ${zoneId}` : 'Notification');

  const [engineResult, setEngineResult] = useState<DecisionEngineResult | null>(
    null
  );

  useEffect(() => {
    api
      .get<{ username?: string; first_name?: string }>('/users/me')
      .then((res) => {
        const first = res.data?.first_name?.trim();
        const user = res.data?.username?.trim();
        setUserSalutation(first || user || 'Utilisateur');
      })
      .catch(() => setUserSalutation('Utilisateur'));
  }, []);

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
    setEngineResult(result);
  }, [
    id,
    notification.ET0,
    notification.soil_humidity,
    notification.template_summary,
    zoneId,
    notification.notification_config_id,
    notification.notification_name,
    config?.kc,
    config?.criticalThresholdPct,
    config?.et0KcAdvisoryMm,
  ]);

  const ecVal = pickExtra(rawNested, [
    'soil_ec',
    'soil_ec_ds_m',
    'soil_conductivity',
    'ec_soil',
    'ec_soil_medium',
    'conductivity',
  ]);
  const npkVal = pickExtra(rawNested, [
    'soil_npk',
    'npk',
    'fertilizer_npk',
    'engrais_npk',
  ]);
  const salinityVal = pickExtra(rawNested, [
    'soil_salinity',
    'salinity',
    'salinite',
  ]);

  const lastIrrigationLine = (() => {
    const date = notification.last_irrigation_date;
    const water = notification.used_water_irrigation;
    const start = notification.last_start_irrigation_hour;
    const end = notification.last_finish_irrigation_hour;
    if (date && date !== '—' && water && water !== '—') {
      const dur =
        start && end && start !== '—' && end !== '—'
          ? ` / ${start} – ${end}`
          : '';
      return `Dernière irrigation le ${formatDateShortFr(date)} : ${water} L${dur}`;
    }
    if (date && date !== '—') {
      return `Dernière irrigation le ${formatDateShortFr(date)}`;
    }
    return '—';
  })();

  const irrigationDecisionLine = (() => {
    const perfect = notification.perfect_irrigation_period?.trim();
    if (perfect && perfect !== '—') return perfect;
    if (engineResult) {
      const rec = decisionShortFr(engineResult.decision);
      const etc = Number.isFinite(engineResult.et0TimesKc)
        ? ` — ETo×Kc ≈ ${engineResult.et0TimesKc.toFixed(2)} mm`
        : '';
      return `${rec}${etc}`;
    }
    return '—';
  })();

  if (notification.template_summary) {
    return (
      <VStack align="stretch" spacing={4}>
        <Box>
          <Text fontSize="lg" fontWeight="bold" color={textColor}>
            Bonjour {userSalutation}
          </Text>
          <Text fontSize="sm" color={mutedTextColor} mt={1}>
            Informations concernant votre parcelle agricole.
          </Text>
          <HStack mt={3} spacing={2} align="center">
            <Icon as={FaLightbulb} color="yellow.500" boxSize={5} />
            <Text fontWeight="bold" fontSize="md" color={textColor}>
              Alerte d’irrigation quotidienne — {zoneLabel}
            </Text>
          </HStack>
          <HStack mt={2} spacing={2}>
            <Icon as={FaCalendarAlt} color="gray.500" />
            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
              Date : {formatDateShortFr(notification.notification_date)}
            </Text>
          </HStack>
        </Box>
        <Divider />
        <Box
          p={4}
          borderRadius="lg"
          borderWidth="1px"
          bg="blue.50"
          _dark={{ bg: 'whiteAlpha.100' }}
        >
          <Text fontWeight="bold" mb={2} color={textColor}>
            Message
          </Text>
          <Text fontSize="sm" color={textColor}>
            {notification.template_summary}
          </Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={0}>
      <Box pb={4}>
        <Text fontSize="lg" fontWeight="bold" color={textColor}>
          Bonjour {userSalutation}
        </Text>
        <Text fontSize="sm" color={mutedTextColor} mt={1}>
          Informations concernant votre parcelle agricole.
        </Text>
        <HStack mt={4} spacing={2} align="flex-start">
          <Icon as={FaLightbulb} color="yellow.500" boxSize={5} mt={0.5} />
          <Text fontWeight="bold" fontSize="md" color={textColor}>
            Alerte d’irrigation quotidienne — {zoneLabel}
          </Text>
        </HStack>
        <HStack mt={2} spacing={2}>
          <Icon as={FaCalendarAlt} color="gray.500" />
          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
            Date : {formatDateShortFr(notification.notification_date)}
          </Text>
          <Text fontSize="xs" color={mutedTextColor}>
            ({formatDateTimeFr(notification.notification_date)})
          </Text>
        </HStack>
      </Box>

      <Divider />

      <Box py={4}>
        <SectionTitle textColor={textColor}>
          Météo des 2 derniers jours
        </SectionTitle>
        <Row
          icon={FaThermometerHalf}
          label="Température moyenne de l’air hier :"
          value={`${notification.yesterday_temperature} °C`}
          boldValue
          textColor={textColor}
        />
        <Row
          icon={FaTint}
          label="Humidité moyenne de l’air hier :"
          value={`${notification.yesterday_humidity} %`}
          boldValue
          textColor={textColor}
        />
        <Row
          icon={FaSun}
          label="Quantité d’eau évaporée hier (ET0) :"
          value={`${notification.ET0} mm`}
          boldValue
          textColor={textColor}
        />
        <Text
          fontWeight="semibold"
          fontSize="sm"
          mt={3}
          mb={1}
          color={textColor}
        >
          Dernière opération d’irrigation
        </Text>
        <Row
          icon={FaFaucet}
          label=""
          value={lastIrrigationLine}
          boldValue
          textColor={textColor}
        />
      </Box>

      <Divider />

      <Box py={4}>
        <SectionTitle textColor={textColor}>
          Informations d’aujourd’hui
        </SectionTitle>
        <Row
          icon={FaSeedling}
          label="Humidité actuelle du sol :"
          value={`${notification.soil_humidity} %`}
          boldValue
          textColor={textColor}
        />
        <Row
          icon={FaThermometerHalf}
          label="Température actuelle du sol :"
          value={`${notification.soil_temperature} °C`}
          boldValue
          textColor={textColor}
        />
        <Row
          icon={FaBolt}
          label="Conductivité électrique du sol (CE) :"
          value={ecVal === '—' ? '— dS/m' : `${ecVal} dS/m`}
          boldValue
          textColor={textColor}
        />
        <Row
          icon={FaLeaf}
          label="Quantité d’engrais N.P.K :"
          value={npkVal === '—' ? '— mg/kg' : `${npkVal} mg/kg`}
          boldValue
          textColor={textColor}
        />
        <Row
          icon={FaTint}
          label="Salinité du sol (CE / salinité) :"
          value={
            salinityVal === '—' ? '— dS/m · mg/L' : `${salinityVal} dS/m · mg/L`
          }
          boldValue
          textColor={textColor}
        />
        {engineResult && (
          <Text fontSize="xs" color={mutedTextColor} mt={2}>
            Aide décision :{' '}
            <Text as="span" color={decisionBadgeColor(engineResult.decision)}>
              {engineResult.decision.toUpperCase()}
            </Text>{' '}
            — {decisionShortFr(engineResult.decision)}
          </Text>
        )}
        <Divider my={4} />
        <HStack align="flex-start" spacing={2}>
          <Icon as={FaTint} color="primary.400" boxSize={5} mt={0.5} />
          <Box>
            <Text fontWeight="bold" fontSize="sm" color={textColor}>
              Décision d’irrigation aujourd’hui
            </Text>
            <Text
              fontSize="sm"
              fontWeight="bold"
              mt={1}
              color="primary.600"
              _dark={{ color: 'blue.300' }}
            >
              {irrigationDecisionLine}
            </Text>
          </Box>
        </HStack>
      </Box>
    </VStack>
  );
};

export default NotificationDetailFrench;
