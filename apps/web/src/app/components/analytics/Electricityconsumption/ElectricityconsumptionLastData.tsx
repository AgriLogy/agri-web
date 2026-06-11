import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { FaBolt } from 'react-icons/fa';
import { useLocale, useTranslations } from 'next-intl';
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
  t: (key: string, values?: Record<string, string | number>) => string,
  tag: string
): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);

  if (diffMin < 1) return t('analytics.common.justNow');
  if (diffMin < 60) return t('analytics.common.minutesAgo', { count: diffMin });
  if (diffH < 24) return t('analytics.common.hoursAgo', { count: diffH });
  return then.toLocaleDateString(tag);
};

const ElectricityconsumptionLastData = ({ data }: { data: SensorData[] }) => {
  const t = useTranslations();
  const tag = localeTag(useLocale());
  useUnitOverridesRevision();
  const latest = data[data.length - 1];
  const unit = resolveAxisUnit('electricity_consumption', latest?.default_unit);

  const valueColor = useColorModeValue('brand.700', 'brand.200');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const subColor = useColorModeValue('gray.500', 'gray.400');

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
        variant="electricity"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <FaBolt size={44} color="#f4a261" />
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          mt={3}
          color={textColor}
        >
          {t('sensors.electricity_consumption')}
        </Text>
        <Text fontSize="2xl" fontWeight="semibold" color={valueColor} mt={1}>
          {latest
            ? `${formatCalibratedReading('electricity_consumption', latest.value)} ${unit}`
            : '—'}
        </Text>
        <Text fontSize="xs" color={subColor} mt={2}>
          {latest
            ? t('analytics.common.measuredAt', {
                time: timeAgo(latest.timestamp, t, tag),
              })
            : ''}
        </Text>
        <LastDataAddAlertButton sensorKey="electricity_consumption" />
      </LastDataPanel>
    </Box>
  );
};

export default ElectricityconsumptionLastData;
