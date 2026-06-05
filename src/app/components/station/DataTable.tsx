'use client';
import React from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorMode,
  HStack,
  Spinner,
} from '@chakra-ui/react';
import { CSVLink } from 'react-csv';
import { useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import ChartPanelHeading from '../common/ChartPanelHeading';

interface SensorData {
  id: number;
  user: string;
  et0: number;
  timestamp: string;
  precipitation_rate: number;
  humidity_weather: number;
  wind_speed: number;
  solar_radiation: number;
  pressure_weather: number;
  wind_direction: number;
  temperature_weather: number;
  ec_soil_medium: number;
  soil_temperature_medium: number;
  soil_ec_high: number;
  ec_soil_low: number;
  soil_moisture_medium: number;
  soil_moisture_high: number;
  soil_moisture_low: number;
  ph_soil: number;
  soil_temperature_low: number;
  soil_temperature_high: number;
}

const DataTable = ({
  data,
}: {
  data: { sensor_data: SensorData[]; sensor_names: any };
}) => {
  const t = useTranslations();
  const { textColor } = useColorModeStyles();
  const { colorMode } = useColorMode();

  if (!data || !data.sensor_data || data.sensor_data.length === 0)
    return <Spinner />;

  const headers = Object.keys(data.sensor_data[0] || {}).map((key) => ({
    label: key.replace(/_/g, ' ').toUpperCase(),
    key: key,
  }));

  return (
    <Box
      width="100%"
      p={4}
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      borderRadius="md"
      boxShadow="lg"
    >
      <HStack justify="space-between" align="flex-start" mb={4}>
        <ChartPanelHeading
          title={t('station.dataTable.title')}
          subtitle={data.sensor_names?.data_table}
          color={textColor}
        />
        <CSVLink
          data={data.sensor_data}
          headers={headers}
          filename="sensor_data.csv"
          style={{ textDecoration: 'none' }}
        >
          <Button colorScheme="brand" mb={4}>
            {t('station.dataTable.exportCsv')}
          </Button>
        </CSVLink>
      </HStack>
      <Box overflowX="auto" overflowY="auto" maxHeight="400px">
        <Table variant="simple" whiteSpace="nowrap">
          <Thead>
            <Tr
              position="sticky"
              top="0"
              bg={colorMode === 'light' ? 'white' : 'gray.800'}
              zIndex={1}
            >
              {headers.map((header) => (
                <Th key={header.key}>{header.label}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {data.sensor_data.map((row) => (
              <Tr key={row.id}>
                {headers.map((header) => (
                  <Td key={header.key} color={textColor}>
                    {row[header.key as keyof SensorData]}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default DataTable;
