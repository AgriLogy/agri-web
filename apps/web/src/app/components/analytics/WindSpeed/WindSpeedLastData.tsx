import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { useTranslations, useLocale } from 'next-intl';
import { FaBolt } from 'react-icons/fa';
import { SensorData } from '@/app/types';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

const timeAgo = (
  timestamp: string,
  t: ReturnType<typeof useTranslations>,
  locale: string
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
  return then.toLocaleDateString(localeTag(locale));
};

const WindSpeedLastData = ({ data }: { data: SensorData[] }) => {
  const t = useTranslations();
  const locale = useLocale();
  const latest = data[data.length - 1];
  useUnitOverridesRevision();
  const unit = resolveAxisUnit('wind_speed', latest?.default_unit);

  // Rafale (gust): peak wind speed across the loaded window. A dedicated
  // high-frequency gust sensor is a later backend item; until then the series
  // maximum is the best available proxy.
  const gustMax = data.reduce<number | null>((max, row) => {
    const v = typeof row?.value === 'number' ? row.value : null;
    if (v === null) return max;
    return max === null || v > max ? v : max;
  }, null);

  const valueColor = useColorModeValue('brand.700', 'brand.200');
  const gustColor = useColorModeValue('orange.600', 'orange.300');
  const textColor = useColorModeValue('gray.600', 'gray.300');
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
        variant="windSpeed"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <Box display="flex" justifyContent="center">
          <FaBolt size={44} color="#f4a261" />
        </Box>
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          mt={3}
          color={textColor}
        >
          {t('analytics.windSpeed.lastDataTitle')}
        </Text>
        <Text fontSize="2xl" fontWeight="semibold" color={valueColor} mt={1}>
          {latest
            ? `${formatCalibratedReading('wind_speed', latest.value)} ${unit}`
            : t('common.notAvailable')}
        </Text>
        {gustMax !== null && (
          <Box mt={2}>
            <Text
              fontSize="xs"
              fontWeight="medium"
              letterSpacing="0.04em"
              textTransform="uppercase"
              color={textColor}
            >
              {t('analytics.windSpeed.gustMax')}
            </Text>
            <Text fontSize="lg" fontWeight="semibold" color={gustColor}>
              {`${formatCalibratedReading('wind_speed', gustMax)} ${unit}`}
            </Text>
          </Box>
        )}
        <Text fontSize="xs" color={timeColor} mt={2}>
          {latest
            ? t('analytics.lastData.measuredAt', {
                time: timeAgo(latest.timestamp, t, locale),
              })
            : ''}
        </Text>
        <LastDataAddAlertButton sensorKey="wind_speed" />
      </LastDataPanel>
    </Box>
  );
};

export default WindSpeedLastData;
