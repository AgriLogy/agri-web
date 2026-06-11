'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Text,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  useToast,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import api from '@agri/api-client/api';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import EmptyBox from '../common/EmptyBox';

const SensorColorSettings = () => {
  const t = useTranslations();
  const { textColor } = useColorModeStyles();

  const [sensorColors, setSensorColors] = useState<Record<
    string,
    string
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await api.get('/api/sensor-color/');
        setSensorColors(response.data);
      } catch {
        toast({
          title: t('settings.sensorColor.errorTitle'),
          description: t('settings.sensorColor.fetchError'),
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchColors();
  }, [toast, t]);

  const handleColorChange = (key: string, value: string) => {
    setSensorColors((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const saveChanges = async (key: string, value: string) => {
    try {
      await api.put('/api/sensor-color/', { [key]: value });
      toast({
        title: t('settings.sensorColor.successTitle'),
        description: t('settings.sensorColor.successDescription'),
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch {
      toast({
        title: t('settings.sensorColor.errorTitle'),
        description: t('settings.sensorColor.errorDescription'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (loading) return <EmptyBox variant="loading" />;

  return (
    <Box overflowX="auto">
      <Text color={textColor}>{t('settings.sensorColor.title')}</Text>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>{t('settings.sensorColor.colName')}</Th>
            <Th>{t('settings.sensorColor.colColor')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {sensorColors &&
            Object.entries(sensorColors).map(([key, value]) => (
              <Tr key={key}>
                <Td>{key.replace(/_/g, ' ')}</Td>
                <Td>
                  <Input
                    type="color"
                    value={value}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    onBlur={() => saveChanges(key, sensorColors[key])}
                    width="50px"
                    p="0"
                  />
                </Td>
              </Tr>
            ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default SensorColorSettings;
