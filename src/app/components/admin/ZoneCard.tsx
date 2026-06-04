'use client';

import React from 'react';
import { Box, Text, Badge, Tag } from '@chakra-ui/react';
import { useLocale, useTranslations } from 'next-intl';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { ZoneCardType } from '@/app/types';

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

const ZoneCard = ({ zone, onClick }: ZoneCardType) => {
  const { bg, hoverColor, textColor } = useColorModeStyles();
  const t = useTranslations();
  const tag = localeTag(useLocale());

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
        {zone.name}
      </Text>

      <Text color={textColor} fontSize="sm">
        📏 {t('admin.zoneCard.area')} : {zone.space} m²
      </Text>

      <Text color={textColor} fontSize="sm">
        🌱 {t('admin.zoneCard.plant')} :{' '}
        <Badge colorScheme="green">{zone.plant_type}</Badge>
      </Text>

      <Text color={textColor} fontSize="sm">
        🧱 {t('admin.zoneCard.soilType')} :{' '}
        <Badge colorScheme="brand">{zone.soil_type}</Badge>
      </Text>

      <Text color={textColor} fontSize="sm">
        🌿 {t('admin.zoneCard.kc')} : {zone.kc}
      </Text>

      <Text color={textColor} fontSize="sm">
        🚿 {t('admin.zoneCard.irrigationMethod')} :{' '}
        <Tag colorScheme="brand">{zone.irrigation_method}</Tag>
      </Text>

      <Text color={textColor} fontSize="sm">
        🌤️ {t('admin.zoneCard.et0')} : {zone.et0} {t('admin.zoneCard.et0Unit')}
      </Text>

      <Text color={textColor} fontSize="sm">
        🗓️ {t('admin.zoneCard.lastIrrigation')} :{' '}
        {new Date(zone.last_irrigation_date).toLocaleDateString(tag)}
      </Text>
    </Box>
  );
};

export default ZoneCard;
