import React from 'react';
import { Box, Text, Badge } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { ALERT_CHOICES } from '@/app/utils/alertChoices';
import useColorModeStyles from '@/app/utils/useColorModeStyles'; // import the custom hook
import '../../styles/style.module.css';

interface AlertProps {
  id: number;
  name: string;
  type: string;
  description: string;
  condition: string;
  condition_nbr: number;
  onClick?: () => void; // optional click handler
}

const Alert: React.FC<AlertProps> = ({
  id,
  name,
  type,
  description,
  condition,
  condition_nbr,
  onClick,
}) => {
  const t = useTranslations();
  const { textColor, bg } = useColorModeStyles(); // Use the custom hook for theme-based styles
  const alertChoice = ALERT_CHOICES.find((alert) => alert.value === type);
  const typeLabels = alertChoice ? t(`alertTypes.${alertChoice.i18nKey}`) : '';

  return (
    <Box
      border="1px solid #ccc"
      p={6}
      key={id}
      borderWidth={1}
      width="100%"
      borderRadius="md"
      overflowY="auto"
      bg={bg} // Background color changes based on the color mode
      boxShadow="lg"
      cursor="pointer"
      onClick={onClick} // Make it clickable
      transition="transform 0.3s ease, box-shadow 0.3s ease"
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: 'xl',
        // bg: hoverColor, // Hover color changes based on the color mode
      }}
    >
      {/* Name and Type */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Text fontWeight="bold" fontSize="xl" color={textColor}>
          {name}
        </Text>
        <Badge colorScheme="brand" fontSize="sm" p={2}>
          {typeLabels || type}
        </Badge>
      </Box>

      {/* Condition Box */}
      <Box mt={4} p={3} bg="gray.50" borderRadius="md">
        <Text fontSize="lg" fontWeight="bold" color="gray.700">
          ⚡ {t('notifications.alert.conditionTitle')}
        </Text>
        <Text color="gray.600">
          <strong>{t('notifications.alert.conditionLabel')}</strong>{' '}
          {condition === '>'
            ? t('conditions.gt')
            : condition === '<'
              ? t('conditions.lt')
              : t('conditions.eq')}{' '}
          {condition_nbr}
        </Text>
      </Box>

      {/* Description Box */}
      <Box mt={4} p={3} bg="gray.50" borderRadius="md">
        <Text fontSize="lg" fontWeight="bold" color="gray.700">
          📜 {t('notifications.alert.descriptionTitle')}
        </Text>
        <Text color="gray.600">{description}</Text>
      </Box>
    </Box>
  );
};

export default Alert;
