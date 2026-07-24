import { Box, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { WiStrongWind } from 'react-icons/wi';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';

interface WindData {
  timestamp: string;
  value: number;
  default_unit: string;
}

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
  if (diffH < 24)
    return t('analytics.lastData.hoursAgoShort', { count: diffH });
  return then.toLocaleDateString();
};

const WindRadarLastData = ({
  windSpeedData,
  windDirectionData,
}: {
  windSpeedData: WindData[];
  windDirectionData: WindData[];
}) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const latestSpeed = windSpeedData[windSpeedData.length - 1];
  const latestDirection = windDirectionData[windDirectionData.length - 1];
  const speedUnit = resolveAxisUnit('wind_speed', latestSpeed?.default_unit);
  const directionUnit = resolveAxisUnit(
    'wind_direction',
    latestDirection?.default_unit
  );

  const titleColor = useColorModeValue('gray.600', 'gray.300');
  const labelMuted = useColorModeValue('gray.500', 'gray.400');
  const valueColor = useColorModeValue('brand.700', 'brand.200');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const iconTone = useColorModeValue('#276749', '#68d391');

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
      <LastDataPanel
        variant="windRadar"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <Box display="flex" justifyContent="center">
          <WiStrongWind size={52} color={iconTone} />
        </Box>

        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          mt={3}
          color={titleColor}
        >
          {t('analytics.windRadar.lastTitle')}
        </Text>

        {latestSpeed && latestDirection ? (
          <VStack spacing={3} mt={4} align="stretch" w="100%">
            <Box>
              <Text fontSize="xs" fontWeight="medium" color={labelMuted}>
                {t('analytics.windRadar.speed')}
              </Text>
              <Text fontSize="lg" fontWeight="semibold" color={valueColor}>
                {formatCalibratedReading('wind_speed', latestSpeed.value)}{' '}
                {speedUnit}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="medium" color={labelMuted}>
                {t('analytics.windRadar.direction')}
              </Text>
              <Text fontSize="lg" fontWeight="semibold" color={valueColor}>
                {formatCalibratedReading(
                  'wind_direction',
                  latestDirection.value
                )}{' '}
                {directionUnit}
              </Text>
            </Box>
          </VStack>
        ) : (
          <Text mt={4} fontSize="sm" color={subColor}>
            {t('analytics.lastData.noRecentData')}
          </Text>
        )}

        {latestSpeed && (
          <Text fontSize="xs" color={subColor} mt={3}>
            {t('analytics.lastData.measuredAt', {
              time: timeAgo(latestSpeed.timestamp, t),
            })}
          </Text>
        )}
        <LastDataAddAlertButton sensorKey="wind_speed" />
      </LastDataPanel>
    </Box>
  );
};

export default WindRadarLastData;
