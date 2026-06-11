'use client';

import React, { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import axios from 'axios';

const HighPressure: React.FC = () => {
  const t = useTranslations();
  const [formData, setFormData] = useState({
    alertName: '',
    alertType: 'Pressure - High',
    percentage: 1,
    description: '',
  });

  const toast = useToast();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePercentageChange = (valueAsNumber: number) => {
    setFormData((prev) => ({
      ...prev,
      percentage: valueAsNumber,
    }));
  };

  const handleSubmit = async () => {
    try {
      await axios.post('/api/alerts/windspeed', formData);
      toast({
        title: t('alertsPage.windForm.successTitle'),
        description: t('alertsPage.windForm.successDescription'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setFormData({
        alertName: '',
        alertType: 'Pressure - High',
        percentage: 1,
        description: '',
      });
    } catch {
      toast({
        title: t('alertsPage.windForm.errorTitle'),
        description: t('alertsPage.windForm.errorWindSpeed'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box w="100%" p={4} borderRadius="md" overflowY="auto">
      <VStack spacing={4} align="stretch">
        {/* Alert Name */}
        <FormControl isRequired>
          <FormLabel>{t('alertsPage.windForm.nameLabel')}</FormLabel>
          <Input
            name="alertName"
            placeholder={t('alertsPage.windForm.namePlaceholder')}
            value={formData.alertName}
            onChange={handleChange}
          />
        </FormControl>

        {/* Alert Type */}
        <FormControl isReadOnly>
          <FormLabel>{t('alertsPage.windForm.typeLabel')}</FormLabel>
          <Input name="alertType" value={formData.alertType} isReadOnly />
        </FormControl>

        {/* Percentage */}
        <FormControl isRequired>
          <FormLabel>{t('alertsPage.windForm.percentageLabel')}</FormLabel>
          <NumberInput
            defaultValue={1}
            min={1}
            max={100}
            value={formData.percentage}
            onChange={(_, valueAsNumber) =>
              handlePercentageChange(valueAsNumber)
            }
          >
            <NumberInputField name="percentage" />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        {/* Description */}
        <FormControl>
          <FormLabel>{t('alertsPage.windForm.descriptionLabel')}</FormLabel>
          <Textarea
            name="description"
            placeholder={t('alertsPage.windForm.descriptionPlaceholder')}
            value={formData.description}
            onChange={handleChange}
          />
        </FormControl>

        {/* Submit Button */}
        <Button colorScheme="brand" onClick={handleSubmit} w="full">
          {t('alertsPage.windForm.submit')}
        </Button>
      </VStack>
    </Box>
  );
};

export default HighPressure;
