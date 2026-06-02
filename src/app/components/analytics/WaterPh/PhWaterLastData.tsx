import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { SensorData } from '@/app/types';
import { GiChemicalDrop } from 'react-icons/gi';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';

const timeAgo = (timestamp: string): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `${diffMin} min.`;
  if (diffH < 24) return `${diffH} h`;
  return then.toLocaleDateString();
};

const PhWaterLastData = ({ data }: { data: SensorData[] }) => {
  useUnitOverridesRevision();
  const latest = data[data.length - 1];
  const unit = resolveAxisUnit('water_ph', latest?.default_unit);

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
        variant="phWater"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <GiChemicalDrop size={44} color="#90be6d" />
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          mt={3}
          color={textColor}
        >
          pH de l&apos;eau (dernière mesure)
        </Text>
        <Text fontSize="2xl" fontWeight="semibold" color={valueColor} mt={1}>
          {latest
            ? `${formatCalibratedReading('water_ph', latest.value)} ${unit}`
            : '—'}
        </Text>
        <Text fontSize="xs" color={subColor} mt={2}>
          {latest ? `Mesure : ${timeAgo(latest.timestamp)}` : ''}
        </Text>
        <LastDataAddAlertButton sensorKey="ph_water" />
      </LastDataPanel>
    </Box>
  );
};

export default PhWaterLastData;
