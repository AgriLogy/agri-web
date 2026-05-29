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
import api from '@/app/lib/api';

const WindSpeedForm: React.FC = () => {
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
        title: 'Alerte créée',
        description: 'Alerte de vitesse du vent ajoutée avec succès.',
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
        title: 'Erreur',
        description: "Échec de la création de l'alerte de vitesse du vent.",
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
          <FormLabel>Nom de l&apos;alerte</FormLabel>
          <Input
            name="name"
            placeholder="Entrez le nom de l'alerte"
            value={formData.name}
            onChange={handleChange}
          />
        </FormControl>

        {/* Type d'alerte */}
        <FormControl isReadOnly>
          <FormLabel>Type d&apos;alerte</FormLabel>
          <Input name="type" value={formData.type} isReadOnly />
        </FormControl>

        {/* Condition and condition_nbr */}
        <FormControl isRequired>
          <FormLabel>Condition</FormLabel>
          <Flex direction="row" align="center" gap={4}>
            {/* Dropdown for condition */}
            <Select
              name="condition"
              value={formData.condition}
              onChange={handleConditionChange}
              w="auto"
            >
              <option value=">">Supérieur à</option>
              <option value="<">Inférieur à</option>
              <option value="=">Égal à</option>
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
          <FormLabel>Description</FormLabel>
          <Textarea
            name="description"
            placeholder="Entrez la description"
            value={formData.description}
            onChange={handleChange}
          />
        </FormControl>

        {/* Bouton de soumission */}
        <Button colorScheme="brand" onClick={handleSubmit} w="full">
          Soumettre
        </Button>
      </VStack>
    </Box>
  );
};

export default WindSpeedForm;
