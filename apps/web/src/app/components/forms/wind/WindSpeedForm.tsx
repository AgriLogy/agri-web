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
  Flex,
  Select,
  useToast,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import api from '@agri/api-client/api';

const WindSpeedForm: React.FC = () => {
  const t = useTranslations();
  const [formData, setFormData] = useState({
    name: '',
    type: 'Wind Speed',
    condition: '>',
    description: '',
    condition_nbr: 0,
  });

  const toast = useToast();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      condition: e.target.value,
    }));
  };

  const handlecondition_nbrChange = (valueAsNumber: number) => {
    setFormData((prev) => ({
      ...prev,
      condition_nbr: valueAsNumber,
    }));
  };

  const handleSubmit = async () => {
    try {
      await api.post('/alerts', formData);
      toast({
        title: t('alertsPage.windSpeedForm.successTitle'),
        description: t('alertsPage.windSpeedForm.successDescription'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setFormData({
        name: '',
        type: 'Wind Speed',
        condition: '>',
        description: '',
        condition_nbr: 0,
      });
    } catch {
      toast({
        title: t('alertsPage.windSpeedForm.errorTitle'),
        description: t('alertsPage.windSpeedForm.errorDescription'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box w="100%" p={4} borderRadius="md" overflowY="auto">
      <VStack spacing={4} align="stretch">
        {/* Nom de l'alerte */}
        <FormControl isRequired>
          <FormLabel>{t('alertsPage.windSpeedForm.nameLabel')}</FormLabel>
          <Input
            name="name"
            placeholder={t('alertsPage.windSpeedForm.namePlaceholder')}
            value={formData.name}
            onChange={handleChange}
          />
        </FormControl>

        {/* Type d'alerte */}
        <FormControl isReadOnly>
          <FormLabel>{t('alertsPage.windSpeedForm.typeLabel')}</FormLabel>
          <Input
            name="type"
            value={t('alertTypes.windSpeed')}
            isReadOnly
            readOnly
          />
        </FormControl>

        {/* Condition and condition_nbr */}
        <FormControl isRequired>
          <FormLabel>{t('alertsPage.windSpeedForm.conditionLabel')}</FormLabel>
          <Flex direction="row" align="center" gap={4}>
            {/* Dropdown for condition */}
            <Select
              name="condition"
              value={formData.condition}
              onChange={handleConditionChange}
              w="auto"
            >
              <option value=">">{t('conditions.gt')}</option>
              <option value="<">{t('conditions.lt')}</option>
              <option value="=">{t('conditions.eq')}</option>
            </Select>

            {/* Numeric input for condition_nbr */}
            <NumberInput
              name="condition_nbr"
              min={1}
              max={100}
              value={formData.condition_nbr}
              onChange={(_, valueAsNumber) =>
                handlecondition_nbrChange(valueAsNumber)
              }
              w="100px"
            >
              <NumberInputField name="condition_nbr" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </Flex>
        </FormControl>

        {/* Description */}
        <FormControl>
          <FormLabel>
            {t('alertsPage.windSpeedForm.descriptionLabel')}
          </FormLabel>
          <Textarea
            name="description"
            placeholder={t('alertsPage.windSpeedForm.descriptionPlaceholder')}
            value={formData.description}
            onChange={handleChange}
          />
        </FormControl>

        {/* Bouton de soumission */}
        <Button colorScheme="brand" onClick={handleSubmit} w="full">
          {t('alertsPage.windSpeedForm.submit')}
        </Button>
      </VStack>
    </Box>
  );
};

export default WindSpeedForm;
