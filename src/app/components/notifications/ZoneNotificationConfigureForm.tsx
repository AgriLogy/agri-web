'use client';

import React, { useEffect, useState } from 'react';
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
  InputGroup,
  InputRightAddon,
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
  FaCloud,
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
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import api from '@/app/lib/api';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import {
  saveZoneNotificationConfig,
  getNotificationConfigById,
  getNotificationConfigsForZone,
  defaultKcProtocolStages,
  representativeKcFromStages,
  type ZoneNotificationConfig,
} from '@/app/lib/zoneNotificationConfigStorage';
import KcProtocolTableModal from '@/app/components/notifications/KcProtocolTableModal';
import { evaluateV1NotificationDecision } from '@/app/lib/notificationDecisionEngine';
import { dispatchZoneNotificationOutbound } from '@/app/lib/notificationDispatch';
import {
  prependNotificationsToCache,
  removeLocalZoneTemplateNotificationsForConfig,
} from '@/app/lib/notificationsCacheStorage';
import { buildLocalZoneConfirmationNotification } from '@/app/lib/zoneNotificationTemplate';

const defaultConfig = (
  zoneId: number,
  configId = ''
): ZoneNotificationConfig => ({
  configId,
  zoneId,
  secteurLabel: '',
  notificationName: '',
  soilType: 'light',
  soilCharacteristics: 'TAW & RAW & FC & WP',
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
  soilPermeabilityPct: 75,
  valveMode: 'auto',
  vpdThresholdKpa: 0.5,
  rootMonitoring: 'on',
  criticalThresholdPct: 20,
  et0KcAdvisoryMm: 4,
  maxWaterM3: 50,
  notifyEmail: true,
  notifySms: false,
  notifyWhatsapp: false,
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
  const { bg, textColor, mutedTextColor } = useColorModeStyles();
  const toast = useToast();
  const {
    isOpen: isKcTableOpen,
    onOpen: onKcTableOpen,
    onClose: onKcTableClose,
  } = useDisclosure();

  const [zones, setZones] = useState<{ id: number; name: string }[]>([]);
  const [zoneId, setZoneId] = useState<number>(0);
  const [form, setForm] = useState<ZoneNotificationConfig | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ id: number; name: string }[]>('/zones');
        const z = res.data || [];
        setZones(z);
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
                  title: 'Plusieurs secteurs pour cette zone',
                  description:
                    'Ouvrez la modification depuis la carte de notification concernée pour cibler le bon secteur.',
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
                title: 'Configuration introuvable',
                description:
                  'Aucune notification enregistrée pour cette zone. Fermez ce panneau et utilisez « Ajouter une notification de zone ».',
                status: 'warning',
              });
              setForm(mergeZoneConfig(initialId, undefined));
            }
          }
        }
      } catch (k) {
        logOptionalApiFailure('ZoneNotificationConfigure: zones', k);
        toast({ title: 'Impossible de charger les zones', status: 'error' });
      }
    };
    void load();
  }, [initialZoneId, initialConfigId, intent, toast]);

  const update = <K extends keyof ZoneNotificationConfig>(
    key: K,
    value: ZoneNotificationConfig[K]
  ) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const apply = async () => {
    if (!form) {
      toast({ title: 'Chargement…', status: 'warning' });
      return;
    }
    if (!zones.length) {
      toast({ title: 'Aucune zone disponible', status: 'error' });
      return;
    }
    const resolvedZoneId = zones.some((z) => z.id === zoneId)
      ? zoneId
      : form.zoneId;
    if (!zones.some((z) => z.id === resolvedZoneId)) {
      toast({ title: 'Veuillez sélectionner une zone', status: 'warning' });
      return;
    }
    const cfgId = form.configId?.trim();
    if (!cfgId) {
      toast({
        title: 'Identifiant de configuration manquant',
        status: 'error',
      });
      return;
    }
    const hadConfigBefore =
      intent === 'edit' || getNotificationConfigById(cfgId) !== undefined;
    const toSave = { ...form, zoneId: resolvedZoneId, configId: cfgId };

    removeLocalZoneTemplateNotificationsForConfig(cfgId);
    saveZoneNotificationConfig(toSave);

    const zoneLabel =
      zones.find((z) => z.id === toSave.zoneId)?.name ??
      `Zone ${toSave.zoneId}`;
    if (!hadConfigBefore) {
      prependNotificationsToCache([
        buildLocalZoneConfirmationNotification({
          configId: cfgId,
          zoneId: toSave.zoneId,
          zoneName: zoneLabel,
          notificationName: toSave.notificationName,
          secteurLabel: toSave.secteurLabel,
        }),
      ]);
    }

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

    if (toSave.notifyEmail || toSave.notifySms || toSave.notifyWhatsapp) {
      await dispatchZoneNotificationOutbound({
        zoneId: toSave.zoneId,
        subject: `Agrilogy — configuration notification ${toSave.notificationName || zoneLabel}`,
        message:
          'La configuration des seuils de notification de zone a été enregistrée. Les canaux acceptés seront utilisés côté serveur lorsque disponibles.',
        channels: {
          email: toSave.notifyEmail,
          sms: toSave.notifySms,
          whatsapp: toSave.notifyWhatsapp,
        },
        decisionMeta: {
          rulesFired: sample.rulesFired,
          et0TimesKc: sample.et0TimesKc,
        },
      });
    }

    toast({
      title:
        intent === 'edit'
          ? 'Modifications enregistrées'
          : 'Configuration enregistrée',
      status: 'success',
    });
    onSaved?.();
    onClose();
  };

  if (!zones.length) {
    return (
      <Box p={6} color={textColor}>
        <Text fontWeight="medium">
          Aucune zone n&apos;est disponible pour ce compte.
        </Text>
        <Text fontSize="sm" mt={2} color={mutedTextColor}>
          Créez ou assignez d&apos;abord une parcelle / zone côté Agrilogy, puis
          revenez configurer une notification.
        </Text>
      </Box>
    );
  }

  if (!form) {
    return (
      <Box p={6} color={textColor}>
        <Text>Chargement…</Text>
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
              title="Paramètres zone"
              titleColor={textColor}
            />
            {intent === 'edit' ? (
              <Text fontSize="sm" color={mutedTextColor} mb={3}>
                Enregistrer met à jour cette notification (secteur, seuils et
                canaux) pour la zone sélectionnée.
              </Text>
            ) : (
              <Text fontSize="sm" color={mutedTextColor} mb={3}>
                Une même zone peut regrouper plusieurs secteurs : créez une
                notification par secteur pour des seuils et un suivi distincts.
                Un court message de confirmation est ajouté à la liste la
                première fois que vous enregistrez cette configuration.
              </Text>
            )}
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <LabelWithIcon icon={FaMapMarkedAlt} labelColor={textColor}>
                  Zone
                </LabelWithIcon>
                <Select
                  value={zoneId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setZoneId(id);
                    setForm((f) =>
                      f
                        ? mergeZoneConfig(id, f)
                        : mergeZoneConfig(id, undefined)
                    );
                  }}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaSitemap} labelColor={textColor}>
                  Secteur (dans la zone)
                </LabelWithIcon>
                <Input
                  value={form.secteurLabel}
                  onChange={(e) => update('secteurLabel', e.target.value)}
                  placeholder="Ex. Secteur nord, Parcelle B, Bloc 2…"
                />
                <Text fontSize="xs" color={mutedTextColor} mt={1}>
                  Identifie la portion de la zone couverte par cette
                  notification.
                </Text>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaPen} labelColor={textColor}>
                  Nom de la notification
                </LabelWithIcon>
                <Input
                  value={form.notificationName}
                  onChange={(e) => update('notificationName', e.target.value)}
                  placeholder="Ex. Zone 1 pommes de terre"
                />
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaFilter} labelColor={textColor}>
                  Type de sol
                </LabelWithIcon>
                <RadioGroup
                  value={form.soilType}
                  onChange={(v) =>
                    update('soilType', v as ZoneNotificationConfig['soilType'])
                  }
                >
                  <HStack spacing={4}>
                    <Radio value="light">Léger</Radio>
                    <Radio value="medium">Moyen</Radio>
                    <Radio value="heavy">Lourd</Radio>
                  </HStack>
                </RadioGroup>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaInfoCircle} labelColor={textColor}>
                  Caractéristique du sol
                </LabelWithIcon>
                <Input
                  value={form.soilCharacteristics}
                  onChange={(e) =>
                    update('soilCharacteristics', e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaTint} labelColor={textColor}>
                  Humidité du sol (source)
                </LabelWithIcon>
                <Select
                  value={form.soilMoistureSource}
                  onChange={(e) => update('soilMoistureSource', e.target.value)}
                >
                  <option value="avg_sensors">Capteur moyen (1+2+3)</option>
                  <option value="sensor_1">Capteur 1</option>
                  <option value="sensor_2">Capteur 2</option>
                  <option value="sensor_3">Capteur 3</option>
                </Select>
              </FormControl>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <LabelWithIcon icon={FaChartLine} labelColor={textColor}>
                    Coefficient Kc
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
                    <option value="table">Table</option>
                    <option value="manual">Manuel</option>
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
                      Ouvrir la table Kc…
                    </Button>
                  )}
                </FormControl>
                <FormControl>
                  <LabelWithIcon icon={FaBolt} labelColor={textColor}>
                    Valeur Kc
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
                      Moyenne pondérée (stades actifs) — éditable via la table.
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
                  Coefficient Kc
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
                    Humidité basse (%)
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
                    Humidité moyenne (%)
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
                    Humidité haute (%)
                  </Checkbox>
                </VStack>
              </Grid>

              <FormControl>
                <LabelWithIcon icon={FaSun} labelColor={textColor}>
                  Référence ETo
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
                  <option value="weather_station">Calcul station météo</option>
                  <option value="calculated">Calcul locale</option>
                </Select>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaCloud} labelColor={textColor}>
                  Précipitations
                </LabelWithIcon>
                <Select
                  value={form.precipSource}
                  onChange={(e) => update('precipSource', e.target.value)}
                >
                  <option value="sensor">Capteur de précipitation</option>
                  <option value="station">Station</option>
                </Select>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaPercent} labelColor={textColor}>
                  Facteur KR ({form.krFactor.toFixed(2)})
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
                    Surface (ha)
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
                    Culture
                  </LabelWithIcon>
                  <Input
                    value={form.cropType}
                    onChange={(e) => update('cropType', e.target.value)}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <LabelWithIcon icon={FaWater} labelColor={textColor}>
                  Débit (m³/h)
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
              title="Irrigation & seuils moteur v1"
              accent="cyan.400"
              titleColor={textColor}
            />
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <LabelWithIcon icon={FaWater} labelColor={textColor}>
                  Méthode d&apos;irrigation
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
                    <Radio value="drip_sprinkler">Goutte / aspersion</Radio>
                    <Radio value="subsurface_drip">Goutte souterraine</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaClock} labelColor={textColor}>
                  Fréquence & notification
                </LabelWithIcon>
                <InputGroup>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={1440}
                    step={5}
                    value={form.intervalMinutes}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      update(
                        'intervalMinutes',
                        Math.min(1440, Math.max(5, Math.round(v)))
                      );
                    }}
                  />
                  <InputRightAddon>minutes</InputRightAddon>
                </InputGroup>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaSlidersH} labelColor={textColor}>
                  Perméabilité ({form.soilPermeabilityPct} %)
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
                  Vanne
                </LabelWithIcon>
                <RadioGroup
                  value={form.valveMode}
                  onChange={(v) =>
                    update(
                      'valveMode',
                      v as ZoneNotificationConfig['valveMode']
                    )
                  }
                >
                  <HStack spacing={4}>
                    <Radio value="auto">Automatique</Radio>
                    <Radio value="manual">Manuelle</Radio>
                  </HStack>
                </RadioGroup>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaFan} labelColor={textColor}>
                  Seuil DPV (kPa)
                </LabelWithIcon>
                <NumberInput
                  value={form.vpdThresholdKpa}
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(_, v) => update('vpdThresholdKpa', v)}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaTree} labelColor={textColor}>
                  Surveillance racine
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
                  <option value="on">Activée</option>
                  <option value="off">Désactivée</option>
                </Select>
              </FormControl>

              <Divider />

              <HStack spacing={2}>
                <Icon as={FaTachometerAlt} color="orange.400" boxSize={5} />
                <Text fontWeight="semibold" color={textColor}>
                  Seuils moteur v1 (ET0 × Kc, humidité)
                </Text>
              </HStack>

              <FormControl>
                <LabelWithIcon
                  icon={FaTint}
                  labelColor={textColor}
                  iconColor="blue.400"
                >
                  Seuil critique humidité sol (%)
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
                  {form.criticalThresholdPct} % — en dessous = décision critique
                </Text>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaBolt} labelColor={textColor}>
                  Seuil conseil ET0×Kc (mm)
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
                  Au-dessus = décision advisory (demande en eau élevée)
                </Text>
              </FormControl>

              <FormControl>
                <LabelWithIcon icon={FaCubes} labelColor={textColor}>
                  Volume d&apos;eau max (m³)
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
                  Canaux de notification
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.500" mb={1}>
                Cochez les canaux que vous acceptez pour recevoir des alertes.
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
        >
          Enregistrer la notification de zone
        </Button>
      </HStack>
    </Box>
  );
};

export default ZoneNotificationConfigureForm;
