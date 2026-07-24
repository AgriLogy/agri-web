import { Box, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { WiDayCloudy, WiHumidity, WiThermometer } from 'react-icons/wi';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';

interface WeatherData {
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
  if (diffH < 24) return t('analytics.lastData.hoursAgoLong', { count: diffH });
  return then.toLocaleDateString();
};

const TempuratureHumidtyLastData = ({
  humidityData,
  temperatureData,
}: {
  humidityData: WeatherData[];
  temperatureData: WeatherData[];
}) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const latestHumidity = humidityData[humidityData.length - 1];
  const latestTemperature = temperatureData[temperatureData.length - 1];
  const temperatureUnit = resolveAxisUnit(
    'temperature_weather',
    latestTemperature?.default_unit
  );
  const humidityUnit = resolveAxisUnit(
    'humidity_weather',
    latestHumidity?.default_unit
  );

  const textColor = useColorModeValue('gray.700', 'gray.200');
  const muted = useColorModeValue('gray.600', 'gray.400');
  const timeColor = useColorModeValue('gray.500', 'gray.400');

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
        variant="tempHumidity"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <Box display="flex" justifyContent="center">
          <WiDayCloudy size={44} color="#dd6b20" />
        </Box>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color={muted}
          mt={2}
          mb={3}
        >
          {t('analytics.weatherTempHumidity.lastTitle', {
            tempUnit: temperatureUnit,
            humUnit: humidityUnit,
          })}
        </Text>

        <VStack spacing={4}>
          {latestTemperature ? (
            <Box>
              <WiThermometer
                size={32}
                style={{ display: 'inline', color: '#dd6b20' }}
              />
              <Text fontSize="xs" color={muted} mt={1}>
                {t('analytics.weatherTempHumidity.temperatureLabel')}
              </Text>
              <Text fontSize="xl" fontWeight="semibold" color={textColor}>
                {`${formatCalibratedReading('temperature_weather', latestTemperature.value)} ${temperatureUnit}`}
              </Text>
            </Box>
          ) : (
            <Text color={muted}>
              {t('analytics.weatherTempHumidity.temperatureEmpty')}
            </Text>
          )}

          {latestHumidity ? (
            <Box>
              <WiHumidity
                size={32}
                style={{ display: 'inline', color: '#1f7740' }}
              />
              <Text fontSize="xs" color={muted} mt={1}>
                {t('analytics.weatherTempHumidity.humidityLabel')}
              </Text>
              <Text fontSize="xl" fontWeight="semibold" color={textColor}>
                {`${formatCalibratedReading('humidity_weather', latestHumidity.value)} ${humidityUnit}`}
              </Text>
            </Box>
          ) : (
            <Text color={muted}>
              {t('analytics.weatherTempHumidity.humidityEmpty')}
            </Text>
          )}

          {latestTemperature && (
            <Text fontSize="xs" color={timeColor}>
              {t('analytics.lastData.measuredAt', {
                time: timeAgo(latestTemperature.timestamp, t),
              })}
            </Text>
          )}
        </VStack>
        <LastDataAddAlertButton sensorKey="temperature_weather" />
      </LastDataPanel>
    </Box>
  );
};

export default TempuratureHumidtyLastData;
