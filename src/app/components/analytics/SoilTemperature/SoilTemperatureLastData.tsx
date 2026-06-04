import { Box, Text, VStack, HStack, useColorModeValue } from '@chakra-ui/react';
import { FaThermometerHalf } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import { SensorData } from '@/app/types';
import {
  compactResolvedAxisUnits,
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { getCatalogDefaultUnit } from '@/app/utils/sensorCatalog';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';

type Translate = (
  key: string,
  values?: Record<string, string | number>
) => string;

const timeAgo = (timestamp: string, t: Translate): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);

  if (diffMin < 1) return t('analytics.common.justNow');
  if (diffMin < 60)
    return t('analytics.common.minutesAgoShort', { count: diffMin });
  if (diffH < 24) return t('analytics.common.hoursAgo', { count: diffH });
  return then.toLocaleDateString();
};

const Row = ({
  label,
  entry,
  color,
  sensorKey,
  t,
}: {
  label: string;
  entry?: SensorData;
  color: string;
  sensorKey: string;
  t: Translate;
}) => {
  const metaColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Box pl={3} borderLeftWidth="3px" borderLeftColor={color}>
      <VStack align="stretch" spacing={0}>
        <HStack justify="space-between">
          <Text fontSize="xs" fontWeight="semibold" color={color}>
            {label}
          </Text>
          <Text fontSize="sm" fontWeight="semibold" color={color}>
            {entry
              ? `${formatCalibratedReading(sensorKey, entry.value)} ${resolveAxisUnit(sensorKey, entry.default_unit)}`
              : '—'}
          </Text>
        </HStack>
        <Text fontSize="xs" color={metaColor}>
          {entry
            ? t('analytics.common.measuredAt', {
                time: timeAgo(entry.timestamp, t),
              })
            : ''}
        </Text>
      </VStack>
    </Box>
  );
};

const SoilTemperatureLastData = ({
  lastLow,
  lastMedium,
  lastHigh,
}: {
  lastLow?: SensorData;
  lastMedium?: SensorData;
  lastHigh?: SensorData;
}) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const soilTempFallback = getCatalogDefaultUnit('soil_temp_low') || '°C';
  const soilHeadingUnits = compactResolvedAxisUnits(
    ['soil_temp_low', 'soil_temp_medium', 'soil_temp_high'],
    soilTempFallback
  );
  const headingColor = useColorModeValue('gray.600', 'gray.300');
  const iconColor = useColorModeValue('orange.600', 'orange.300');

  const lowColor = useColorModeValue('brand.600', 'brand.300');
  const medColor = useColorModeValue('teal.600', 'teal.300');
  const highColor = useColorModeValue('red.600', 'red.300');

  return (
    <Box
      flex={1}
      minH={0}
      minW={0}
      w="100%"
      alignSelf="stretch"
      display="flex"
      flexDirection="column"
    >
      <LastDataPanel variant="soilTemperature">
        <HStack justify="center" mb={2}>
          <FaThermometerHalf size={40} color={iconColor} />
        </HStack>
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color={headingColor}
          textAlign="center"
          mb={4}
        >
          {`${t('sensors.soil_temperature')} (${soilHeadingUnits})`}
        </Text>
        <VStack spacing={4} align="stretch" w="100%">
          <Row
            label={t('analytics.common.lowProbe')}
            entry={lastLow}
            color={lowColor}
            sensorKey="soil_temp_low"
            t={t}
          />
          <Row
            label={t('analytics.common.mediumProbe')}
            entry={lastMedium}
            color={medColor}
            sensorKey="soil_temp_medium"
            t={t}
          />
          <Row
            label={t('analytics.common.highProbe')}
            entry={lastHigh}
            color={highColor}
            sensorKey="soil_temp_high"
            t={t}
          />
        </VStack>
        <LastDataAddAlertButton sensorKey="soil_temperature_medium" />
      </LastDataPanel>
    </Box>
  );
};

export default SoilTemperatureLastData;
