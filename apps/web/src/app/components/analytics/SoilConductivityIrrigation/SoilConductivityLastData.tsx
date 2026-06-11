import { Box, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { SensorData } from '@/app/types';
import { FaWater } from 'react-icons/fa';
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
  const diffMin = Math.floor((now.getTime() - then.getTime()) / 60000);
  const diffH = Math.floor(diffMin / 60);
  if (diffMin < 1) return t('analytics.common.justNow');
  if (diffMin < 60) return t('analytics.common.minutesAgo', { count: diffMin });
  if (diffH < 24) return t('analytics.common.hoursAgo', { count: diffH });
  return then.toLocaleDateString();
};

const Row = ({
  label,
  value,
  unit,
  color,
  labelColor,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  labelColor: string;
}) => (
  <Box pl={3} borderLeftWidth="3px" borderLeftColor={color} textAlign="left">
    <Text fontSize="xs" fontWeight="medium" color={labelColor}>
      {label}
    </Text>
    <Text fontSize="md" fontWeight="semibold" color={color}>
      {value} {unit}
    </Text>
  </Box>
);

const SoilConductivityLastData = ({
  lowData,
  highData,
  flowData,
}: {
  lowData: SensorData[];
  highData: SensorData[];
  flowData: SensorData[];
}) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const latestLow = lowData[lowData.length - 1];
  const latestHigh = highData[highData.length - 1];
  const latestFlow = flowData[flowData.length - 1];

  const headingColor = useColorModeValue('gray.600', 'gray.300');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const rowLabelColor = useColorModeValue('gray.500', 'gray.400');
  const cLow = useColorModeValue('brand.600', 'brand.300');
  const cHigh = useColorModeValue('teal.600', 'teal.300');
  const cFlow = useColorModeValue('cyan.700', 'cyan.300');

  const ts =
    latestFlow?.timestamp ||
    latestHigh?.timestamp ||
    latestLow?.timestamp ||
    '';

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
      <LastDataPanel variant="soilConductivity">
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color={headingColor}
          textAlign="center"
          mb={3}
        >
          {t('analytics.soilConductivity.lastDataHeading')}
        </Text>
        <FaWater size={40} color="#2E924F" style={{ margin: '0 auto' }} />
        <VStack spacing={4} mt={4} align="stretch" w="100%">
          <Row
            labelColor={rowLabelColor}
            label={t('analytics.common.lowProbe')}
            value={
              latestLow
                ? formatCalibratedReading('soil_conductivity', latestLow.value)
                : '—'
            }
            unit={
              latestLow
                ? resolveAxisUnit('soil_conductivity', latestLow.default_unit)
                : ''
            }
            color={cLow}
          />
          <Row
            labelColor={rowLabelColor}
            label={t('analytics.common.highProbe')}
            value={
              latestHigh
                ? formatCalibratedReading('soil_conductivity', latestHigh.value)
                : '—'
            }
            unit={
              latestHigh
                ? resolveAxisUnit('soil_conductivity', latestHigh.default_unit)
                : ''
            }
            color={cHigh}
          />
          <Row
            labelColor={rowLabelColor}
            label={t('analytics.soilConductivity.irrigationFlow')}
            value={
              latestFlow
                ? formatCalibratedReading('water_flow', latestFlow.value)
                : '—'
            }
            unit={
              latestFlow
                ? resolveAxisUnit('water_flow', latestFlow.default_unit)
                : ''
            }
            color={cFlow}
          />
        </VStack>
        {(latestLow || latestHigh || latestFlow) && ts && (
          <Text fontSize="xs" color={subColor} mt={4} textAlign="center">
            {t('analytics.common.measuredAt', { time: timeAgo(ts, t) })}
          </Text>
        )}
        <LastDataAddAlertButton sensorKey="soil_conductivity" />
      </LastDataPanel>
    </Box>
  );
};

export default SoilConductivityLastData;
