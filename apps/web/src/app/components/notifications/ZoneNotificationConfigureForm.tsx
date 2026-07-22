'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Icon,
  Input,
  NumberInput,
  NumberInputField,
  Radio,
  RadioGroup,
  Select,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  useToast,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import {
  FaBell,
  FaBolt,
  FaChartLine,
  FaClock,
  FaCubes,
  FaEnvelopeOpenText,
  FaFan,
  FaFilter,
  FaInfoCircle,
  FaLeaf,
  FaMapMarkedAlt,
  FaMobileAlt,
  FaPen,
  FaPercent,
  FaRandom,
  FaSeedling,
  FaShower,
  FaSitemap,
  FaSlidersH,
  FaSun,
  FaTachometerAlt,
  FaTint,
  FaTree,
  FaVectorSquare,
  FaWater,
  FaWhatsapp,
} from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import api from '@agri/api-client/api';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import { fetchLastSensorSample } from '@/app/utils/fetchSensorLastValue';
import {
  notificationZoneApi,
  NOTIFICATION_ZONES_UPDATED_EVENT,
  type NotificationZone,
} from '@agri/api-client/notificationZoneApi';
import {
  buildZoneChoices,
  encodeZoneChoiceValue,
  type FarmZone,
} from '@agri/api-client/zonePickerChoices';
import {
  saveZoneNotificationConfig,
  getNotificationConfigById,
  getNotificationConfigsForZone,
  defaultKcProtocolStages,
  representativeKcFromStages,
  type ZoneNotificationConfig,
} from '@agri/api-client/zoneNotificationConfigStorage';
import KcProtocolTableModal from '@/app/components/notifications/KcProtocolTableModal';
import { evaluateV1NotificationDecision } from '@agri/api-client/notificationDecisionEngine';
import { dispatchZoneNotificationOutbound } from '@agri/api-client/notificationDispatch';
import {
  prependNotificationsToCache,
  removeLocalZoneTemplateNotificationsForConfig,
} from '@agri/api-client/notificationsCacheStorage';
import { buildLocalZoneConfirmationNotification } from '@agri/api-client/zoneNotificationTemplate';
import {
  DELIVERY_RATE_PRESETS,
  DELIVERY_UNITS,
  deliveryRateToMinutes,
  matchPresetKey,
  normalizeDeliveryRate,
  presetByKey,
  type DeliveryRate,
  type DeliveryUnit,
} from '@agri/api-client/notificationDeliveryRate';

const defaultConfig = (
  zoneId: number,
  configId = ''
): ZoneNotificationConfig => ({
  configId,
  zoneId,
  notificationZoneId: null,
  secteurLabel: '',
  notificationName: '',
  soilType: 'light',
  soilTawMm: 120,
  soilRawMm: 60,
  soilFcPct: 30,
  soilWpPct: 12,
  soilMoistureSource: 'avg_sensors',
  kcMode: 'table',
  kc: 0.85,
  et0Source: 'weather_station',
  precipSource: 'sensor',
  krFactor: 0.4,
  zoneAreaHa: 5,
  cropType: 'Tomates',
  flowRateM3h: 30,
  irrigationMethod: 'drip_sprinkler',
  intervalMinutes: 60,
  deliveryRate: { amount: 1, unit: 'hour' },
  lastNotifiedAt: null,
  soilPermeabilityPct: 75,
  valveMode: 'manual',
  vpdThresholdKpa: 0.5,
  rootMonitoring: 'on',
  criticalThresholdPct: 20,
  et0KcAdvisoryMm: 4,
  maxWaterM3: 50,
  notifyEmail: true,
  notifySms: false,
  notifyWhatsapp: false,
  overridePhone: '',
  overrideEmail: '',
  updatedAt: '',
  kcProtocolName: 'Protocole météo culture',
  kcStages: defaultKcProtocolStages(),
  kcSensorHumidityLow: true,
  kcSensorHumidityMid: true,
  kcSensorHumidityHigh: true,
});

function normalizeKcStages(
  raw: ZoneNotificationConfig['kcStages'] | undefined
): ZoneNotificationConfig['kcStages'] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultKcProtocolStages();
  return raw.map((s) => ({
    stageName: String(s.stageName ?? ''),
    durationDays: Math.max(0, Math.round(Number(s.durationDays) || 0)),
    kcStart: Math.min(2, Math.max(0, Number(s.kcStart) || 0)),
    kcEnd: Math.min(2, Math.max(0, Number(s.kcEnd) || 0)),
    amountMm: Math.max(0, Number(s.amountMm) || 0),
    active: s.active !== false,
  }));
}

function mergeZoneConfig(
  zoneId: number,
  saved?:
    | ZoneNotificationConfig
    | (Partial<ZoneNotificationConfig> & Record<string, unknown>)
): ZoneNotificationConfig {
  const base = defaultConfig(zoneId);
  if (!saved) return base;
  const {
    contactEmail: _e,
    contactPhone: _p,
    ...rest
  } = saved as Record<string, unknown>;
  const merged = {
    ...base,
    ...(rest as Partial<ZoneNotificationConfig>),
    zoneId,
  };
  if (typeof merged.configId !== 'string' || !merged.configId.trim()) {
    merged.configId = base.configId;
  }
  if (typeof merged.secteurLabel !== 'string') merged.secteurLabel = '';
  merged.kcStages = normalizeKcStages(merged.kcStages);
  if (typeof merged.kcProtocolName !== 'string') {
    merged.kcProtocolName = base.kcProtocolName;
  }
  if (merged.kcMode === 'table') {
    merged.kc = representativeKcFromStages(merged.kcStages);
  }
  if (typeof merged.kcSensorHumidityLow !== 'boolean') {
    merged.kcSensorHumidityLow = base.kcSensorHumidityLow;
  }
  if (typeof merged.kcSensorHumidityMid !== 'boolean') {
    merged.kcSensorHumidityMid = base.kcSensorHumidityMid;
  }
  if (typeof merged.kcSensorHumidityHigh !== 'boolean') {
    merged.kcSensorHumidityHigh = base.kcSensorHumidityHigh;
  }
  return merged;
}

function pickInitialZoneId(
  zones: { id: number; name: string }[],
  initialZoneId: number | null | undefined
): number | undefined {
  if (!zones.length) return undefined;
  if (
    initialZoneId != null &&
    Number.isFinite(initialZoneId) &&
    zones.some((x) => x.id === initialZoneId)
  ) {
    return initialZoneId;
  }
  return zones[0]?.id;
}

function LabelWithIcon({
  icon,
  children,
  iconColor = 'teal.500',
  labelColor,
}: {
  icon: IconType;
  children: React.ReactNode;
  iconColor?: string;
  labelColor: string;
}) {
  return (
    <FormLabel
      display="flex"
      alignItems="center"
      gap={2}
      mb={2}
      fontWeight="medium"
      color={labelColor}
    >
      <Icon
        as={icon}
        boxSize={4}
        color={iconColor}
        flexShrink={0}
        aria-hidden
      />
      <span>{children}</span>
    </FormLabel>
  );
}

function PanelTitle({
  icon,
  title,
  accent = 'green.400',
  titleColor,
}: {
  icon: IconType;
  title: string;
  accent?: string;
  titleColor: string;
}) {
  return (
    <HStack mb={4} spacing={3}>
      <Icon as={icon} boxSize={6} color={accent} aria-hidden />
      <Text fontWeight="bold" fontSize="md" color={titleColor}>
        {title}
      </Text>
    </HStack>
  );
}

export type ZoneNotificationConfigureFormProps = {
  /** When provided, selects this zone after zones load (e.g. deep link). */
  initialZoneId?: number | null;
  /** When provided, loads this notification configuration (secteur) for editing. */
  initialConfigId?: string | null;
  /** create = nouvelle config ; edit = modifier une zone existante (affiche les données sauvegardées). */
  intent?: 'create' | 'edit';
  onClose: () => void;
  onSaved?: () => void;
};

const ZoneNotificationConfigureForm: React.FC<
  ZoneNotificationConfigureFormProps
> = ({
  initialZoneId,
  initialConfigId,
  intent = 'create',
  onClose,
  onSaved,
}) => {
  const t = useTranslations();
  const { bg, textColor, mutedTextColor } = useColorModeStyles();
  const toast = useToast();
  const {
    isOpen: isKcTableOpen,
    onOpen: onKcTableOpen,
    onClose: onKcTableClose,
  } = useDisclosure();

  const [zones, setZones] = useState<FarmZone[]>([]);
  const [notificationZones, setNotificationZones] = useState<
    NotificationZone[]
  >([]);
  const [zoneId, setZoneId] = useState<number>(0);
  const [form, setForm] = useState<ZoneNotificationConfig | null>(null);
  const [nameError, setNameError] = useState(false);
  /** Live VPD reading pulled from the captor (`/sensors/vpd`) for the selected zone. */
  const [vpdLive, setVpdLive] = useState<number | null>(null);
  const [vpdLoading, setVpdLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Farm zones and the user's custom notification zones (the ones created
        // on /notification-zones) both feed the Zone dropdown. The custom list
        // is best-effort: a failure there must not hide the farm zones.
        const [res, custom] = await Promise.all([
          api.get<FarmZone[]>('/zones'),
          notificationZoneApi.list().catch((k) => {
            logOptionalApiFailure(
              'ZoneNotificationConfigure: notification zones',
              k
            );
            return [] as NotificationZone[];
          }),
        ]);
        const z = res.data || [];
        setZones(z);
        setNotificationZones(
          Array.isArray(custom) ? custom.filter((c) => c.is_active) : []
        );
        if (z.length > 0) {
          let cfgId = initialConfigId?.trim() ?? '';

          if (intent === 'edit' && !cfgId) {
            const initialId = pickInitialZoneId(z, initialZoneId ?? null);
            if (initialId != null) {
              const list = getNotificationConfigsForZone(initialId);
              if (list.length === 1) {
                cfgId = list[0].configId;
              } else if (list.length > 1) {
                cfgId = list[0].configId;
                toast({
                  title: t('notifications.configForm.multiSectorTitle'),
                  description: t(
                    'notifications.configForm.multiSectorDescription'
                  ),
                  status: 'info',
                  duration: 5000,
                });
              }
            }
          }

          if (cfgId) {
            const cfg = getNotificationConfigById(cfgId);
            const initialId =
              cfg?.zoneId ?? pickInitialZoneId(z, initialZoneId ?? null);
            if (initialId !== undefined) {
              setZoneId(initialId);
              setForm(
                mergeZoneConfig(
                  initialId,
                  cfg ??
                    ({
                      configId: cfgId,
                      zoneId: initialId,
                    } as Partial<ZoneNotificationConfig>)
                )
              );
            }
          } else if (intent !== 'edit') {
            const initialId = pickInitialZoneId(z, initialZoneId ?? null);
            if (initialId !== undefined) {
              setZoneId(initialId);
              const draftId =
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                  ? crypto.randomUUID()
                  : `cfg-${Date.now()}`;
              setForm(
                mergeZoneConfig(initialId, {
                  configId: draftId,
                  zoneId: initialId,
                } as Partial<ZoneNotificationConfig>)
              );
            }
          } else {
            const initialId = pickInitialZoneId(z, initialZoneId ?? null);
            if (initialId !== undefined) {
              setZoneId(initialId);
              toast({
                title: t('notifications.configForm.configNotFoundTitle'),
                description: t(
                  'notifications.configForm.configNotFoundDescription'
                ),
                status: 'warning',
              });
              setForm(mergeZoneConfig(initialId, undefined));
            }
          }
        }
      } catch (k) {
        logOptionalApiFailure('ZoneNotificationConfigure: zones', k);
        toast({
          title: t('notifications.configForm.zonesLoadError'),
          status: 'error',
        });
      }
    };
    void load();
  }, [initialZoneId, initialConfigId, intent, toast]);

  // A zone created on /notification-zones must show up in the picker without a
  // reload: refresh the custom-zone list whenever the manager reports a change.
  useEffect(() => {
    const refresh = () => {
      void notificationZoneApi
        .list()
        .then((list) =>
          setNotificationZones(
            Array.isArray(list) ? list.filter((c) => c.is_active) : []
          )
        )
        .catch((k) =>
          logOptionalApiFailure(
            'ZoneNotificationConfigure: notification zones refresh',
            k
          )
        );
    };
    window.addEventListener(NOTIFICATION_ZONES_UPDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(NOTIFICATION_ZONES_UPDATED_EVENT, refresh);
  }, []);

  // VPD is read from the captor, never typed by the user. Pull the latest
  // `/sensors/vpd` sample for the selected zone and mirror it into the form so
  // the saved config + decision engine use the real sensor value.
  useEffect(() => {
    if (!zoneId) return;
    let cancelled = false;
    setVpdLoading(true);
    fetchLastSensorSample('vpd', zoneId)
      .then((sample) => {
        if (cancelled) return;
        const v = sample?.rawValue ?? null;
        setVpdLive(v);
        if (v != null) {
          setForm((f) => (f ? { ...f, vpdThresholdKpa: v } : f));
        }
      })
      .finally(() => {
        if (!cancelled) setVpdLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [zoneId]);

  const zoneChoices = useMemo(
    () => buildZoneChoices(zones, notificationZones),
    [zones, notificationZones]
  );

  const selectedNotificationZoneId = form?.notificationZoneId ?? null;

  const selectedZoneValue = useMemo(() => {
    if (
      selectedNotificationZoneId != null &&
      notificationZones.some((z) => z.id === selectedNotificationZoneId)
    ) {
      return encodeZoneChoiceValue('notification', selectedNotificationZoneId);
    }
    return encodeZoneChoiceValue('farm', zoneId);
  }, [selectedNotificationZoneId, notificationZones, zoneId]);

  const selectedZoneLabel = useMemo(
    () => zoneChoices.find((c) => c.value === selectedZoneValue)?.label,
    [zoneChoices, selectedZoneValue]
  );

  const update = <K extends keyof ZoneNotificationConfig>(
    key: K,
    value: ZoneNotificationConfig[K]
  ) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  /** Set the flexible delivery rate (and keep legacy intervalMinutes in sync). */
  const setDeliveryRate = (next: DeliveryRate) => {
    const norm = normalizeDeliveryRate(next);
    setForm((f) =>
      f
        ? {
            ...f,
            deliveryRate: norm,
            intervalMinutes: deliveryRateToMinutes(norm),
          }
        : f
    );
  };

  const apply = async () => {
    if (!form) {
      toast({
        title: t('notifications.configForm.loading'),
        status: 'warning',
      });
      return;
    }
    if (!zones.length) {
      toast({
        title: t('notifications.configForm.noZoneAvailable'),
        status: 'error',
      });
      return;
    }
    const resolvedZoneId = zones.some((z) => z.id === zoneId)
      ? zoneId
      : form.zoneId;
    if (
      !zones.some((z) => z.id === resolvedZoneId) &&
      form.notificationZoneId == null
    ) {
      toast({
        title: t('notifications.configForm.selectZone'),
        status: 'warning',
      });
      return;
    }
    const cfgId = form.configId?.trim();
    if (!cfgId) {
      toast({
        title: t('notifications.configForm.missingConfigId'),
        status: 'error',
      });
      return;
    }
    const notificationName = (form.notificationName ?? '').trim();
    if (!notificationName) {
      setNameError(true);
      toast({
        title: t('notifications.configForm.nameRequired'),
        status: 'warning',
      });
      return;
    }
    const toSave = {
      ...form,
      zoneId: resolvedZoneId,
      configId: cfgId,
      notificationName,
    };

    removeLocalZoneTemplateNotificationsForConfig(cfgId);
    saveZoneNotificationConfig(toSave);

    const zoneLabel =
      selectedZoneLabel ??
      zones.find((z) => z.id === toSave.zoneId)?.name ??
      t('notifications.configForm.zoneNumber', { id: toSave.zoneId });

    // Exactly ONE card per config: removeLocalZoneTemplate… above cleared any
    // prior representation row for this config, so this re-adds a single
    // editable/deletable card. (Reverts the "toast, no card" change — the card
    // is how a saved config appears in the list; the periodic reminder no longer
    // fires immediately, so there's no second card on save.)
    prependNotificationsToCache([
      buildLocalZoneConfirmationNotification({
        configId: cfgId,
        zoneId: toSave.zoneId,
        zoneName: zoneLabel,
        notificationName: toSave.notificationName,
        secteurLabel: toSave.secteurLabel,
      }),
    ]);

    const sample = evaluateV1NotificationDecision({
      et0Mm: 5,
      soilHumidityPct: toSave.criticalThresholdPct - 1,
      kc: toSave.kc,
      thresholds: {
        humidityCriticalPct: toSave.criticalThresholdPct,
        et0KcAdvisoryMm: toSave.et0KcAdvisoryMm,
      },
    });
    sample.logs.forEach((l) => console.info('[zone-config-apply]', l));

    // Outbound delivery is best-effort and FIRE-AND-FORGET — it must never
    // block (or, if it hangs, freeze) the modal close. The config is already
    // persisted; the email/SMS/WhatsApp send runs in the background.
    if (toSave.notifyEmail || toSave.notifySms || toSave.notifyWhatsapp) {
      void dispatchZoneNotificationOutbound({
        zoneId: toSave.zoneId,
        subject: t('notifications.configForm.outboundSubject', {
          name: toSave.notificationName || zoneLabel,
        }),
        message: t('notifications.configForm.outboundMessage'),
        channels: {
          email: toSave.notifyEmail,
          sms: toSave.notifySms,
          whatsapp: toSave.notifyWhatsapp,
        },
        ...(toSave.overridePhone?.trim()
          ? { contactPhone: toSave.overridePhone.trim() }
          : {}),
        ...(toSave.overrideEmail?.trim()
          ? { contactEmail: toSave.overrideEmail.trim() }
          : {}),
        decisionMeta: {
          rulesFired: sample.rulesFired,
          et0TimesKc: sample.et0TimesKc,
        },
      }).catch((e) =>
        console.error('zone notification outbound dispatch failed', e)
      );
    }

    toast({
      title:
        intent === 'edit'
          ? t('notifications.configForm.savedChanges')
          : t('notifications.configForm.savedConfig'),
      status: 'success',
    });
    onSaved?.();
    onClose();
  };

  if (!zones.length) {
    return (
      <Box p={6} color={textColor}>
        <Text fontWeight="medium">
          {t('notifications.configForm.noZoneForAccount')}
        </Text>
        <Text fontSize="sm" mt={2} color={mutedTextColor}>
          {t('notifications.configForm.noZoneHint')}
        </Text>
      </Box>
    );
  }

  if (!form) {
    return (
      <Box p={6} color={textColor}>
        <Text>{t('notifications.configForm.loading')}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <KcProtocolTableModal
        isOpen={isKcTableOpen}
        onClose={onKcTableClose}
        initialProtocolName={form.kcProtocolName}
        initialStages={form.kcStages}
        onSave={({ protocolName, stages }) => {
          const kc = representativeKcFromStages(stages);
          setForm((f) =>
            f
              ? {
                  ...f,
                  kcProtocolName: protocolName,
                  kcStages: stages,
                  kc,
                }
              : f
          );
        }}
      />
      <Grid
        templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
        gap={6}
        alignItems="start"
      >
        <GridItem>
          <Box bg={bg} p={5} borderRadius="xl" borderWidth="1px" boxShadow="sm">
            <PanelTitle
              icon={FaSeedling}
              title={t('notifications.configForm.zoneParamsTitle')}
              titleColor={textColor}
            />
            {intent === 'edit' ? (
              <Text fontSize="sm" color={mutedTextColor} mb={3}>
                {t('notifications.configForm.editHint')}
              </Text>
            ) : (
              <Text fontSize="sm" color={mutedTextColor} mb={3}>
                {t('notifications.configForm.createHint')}
              </Text>
            )}
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <LabelWithIcon icon={FaMapMarkedAlt} labelColor={textColor}>
                  {t('notifications.configForm.zoneLabel')}
                </LabelWithIcon>
                <Select
                  value={selectedZoneValue}
                  onChange={(e) => {
                    const choice = zoneChoices.find(
                      (c) => c.value === e.target.value
                    );
                    if (!choice) return;
                    setZoneId(choice.zoneId);
                    setForm((f) => ({
                      ...(f
                        ? mergeZoneConfig(choice.zoneId, f)
                        : mergeZoneConfig(choice.zoneId, undefined)),
                      notificationZoneId: choice.notificationZoneId,
                    }));
                  }}
                  data-testid="notif-zone-select"
                >
                  <optgroup label={t('notifications.configForm.zoneGroupFarm')}>
                    {zoneChoices
                      .filter((c) => c.kind === 'farm')
                      .map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                  </optgroup>
                  {zoneChoices.some((c) => c.kind === 'notification') && (
                    <optgroup
                      label={t(
                        'notifications.configForm.zoneGroupNotification'
                      )}
                    >
                      {zoneChoices
                        .filter((c) => c.kind === 'notification')
                        .map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </Select>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaSitemap} labelColor={textColor}>
                  {t('notifications.configForm.sectorLabel')}
                </LabelWithIcon>
                <Input
                  value={form.secteurLabel}
                  onChange={(e) => update('secteurLabel', e.target.value)}
                  placeholder={t('notifications.configForm.sectorPlaceholder')}
                />
                <Text fontSize="xs" color={mutedTextColor} mt={1}>
                  {t('notifications.configForm.sectorHint')}
                </Text>
              </FormControl>

              <FormControl isRequired isInvalid={nameError}>
                <LabelWithIcon icon={FaPen} labelColor={textColor}>
                  {t('notifications.configForm.notificationNameLabel')}
                </LabelWithIcon>
                <Input
                  value={form.notificationName}
                  onChange={(e) => {
                    update('notificationName', e.target.value);
                    if (nameError && e.target.value.trim()) setNameError(false);
                  }}
                  placeholder={t(
                    'notifications.configForm.notificationNamePlaceholder'
                  )}
                  data-testid="notif-name-input"
                />
                {nameError && (
                  <Text fontSize="xs" color="red.500" mt={1}>
                    {t('notifications.configForm.nameRequired')}
                  </Text>
                )}
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaFilter} labelColor={textColor}>
                  {t('notifications.configForm.soilTypeLabel')}
                </LabelWithIcon>
                <RadioGroup
                  value={form.soilType}
                  onChange={(v) =>
                    update('soilType', v as ZoneNotificationConfig['soilType'])
                  }
                >
                  <HStack spacing={4}>
                    <Radio value="light">
                      {t('notifications.configForm.soilLight')}
                    </Radio>
                    <Radio value="medium">
                      {t('notifications.configForm.soilMedium')}
                    </Radio>
                    <Radio value="heavy">
                      {t('notifications.configForm.soilHeavy')}
                    </Radio>
                  </HStack>
                </RadioGroup>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaInfoCircle} labelColor={textColor}>
                  {t('notifications.configForm.soilCharacteristicLabel')}
                </LabelWithIcon>
                <SimpleGrid columns={2} spacing={3}>
                  <Box>
                    <Text fontSize="xs" color={mutedTextColor} mb={1}>
                      {t('notifications.configForm.soilTaw')}
                    </Text>
                    <NumberInput
                      value={form.soilTawMm}
                      min={0}
                      step={1}
                      onChange={(_, v) =>
                        update('soilTawMm', Number.isFinite(v) ? v : 0)
                      }
                    >
                      <NumberInputField />
                    </NumberInput>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={mutedTextColor} mb={1}>
                      {t('notifications.configForm.soilRaw')}
                    </Text>
                    <NumberInput
                      value={form.soilRawMm}
                      min={0}
                      step={1}
                      onChange={(_, v) =>
                        update('soilRawMm', Number.isFinite(v) ? v : 0)
                      }
                    >
                      <NumberInputField />
                    </NumberInput>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={mutedTextColor} mb={1}>
                      {t('notifications.configForm.soilFc')}
                    </Text>
                    <NumberInput
                      value={form.soilFcPct}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(_, v) =>
                        update('soilFcPct', Number.isFinite(v) ? v : 0)
                      }
                    >
                      <NumberInputField />
                    </NumberInput>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={mutedTextColor} mb={1}>
                      {t('notifications.configForm.soilWp')}
                    </Text>
                    <NumberInput
                      value={form.soilWpPct}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(_, v) =>
                        update('soilWpPct', Number.isFinite(v) ? v : 0)
                      }
                    >
                      <NumberInputField />
                    </NumberInput>
                  </Box>
                </SimpleGrid>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaTint} labelColor={textColor}>
                  {t('notifications.configForm.soilMoistureSourceLabel')}
                </LabelWithIcon>
                <Select
                  value={form.soilMoistureSource}
                  onChange={(e) => update('soilMoistureSource', e.target.value)}
                >
                  <option value="avg_sensors">
                    {t('notifications.configForm.avgSensors')}
                  </option>
                  <option value="sensor_1">
                    {t('notifications.configForm.sensor1')}
                  </option>
                  <option value="sensor_2">
                    {t('notifications.configForm.sensor2')}
                  </option>
                  <option value="sensor_3">
                    {t('notifications.configForm.sensor3')}
                  </option>
                </Select>
              </FormControl>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <LabelWithIcon icon={FaChartLine} labelColor={textColor}>
                    {t('notifications.configForm.kcCoefficient')}
                  </LabelWithIcon>
                  <Select
                    value={form.kcMode}
                    onChange={(e) => {
                      const v = e.target
                        .value as ZoneNotificationConfig['kcMode'];
                      update('kcMode', v);
                      if (v === 'table') {
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                kc: representativeKcFromStages(f.kcStages),
                              }
                            : f
                        );
                        onKcTableOpen();
                      }
                    }}
                  >
                    <option value="table">
                      {t('notifications.configForm.kcModeTable')}
                    </option>
                    <option value="manual">
                      {t('notifications.configForm.kcModeManual')}
                    </option>
                  </Select>
                  {form.kcMode === 'table' && (
                    <Button
                      mt={2}
                      size="xs"
                      variant="outline"
                      colorScheme="brand"
                      borderRadius="full"
                      onClick={onKcTableOpen}
                    >
                      {t('notifications.configForm.openKcTable')}
                    </Button>
                  )}
                </FormControl>
                <FormControl>
                  <LabelWithIcon icon={FaBolt} labelColor={textColor}>
                    {t('notifications.configForm.kcValue')}
                  </LabelWithIcon>
                  <NumberInput
                    value={
                      form.kcMode === 'table'
                        ? representativeKcFromStages(form.kcStages)
                        : form.kc
                    }
                    min={0}
                    max={2}
                    step={0.05}
                    isReadOnly={form.kcMode === 'table'}
                    onChange={(_, v) => {
                      if (form.kcMode === 'manual') update('kc', v);
                    }}
                  >
                    <NumberInputField
                      opacity={form.kcMode === 'table' ? 0.85 : 1}
                    />
                  </NumberInput>
                  {form.kcMode === 'table' && (
                    <Text fontSize="xs" color={mutedTextColor} mt={1}>
                      {t('notifications.configForm.kcWeightedHint')}
                    </Text>
                  )}
                </FormControl>
              </SimpleGrid>

              <Grid
                templateColumns={{ base: '1fr', md: 'minmax(140px,auto) 1fr' }}
                gap={{ base: 2, md: 6 }}
                alignItems="start"
                mt={2}
              >
                <Text
                  fontWeight="semibold"
                  fontSize="sm"
                  color={textColor}
                  pt={1}
                >
                  {t('notifications.configForm.kcCoefficient')}
                </Text>
                <VStack align="stretch" spacing={2}>
                  <Checkbox
                    colorScheme="brand"
                    isChecked={form.kcSensorHumidityLow}
                    onChange={(e) =>
                      update('kcSensorHumidityLow', e.target.checked)
                    }
                    sx={{
                      '& .chakra-checkbox__label': {
                        color: 'green.600',
                        fontWeight: '500',
                      },
                    }}
                    _dark={{
                      '& .chakra-checkbox__label': { color: 'green.300' },
                    }}
                  >
                    {t('notifications.configForm.humidityLow')}
                  </Checkbox>
                  <Checkbox
                    colorScheme="brand"
                    isChecked={form.kcSensorHumidityMid}
                    onChange={(e) =>
                      update('kcSensorHumidityMid', e.target.checked)
                    }
                    sx={{
                      '& .chakra-checkbox__label': {
                        color: 'green.600',
                        fontWeight: '500',
                      },
                    }}
                    _dark={{
                      '& .chakra-checkbox__label': { color: 'green.300' },
                    }}
                  >
                    {t('notifications.configForm.humidityMid')}
                  </Checkbox>
                  <Checkbox
                    colorScheme="brand"
                    isChecked={form.kcSensorHumidityHigh}
                    onChange={(e) =>
                      update('kcSensorHumidityHigh', e.target.checked)
                    }
                    sx={{
                      '& .chakra-checkbox__label': {
                        color: 'green.600',
                        fontWeight: '500',
                      },
                    }}
                    _dark={{
                      '& .chakra-checkbox__label': { color: 'green.300' },
                    }}
                  >
                    {t('notifications.configForm.humidityHigh')}
                  </Checkbox>
                </VStack>
              </Grid>

              <FormControl>
                <LabelWithIcon icon={FaSun} labelColor={textColor}>
                  {t('notifications.configForm.et0ReferenceLabel')}
                </LabelWithIcon>
                <Select
                  value={form.et0Source}
                  onChange={(e) =>
                    update(
                      'et0Source',
                      e.target.value as ZoneNotificationConfig['et0Source']
                    )
                  }
                >
                  <option value="weather_station">
                    {t('notifications.configForm.et0WeatherStation')}
                  </option>
                  <option value="calculated">
                    {t('notifications.configForm.et0LocalCalc')}
                  </option>
                </Select>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaPercent} labelColor={textColor}>
                  {t('notifications.configForm.krFactor', {
                    value: form.krFactor.toFixed(2),
                  })}
                </LabelWithIcon>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={form.krFactor}
                  onChange={(v) => update('krFactor', v)}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <HStack align="flex-start">
                <FormControl>
                  <LabelWithIcon icon={FaVectorSquare} labelColor={textColor}>
                    {t('notifications.configForm.surfaceHa')}
                  </LabelWithIcon>
                  <NumberInput
                    value={form.zoneAreaHa}
                    min={0}
                    step={0.1}
                    onChange={(_, v) => update('zoneAreaHa', v)}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <LabelWithIcon icon={FaLeaf} labelColor={textColor}>
                    {t('notifications.configForm.cropLabel')}
                  </LabelWithIcon>
                  <Input
                    value={form.cropType}
                    onChange={(e) => update('cropType', e.target.value)}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <LabelWithIcon icon={FaWater} labelColor={textColor}>
                  {t('notifications.configForm.flowRate')}
                </LabelWithIcon>
                <NumberInput
                  value={form.flowRateM3h}
                  min={0}
                  onChange={(_, v) =>
                    update('flowRateM3h', Number.isFinite(v) ? v : 0)
                  }
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </VStack>
          </Box>
        </GridItem>

        <GridItem>
          <Box bg={bg} p={5} borderRadius="xl" borderWidth="1px" boxShadow="sm">
            <PanelTitle
              icon={FaShower}
              title={t('notifications.configForm.irrigationPanelTitle')}
              accent="cyan.400"
              titleColor={textColor}
            />
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <LabelWithIcon icon={FaWater} labelColor={textColor}>
                  {t('notifications.configForm.irrigationMethodLabel')}
                </LabelWithIcon>
                <RadioGroup
                  value={form.irrigationMethod}
                  onChange={(v) =>
                    update(
                      'irrigationMethod',
                      v as ZoneNotificationConfig['irrigationMethod']
                    )
                  }
                >
                  <Stack>
                    <Radio value="drip">
                      {t('notifications.configForm.drip')}
                    </Radio>
                    <Radio value="drip_sprinkler">
                      {t('notifications.configForm.dripSprinkler')}
                    </Radio>
                    <Radio value="subsurface_drip">
                      {t('notifications.configForm.subsurfaceDrip')}
                    </Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaClock} labelColor={textColor}>
                  {t('notifications.deliveryRate.label')}
                </LabelWithIcon>
                <Stack spacing={2}>
                  <Select
                    value={
                      matchPresetKey(
                        normalizeDeliveryRate(form.deliveryRate)
                      ) ?? 'custom'
                    }
                    onChange={(e) => {
                      const preset = presetByKey(e.target.value);
                      if (preset) setDeliveryRate(preset.rate);
                    }}
                  >
                    {DELIVERY_RATE_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {t(`notifications.deliveryRate.preset.${p.key}`)}
                      </option>
                    ))}
                    <option value="custom">
                      {t('notifications.deliveryRate.preset.custom')}
                    </option>
                  </Select>
                  <HStack spacing={2}>
                    <NumberInput
                      min={1}
                      max={1000}
                      maxW="120px"
                      value={normalizeDeliveryRate(form.deliveryRate).amount}
                      onChange={(_, n) => {
                        if (!Number.isFinite(n)) return;
                        setDeliveryRate({
                          amount: n,
                          unit: normalizeDeliveryRate(form.deliveryRate).unit,
                        });
                      }}
                    >
                      <NumberInputField />
                    </NumberInput>
                    <Select
                      value={normalizeDeliveryRate(form.deliveryRate).unit}
                      onChange={(e) =>
                        setDeliveryRate({
                          amount: normalizeDeliveryRate(form.deliveryRate)
                            .amount,
                          unit: e.target.value as DeliveryUnit,
                        })
                      }
                    >
                      {DELIVERY_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {t(`notifications.deliveryRate.unit.${u}`)}
                        </option>
                      ))}
                    </Select>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    {t('notifications.deliveryRate.hint')}
                  </Text>
                </Stack>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaSlidersH} labelColor={textColor}>
                  {t('notifications.configForm.permeability', {
                    value: form.soilPermeabilityPct,
                  })}
                </LabelWithIcon>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={form.soilPermeabilityPct}
                  onChange={(v) => update('soilPermeabilityPct', v)}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaRandom} labelColor={textColor}>
                  {t('notifications.configForm.valveLabel')}
                </LabelWithIcon>
                <RadioGroup value="manual">
                  <Radio value="manual" isChecked isReadOnly>
                    {t('notifications.configForm.valveManual')}
                  </Radio>
                </RadioGroup>
                <Text fontSize="xs" color={mutedTextColor} mt={1}>
                  {t('notifications.configForm.valveManualOnlyHint')}
                </Text>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaFan} labelColor={textColor}>
                  {t('notifications.configForm.vpdThreshold')}
                </LabelWithIcon>
                <NumberInput value={vpdLive ?? form.vpdThresholdKpa} isReadOnly>
                  <NumberInputField opacity={0.85} />
                </NumberInput>
                <Text fontSize="xs" color={mutedTextColor} mt={1}>
                  {vpdLoading
                    ? t('notifications.configForm.vpdLoading')
                    : vpdLive != null
                      ? t('notifications.configForm.vpdSensorHint')
                      : t('notifications.configForm.vpdNoData')}
                </Text>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaTree} labelColor={textColor}>
                  {t('notifications.configForm.rootMonitoringLabel')}
                </LabelWithIcon>
                <Select
                  value={form.rootMonitoring}
                  onChange={(e) =>
                    update(
                      'rootMonitoring',
                      e.target.value as ZoneNotificationConfig['rootMonitoring']
                    )
                  }
                >
                  <option value="on">
                    {t('notifications.configForm.enabled')}
                  </option>
                  <option value="off">
                    {t('notifications.configForm.disabled')}
                  </option>
                </Select>
              </FormControl>

              <Divider />

              <HStack spacing={2}>
                <Icon as={FaTachometerAlt} color="orange.400" boxSize={5} />
                <Text fontWeight="semibold" color={textColor}>
                  {t('notifications.configForm.engineThresholdsTitle')}
                </Text>
              </HStack>

              <FormControl>
                <LabelWithIcon
                  icon={FaTint}
                  labelColor={textColor}
                  iconColor="blue.400"
                >
                  {t('notifications.configForm.criticalSoilHumidityLabel')}
                </LabelWithIcon>
                <Slider
                  min={5}
                  max={60}
                  step={1}
                  value={form.criticalThresholdPct}
                  onChange={(v) => update('criticalThresholdPct', v)}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <Text fontSize="sm" color="gray.500">
                  {t('notifications.configForm.criticalSoilHumidityHint', {
                    value: form.criticalThresholdPct,
                  })}
                </Text>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaBolt} labelColor={textColor}>
                  {t('notifications.configForm.et0KcAdvisoryLabel')}
                </LabelWithIcon>
                <NumberInput
                  value={form.et0KcAdvisoryMm}
                  min={0}
                  max={20}
                  step={0.5}
                  onChange={(_, v) => update('et0KcAdvisoryMm', v)}
                >
                  <NumberInputField />
                </NumberInput>
                <Text fontSize="sm" color="gray.500">
                  {t('notifications.configForm.et0KcAdvisoryHint')}
                </Text>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaCubes} labelColor={textColor}>
                  {t('notifications.configForm.maxWaterLabel')}
                </LabelWithIcon>
                <NumberInput
                  value={form.maxWaterM3}
                  min={0}
                  onChange={(_, v) => update('maxWaterM3', v)}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <Divider />

              <HStack spacing={2}>
                <Icon as={FaBell} color="purple.400" boxSize={5} />
                <Text fontWeight="semibold" color={textColor}>
                  {t('notifications.configForm.channelsTitle')}
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.500" mb={1}>
                {t('notifications.configForm.channelsHint')}
              </Text>

              <VStack align="stretch" spacing={3} pl={1}>
                <Checkbox
                  isChecked={form.notifyEmail}
                  onChange={(e) => update('notifyEmail', e.target.checked)}
                  colorScheme="brand"
                >
                  <HStack spacing={2} as="span">
                    <Icon as={FaEnvelopeOpenText} color="primary.400" />
                    <span>E-mail</span>
                  </HStack>
                </Checkbox>
                <Checkbox
                  isChecked={form.notifySms}
                  onChange={(e) => update('notifySms', e.target.checked)}
                  colorScheme="brand"
                >
                  <HStack spacing={2} as="span">
                    <Icon as={FaMobileAlt} color="green.500" />
                    <span>SMS</span>
                  </HStack>
                </Checkbox>
                <Checkbox
                  isChecked={form.notifyWhatsapp}
                  onChange={(e) => update('notifyWhatsapp', e.target.checked)}
                  colorScheme="brand"
                >
                  <HStack spacing={2} as="span">
                    <Icon as={FaWhatsapp} color="green.400" />
                    <span>WhatsApp</span>
                  </HStack>
                </Checkbox>

                {(form.notifySms || form.notifyWhatsapp) && (
                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>
                      {t('notifications.configForm.overridePhone')}
                    </FormLabel>
                    <Input
                      size="sm"
                      value={form.overridePhone ?? ''}
                      onChange={(e) => update('overridePhone', e.target.value)}
                      placeholder={t(
                        'notifications.configForm.overrideContactHint'
                      )}
                    />
                  </FormControl>
                )}
                {form.notifyEmail && (
                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>
                      {t('notifications.configForm.overrideEmail')}
                    </FormLabel>
                    <Input
                      size="sm"
                      value={form.overrideEmail ?? ''}
                      onChange={(e) => update('overrideEmail', e.target.value)}
                      placeholder={t(
                        'notifications.configForm.overrideContactHint'
                      )}
                    />
                  </FormControl>
                )}
              </VStack>
            </VStack>
          </Box>
        </GridItem>
      </Grid>

      <HStack justify="center" mt={8}>
        <Button
          type="button"
          colorScheme="brand"
          size="lg"
          leftIcon={<Icon as={FaBell} />}
          onClick={() => void apply()}
          data-testid="zone-config-save"
        >
          {t('notifications.configForm.saveZoneNotification')}
        </Button>
      </HStack>
    </Box>
  );
};

export default ZoneNotificationConfigureForm;
