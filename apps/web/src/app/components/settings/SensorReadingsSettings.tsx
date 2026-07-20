'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  chakra,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
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
  useColorModeValue,
} from '@chakra-ui/react';
import { FaCheck, FaPen, FaTimes } from 'react-icons/fa';
import {
  MobileRecordCards,
  type RecordCard,
} from '@/app/components/common/MobileRecordCards';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { useTranslations } from 'next-intl';
import {
  getAllSensorsCatalog,
  getReadingLabelOptions,
  getTypeLabelOptions,
  getUnitSelectOptions,
  isDeviceHealthSensor,
} from '@/app/utils/sensorCatalog';
import {
  composeCalibrationWithUnitChange,
  getCompatibleUnitOptions,
} from '@/app/utils/sensorUnitConversion';
import { notifyUnitOverridesChanged } from '@/app/hooks/useUnitOverridesRevision';
import { getDefaultCalibrationForSensorKey } from '@/app/utils/sensorCalibrationDefaults';
import { fetchLastSensorSample } from '@/app/utils/fetchSensorLastValue';
import {
  formatCalibratedReading,
  resolveAxisUnit,
} from '@/app/utils/unitOverrides';
import api from '@agri/api-client/api';

type UnitSettingRow = {
  key: string;
  readingLabel: string;
  typeLabel: string;
  unit: string;
  scaleA: number;
  offsetB: number;
  lastValue: string;
};

const STORAGE_KEY = 'frontendUnitOverrides';

type RowOverridePayload = Pick<
  UnitSettingRow,
  'readingLabel' | 'typeLabel' | 'unit' | 'scaleA' | 'offsetB'
>;

function mergeSelectOptions(options: string[], current: string): string[] {
  const s = new Set(options);
  const t = current.trim();
  if (t) s.add(t);
  return [...s].sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );
}

function getDefaultRows(): UnitSettingRow[] {
  return getAllSensorsCatalog(false)
    .filter((item) => !isDeviceHealthSensor(item.key))
    .map((item) => {
      const spec = getDefaultCalibrationForSensorKey(item.key);
      return {
        key: item.key,
        readingLabel: item.readingLabel,
        typeLabel: item.typeLabel,
        unit: item.defaultUnit,
        scaleA: spec.scaleA,
        offsetB: spec.offsetB,
        lastValue: '—',
      };
    });
}

function getMountedRows(): UnitSettingRow[] {
  return getAllSensorsCatalog(true)
    .filter((item) => !isDeviceHealthSensor(item.key))
    .map((item) => {
      const spec = getDefaultCalibrationForSensorKey(item.key);
      return {
        key: item.key,
        readingLabel: item.readingLabel,
        typeLabel: item.typeLabel,
        unit: item.defaultUnit,
        scaleA: spec.scaleA,
        offsetB: spec.offsetB,
        lastValue: '—',
      };
    });
}

function loadRows(): UnitSettingRow[] {
  const defaults = getMountedRows();
  if (typeof window === 'undefined') return defaults;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Record<
      string,
      Partial<RowOverridePayload>
    >;
    return defaults.map((row) => {
      const spec = getDefaultCalibrationForSensorKey(row.key);
      return {
        ...row,
        readingLabel: parsed[row.key]?.readingLabel ?? row.readingLabel,
        typeLabel: parsed[row.key]?.typeLabel ?? row.typeLabel,
        unit: parsed[row.key]?.unit ?? row.unit,
        scaleA: parsed[row.key]?.scaleA ?? spec.scaleA,
        offsetB: parsed[row.key]?.offsetB ?? spec.offsetB,
      };
    });
  } catch {
    return defaults;
  }
}

const SensorReadingsSettings = () => {
  const t = useTranslations();
  const toast = useToast();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<UnitSettingRow[]>(() => getDefaultRows());
  const [search, setSearch] = useState('');
  const [zones, setZones] = useState<{ id: number; name: string }[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [loadingLast, setLoadingLast] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<RowOverridePayload>({
    readingLabel: '',
    typeLabel: '',
    unit: '',
    scaleA: 1,
    offsetB: 0,
  });
  const panelBg = useColorModeValue('white', 'gray.800');
  const panelBorder = useColorModeValue('gray.200', 'gray.600');
  const theadBg = useColorModeValue('white', 'gray.900');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');

  // Avoid hydration mismatch: read localStorage only after mount.
  useEffect(() => {
    setRows(loadRows());
  }, []);

  useEffect(() => {
    api
      .get<{ id: number; name: string }[]>('/zones')
      .then((res) => {
        const list = res.data ?? [];
        setZones(list);
        setSelectedZoneId((z) => (z == null && list.length ? list[0].id : z));
      })
      .catch(() => {});
  }, []);

  const refreshLastValues = useCallback(async () => {
    if (selectedZoneId == null) return;
    setLoadingLast(true);
    try {
      const catalog = getMountedRows();
      const next = await Promise.all(
        catalog.map(async (row) => {
          const sample = await fetchLastSensorSample(row.key, selectedZoneId);
          if (!sample) {
            return { key: row.key, text: '—' as string };
          }
          const unit = resolveAxisUnit(row.key, sample.defaultUnit);
          const val = formatCalibratedReading(row.key, sample.rawValue);
          return { key: row.key, text: `${val} ${unit}`.trim() };
        })
      );
      const map = new Map(next.map((n) => [n.key, n.text]));
      setRows((prev) =>
        prev.map((r) => ({ ...r, lastValue: map.get(r.key) ?? '—' }))
      );
    } finally {
      setLoadingLast(false);
    }
  }, [selectedZoneId]);

  useEffect(() => {
    if (selectedZoneId == null) return;
    void refreshLastValues();
  }, [selectedZoneId, refreshLastValues]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay =
        `${row.readingLabel} ${row.typeLabel} ${row.key} ${row.unit}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const hasChanges = useMemo(() => {
    return rows.some((row) => {
      const defaults = getDefaultRows().find((d) => d.key === row.key);
      return defaults
        ? defaults.unit !== row.unit ||
            defaults.readingLabel !== row.readingLabel ||
            defaults.typeLabel !== row.typeLabel ||
            defaults.scaleA !== row.scaleA ||
            defaults.offsetB !== row.offsetB
        : false;
    });
  }, [rows]);

  const startEdit = (row: UnitSettingRow) => {
    setEditingKey(row.key);
    setDraft({
      readingLabel: row.readingLabel,
      typeLabel: row.typeLabel,
      unit: row.unit,
      scaleA: row.scaleA,
      offsetB: row.offsetB,
    });
  };

  const cancelEdit = () => {
    setEditingKey(null);
  };

  const applyEdit = (key: string) => {
    setRows((prev) => {
      const next = prev.map((row) =>
        row.key === key
          ? {
              ...row,
              readingLabel: draft.readingLabel,
              typeLabel: draft.typeLabel,
              unit: draft.unit,
              scaleA: Number.isFinite(draft.scaleA) ? draft.scaleA : row.scaleA,
              offsetB: Number.isFinite(draft.offsetB)
                ? draft.offsetB
                : row.offsetB,
            }
          : row
      );
      const payload = next.reduce(
        (acc, row) => {
          acc[row.key] = {
            readingLabel: row.readingLabel,
            typeLabel: row.typeLabel,
            unit: row.unit,
            scaleA: row.scaleA,
            offsetB: row.offsetB,
          };
          return acc;
        },
        {} as Record<string, RowOverridePayload>
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      notifyUnitOverridesChanged();
      return next;
    });
    setEditingKey(null);
    toast({
      title: t('settings.readings.rowSavedTitle'),
      description: t('settings.readings.rowSavedDesc'),
      status: 'success',
      duration: 1800,
      isClosable: true,
    });
  };

  const editingRow = useMemo(
    () => rows.find((row) => row.key === editingKey) ?? null,
    [rows, editingKey]
  );

  const catalogDefaultUnitForEdit = useMemo(() => {
    if (!editingRow) return undefined;
    return getAllSensorsCatalog(true).find((c) => c.key === editingRow.key)
      ?.defaultUnit;
  }, [editingRow]);

  const readingLabelOptions = useMemo(
    () => mergeSelectOptions(getReadingLabelOptions(true), draft.readingLabel),
    [draft.readingLabel, editingKey, rows.length]
  );

  const typeLabelOptions = useMemo(
    () => mergeSelectOptions(getTypeLabelOptions(true), draft.typeLabel),
    [draft.typeLabel, editingKey, rows.length]
  );

  const unitOptions = useMemo(() => {
    const baseUnit =
      catalogDefaultUnitForEdit ?? editingRow?.unit ?? draft.unit;
    const compatible = getCompatibleUnitOptions(
      baseUnit,
      getUnitSelectOptions(true)
    );
    return mergeSelectOptions(compatible, draft.unit);
  }, [catalogDefaultUnitForEdit, editingRow?.unit, draft.unit]);

  const modalSelectProps = {
    rounded: 'md' as const,
    borderWidth: '1px' as const,
    borderColor: panelBorder,
    w: '100%' as const,
    h: '10' as const,
    px: 3,
    bg: panelBg,
  };

  const toolbarSelectProps = {
    ...modalSelectProps,
    maxW: '280px' as const,
  };

  const handleSave = () => {
    const payload = rows.reduce(
      (acc, row) => {
        acc[row.key] = {
          readingLabel: row.readingLabel,
          typeLabel: row.typeLabel,
          unit: row.unit,
          scaleA: row.scaleA,
          offsetB: row.offsetB,
        };
        return acc;
      },
      {} as Record<string, RowOverridePayload>
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    notifyUnitOverridesChanged();
    toast({
      title: t('settings.readings.unitsSavedTitle'),
      description: t('settings.readings.unitsSavedDesc'),
      status: 'success',
      duration: 2500,
      isClosable: true,
    });
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    notifyUnitOverridesChanged();
    setRows(getMountedRows());
    void refreshLastValues();
    toast({
      title: t('settings.readings.resetTitle'),
      description: t('settings.readings.resetDesc'),
      status: 'info',
      duration: 2200,
      isClosable: true,
    });
  };

  return (
    <Box
      overflowX="auto"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor={panelBorder}
      bg={panelBg}
    >
      <Flex
        gap={3}
        flexWrap="wrap"
        align="center"
        p={3}
        borderBottomWidth="1px"
      >
        <Input
          placeholder={t('settings.readings.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW="360px"
          size="sm"
        />
        <Flex align="center" gap={2}>
          <Text fontSize="sm" whiteSpace="nowrap">
            {t('settings.readings.zoneLabel')}
          </Text>
          <chakra.select
            {...toolbarSelectProps}
            value={selectedZoneId ?? ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSelectedZoneId(e.target.value ? Number(e.target.value) : null)
            }
          >
            {zones.length === 0 && <option value="">—</option>}
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </chakra.select>
        </Flex>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void refreshLastValues()}
          isLoading={loadingLast}
        >
          {t('settings.readings.refreshButton')}
        </Button>
      </Flex>
      {isMobile ? (
        <Box p={3}>
          <MobileRecordCards
            cards={filteredRows.map(
              (row): RecordCard => ({
                key: row.key,
                title: row.readingLabel,
                fields: [
                  {
                    label: t('settings.readings.colType'),
                    value: row.typeLabel,
                  },
                  { label: t('settings.readings.colUnit'), value: row.unit },
                  { label: t('settings.readings.colScale'), value: row.scaleA },
                  {
                    label: t('settings.readings.colOffset'),
                    value: row.offsetB,
                  },
                  {
                    label: t('settings.readings.colLastValue'),
                    value: row.lastValue,
                  },
                ],
                footer: (
                  <IconButton
                    aria-label={t('settings.readings.editRowAria')}
                    size="sm"
                    icon={<FaPen />}
                    variant="ghost"
                    colorScheme="brand"
                    onClick={() => startEdit(row)}
                  />
                ),
              })
            )}
          />
        </Box>
      ) : (
        <Table size="md" variant="simple">
          <Thead>
            <Tr bg={theadBg} borderBottomWidth="1px" borderColor={panelBorder}>
              <Th>{t('settings.readings.colReadingLabel')}</Th>
              <Th>{t('settings.readings.colType')}</Th>
              <Th>{t('settings.readings.colUnit')}</Th>
              <Th>{t('settings.readings.colScale')}</Th>
              <Th>{t('settings.readings.colOffset')}</Th>
              <Th>{t('settings.readings.colLastValue')}</Th>
              <Th>{t('settings.readings.colActions')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredRows.map((row) => (
              <Tr key={row.key}>
                <Td minW="220px">{row.readingLabel}</Td>
                <Td>{row.typeLabel}</Td>
                <Td minW="120px">{row.unit}</Td>
                <Td minW="120px">{row.scaleA}</Td>
                <Td minW="120px">{row.offsetB}</Td>
                <Td>{row.lastValue}</Td>
                <Td>
                  <IconButton
                    aria-label={t('settings.readings.editRowAria')}
                    size="sm"
                    icon={<FaPen />}
                    variant="ghost"
                    colorScheme="brand"
                    onClick={() => startEdit(row)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Flex justify="flex-end" gap={2} mt={4} p={3}>
        <Button size="sm" variant="outline" onClick={handleReset}>
          {t('settings.readings.resetButton')}
        </Button>
        <Button size="sm" colorScheme="brand" onClick={handleSave}>
          {t('settings.readings.saveButton')}
        </Button>
      </Flex>

      {hasChanges && (
        <Text mt={1} mb={3} ml={3} fontSize="xs" color="orange.500">
          {t('settings.readings.localChangesNotice')}
        </Text>
      )}

      <Modal isOpen={editingRow != null} onClose={cancelEdit} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('settings.readings.editModalTitle')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex direction="column" gap={3}>
              <FormControl>
                <FormLabel>{t('settings.readings.colReadingLabel')}</FormLabel>
                <chakra.select
                  {...modalSelectProps}
                  value={draft.readingLabel}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setDraft((prev) => ({
                      ...prev,
                      readingLabel: e.target.value,
                    }))
                  }
                >
                  {readingLabelOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </chakra.select>
              </FormControl>
              <FormControl>
                <FormLabel>{t('settings.readings.colType')}</FormLabel>
                <chakra.select
                  {...modalSelectProps}
                  value={draft.typeLabel}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setDraft((prev) => ({
                      ...prev,
                      typeLabel: e.target.value,
                    }))
                  }
                >
                  {typeLabelOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </chakra.select>
              </FormControl>
              <FormControl>
                <FormLabel>{t('settings.readings.colUnit')}</FormLabel>
                <chakra.select
                  {...modalSelectProps}
                  value={draft.unit}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const newUnit = e.target.value;
                    setDraft((prev) => {
                      const { scaleA, offsetB } =
                        composeCalibrationWithUnitChange(
                          prev.scaleA,
                          prev.offsetB,
                          prev.unit,
                          newUnit,
                          catalogDefaultUnitForEdit
                        );
                      return {
                        ...prev,
                        unit: newUnit,
                        scaleA,
                        offsetB,
                      };
                    });
                  }}
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </chakra.select>
              </FormControl>
              <FormControl>
                <FormLabel>{t('settings.readings.colScale')}</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.scaleA}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      scaleA: Number(e.target.value),
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>{t('settings.readings.colOffset')}</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.offsetB}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      offsetB: Number(e.target.value),
                    }))
                  }
                />
              </FormControl>
              <Text fontSize="xs" color={mutedTextColor}>
                {t('settings.readings.calibrationNote', {
                  pdf: 'change.the.unite.of.sensors…1.3.pdf',
                  conversionModule: 'sensorUnitConversion',
                  defaultsModule: 'sensorCalibrationDefaults',
                })}
              </Text>
            </Flex>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button
              leftIcon={<FaTimes />}
              variant="ghost"
              colorScheme="red"
              onClick={cancelEdit}
            >
              {t('settings.readings.cancel')}
            </Button>
            <Button
              leftIcon={<FaCheck />}
              colorScheme="brand"
              onClick={() => {
                if (editingRow) applyEdit(editingRow.key);
              }}
            >
              {t('settings.readings.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SensorReadingsSettings;
