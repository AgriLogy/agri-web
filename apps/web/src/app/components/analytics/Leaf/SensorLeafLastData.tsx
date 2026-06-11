import {
  Box,
  Divider,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { useLocale, useTranslations } from 'next-intl';
import { WiRaindrop, WiThermometer } from 'react-icons/wi';
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
  tag: string
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
  return then.toLocaleDateString(tag);
};

const SensorLeafLastData = ({
  temperature,
  moisture,
}: {
  temperature?: { value: number; timestamp: string };
  moisture?: { value: number; timestamp: string };
}) => {
  const t = useTranslations();
  const tag = localeTag(useLocale());
  useUnitOverridesRevision();
  const titleColor = useColorModeValue('gray.600', 'gray.300');
  const labelMuted = useColorModeValue('gray.500', 'gray.400');
  const valueTemp = useColorModeValue('orange.700', 'orange.200');
  const valueMoist = useColorModeValue('brand.700', 'brand.200');
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
      <LastDataPanel variant="sensorLeaf">
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color={titleColor}
          textAlign="center"
          mb={2}
        >
          {t('analytics.leaf.lastDataTitle')}
        </Text>
        <VStack spacing={0} align="stretch" w="100%" divider={<Divider />}>
          <Box textAlign="center" py={2}>
            <Box display="flex" justifyContent="center">
              <WiThermometer size={44} color="#FF7300" />
            </Box>
            <Text
              fontSize="xs"
              fontWeight="medium"
              color={labelMuted}
              mt={2}
              textTransform="uppercase"
              letterSpacing="0.06em"
            >
              {t('sensors.leaf_temperature')}
            </Text>
            <Text fontSize="xl" fontWeight="semibold" color={valueTemp} mt={1}>
              {temperature
                ? `${formatCalibratedReading('leaf_temperature', temperature.value)} ${resolveAxisUnit('leaf_temperature')}`
                : '—'}
            </Text>
            <Text fontSize="xs" color={subColor} mt={1}>
              {temperature
                ? t('analytics.lastData.measuredAt', {
                    time: timeAgo(temperature.timestamp, t, tag),
                  })
                : ''}
            </Text>
          </Box>
          <Box textAlign="center" py={2}>
            <Box display="flex" justifyContent="center">
              <WiRaindrop size={44} color="#007AFF" />
            </Box>
            <Text
              fontSize="xs"
              fontWeight="medium"
              color={labelMuted}
              mt={2}
              textTransform="uppercase"
              letterSpacing="0.06em"
            >
              {t('sensors.leaf_moisture')}
            </Text>
            <Text fontSize="xl" fontWeight="semibold" color={valueMoist} mt={1}>
              {moisture
                ? `${formatCalibratedReading('leaf_moisture', moisture.value)} ${resolveAxisUnit('leaf_moisture')}`
                : '—'}
            </Text>
            <Text fontSize="xs" color={subColor} mt={1}>
              {moisture
                ? t('analytics.lastData.measuredAt', {
                    time: timeAgo(moisture.timestamp, t, tag),
                  })
                : ''}
            </Text>
          </Box>
        </VStack>
        <LastDataAddAlertButton sensorKey="leaf_temperature" />
      </LastDataPanel>
    </Box>
  );
};

export default SensorLeafLastData;
