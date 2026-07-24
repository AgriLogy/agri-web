import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { WiBarometer } from 'react-icons/wi';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { resolveAxisUnit } from '@/app/utils/unitOverrides';
import { formatNumber } from '@/app/utils/formatNumber';
import type { VPDDataPoint } from './VPDChart';

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

const VPDLastData = ({ data }: { data: VPDDataPoint[] }) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const vpdUnit = resolveAxisUnit('vpd');
  const latest = data[data.length - 1];
  const valueColor = useColorModeValue('purple.700', 'purple.200');
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
        variant="vpd"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <Box display="flex" justifyContent="center">
          <WiBarometer size={44} color="#805AD5" />
        </Box>
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color={textColor}
          mt={2}
        >
          {t('analytics.vpd.title')}
        </Text>
        <Text fontSize="2xl" fontWeight="semibold" color={valueColor} mt={2}>
          {latest
            ? `${formatNumber(latest.vpd)}${vpdUnit ? ` ${vpdUnit}` : ''}`.trim()
            : '—'}
        </Text>
        <Text fontSize="xs" color={timeColor} mt={2}>
          {latest
            ? t('analytics.lastData.measuredAt', {
                time: timeAgo(latest.timestamp, t),
              })
            : ''}
        </Text>
        <LastDataAddAlertButton sensorKey="vpd" />
      </LastDataPanel>
    </Box>
  );
};

export default VPDLastData;
