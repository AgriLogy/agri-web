// import { Box, Text, useColorModeValue } from '@chakra-ui/react';
// import { FaSun } from 'react-icons/fa';
// import { SensorData } from '@/app/types';
// import {
//   formatCalibratedReading,
//   getUnitOverride,
// } from '@/app/utils/unitOverrides';

// const timeAgo = (timestamp: string): string => {
//   const now = new Date();
//   const then = new Date(timestamp);
//   const diffMs = now.getTime() - then.getTime();
//   const diffMin = Math.floor(diffMs / 60000);
//   const diffH = Math.floor(diffMin / 60);

//   if (diffMin < 1) return "À l'instant";
//   if (diffMin < 60) return `${diffMin} min`;
//   if (diffH < 24) return `${diffH} h`;
//   return then.toLocaleDateString();
// };

// const SolarRadiationLastData = ({ data }: { data: SensorData[] }) => {
//   const latest = data[data.length - 1];

//   const bgColor = useColorModeValue('yellow.50', 'yellow.900');
//   const valueColor = useColorModeValue('yellow.700', 'yellow.200');
//   const textColor = useColorModeValue('gray.600', 'gray.300');
//   const timeColor = useColorModeValue('gray.500', 'gray.400');

//   return (
//     <Box
//       bg={bgColor}
//       p={4}
//       borderRadius="md"
//       boxShadow="md"
//       minH="300px"
//       minW="250px"
//       height="100%"
//       width="100%"
//       display="flex"
//       flexDirection="column"
// // //       textAlign="center"
//     >
//       <FaSun size={50} color="#f6c90e" />
//       <Text fontWeight="bold" fontSize="lg" mt={2} color={textColor}>
//         Dernière radiation solaire :
//       </Text>
//       <Text fontSize="2xl" color={valueColor}>
//         {latest
//           ? `${formatCalibratedReading('solar_radiation', latest.value / 1000)} ${getUnitOverride('solar_radiation', 'W/m²')}`
//           : 'N/A'}
//       </Text>
//       <Text fontSize="sm" color={timeColor}>
//         {latest ? `Mise à jour : ${timeAgo(latest.timestamp)}` : ''}
//       </Text>
//     </Box>
//   );
// };

// export default SolarRadiationLastData;

import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { FaSun } from 'react-icons/fa';
import { SensorData } from '@/app/types';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import { useUnitOverridesRevision } from '@/app/hooks/useUnitOverridesRevision';
import LastDataAddAlertButton from '../../common/LastDataAddAlertButton';
import LastDataPanel from '../../common/LastDataPanel';

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
  if (diffH < 24)
    return t('analytics.lastData.hoursAgoShort', { count: diffH });
  return then.toLocaleDateString();
};

const SolarRadiationLastData = ({ data }: { data: SensorData[] }) => {
  const t = useTranslations();
  useUnitOverridesRevision();
  const latest = [...data].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  )[data.length - 1];

  const valueColor = useColorModeValue('yellow.700', 'yellow.200');
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
        variant="solarRadiation"
        display="flex"
        flexDirection="column"
        textAlign="center"
        minW="250px"
      >
        <Box display="flex" justifyContent="center">
          <FaSun size={44} color="#f6c90e" />
        </Box>
        <Text
          fontWeight="semibold"
          fontSize="xs"
          letterSpacing="0.08em"
          textTransform="uppercase"
          mt={3}
          color={textColor}
        >
          {t('analytics.solarRadiation.lastTitle')}
        </Text>
        <Text fontSize="2xl" fontWeight="semibold" color={valueColor} mt={1}>
          {latest
            ? `${formatCalibratedReading('solar_radiation', latest.value)} ${resolveAxisUnit('solar_radiation', latest?.default_unit)}`
            : t('analytics.lastData.noRecentData')}
        </Text>
        <Text fontSize="xs" color={timeColor} mt={2}>
          {latest
            ? t('analytics.lastData.measuredAt', {
                time: timeAgo(latest.timestamp, t),
              })
            : ''}
        </Text>
        <LastDataAddAlertButton sensorKey="solar_radiation" />
      </LastDataPanel>
    </Box>
  );
};

export default SolarRadiationLastData;
