import React from 'react';
import { Box, Text, useBreakpointValue } from '@chakra-ui/react';
import { CircularProgress } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

interface StatusIndicatorsProps {
  humidity: number;
  solarRadiation: number;
  solarPanelVoltage: number;
}

const StatusIndicators: React.FC<StatusIndicatorsProps> = ({
  humidity,
  solarRadiation,
  solarPanelVoltage,
}) => {
  const {
    bg,
    textColor,
    humidityColors,
    solarRadiationColors,
    solarPanelVoltageColors,
  } = useColorModeStyles();
  const t = useTranslations();
  const p = useBreakpointValue({ base: 2, md: 4 });

  const getHumidityColor = (value: number) => {
    if (value < 20) return humidityColors.red;
    if (value > 80) return humidityColors.green;
    return humidityColors.yellow;
  };

  const getSolarRadiationColor = (value: number) => {
    if (value < 200) return solarRadiationColors.red;
    if (value > 800) return solarRadiationColors.green;
    return solarRadiationColors.yellow;
  };

  const getSolarPanelVoltageColor = (value: number) => {
    if (value < 10) return solarPanelVoltageColors.red;
    if (value > 120) return solarPanelVoltageColors.green;
    return solarPanelVoltageColors.yellow;
  };

  const systemStatus = () => {
    if (
      getHumidityColor(humidity) === humidityColors.red ||
      getSolarRadiationColor(solarRadiation) === solarRadiationColors.red ||
      getSolarPanelVoltageColor(solarPanelVoltage) ===
        solarPanelVoltageColors.red
    ) {
      return t('shell.statusIndicators.systemUnhealthy');
    }
    return t('shell.statusIndicators.systemHealthy');
  };

  return (
    <Box
      width="100%"
      height="100%"
      bg={bg}
      borderRadius="md"
      boxShadow="lg"
      p={p}
      overflowX="auto"
    >
      <Text color={textColor} fontSize="lg" fontWeight="bold" mb={4}>
        {t('shell.statusIndicators.title')}
      </Text>
      <Box
        display="flex"
        justifyContent="space-around"
        flexWrap="wrap"
        width="100%"
        mb={4}
      >
        <Box textAlign="center" mx={2} mb={4}>
          <Text color={textColor}>{t('sensors.humidity_air')} (%)</Text>
          <CircularProgress
            value={humidity}
            color={getHumidityColor(humidity)}
            size="120px"
            thickness="12px"
          />
          <Text color={textColor} fontSize="md" mt={2}>
            {humidity}%
          </Text>
        </Box>
        <Box textAlign="center" mx={2} mb={4}>
          <Text color={textColor}>{t('sensors.solar_radiation')} (W/m²)</Text>
          <CircularProgress
            value={solarRadiation}
            color={getSolarRadiationColor(solarRadiation)}
            size="120px"
            thickness="12px"
          />
          <Text color={textColor} fontSize="md" mt={2}>
            {solarRadiation} W/m²
          </Text>
        </Box>
        <Box textAlign="center" mx={2} mb={4}>
          <Text color={textColor}>
            {t('shell.statusIndicators.panelVoltage')} (V)
          </Text>
          <CircularProgress
            value={solarPanelVoltage}
            color={getSolarPanelVoltageColor(solarPanelVoltage)}
            size="120px"
            thickness="12px"
          />
          <Text color={textColor} fontSize="md" mt={2}>
            {solarPanelVoltage} V
          </Text>
        </Box>
      </Box>
      <Text color={textColor} textAlign="center" mt={4}>
        {systemStatus()}
      </Text>
    </Box>
  );
};

export default StatusIndicators;
