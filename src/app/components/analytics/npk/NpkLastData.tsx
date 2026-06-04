import { Box, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { GiChemicalDrop } from 'react-icons/gi';
import { NpkSensorData } from '@/app/types';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import {
  compactResolvedAxisUnits,
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { getCatalogDefaultUnit } from '@/app/utils/sensorCatalog';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';

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

  if (diffMin < 1) return t('analytics.npkLastData.justNow');
  if (diffMin < 60)
    return t('analytics.npkLastData.minutesAgo', { count: diffMin });
  if (diffH < 24) return t('analytics.npkLastData.hoursAgo', { count: diffH });
  return then.toLocaleDateString();
};

const NpkLastData = ({ data }: { data: NpkSensorData[] }) => {
  const t = useTranslations();
  const latest = data[data.length - 1];
  useUnitOverridesRevision();

  const npkFallback = latest?.default_unit ?? getCatalogDefaultUnit('npk_n');
  const unitN = resolveAxisUnit('npk_n', npkFallback);
  const unitP = resolveAxisUnit('npk_p', npkFallback);
  const unitK = resolveAxisUnit('npk_k', npkFallback);
  const npkHeadingUnits = compactResolvedAxisUnits(
    ['npk_n', 'npk_p', 'npk_k'],
    npkFallback
  );

  const noDataColor = useColorModeValue('gray.600', 'gray.300');
  const timeColor = useColorModeValue('gray.500', 'gray.400');
  const textColor = useColorModeValue('gray.600', 'gray.300');

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
        variant="npk"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <GiChemicalDrop size={44} color="#175E33" />
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          mt={3}
          color={textColor}
        >
          {t('analytics.npkLastData.heading', { units: npkHeadingUnits })}
        </Text>

        {latest ? (
          <VStack spacing={2} mt={3}>
            <Text
              fontSize="md"
              fontWeight="medium"
              color={latest.nitrogen_color}
            >
              N : {formatCalibratedReading('npk_n', latest.nitrogen_value)}{' '}
              {unitN}
            </Text>
            <Text
              fontSize="md"
              fontWeight="medium"
              color={latest.phosphorus_color}
            >
              P : {formatCalibratedReading('npk_p', latest.phosphorus_value)}{' '}
              {unitP}
            </Text>
            <Text
              fontSize="md"
              fontWeight="medium"
              color={latest.potassium_color}
            >
              K : {formatCalibratedReading('npk_k', latest.potassium_value)}{' '}
              {unitK}
            </Text>
          </VStack>
        ) : (
          <Text mt={3} fontSize="sm" color={noDataColor}>
            —
          </Text>
        )}

        {latest && (
          <Text fontSize="xs" color={timeColor} mt={3}>
            {t('analytics.npkLastData.measured', {
              ago: timeAgo(latest.timestamp, t),
            })}
          </Text>
        )}
        <LastDataAddAlertButton />
      </LastDataPanel>
    </Box>
  );
};

export default NpkLastData;
