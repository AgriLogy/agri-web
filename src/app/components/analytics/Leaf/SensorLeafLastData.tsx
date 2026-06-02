import {
  Box,
  Divider,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { WiRaindrop, WiThermometer } from 'react-icons/wi';
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

const SensorLeafLastData = ({
  temperature,
  moisture,
}: {
  temperature?: { value: number; timestamp: string };
  moisture?: { value: number; timestamp: string };
}) => {
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
          Capteur foliaire
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
              Température foliaire
            </Text>
            <Text fontSize="xl" fontWeight="semibold" color={valueTemp} mt={1}>
              {temperature
                ? `${formatCalibratedReading('leaf_temperature', temperature.value)} ${resolveAxisUnit('leaf_temperature')}`
                : '—'}
            </Text>
            <Text fontSize="xs" color={subColor} mt={1}>
              {temperature ? `Mesure : ${timeAgo(temperature.timestamp)}` : ''}
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
              Humidité foliaire
            </Text>
            <Text fontSize="xl" fontWeight="semibold" color={valueMoist} mt={1}>
              {moisture
                ? `${formatCalibratedReading('leaf_moisture', moisture.value)} ${resolveAxisUnit('leaf_moisture')}`
                : '—'}
            </Text>
            <Text fontSize="xs" color={subColor} mt={1}>
              {moisture ? `Mesure : ${timeAgo(moisture.timestamp)}` : ''}
            </Text>
          </Box>
        </VStack>
        <LastDataAddAlertButton sensorKey="leaf_temperature" />
      </LastDataPanel>
    </Box>
  );
};

export default SensorLeafLastData;
