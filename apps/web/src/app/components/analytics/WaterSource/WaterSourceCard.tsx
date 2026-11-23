import { useEffect, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { FaPen } from 'react-icons/fa';
import {
  waterLevelApi,
  type WaterSourceStatus,
  type WaterSourceWithStatus,
} from '@agri/api-client/waterLevelApi';
import { formatNumber } from '@/app/utils/formatNumber';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import {
  ageParts,
  dataStatusScheme,
  levelStateScheme,
} from '@/app/utils/waterSourceModel';
import WaterSourceGauge from './WaterSourceGauge';
import WaterSourceHistoryChart from './WaterSourceHistoryChart';

const Metric = ({ label, value }: { label: string; value: string }) => {
  const labelColor = useColorModeValue('gray.500', 'gray.400');
  return (
    <Box>
      <Text fontSize="xs" color={labelColor}>
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="semibold">
        {value}
      </Text>
    </Box>
  );
};

const m = (v: number | null | undefined, unit: string, digits = 2) =>
  v == null ? '—' : `${formatNumber(v, digits)} ${unit}`;

const signed = (v: number | null, unit: string) =>
  v == null ? '—' : `${v > 0 ? '+' : ''}${formatNumber(v, 2)} ${unit}`;

const WaterSourceCard = ({
  source,
  zoneNames,
  onEdit,
  canEdit = false,
}: {
  source: WaterSourceWithStatus;
  zoneNames: string[];
  /** Omitted for read-only callers: no edit button is rendered. */
  onEdit?: () => void;
  /** Editor+ only: shows the Modifier button and the level simulator. */
  canEdit?: boolean;
}) => {
  const t = useTranslations('analytics.waterSource');
  const border = useColorModeValue('gray.200', 'gray.600');
  const panel = useColorModeValue('gray.50', 'gray.700');
  const [status, setStatus] = useState<WaterSourceStatus>(source.status);
  const [slider, setSlider] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Keep "last update" and OFFLINE/STALE honest without a page reload.
  useEffect(() => {
    const id = window.setInterval(() => {
      waterLevelApi
        .status(source.id)
        .then(setStatus)
        .catch((e) => logOptionalApiFailure('WaterSourceCard: status', e));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [source.id]);

  const metrics = status.metrics;
  const isWell = source.source_type === 'WELL';
  const isSimulated = source.mode === 'SIMULATED';
  const levelScheme = levelStateScheme(metrics?.level_state ?? 'UNKNOWN');
  const sliderValue = slider ?? metrics?.level_m ?? 0;

  const simulate = async (level: number) => {
    setError(null);
    try {
      setStatus(await waterLevelApi.simulate(source.id, level));
      setRefreshKey((k) => k + 1);
    } catch (e) {
      logOptionalApiFailure('WaterSourceCard: simulate', e);
      setError(t('simulateFailed'));
    } finally {
      setSlider(null);
    }
  };

  const age = status.last_reading
    ? ageParts(status.last_reading.measured_at, new Date(status.server_time))
    : null;

  return (
    <Box
      borderWidth="1px"
      borderColor={border}
      borderRadius="lg"
      p={{ base: 3, md: 4 }}
      w="100%"
    >
      <Flex justify="space-between" align="start" gap={3} wrap="wrap" mb={3}>
        <Box minW={0}>
          <Text fontWeight="bold" fontSize="lg">
            {source.name}
          </Text>
          <Text fontSize="sm" color="gray.500">
            {t(`type.${source.source_type}`)} ·{' '}
            {t(`geometry.${source.geometry}`)}
            {zoneNames.length > 0 ? ` · ${zoneNames.join(', ')}` : ''}
          </Text>
        </Box>
        <HStack spacing={2}>
          <Badge colorScheme={dataStatusScheme(status.data_status)}>
            {t(`dataStatus.${status.data_status}`)}
          </Badge>
          {canEdit && onEdit && (
            <Button
              size="sm"
              leftIcon={<FaPen />}
              variant="outline"
              onClick={onEdit}
            >
              {t('edit')}
            </Button>
          )}
        </HStack>
      </Flex>

      {status.open_alerts.length > 0 && (
        <Stack spacing={2} mb={3}>
          {status.open_alerts.map((a) => (
            <Alert
              key={a.id}
              status={a.kind === 'CRITICAL' ? 'error' : 'warning'}
              borderRadius="md"
              py={2}
            >
              <AlertIcon />
              <Text fontSize="sm">
                {t(`alert.${a.kind}`, {
                  fill:
                    a.fill_percent == null
                      ? '—'
                      : formatNumber(a.fill_percent, 1),
                  minutes: source.offline_after_min,
                })}
              </Text>
            </Alert>
          ))}
        </Stack>
      )}

      <Flex
        gap={{ base: 4, md: 6 }}
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'center', md: 'stretch' }}
      >
        <WaterSourceGauge
          fillPercent={metrics?.fill_percent ?? null}
          criticalPct={source.critical_pct}
          lowPct={source.low_warning_pct}
          highPct={source.high_pct}
          scheme={
            levelScheme === 'gray'
              ? 'blue'
              : levelScheme === 'green'
                ? 'blue'
                : levelScheme
          }
        />
        <Stack flex={1} minW={0} spacing={4} w="100%">
          <SimpleGrid columns={{ base: 2, lg: 3 }} spacing={4}>
            <Metric
              label={t('currentLevel')}
              value={m(metrics?.level_m, 'm')}
            />
            <Metric
              label={t('maxHeight')}
              value={m(source.max_height_m, 'm')}
            />
            {isWell ? (
              <Metric
                label={t('depthToWater')}
                value={m(metrics?.depth_to_water_m, 'm')}
              />
            ) : (
              <Metric
                label={t('currentVolume')}
                value={m(metrics?.volume_m3, 'm³')}
              />
            )}
            <Metric
              label={t('freeCapacity')}
              value={m(metrics?.free_capacity_m3, 'm³')}
            />
            <Metric
              label={t('availableAfterReserve')}
              value={m(metrics?.available_m3, 'm³')}
            />
            <Metric
              label={t('lastUpdate')}
              value={
                age ? t(`ago.${age.unit}`, { count: age.value }) : t('never')
              }
            />
          </SimpleGrid>
          {isWell && metrics && metrics.volume_m3 == null && (
            <Text fontSize="xs" color="gray.500">
              {t('wellVolumeHint')}
            </Text>
          )}
          <SimpleGrid
            columns={{ base: 1, sm: 3 }}
            spacing={3}
            bg={panel}
            borderRadius="md"
            p={3}
          >
            <Box>
              <Text fontSize="xs" color="gray.500">
                {t('status')}
              </Text>
              <Badge colorScheme={levelScheme} fontSize="sm">
                {t(`levelState.${metrics?.level_state ?? 'UNKNOWN'}`)}
              </Badge>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">
                {t('trend24h')}
              </Text>
              <Text fontWeight="semibold">
                {status.trend_24h_m3 != null
                  ? signed(status.trend_24h_m3, 'm³')
                  : signed(status.trend_24h_level_m, 'm')}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500">
                {t('alertThreshold')}
              </Text>
              <Text fontWeight="semibold">
                {formatNumber(source.low_warning_pct, 0)}% ·{' '}
                {formatNumber(source.critical_pct, 0)}%
              </Text>
            </Box>
          </SimpleGrid>

          {isSimulated && canEdit && (
            <Box
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="blue.300"
              borderRadius="md"
              p={3}
            >
              <Flex justify="space-between" mb={1}>
                <Text fontSize="sm" fontWeight="semibold">
                  {t('simulator')}
                </Text>
                <Text fontSize="sm">
                  {formatNumber(sliderValue, 2)} /{' '}
                  {formatNumber(source.max_height_m, 2)} m
                </Text>
              </Flex>
              <Slider
                aria-label={t('simulator')}
                min={0}
                max={source.max_height_m}
                step={Math.max(0.01, source.max_height_m / 500)}
                value={sliderValue}
                // Not disabled while saving: disabling drops keyboard focus.
                onChange={setSlider}
                onChangeEnd={(v) => void simulate(v)}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                {/* onChangeEnd fires for pointer only: send keyboard moves
                    (arrows, Home/End, Page keys) when the key is released. */}
                <SliderThumb
                  onKeyUp={() => {
                    if (slider != null) void simulate(slider);
                  }}
                />
              </Slider>
              <Text fontSize="xs" color="gray.500">
                {t('simulatorHint')}
              </Text>
              {error && (
                <Text fontSize="xs" color="red.500" mt={1}>
                  {error}
                </Text>
              )}
            </Box>
          )}
        </Stack>
      </Flex>

      <Box mt={4}>
        <WaterSourceHistoryChart source={source} refreshKey={refreshKey} />
      </Box>
    </Box>
  );
};

export default WaterSourceCard;
