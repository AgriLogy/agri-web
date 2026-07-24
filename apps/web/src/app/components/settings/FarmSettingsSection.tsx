'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  VStack,
  useToast,
  Image as ChakraImage,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import api from '@agri/api-client/api';
import type { ZoneType, ZoneWrapper } from '@/app/types';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useCan } from '@/app/hooks/useAccessLevel';
import { PermissionGate } from '@/app/components/common/PermissionGate';
import {
  getFarmImageDataUrl,
  setFarmImageDataUrl,
} from '@/app/utils/farmImageStorage';

const FarmSettingsSection = () => {
  const t = useTranslations();
  const { canEdit } = useCan();
  const toast = useToast();
  const { textColor, bg, bgColor, borderColor, mutedTextColor } =
    useColorModeStyles();
  const [username, setUsername] = useState('');
  const [zones, setZones] = useState<ZoneWrapper[]>([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<number, string>>({});
  const [, bump] = useState(0);

  useEffect(() => {
    api
      .get<{ username: string }>('/users/me')
      .then((r) => setUsername(r.data.username))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    api
      .get<ZoneWrapper[]>(`/api/zone-per-user/${username}/`)
      .then((res) => {
        const list = res.data ?? [];
        setZones(list);
        const n: Record<number, string> = {};
        for (const zw of list) {
          n[zw.zone.id] = zw.zone.name;
        }
        setNames(n);
      })
      .catch(() => {
        toast({
          title: t('settings.farms.errorTitle'),
          description: t('settings.farms.loadFarmsError'),
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      })
      .finally(() => setLoading(false));
  }, [username, toast]);

  const saveZone = async (zone: ZoneType) => {
    const name = names[zone.id]?.trim();
    if (!name) {
      toast({
        title: t('settings.farms.nameRequired'),
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    try {
      const payload: ZoneType = { ...zone, name };
      await api.put(`/api/mod-zone-per-user/${username}/${zone.id}/`, payload);
      setZones((prev) =>
        prev.map((zw) =>
          zw.zone.id === zone.id ? { ...zw, zone: { ...zw.zone, name } } : zw
        )
      );
      toast({
        title: t('settings.farms.farmUpdated'),
        status: 'success',
        duration: 2000,
      });
    } catch {
      toast({
        title: t('settings.farms.saveFailed'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const onPickImage = (zoneId: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl.length > 2_500_000) {
        toast({
          title: t('settings.farms.imageTooLargeTitle'),
          description: t('settings.farms.imageTooLargeDesc'),
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
        return;
      }
      setFarmImageDataUrl(zoneId, dataUrl);
      bump((x) => x + 1);
      toast({
        title: t('settings.farms.imageSavedTitle'),
        description: t('settings.farms.imageSavedDesc'),
        status: 'success',
        duration: 3500,
        isClosable: true,
      });
    };
    reader.readAsDataURL(file);
  };

  if (loading && !zones.length) {
    return (
      <Text color={textColor} fontSize="sm">
        {t('settings.farms.loading')}
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="sm" color={mutedTextColor}>
        {t('settings.farms.intro')}
      </Text>
      {zones.length === 0 && (
        <Text color={textColor}>{t('settings.farms.empty')}</Text>
      )}
      {zones.map((zw) => {
        const zone = zw.zone;
        const img = getFarmImageDataUrl(zone.id);
        return (
          <Box
            key={zw.id}
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor={borderColor}
            bg={bg}
          >
            <Heading size="sm" mb={3} color={textColor}>
              {t('settings.farms.farmZoneHeading', { id: zone.id })}
            </Heading>
            <Flex
              direction={{ base: 'column', md: 'row' }}
              gap={4}
              align="flex-start"
            >
              <Box>
                {img ? (
                  <ChakraImage
                    src={img}
                    alt={zone.name}
                    maxW="200px"
                    maxH="120px"
                    objectFit="cover"
                    borderRadius="md"
                  />
                ) : (
                  <Box
                    w="200px"
                    h="100px"
                    bg={bgColor}
                    borderWidth="1px"
                    borderStyle="dashed"
                    borderColor={borderColor}
                    borderRadius="md"
                  />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  size="sm"
                  mt={2}
                  onChange={(e) =>
                    onPickImage(zone.id, e.target.files?.[0] ?? null)
                  }
                />
                {img && (
                  <Button
                    size="xs"
                    variant="link"
                    mt={1}
                    onClick={() => {
                      setFarmImageDataUrl(zone.id, null);
                      bump((x) => x + 1);
                    }}
                  >
                    {t('settings.farms.removeImage')}
                  </Button>
                )}
              </Box>
              <VStack align="stretch" flex={1} spacing={3}>
                <FormControl>
                  <FormLabel>{t('settings.farms.farmNameLabel')}</FormLabel>
                  <Input
                    value={names[zone.id] ?? ''}
                    isDisabled={!canEdit}
                    onChange={(e) =>
                      setNames((prev) => ({
                        ...prev,
                        [zone.id]: e.target.value,
                      }))
                    }
                  />
                </FormControl>
                <PermissionGate
                  blocked={!canEdit}
                  reason={t('access.editRequiresEditor')}
                  ui="chakra"
                >
                  <Button
                    size="sm"
                    colorScheme="brand"
                    alignSelf="flex-start"
                    onClick={() => void saveZone(zone)}
                  >
                    {t('settings.farms.saveNameButton')}
                  </Button>
                </PermissionGate>
              </VStack>
            </Flex>
          </Box>
        );
      })}
    </VStack>
  );
};

export default FarmSettingsSection;
