import type { ReactNode } from 'react';
import { Box, Divider, Text, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { FaTint, FaRulerCombined } from 'react-icons/fa';
import { SensorData } from '@/app/types';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';

const timeAgo = (
  timestamp: string,
  t: (key: string, values?: Record<string, string | number>) => string
): string => {
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

const Block = ({
  icon,
  title,
  latest,
  sensorKey,
}: {
  icon: ReactNode;
  title: string;
  latest?: SensorData;
  sensorKey: string;
}) => {
  const t = useTranslations();
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const valueColor = useColorModeValue('brand.700', 'brand.200');
  const subColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Box textAlign="center" py={2}>
      <Box display="flex" justifyContent="center">
        {icon}
      </Box>
      <Text
        fontWeight="semibold"
        fontSize="xs"
        letterSpacing="0.06em"
        textTransform="uppercase"
        mt={2}
        color={textColor}
      >
        {title}
      </Text>
      <Text fontSize="xl" fontWeight="semibold" color={valueColor} mt={1}>
        {latest
          ? `${formatCalibratedReading(sensorKey, latest.value)} ${resolveAxisUnit(sensorKey, latest.default_unit)}`
          : '—'}
      </Text>
      <Text fontSize="xs" color={subColor} mt={1}>
        {latest
          ? t('analytics.common.measuredAt', {
              time: timeAgo(latest.timestamp, t),
            })
          : ''}
      </Text>
    </Box>
  );
};

const SoilSalinityConductivityLastData = ({
  salinityData,
  conductivityData,
}: {
  salinityData: SensorData[];
  conductivityData: SensorData[];
}) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const latestSalinity = salinityData[salinityData.length - 1];
  const latestConductivity = conductivityData[conductivityData.length - 1];

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
      <LastDataPanel variant="soilSalinity">
        <Block
          icon={<FaTint size={40} color="#175e33" />}
          title={t('sensors.soil_salinity')}
          latest={latestSalinity}
          sensorKey="soil_salinity"
        />
        <Divider my={2} />
        <Block
          icon={<FaRulerCombined size={36} color="#48bb78" />}
          title={t('sensors.soil_conductivity')}
          latest={latestConductivity}
          sensorKey="soil_conductivity"
        />
        <LastDataAddAlertButton sensorKey="soil_salinity" />
      </LastDataPanel>
    </Box>
  );
};

export default SoilSalinityConductivityLastData;
