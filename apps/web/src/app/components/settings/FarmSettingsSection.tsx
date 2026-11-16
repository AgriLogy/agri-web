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
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useCan } from '@/app/hooks/useAccessLevel';
import { PermissionGate } from '@/app/components/common/PermissionGate';
import {
  getFarmImageDataUrl,
  setFarmImageDataUrl,
} from '@/app/utils/farmImageStorage';

type MyZone = { id: number; name: string };

const FarmSettingsSection = () => {
  const t = useTranslations();
  const { canEdit } = useCan();
  const toast = useToast();
  const { textColor, bg, bgColor, borderColor, mutedTextColor } =
    useColorModeStyles();
  // GET /zones gives the caller's zones; PATCH /zones/{id} renames one
  // (agri-web#172 — the old /api/zone-per-user routes no longer exist).
  const [zones, setZones] = useState<MyZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<number, string>>({});
  const [, bump] = useState(0);

  useEffect(() => {
    api
      .get<MyZone[]>('/zones')
      .then((res) => {
        const list = res.data ?? [];
        setZones(list);
        setNames(Object.fromEntries(list.map((z) => [z.id, z.name])));
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
  }, [toast, t]);

  const saveZone = async (zone: MyZone) => {
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
      const res = await api.patch<MyZone>(`/zones/${zone.id}`, { name });
      setZones((prev) =>
        prev.map((z) => (z.id === zone.id ? { ...z, name: res.data.name } : z))
      );
      setNames((prev) => ({ ...prev, [zone.id]: res.data.name }));
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
      {zones.map((zone) => {
        const img = getFarmImageDataUrl(zone.id);
        return (
          <Box
            key={zone.id}
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
