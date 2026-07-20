'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
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
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
  IconButton,
} from '@chakra-ui/react';
import { FaPen } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import {
  SENSOR_CATALOG,
  getAllSensorsCatalog,
  getCustomSensorsCatalog,
  isDeviceHealthSensor,
  saveCustomSensorsCatalog,
  type SensorCatalogItem,
} from '@/app/utils/sensorCatalog';
import {
  loadSensorInstanceOverrides,
  mergeCatalogWithOverrides,
  saveSensorInstanceOverrides,
  type SensorInstanceOverride,
  type SensorInstanceOverridesMap,
} from '@/app/utils/sensorInstanceOverrides';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

const PLACEMENT_OPTION_KEYS = [
  'soil',
  'water',
  'weather',
  'greenhouse',
  'leafFruit',
  'electricity',
  'other',
] as const;

const SensorDirectorySettings = () => {
  const t = useTranslations();
  // Built-in sensors resolve their reading/type label from the catalog so they
  // follow the active locale; custom (user-added) sensors keep their stored label.
  const readingFor = (it: { key: string; readingLabel: string }) =>
    t.has(`sensorCatalog.${it.key}.reading`)
      ? t(`sensorCatalog.${it.key}.reading`)
      : it.readingLabel;
  const typeFor = (it: { key: string; typeLabel: string }) =>
    t.has(`sensorCatalog.${it.key}.type`)
      ? t(`sensorCatalog.${it.key}.type`)
      : it.typeLabel;
  const placementOptions = PLACEMENT_OPTION_KEYS.map((k) =>
    t(`settings.directory.placementOptions.${k}`)
  );
  const { mutedTextColor } = useColorModeStyles();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<SensorCatalogItem[]>(SENSOR_CATALOG);
  const [overrides, setOverrides] = useState<SensorInstanceOverridesMap>({});
  const [openAdd, setOpenAdd] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    readingLabel: '',
    typeLabel: '',
    key: '',
    defaultUnit: '',
  });
  const [editDraft, setEditDraft] = useState<SensorInstanceOverride>({});

  useEffect(() => {
    setCatalog(
      getAllSensorsCatalog(true).filter(
        (item) => !isDeviceHealthSensor(item.key)
      )
    );
    setOverrides(loadSensorInstanceOverrides());
  }, []);

  const merged = useMemo(
    () => mergeCatalogWithOverrides(catalog, overrides),
    [catalog, overrides]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((item) => {
      const hay =
        `${item.readingLabel} ${item.typeLabel} ${item.key} ${item.defaultUnit} ${item.displayName ?? ''} ${item.placementType ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, merged]);

  const startEdit = (item: SensorCatalogItem & SensorInstanceOverride) => {
    setEditKey(item.key);
    setEditDraft({
      displayName: item.displayName ?? item.readingLabel,
      placementType: item.placementType ?? '',
      visible: item.visible !== false,
    });
  };

  const saveEdit = () => {
    if (!editKey) return;
    const next: SensorInstanceOverridesMap = {
      ...overrides,
      [editKey]: {
        displayName: editDraft.displayName?.trim() || undefined,
        placementType: editDraft.placementType?.trim() || undefined,
        visible: editDraft.visible !== false,
      },
    };
    setOverrides(next);
    saveSensorInstanceOverrides(next);
    setEditKey(null);
    toast({
      title: t('settings.directory.toastUpdated'),
      status: 'success',
      duration: 2000,
    });
  };

  const addSensor = () => {
    const key = form.key.trim();
    const readingLabel = form.readingLabel.trim();
    const typeLabel = form.typeLabel.trim();
    const defaultUnit = form.defaultUnit.trim();

    if (!key || !readingLabel || !typeLabel || !defaultUnit) {
      toast({
        title: t('settings.directory.requiredFieldsTitle'),
        description: t('settings.directory.requiredFieldsDesc'),
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    if (catalog.some((item) => item.key === key)) {
      toast({
        title: t('settings.directory.keyUsedTitle'),
        description: t('settings.directory.keyUsedDesc'),
        status: 'error',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    const nextItem: SensorCatalogItem = {
      key,
      readingLabel,
      typeLabel,
      defaultUnit,
      category: 'sensor',
    };

    const custom = getCustomSensorsCatalog();
    saveCustomSensorsCatalog([...custom, nextItem]);
    setCatalog(
      getAllSensorsCatalog().filter((item) => !isDeviceHealthSensor(item.key))
    );
    setOpenAdd(false);
    setForm({ readingLabel: '', typeLabel: '', key: '', defaultUnit: '' });
    toast({
      title: t('settings.directory.toastAdded'),
      status: 'success',
      duration: 2200,
      isClosable: true,
    });
  };

  const isBuiltIn = (key: string) => SENSOR_CATALOG.some((s) => s.key === key);

  return (
    <Box>
      <Flex gap={2} mb={3} align="center" flexWrap="wrap">
        <Input
          placeholder={t('settings.directory.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxW="480px"
        />
        <Button size="sm" colorScheme="brand" onClick={() => setOpenAdd(true)}>
          {t('settings.directory.addSensorButton')}
        </Button>
      </Flex>
      <Text fontSize="sm" color={mutedTextColor} mb={2}>
        {t('settings.directory.countShown', { count: rows.length })}
      </Text>
      <TableContainer>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>{t('settings.directory.colDisplayName')}</Th>
              <Th>{t('settings.directory.colTypePlacement')}</Th>
              <Th>{t('settings.directory.colKey')}</Th>
              <Th>{t('settings.directory.colUnit')}</Th>
              <Th>{t('settings.directory.colVisible')}</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.key}>
                <Td>{row.displayName ?? readingFor(row)}</Td>
                <Td>
                  {row.placementType
                    ? `${typeFor(row)} — ${row.placementType}`
                    : typeFor(row)}
                </Td>
                <Td>{row.key}</Td>
                <Td>{row.defaultUnit}</Td>
                <Td>
                  {row.visible === false
                    ? t('settings.directory.no')
                    : t('settings.directory.yes')}
                </Td>
                <Td>
                  <IconButton
                    aria-label={t('settings.directory.editAria')}
                    size="sm"
                    icon={<FaPen />}
                    variant="ghost"
                    onClick={() => startEdit(row)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={openAdd} onClose={() => setOpenAdd(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('settings.directory.addModalTitle')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>{t('settings.directory.fieldLabel')}</FormLabel>
              <Input
                value={form.readingLabel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, readingLabel: e.target.value }))
                }
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>{t('settings.directory.fieldType')}</FormLabel>
              <Input
                value={form.typeLabel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, typeLabel: e.target.value }))
                }
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>{t('settings.directory.fieldKeyUnique')}</FormLabel>
              <Input
                value={form.key}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, key: e.target.value }))
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t('settings.directory.fieldUnit')}</FormLabel>
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
              {t('settings.directory.cancel')}
            </Button>
            <Button colorScheme="brand" onClick={addSensor}>
              {t('settings.directory.add')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={editKey != null}
        onClose={() => setEditKey(null)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('settings.directory.editModalTitle')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>{t('settings.directory.fieldDisplayName')}</FormLabel>
              <Input
                value={editDraft.displayName ?? ''}
                onChange={(e) =>
                  setEditDraft((d) => ({ ...d, displayName: e.target.value }))
                }
                placeholder={t('settings.directory.displayNamePlaceholder')}
              />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>
                {t('settings.directory.fieldPlacementType')}
              </FormLabel>
              <Input
                list="placement-suggestions"
                value={editDraft.placementType ?? ''}
                onChange={(e) =>
                  setEditDraft((d) => ({ ...d, placementType: e.target.value }))
                }
                placeholder={t('settings.directory.placementPlaceholder')}
              />
              <datalist id="placement-suggestions">
                {placementOptions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </FormControl>
            <Checkbox
              isChecked={editDraft.visible !== false}
              onChange={(e) =>
                setEditDraft((d) => ({ ...d, visible: e.target.checked }))
              }
            >
              {t('settings.directory.visibleInLists')}
            </Checkbox>
            {editKey && isBuiltIn(editKey) && (
              <Text fontSize="xs" color={mutedTextColor} mt={3}>
                {t('settings.directory.catalogNote')}
              </Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={() => setEditKey(null)}>
              {t('settings.directory.cancel')}
            </Button>
            <Button colorScheme="brand" onClick={saveEdit}>
              {t('settings.directory.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SensorDirectorySettings;
