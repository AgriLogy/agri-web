import React from 'react';
import { Box, Text, Tag, Badge } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

export type Electrovanne = {
  id: number;
  vanneName: string;
  statusMode: 'manual' | 'auto';
  devEUI: string;
  isActivated: boolean;
};

interface Props {
  electrovanne: Electrovanne;
  onClick?: () => void;
}

const ElectrovanCard = ({ electrovanne, onClick }: Props) => {
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
        {electrovanne.vanneName}
      </Text>

      <Text color={textColor} fontSize="sm">
        🔌 {t('shell.electrovanCard.devEui')}:{' '}
        <Badge>{electrovanne.devEUI}</Badge>
      </Text>

      <Text color={textColor} fontSize="sm" mt={2}>
        ⚙️ {t('shell.electrovanCard.mode')}:{' '}
        <Tag
          colorScheme={
            electrovanne.statusMode === 'manual' ? 'yellow' : 'brand'
          }
        >
          {electrovanne.statusMode === 'manual'
            ? t('shell.electrovanCard.modeManual')
            : t('shell.electrovanCard.modeAuto')}
        </Tag>
      </Text>

      <Text color={textColor} fontSize="sm" mt={2}>
        💡 {t('shell.electrovanCard.status')}:{' '}
        <Tag colorScheme={electrovanne.isActivated ? 'green' : 'red'}>
          {electrovanne.isActivated
            ? t('shell.electrovanCard.activated')
            : t('shell.electrovanCard.deactivated')}
        </Tag>
      </Text>
    </Box>
  );
};

export default ElectrovanCard;
