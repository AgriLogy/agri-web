'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import {
  SENSOR_CATALOG,
  getAllSensorsCatalog,
  getCustomSensorsCatalog,
  saveCustomSensorsCatalog,
  type SensorCatalogItem,
} from '@/app/utils/sensorCatalog';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

const SensorSearchDirectory = ({
  allowAdd = false,
}: {
  allowAdd?: boolean;
}) => {
  const t = useTranslations();
  const { mutedTextColor } = useColorModeStyles();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<SensorCatalogItem[]>(SENSOR_CATALOG);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    readingLabel: '',
    typeLabel: '',
    key: '',
    defaultUnit: '',
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((item) => {
      const haystack =
        `${item.readingLabel} ${item.typeLabel} ${item.key} ${item.defaultUnit}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, catalog]);

  useEffect(() => {
    setCatalog(getAllSensorsCatalog(true));
  }, []);

  const addSensor = () => {
    const key = form.key.trim();
    const readingLabel = form.readingLabel.trim();
    const typeLabel = form.typeLabel.trim();
    const defaultUnit = form.defaultUnit.trim();

    if (!key || !readingLabel || !typeLabel || !defaultUnit) {
      toast({
        title: t('settings.searchDirectory.requiredFieldsTitle'),
        description: t('settings.searchDirectory.requiredFieldsDesc'),
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    if (catalog.some((item) => item.key === key)) {
      toast({
        title: t('settings.searchDirectory.keyUsedTitle'),
        description: t('settings.searchDirectory.keyUsedDesc'),
        status: 'error',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    const next: SensorCatalogItem = {
      key,
      readingLabel,
      typeLabel,
      defaultUnit,
      category: 'sensor',
    };

    const custom = getCustomSensorsCatalog();
    saveCustomSensorsCatalog([...custom, next]);
    setCatalog(getAllSensorsCatalog());
    setOpenAdd(false);
    setForm({ readingLabel: '', typeLabel: '', key: '', defaultUnit: '' });
    toast({
      title: t('settings.searchDirectory.toastAddedTitle'),
      description: t('settings.searchDirectory.toastAddedDesc'),
      status: 'success',
      duration: 2200,
      isClosable: true,
    });
  };

  return (
    <Box>
      <Flex gap={2} mb={3} align="center" flexWrap="wrap">
        <Input
          placeholder={t('settings.searchDirectory.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxW="420px"
        />
        {allowAdd && (
          <Button
            size="sm"
            colorScheme="brand"
            onClick={() => setOpenAdd(true)}
          >
            {t('settings.searchDirectory.addSensorButton')}
          </Button>
        )}
      </Flex>
      <Text fontSize="sm" color={mutedTextColor} mb={2}>
        {t('settings.searchDirectory.countFound', { count: rows.length })}
      </Text>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>{t('settings.searchDirectory.colLabel')}</Th>
            <Th>{t('settings.searchDirectory.colType')}</Th>
            <Th>{t('settings.searchDirectory.colKey')}</Th>
            <Th>{t('settings.searchDirectory.colDefaultUnit')}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.key}>
              <Td>{row.readingLabel}</Td>
              <Td>{row.typeLabel}</Td>
              <Td>{row.key}</Td>
              <Td>{row.defaultUnit}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={openAdd} onClose={() => setOpenAdd(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {t('settings.searchDirectory.addModalTitle')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>{t('settings.searchDirectory.fieldLabel')}</FormLabel>
              <Input
                value={form.readingLabel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, readingLabel: e.target.value }))
                }
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>{t('settings.searchDirectory.fieldType')}</FormLabel>
              <Input
                value={form.typeLabel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, typeLabel: e.target.value }))
                }
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>
                {t('settings.searchDirectory.fieldKeyUnique')}
              </FormLabel>
              <Input
                value={form.key}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, key: e.target.value }))
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t('settings.searchDirectory.fieldUnit')}</FormLabel>
              <Input
                value={form.defaultUnit}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, defaultUnit: e.target.value }))
                }
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={() => setOpenAdd(false)}>
              {t('settings.searchDirectory.cancel')}
            </Button>
            <Button colorScheme="brand" onClick={addSensor}>
              {t('settings.searchDirectory.add')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SensorSearchDirectory;
