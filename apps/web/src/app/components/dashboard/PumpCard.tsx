import React from 'react';
import { Box, Text, Tag } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { type Pump } from '@/app/utils/vannesPompesStorage';

interface Props {
  pump: Pump;
  onClick?: () => void;
}

const PumpCard = ({ pump, onClick }: Props) => {
  const { bg, hoverColor, textColor } = useColorModeStyles();
  const t = useTranslations();

  return (
    <Box
      bg={bg}
      p={2}
      borderWidth="1px"
      borderRadius="xl"
      boxShadow="md"
      _hover={{ cursor: 'pointer', borderColor: hoverColor }}
      onClick={onClick}
    >
      <Text fontWeight="bold" fontSize="lg" color={textColor}>
        {pump.name}
      </Text>

      <Text color={textColor} fontSize="sm" mt={2}>
        ⚙️ {t('shell.pumpCard.status')}:{' '}
        <Tag colorScheme={pump.running ? 'green' : 'red'}>
          {pump.running
            ? t('shell.pumpCard.running')
            : t('shell.pumpCard.stopped')}
        </Tag>
      </Text>
    </Box>
  );
};

export default PumpCard;
