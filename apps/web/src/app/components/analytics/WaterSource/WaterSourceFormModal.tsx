import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Wrap,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { FaPlus, FaTrash } from 'react-icons/fa';
import {
  waterLevelApi,
  type WaterSource,
  type WaterSourceGeometry,
  type WaterSourceMode,
  type WaterSourceType,
} from '@agri/api-client/waterLevelApi';
import type { ZoneOption } from '@/app/components/layout/ZoneSelect';
import { formatNumber } from '@/app/utils/formatNumber';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import {
  emptyWaterSourceForm,
  formFromSource,
  formToInput,
  previewCapacityM3,
  validateForm,
  type WaterSourceForm,
} from '@/app/utils/waterSourceModel';

const TYPES: WaterSourceType[] = ['BASIN', 'TANK', 'WELL'];
const GEOMETRIES: WaterSourceGeometry[] = [
  'RECTANGULAR',
  'CYLINDRICAL',
  'IRREGULAR',
];
const MODES: WaterSourceMode[] = ['SIMULATED', 'LIVE', 'CALIBRATING'];

type NumKey =
  | 'max_height_m'
  | 'length_m'
  | 'width_m'
  | 'diameter_m'
  | 'total_depth_m'
  | 'max_capacity_m3'
  | 'minimum_reserve_m3'
  | 'low_warning_pct'
  | 'critical_pct'
  | 'high_pct'
  | 'offline_after_min';

const apiDetail = (e: unknown): string | null => {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response
    ?.data?.detail;
  return typeof d === 'string' ? d : null;
};

const WaterSourceFormModal = ({
  isOpen,
  onClose,
  source,
  zones,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Null to create a new source. */
  source: WaterSource | null;
  zones: ZoneOption[];
  onSaved: () => void;
}) => {
  const t = useTranslations('analytics.waterSource');
  // The parent remounts this modal (key) for every open, so state starts
  // fresh from the source being edited.
  const [form, setForm] = useState<WaterSourceForm>(() =>
    source ? formFromSource(source) : emptyWaterSourceForm()
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const errors = useMemo(() => validateForm(form), [form]);
  const capacity = useMemo(() => previewCapacityM3(form), [form]);
  const isWell = form.source_type === 'WELL';

  const set = <K extends keyof WaterSourceForm>(k: K, v: WaterSourceForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setDevice = (k: keyof WaterSourceForm['device'], v: string) =>
    setForm((f) => ({ ...f, device: { ...f.device, [k]: v } }));

  const num = (key: NumKey, unit: string, label: string, required = false) => (
    <FormControl isRequired={required}>
      <FormLabel fontSize="sm" mb={1}>
        {label}
      </FormLabel>
      <InputGroup size="sm">
        <Input
          inputMode="decimal"
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
        />
        <InputRightAddon>{unit}</InputRightAddon>
      </InputGroup>
    </FormControl>
  );

  const save = async () => {
    setSubmitted(true);
    setServerError(null);
    if (errors.length > 0) return;
    setSaving(true);
    try {
      const input = formToInput(form);
      if (source) await waterLevelApi.update(source.id, input);
      else await waterLevelApi.create(input);
      onSaved();
      onClose();
    } catch (e) {
      logOptionalApiFailure('WaterSourceFormModal: save', e);
      setServerError(apiDetail(e) ?? t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!source) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await waterLevelApi.remove(source.id);
      onSaved();
      onClose();
    } catch (e) {
      logOptionalApiFailure('WaterSourceFormModal: delete', e);
      setServerError(apiDetail(e) ?? t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const section = (title: string) => (
    <Text fontWeight="semibold" fontSize="sm" mt={2}>
      {title}
    </Text>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{source ? t('editTitle') : t('addTitle')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={3}>
            <ButtonGroup size="sm" isAttached variant="outline">
              {TYPES.map((type) => (
                <Button
                  key={type}
                  variant={form.source_type === type ? 'solid' : 'outline'}
                  colorScheme={form.source_type === type ? 'blue' : undefined}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      source_type: type,
                      geometry:
                        type === 'BASIN'
                          ? f.geometry
                          : f.geometry === 'RECTANGULAR' && type === 'WELL'
                            ? 'CYLINDRICAL'
                            : f.geometry,
                    }))
                  }
                >
                  {t(`type.${type}`)}
                </Button>
              ))}
            </ButtonGroup>

            {section(t('sectionGeneral'))}
            <FormControl isRequired>
              <FormLabel fontSize="sm" mb={1}>
                {t('name')}
              </FormLabel>
              <Input
                size="sm"
                value={form.name}
                maxLength={120}
                onChange={(e) => set('name', e.target.value)}
              />
            </FormControl>
            {zones.length > 0 && (
              <Box role="group" aria-labelledby="water-source-zones">
                <Text
                  id="water-source-zones"
                  fontSize="sm"
                  fontWeight="medium"
                  mb={1}
                >
                  {t('zones')}
                </Text>
                <CheckboxGroup
                  value={form.zone_ids.map(String)}
                  onChange={(v) => set('zone_ids', v.map(Number))}
                >
                  <Wrap spacing={3}>
                    {zones.map((z) => (
                      <Checkbox key={z.id} value={String(z.id)} size="sm">
                        {z.name}
                      </Checkbox>
                    ))}
                  </Wrap>
                </CheckboxGroup>
              </Box>
            )}

            {section(t('sectionGeometry'))}
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm" mb={1}>
                  {t('geometryLabel')}
                </FormLabel>
                <Select
                  size="sm"
                  value={form.geometry}
                  onChange={(e) =>
                    set('geometry', e.target.value as WaterSourceGeometry)
                  }
                >
                  {GEOMETRIES.map((g) => (
                    <option key={g} value={g}>
                      {t(`geometry.${g}`)}
                    </option>
                  ))}
                </Select>
              </FormControl>
              {num('max_height_m', 'm', t('maxHeight'), true)}
              {form.geometry === 'RECTANGULAR' && (
                <>
                  {num('length_m', 'm', t('length'), !isWell)}
                  {num('width_m', 'm', t('width'), !isWell)}
                </>
              )}
              {form.geometry === 'CYLINDRICAL' &&
                num('diameter_m', 'm', t('diameter'), !isWell)}
              {isWell && num('total_depth_m', 'm', t('totalDepth'))}
              {form.geometry === 'IRREGULAR' &&
                num('max_capacity_m3', 'm³', t('maxCapacity'))}
              {num('minimum_reserve_m3', 'm³', t('minimumReserve'))}
              <Box>
                <Text fontSize="sm" mb={1}>
                  {t('calculatedCapacity')}
                </Text>
                <Text fontWeight="bold" fontSize="lg">
                  {capacity == null ? '—' : `${formatNumber(capacity, 2)} m³`}
                </Text>
              </Box>
            </SimpleGrid>
            {isWell && (
              <Text fontSize="xs" color="gray.500">
                {t('wellVolumeHint')}
              </Text>
            )}

            {form.geometry === 'IRREGULAR' && (
              <Box>
                <Text fontSize="xs" color="gray.500" mb={2}>
                  {t('irregularHint')}
                </Text>
                <Stack spacing={2}>
                  {form.calibration_table.map((row, i) => (
                    <HStack key={i}>
                      <InputGroup size="sm">
                        <Input
                          inputMode="decimal"
                          placeholder={t('level')}
                          value={row.level_m}
                          onChange={(e) =>
                            set(
                              'calibration_table',
                              form.calibration_table.map((r, j) =>
                                j === i ? { ...r, level_m: e.target.value } : r
                              )
                            )
                          }
                        />
                        <InputRightAddon>m</InputRightAddon>
                      </InputGroup>
                      <InputGroup size="sm">
                        <Input
                          inputMode="decimal"
                          placeholder={t('volume')}
                          value={row.volume_m3}
                          onChange={(e) =>
                            set(
                              'calibration_table',
                              form.calibration_table.map((r, j) =>
                                j === i
                                  ? { ...r, volume_m3: e.target.value }
                                  : r
                              )
                            )
                          }
                        />
                        <InputRightAddon>m³</InputRightAddon>
                      </InputGroup>
                      <IconButton
                        aria-label={t('removePoint')}
                        size="sm"
                        variant="ghost"
                        icon={<FaTrash />}
                        onClick={() =>
                          set(
                            'calibration_table',
                            form.calibration_table.filter((_, j) => j !== i)
                          )
                        }
                      />
                    </HStack>
                  ))}
                  <Button
                    size="xs"
                    leftIcon={<FaPlus />}
                    alignSelf="start"
                    variant="ghost"
                    onClick={() =>
                      set('calibration_table', [
                        ...form.calibration_table,
                        { level_m: '', volume_m3: '' },
                      ])
                    }
                  >
                    {t('addPoint')}
                  </Button>
                </Stack>
              </Box>
            )}

            {section(t('sectionAlerts'))}
            <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={3}>
              {num('low_warning_pct', '%', t('lowWarning'))}
              {num('critical_pct', '%', t('criticalLevel'))}
              {num('high_pct', '%', t('highLevel'))}
              {num('offline_after_min', 'min', t('offlineAfter'))}
            </SimpleGrid>

            {section(t('sectionMode'))}
            <Select
              size="sm"
              value={form.mode}
              onChange={(e) => set('mode', e.target.value as WaterSourceMode)}
            >
              {MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`mode.${mode}`)}
                </option>
              ))}
            </Select>

            <Accordion
              allowToggle
              defaultIndex={form.mode === 'SIMULATED' ? -1 : 0}
            >
              <AccordionItem>
                <AccordionButton px={0}>
                  <Box
                    flex={1}
                    textAlign="start"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    {t('sectionIntegration')}
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={0}>
                  <Text fontSize="xs" color="gray.500" mb={2}>
                    {t('integrationHint')}
                  </Text>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                    {(
                      [
                        ['device_id', t('deviceId')],
                        ['dev_eui', t('devEui')],
                        ['modbus_slave_id', t('modbusSlaveId')],
                        ['register_address', t('registerAddress')],
                        ['register_type', t('registerType')],
                        ['scale', t('scale')],
                        ['offset_m', t('offset')],
                        ['baud_rate', t('baudRate')],
                        ['parity', t('parity')],
                        ['byte_order', t('byteOrder')],
                      ] as [keyof WaterSourceForm['device'], string][]
                    ).map(([key, label]) => (
                      <FormControl key={key}>
                        <FormLabel fontSize="sm" mb={1}>
                          {label}
                        </FormLabel>
                        <Input
                          size="sm"
                          value={form.device[key]}
                          onChange={(e) => setDevice(key, e.target.value)}
                        />
                      </FormControl>
                    ))}
                  </SimpleGrid>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>

            {submitted && errors.length > 0 && (
              <Stack spacing={1}>
                {errors.map((e) => (
                  <Text key={e} fontSize="sm" color="red.500">
                    {t(`errors.${e}`)}
                  </Text>
                ))}
              </Stack>
            )}
            {serverError && (
              <Text fontSize="sm" color="red.500">
                {serverError}
              </Text>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Flex w="100%" justify="space-between" gap={2}>
            <Box>
              {source && (
                <Button
                  size="sm"
                  colorScheme="red"
                  variant={confirmDelete ? 'solid' : 'ghost'}
                  onClick={() => void remove()}
                  isDisabled={saving}
                >
                  {confirmDelete ? t('confirmDelete') : t('delete')}
                </Button>
              )}
            </Box>
            <HStack>
              <Button size="sm" variant="ghost" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => void save()}
                isLoading={saving}
              >
                {t('save')}
              </Button>
            </HStack>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default WaterSourceFormModal;
