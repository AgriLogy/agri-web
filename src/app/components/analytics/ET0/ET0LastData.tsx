import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Box,
  Text,
  VStack,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { GiWaterDrop } from 'react-icons/gi';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';
import { aggregateEt0Daily } from '@/app/utils/et0Daily';

interface ET0Data {
  id: number;
  timestamp: string;
  value: number;
  default_unit: string;
}

type TimeAgoTranslator = (
  key: string,
  values?: Record<string, string | number>
) => string;

const timeAgo = (timestamp: string, t: TimeAgoTranslator): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);

  if (diffMin < 1) return t('analytics.et0LastData.justNow');
  if (diffMin < 60)
    return t('analytics.et0LastData.minutesAgo', { count: diffMin });
  if (diffH < 24) return t('analytics.et0LastData.hoursAgo', { count: diffH });
  return then.toLocaleDateString();
};

const ET0LastData = ({
  weatherData,
  calculatedData,
}: {
  weatherData: ET0Data[];
  calculatedData: ET0Data[];
}) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const latestWeather = weatherData[weatherData.length - 1];
  const latestCalculated = calculatedData[calculatedData.length - 1];
  const weatherUnit = resolveAxisUnit('et0', latestWeather?.default_unit);
  const calculatedUnit = resolveAxisUnit('et0', latestCalculated?.default_unit);

  const titleColor = useColorModeValue('gray.600', 'gray.300');
  const labelMuted = useColorModeValue('gray.500', 'gray.400');
  const valueMeteo = useColorModeValue('brand.700', 'brand.200');
  const valueCalc = useColorModeValue('teal.700', 'teal.200');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const valueDaily = useColorModeValue('green.700', 'green.200');

  // Daily / previous-day / cumulative ET₀ (see aggregateEt0Daily for the math).
  const daily = useMemo(
    () => aggregateEt0Daily(calculatedData),
    [calculatedData]
  );

  const newestTs =
    latestWeather && latestCalculated
      ? latestWeather.timestamp > latestCalculated.timestamp
        ? latestWeather.timestamp
        : latestCalculated.timestamp
      : latestWeather?.timestamp || latestCalculated?.timestamp;

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
        variant="et0"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <GiWaterDrop size={44} color="#175E33" />
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          mt={3}
          color={titleColor}
        >
          {t('analytics.et0LastData.heading')}
        </Text>

        {latestWeather || latestCalculated ? (
          <VStack spacing={3} mt={4} align="stretch" w="100%">
            <Box>
              <Text fontSize="xs" fontWeight="medium" color={labelMuted}>
                {t('analytics.et0LastData.weatherSensor')}
              </Text>
              <Text fontSize="lg" fontWeight="semibold" color={valueMeteo}>
                {latestWeather
                  ? `${formatCalibratedReading('et0', latestWeather.value)} ${weatherUnit}`
                  : '—'}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="medium" color={labelMuted}>
                {t('analytics.et0LastData.calculatedModel')}
              </Text>
              <Text fontSize="lg" fontWeight="semibold" color={valueCalc}>
                {latestCalculated
                  ? `${formatCalibratedReading('et0', latestCalculated.value)} ${calculatedUnit}`
                  : '—'}
              </Text>
            </Box>
          </VStack>
        ) : (
          <Text mt={4} fontSize="sm" color={subColor}>
            {t('analytics.et0LastData.noRecentData')}
          </Text>
        )}

        {daily && (
          <>
            <Divider my={4} />
            <VStack spacing={3} align="stretch" w="100%">
              <Box>
                <Text fontSize="xs" fontWeight="medium" color={labelMuted}>
                  {t('analytics.et0LastData.todayEt0', {
                    day: daily.latestDay,
                  })}
                </Text>
                <Text fontSize="lg" fontWeight="bold" color={valueDaily}>
                  {daily.latestTotal.toFixed(2)} mm/j
                </Text>
              </Box>
              {daily.prevDay != null && daily.prevTotal != null && (
                <Box>
                  <Text fontSize="xs" fontWeight="medium" color={labelMuted}>
                    {t('analytics.et0LastData.yesterdayEt0', {
                      day: daily.prevDay,
                    })}
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold" color={valueDaily}>
                    {daily.prevTotal.toFixed(2)} mm/j
                  </Text>
                  <Text fontSize="xs" color={subColor}>
                    {t('analytics.et0LastData.usedForIrrigation')}
                  </Text>
                </Box>
              )}
              <Box>
                <Text fontSize="xs" fontWeight="medium" color={labelMuted}>
                  {t('analytics.et0LastData.cumulative', {
                    count: daily.dayCount,
                  })}
                </Text>
                <Text fontSize="md" fontWeight="semibold" color={valueDaily}>
                  {daily.cumulative.toFixed(2)} mm
                </Text>
              </Box>
            </VStack>
          </>
        )}

        {newestTs && (
          <Text fontSize="xs" color={subColor} mt={3}>
            {t('analytics.et0LastData.measured', { ago: timeAgo(newestTs, t) })}
          </Text>
        )}
        <LastDataAddAlertButton sensorKey="et0" />
      </LastDataPanel>
    </Box>
  );
};

export default ET0LastData;
