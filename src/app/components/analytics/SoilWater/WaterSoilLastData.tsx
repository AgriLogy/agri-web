import {
  Box,
  Text,
  useColorModeValue,
  Divider,
  VStack,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { GiWaterDrop, GiWaterTank, GiGroundbreaker } from 'react-icons/gi';
import { FaTachometerAlt } from 'react-icons/fa';
import { SensorData } from '@/app/types';
import {
  compactResolvedAxisUnits,
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';

const timeAgo = (
  timestamp: string,
  t: ReturnType<typeof useTranslations>
): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);

  if (diffMin < 1) return t('analytics.lastData.justNow');
  if (diffMin < 60)
    return t('analytics.lastData.minutesAgo', { count: diffMin });
  if (diffH < 24) return t('analytics.lastData.hoursAgo', { count: diffH });
  return then.toLocaleDateString();
};

const SensorRow = ({
  icon,
  label,
  data,
  sensorKey,
}: {
  icon: JSX.Element;
  label: string;
  data?: SensorData;
  sensorKey: string;
}) => {
  const t = useTranslations();
  const valueColor = useColorModeValue('brand.700', 'brand.200');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const timeColor = useColorModeValue('gray.500', 'gray.500');

  return (
    <Box textAlign="center" py={2} w="100%">
      <Box display="flex" justifyContent="center">
        {icon}
      </Box>
      <Text
        fontSize="xs"
        fontWeight="semibold"
        letterSpacing="0.06em"
        textTransform="uppercase"
        mt={2}
        color={textColor}
      >
        {label}
      </Text>
      <Text fontSize="xl" fontWeight="semibold" color={valueColor} mt={1}>
        {data
          ? `${formatCalibratedReading(sensorKey, data.value)} ${resolveAxisUnit(sensorKey, data.default_unit)}`
          : '—'}
      </Text>
      <Text fontSize="xs" color={timeColor} mt={1}>
        {data
          ? t('analytics.lastData.measuredAt', {
              time: timeAgo(data.timestamp, t),
            })
          : ''}
      </Text>
    </Box>
  );
};

const WaterSoilLastData = ({
  soilLow,
  soilMedium,
  soilHigh,
  waterFlow,
}: {
  soilLow?: SensorData;
  soilMedium?: SensorData;
  soilHigh?: SensorData;
  waterFlow?: SensorData;
}) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const headingColor = useColorModeValue('gray.700', 'gray.200');
  const humidityHeadingUnits = compactResolvedAxisUnits(
    ['soil_moisture_low', 'soil_moisture_medium', 'soil_moisture_high'],
    '%'
  );
  const flowHeadingUnit = resolveAxisUnit(
    'water_flow',
    waterFlow?.default_unit
  );

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
      <LastDataPanel variant="waterSoil" overflowY="auto">
        <Text
          fontSize="xs"
          fontWeight="semibold"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color={headingColor}
          textAlign="center"
          mb={2}
        >
          {t('analytics.soilWater.lastDataHeading', {
            humidityUnit: humidityHeadingUnits,
            flowUnit: flowHeadingUnit,
          })}
        </Text>
        <VStack spacing={0} align="stretch" w="100%" divider={<Divider />}>
          {soilLow && (
            <SensorRow
              icon={<GiGroundbreaker size={36} color="#9c6644" />}
              label={t('analytics.soilWater.probeLow')}
              data={soilLow}
              sensorKey="soil_moisture_low"
            />
          )}
          {soilMedium && (
            <SensorRow
              icon={<GiWaterDrop size={36} color="#175e33" />}
              label={t('analytics.soilWater.probeMedium')}
              data={soilMedium}
              sensorKey="soil_moisture_medium"
            />
          )}
          {soilHigh && (
            <SensorRow
              icon={<GiWaterTank size={36} color="#38a169" />}
              label={t('analytics.soilWater.probeHigh')}
              data={soilHigh}
              sensorKey="soil_moisture_high"
            />
          )}
          {waterFlow && (
            <SensorRow
              icon={<FaTachometerAlt size={34} color="#e53e3e" />}
              label={t('analytics.soilWater.flowLabel')}
              data={waterFlow}
              sensorKey="water_flow"
            />
          )}
        </VStack>
        <LastDataAddAlertButton sensorKey="soil_moisture_medium" />
      </LastDataPanel>
    </Box>
  );
};

export default WaterSoilLastData;
