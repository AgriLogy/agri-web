import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { FaBolt } from 'react-icons/fa';
import { SensorData } from '@/app/types';
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

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  if (diffH < 24) return `${diffH} h`;
  return then.toLocaleDateString();
};

const WindSpeedLastData = ({ data }: { data: SensorData[] }) => {
  const latest = data[data.length - 1];
  useUnitOverridesRevision();
  const unit = resolveAxisUnit('wind_speed', latest?.default_unit);

  const valueColor = useColorModeValue('brand.700', 'brand.200');
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
        <FaBolt size={44} color="#f4a261" />
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          mt={3}
          color={textColor}
        >
          Vitesse du vent (dernière mesure)
        </Text>
        <Text fontSize="2xl" fontWeight="semibold" color={valueColor} mt={1}>
          {latest
            ? `${formatCalibratedReading('wind_speed', latest.value)} ${unit}`
            : 'Non disponible'}
        </Text>
        <Text fontSize="xs" color={timeColor} mt={2}>
          {latest ? `Mesure : ${timeAgo(latest.timestamp)}` : ''}
        </Text>
        <LastDataAddAlertButton sensorKey="wind_speed" />
      </LastDataPanel>
    </Box>
  );
};

export default WindSpeedLastData;
