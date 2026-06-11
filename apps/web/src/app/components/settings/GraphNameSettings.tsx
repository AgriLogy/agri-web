'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  Text,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  useToast,
  Button,
  Flex,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import api from '@agri/api-client/api';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import EmptyBox from '../common/EmptyBox';

interface SensorSetting {
  name: string;
  customName: string;
}

const GraphNameSettings = () => {
  const t = useTranslations();
  const [settings, setSettings] = useState<SensorSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useToast();
  const { textColor } = useColorModeStyles();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const graphResponse = await api.get('/api/graph-name/');
        const graphData = graphResponse.data;

        const sensorSettings: SensorSetting[] = Object.keys(graphData).map(
          (key) => ({
            name: key,
            customName: graphData[key],
          })
        );

        setSettings(sensorSettings);
      } catch (error) {
        console.error('Error fetching sensor settings', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (index: number, value: string) => {
    const updatedSettings = [...settings];
    updatedSettings[index].customName = value;
    setSettings(updatedSettings);
  };

  const handleSave = async () => {
    try {
      const graphUpdate = settings.reduce(
        (acc, sensor) => {
          acc[sensor.name] = sensor.customName;
          return acc;
        },
        {} as Record<string, string>
      );

      await api.put(`/api/graph-name/`, graphUpdate);

      toast({
        title: t('settings.graphName.successTitle'),
        description: t('settings.graphName.successDescription'),
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating settings', error);
      toast({
        title: t('settings.graphName.errorTitle'),
        description: t('settings.graphName.errorDescription'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  return (
    <div>
      {loading ? (
        <EmptyBox variant="loading" />
      ) : (
        <>
          <Text color={textColor}>{t('settings.graphName.title')}</Text>

          <Table>
            <Thead>
              <Tr>
                <Th>{t('settings.graphName.colName')}</Th>
                <Th>{t('settings.graphName.colCustomName')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {settings.map((sensor, index) => (
                <Tr key={sensor.name}>
                  <Td>{sensor.name}</Td>
                  <Td>
                    <Input
                      value={sensor.customName}
                      onChange={(e) => handleChange(index, e.target.value)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Flex justifyContent="center" mt={4}>
            <Button colorScheme="brand" size="lg" onClick={handleSave}>
              {t('settings.graphName.save')}
            </Button>
          </Flex>
        </>
      )}
    </div>
  );
};

export default GraphNameSettings;
