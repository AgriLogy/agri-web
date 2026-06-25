import { Box, Flex, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { SensorData } from '@/app/types';
import { resolveAxisUnit } from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import { formatNumber } from '@/app/utils/formatNumber';
import LastDataPanel from '../../common/LastDataPanel';

export interface BasinGeometry {
  maxDepthM?: number | null;
  areaM2?: number | null;
  /** Reading offset (m) subtracted from the raw level reading. */
  offsetM?: number | null;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const Row = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) => {
  const labelColor = useColorModeValue('gray.500', 'gray.400');
  return (
    <Flex justify="space-between" align="baseline" w="100%">
      <Text fontSize="xs" color={labelColor}>
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="semibold" color={color}>
        {value}
      </Text>
    </Flex>
  );
};

const WaterLevelLastData = ({
  data,
  basin = {},
}: {
  data: SensorData[];
  basin?: BasinGeometry;
}) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const unit = resolveAxisUnit(
    'water_level',
    data[data.length - 1]?.default_unit
  );
  const latest = data[data.length - 1];

  const valueColor = useColorModeValue('blue.700', 'blue.200');
  const titleColor = useColorModeValue('gray.600', 'gray.300');
  const tankBorder = useColorModeValue('blue.300', 'blue.600');
  const tankBg = useColorModeValue('blue.50', 'gray.700');

  const maxDepth = basin.maxDepthM ?? null;
  const area = basin.areaM2 ?? null;
  const offset = basin.offsetM ?? 0;

  const reading = typeof latest?.value === 'number' ? latest.value : null;
  // Water column height = reading minus an optional sensor mount offset.
  const waterHeight =
    reading === null ? null : Math.max(0, reading - (offset ?? 0));

  const fillPct =
    waterHeight !== null && maxDepth && maxDepth > 0
      ? clamp((waterHeight / maxDepth) * 100, 0, 100)
      : null;

  // Capacity in litres = area (m²) × height (m) × 1000.
  const capacityL =
    waterHeight !== null && area && area > 0 ? area * waterHeight * 1000 : null;

  const dash = '—';

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
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color={titleColor}
        >
          {t('analytics.waterLevel.cardTitle')}
        </Text>

        {/* Tank visualization */}
        <Flex justify="center" my={3}>
          <Box
            position="relative"
            w="64px"
            h="120px"
            borderWidth="2px"
            borderColor={tankBorder}
            borderRadius="md"
            bg={tankBg}
            overflow="hidden"
          >
            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              h={`${fillPct ?? 0}%`}
              bgGradient="linear(to-t, blue.500, blue.300)"
              transition="height 0.4s ease"
            />
            <Flex position="absolute" inset={0} align="center" justify="center">
              <Text fontSize="md" fontWeight="bold" color={valueColor}>
                {fillPct !== null ? `${formatNumber(fillPct)}%` : dash}
              </Text>
            </Flex>
          </Box>
        </Flex>

        <VStack spacing={2} align="stretch" w="100%">
          <Row
            label={t('analytics.waterLevel.maxDepth')}
            value={maxDepth != null ? `${formatNumber(maxDepth)} m` : dash}
            color={valueColor}
          />
          <Row
            label={t('analytics.waterLevel.sensorLevel')}
            value={reading != null ? `${formatNumber(reading)} ${unit}` : dash}
            color={valueColor}
          />
          <Row
            label={t('analytics.waterLevel.capacity')}
            value={capacityL != null ? `${formatNumber(capacityL)} L` : dash}
            color={valueColor}
          />
          <Row
            label={t('analytics.waterLevel.fillPct')}
            value={fillPct != null ? `${formatNumber(fillPct)} %` : dash}
            color={valueColor}
          />
        </VStack>
      </LastDataPanel>
    </Box>
  );
};

export default WaterLevelLastData;
