import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { FaAppleAlt } from 'react-icons/fa';
import { SensorData } from '@/app/types';
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

const LargeFruitDiameterLastData = ({ data }: { data: SensorData[] }) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const latest = data[data.length - 1];

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
        variant="largeFruitDiameter"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <FaAppleAlt size={44} color="#d1495b" />
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          mt={3}
          color={textColor}
        >
          {t('sensors.large_fruit_diameter')}
        </Text>
        <Text fontSize="2xl" fontWeight="semibold" color={valueColor} mt={1}>
          {latest
            ? `${formatCalibratedReading('large_fruit_diameter', latest.value)} ${resolveAxisUnit('large_fruit_diameter', latest?.default_unit)}`
            : '—'}
        </Text>
        <Text fontSize="xs" color={subColor} mt={2}>
          {latest
            ? t('analytics.common.measuredAt', {
                time: timeAgo(latest.timestamp, t),
              })
            : ''}
        </Text>
        <LastDataAddAlertButton sensorKey="large_fruit_diameter" />
      </LastDataPanel>
    </Box>
  );
};

export default LargeFruitDiameterLastData;
