'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Spinner,
  Switch,
  Text,
  chakra,
  useToast,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { sensorCalibrationApi } from '@agri/api-client/sensorCalibrationApi';
import {
  calibrationInUnit,
  isSensorCalibrationUnavailableError,
  normalizeUnit,
  previewCalibration,
  roundCoefficient,
  unitOptionsFor,
  validateCalibrationDraft,
  type CalibrationDraft,
} from '@agri/api-client/sensorCalibrationModel';
import { getAllSensorsCatalog } from '@/app/utils/sensorCatalog';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { useSensorCalibration } from '@/app/hooks/useSensorCalibration';

const EMPTY_DRAFT: CalibrationDraft = {
  scaleA: 1,
  offsetB: 0,
  unit: '',
  isActive: true,
  note: '',
};

/**
 * Réglages → "Étalonnage des capteurs" (agri-web #97, CAL-1).
 *
 * PER SENSOR — the pair `(device_id, sensor_key)` — not per reading and not
 * per catalogue entry: two probes reporting `soil_temperature` are two
 * different pieces of hardware and drift differently. Everything here is
 * account data, stored through `/sensor-calibrations`.
 *
 * Three things this screen is careful about:
 *   1. it SAYS, every time, that a stored calibration does not yet change the
 *      numbers on the dashboard — that is a backend ticket, and letting a
 *      farmer believe otherwise would be worse than not shipping the editor;
 *   2. changing the unit RECOMPUTES `a` and `b` (`a' = a·m`, `b' = b·m + c`)
 *      instead of relabelling them, so the correction keeps meaning the same
 *      physical thing;
 *   3. `scale_a = 0` is refused here, before the API refuses it.
 */
const SensorCalibrationSettings = () => {
  const t = useTranslations();
  const toast = useToast();
  const { borderColor, bgColor, mutedTextColor } = useColorModeStyles();
  const {
    available,
    selected,
    select,
    calibration,
    configured,
    loadingSensors,
    loadingCalibration,
    error,
    availability,
    reloadCalibration,
    markUnavailable,
  } = useSensorCalibration();

  const [draft, setDraft] = useState<CalibrationDraft>(EMPTY_DRAFT);
  const [scaleText, setScaleText] = useState('1');
  const [offsetText, setOffsetText] = useState('0');
  const [rawSample, setRawSample] = useState('');
  const [saving, setSaving] = useState(false);

  const unavailable = availability === 'unavailable';

  const sensorLabel = useCallback(
    (key: string) => (t.has(`sensors.${key}`) ? t(`sensors.${key}`) : key),
    [t]
  );

  /** The catalogue's unit for this sensor key: the fallback when nothing is
   *  stored, and the source unit a first unit change converts FROM. */
  const catalogUnit = useMemo(() => {
    if (!selected) return '';
    const entry = getAllSensorsCatalog(true).find(
      (item) => item.key === selected.sensorKey
    );
    return normalizeUnit(entry?.defaultUnit ?? '');
  }, [selected]);

  // Reset the draft whenever a different sensor's calibration arrives.
  useEffect(() => {
    if (!calibration) {
      setDraft(EMPTY_DRAFT);
      setScaleText('1');
      setOffsetText('0');
      return;
    }
    const next: CalibrationDraft = {
      scaleA: calibration.scaleA,
      offsetB: calibration.offsetB,
      unit: calibration.unit || catalogUnit,
      isActive: calibration.isActive,
      note: calibration.note,
    };
    setDraft(next);
    setScaleText(String(next.scaleA));
    setOffsetText(String(next.offsetB));
  }, [calibration, catalogUnit]);

  const unitOptions = useMemo(
    () => unitOptionsFor(draft.unit || catalogUnit),
    [draft.unit, catalogUnit]
  );

  const draftError = validateCalibrationDraft(draft);
  const preview = previewCalibration(rawSample, draft);

  /**
   * Unit change = closed-form rewrite of the two coefficients, never a
   * relabel. `a' = a·m`, `b' = b·m + c` with `(m, c)` the affine conversion
   * between the units — see `sensorCalibrationModel.calibrationInUnit`.
   */
  const changeUnit = (nextUnit: string) => {
    setDraft((prev) => {
      try {
        const moved = calibrationInUnit(
          { ...prev, unit: prev.unit || catalogUnit },
          nextUnit,
          catalogUnit
        );
        const scaleA = roundCoefficient(moved.scaleA);
        const offsetB = roundCoefficient(moved.offsetB);
        setScaleText(String(scaleA));
        setOffsetText(String(offsetB));
        return { ...prev, unit: moved.unit, scaleA, offsetB };
      } catch {
        // No safe conversion: refuse to move rather than keep stale
        // coefficients under a new label.
        toast({
          title: t('settings.calibration.unitChangeRefused'),
          status: 'warning',
          duration: 4000,
        });
        return prev;
      }
    });
  };

  const save = async () => {
    if (!selected || selected.deviceId == null || draftError) return;
    setSaving(true);
    try {
      await sensorCalibrationApi.save(selected.deviceId, selected.sensorKey, {
        scale_a: draft.scaleA,
        offset_b: draft.offsetB,
        unit: draft.unit,
        is_active: draft.isActive,
        note: draft.note || null,
      });
      await reloadCalibration();
      toast({
        title: t('settings.calibration.toastSaved'),
        description: t('settings.calibration.notAppliedShort'),
        status: 'success',
        duration: 4000,
      });
    } catch (err) {
      if (isSensorCalibrationUnavailableError(err)) {
        markUnavailable();
        toast({
          title: t('settings.calibration.unavailableTitle'),
          description: t('settings.calibration.unavailableBody'),
          status: 'warning',
          duration: 6000,
        });
      } else {
        toast({
          title: t('settings.calibration.toastError'),
          status: 'error',
          duration: 3000,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const selectProps = {
    rounded: 'md' as const,
    borderWidth: '1px' as const,
    borderColor,
    w: '100%' as const,
    h: '10' as const,
    px: 3,
    bg: bgColor,
  };

  if (loadingSensors) {
    return (
      <Flex align="center" gap={2} py={6}>
        <Spinner size="sm" />
        <Text fontSize="sm" color={mutedTextColor}>
          {t('common.loading')}
        </Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Text fontSize="sm" color={mutedTextColor} mb={3}>
        {t('settings.calibration.intro')}
      </Text>

      {/* The one thing a farmer must not misunderstand. Informational, not an
          error: the calibration IS saved — it just is not read back yet. */}
      <Alert
        status="info"
        borderRadius="md"
        mb={3}
        alignItems="flex-start"
        data-testid="calibration-not-applied"
      >
        <AlertIcon />
        <Box>
          <AlertTitle fontSize="sm">
            {t('settings.calibration.notAppliedTitle')}
          </AlertTitle>
          <AlertDescription fontSize="sm">
            {t('settings.calibration.notAppliedBody')}
          </AlertDescription>
        </Box>
      </Alert>

      {error && (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {t('settings.calibration.loadError')}
          </AlertDescription>
          <Button
            size="xs"
            ml="auto"
            onClick={() => void reloadCalibration()}
          >
            {t('settings.calibration.retry')}
          </Button>
        </Alert>
      )}

      {unavailable && (
        <Alert
          status="warning"
          borderRadius="md"
          mb={3}
          alignItems="flex-start"
          data-testid="calibration-unavailable"
        >
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">
              {t('settings.calibration.unavailableTitle')}
            </AlertTitle>
            <AlertDescription fontSize="sm">
              {t('settings.calibration.unavailableBody')}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {available.length === 0 ? (
        <Text fontSize="sm" color={mutedTextColor}>
          {t('settings.calibration.noSensors')}
        </Text>
      ) : (
        <>
          <FormControl maxW="420px" mb={4}>
            <FormLabel fontSize="sm">
              {t('settings.calibration.sensorLabel')}
            </FormLabel>
            <chakra.select
              {...selectProps}
              aria-label={t('settings.calibration.sensorLabel')}
              value={selected?.key ?? ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                select(e.target.value)
              }
            >
              {available.map((sensor) => (
                <option key={sensor.key} value={sensor.key}>
                  {`${sensorLabel(sensor.sensorKey)} — ${
                    sensor.zoneName || t('settings.calibration.zoneUnknown')
                  }${sensor.deviceName ? ` (${sensor.deviceName})` : ''}`}
                </option>
              ))}
            </chakra.select>
          </FormControl>

          {loadingCalibration ? (
            <Flex align="center" gap={2} py={4}>
              <Spinner size="sm" />
              <Text fontSize="sm" color={mutedTextColor}>
                {t('common.loading')}
              </Text>
            </Flex>
          ) : (
            <Box
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="md"
              p={4}
            >
              <Flex align="center" gap={2} mb={3} flexWrap="wrap">
                <Badge
                  colorScheme={configured ? 'green' : 'gray'}
                  data-testid="calibration-status"
                >
                  {configured
                    ? t('settings.calibration.statusConfigured')
                    : t('settings.calibration.statusDefault')}
                </Badge>
                {!draft.isActive && (
                  <Badge colorScheme="orange">
                    {t('settings.calibration.statusInactive')}
                  </Badge>
                )}
              </Flex>

              <Flex gap={3} flexWrap="wrap" mb={3}>
                <FormControl maxW="200px">
                  <FormLabel fontSize="sm">
                    {t('settings.calibration.unitLabel')}
                  </FormLabel>
                  <chakra.select
                    {...selectProps}
                    aria-label={t('settings.calibration.unitLabel')}
                    value={draft.unit}
                    disabled={unavailable || saving}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      changeUnit(e.target.value)
                    }
                  >
                    {unitOptions.length === 0 && <option value="">—</option>}
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </chakra.select>
                  <FormHelperText fontSize="xs">
                    {t('settings.calibration.unitHelp')}
                  </FormHelperText>
                </FormControl>

                <FormControl
                  maxW="200px"
                  isInvalid={
                    draftError === 'scaleZero' ||
                    draftError === 'scaleNotANumber'
                  }
                >
                  <FormLabel fontSize="sm">
                    {t('settings.calibration.scaleLabel')}
                  </FormLabel>
                  <Input
                    type="number"
                    step="any"
                    value={scaleText}
                    isDisabled={unavailable || saving}
                    aria-label={t('settings.calibration.scaleLabel')}
                    onChange={(e) => {
                      setScaleText(e.target.value);
                      setDraft((prev) => ({
                        ...prev,
                        scaleA: Number(e.target.value),
                      }));
                    }}
                  />
                  <FormErrorMessage fontSize="xs">
                    {draftError === 'scaleZero'
                      ? t('settings.calibration.scaleZeroError')
                      : t('settings.calibration.scaleNaNError')}
                  </FormErrorMessage>
                </FormControl>

                <FormControl
                  maxW="200px"
                  isInvalid={draftError === 'offsetNotANumber'}
                >
                  <FormLabel fontSize="sm">
                    {t('settings.calibration.offsetLabel')}
                  </FormLabel>
                  <Input
                    type="number"
                    step="any"
                    value={offsetText}
                    isDisabled={unavailable || saving}
                    aria-label={t('settings.calibration.offsetLabel')}
                    onChange={(e) => {
                      setOffsetText(e.target.value);
                      setDraft((prev) => ({
                        ...prev,
                        offsetB: Number(e.target.value),
                      }));
                    }}
                  />
                  <FormErrorMessage fontSize="xs">
                    {t('settings.calibration.offsetNaNError')}
                  </FormErrorMessage>
                </FormControl>
              </Flex>

              <FormControl display="flex" alignItems="center" gap={2} mb={3}>
                <Switch
                  id="calibration-active"
                  isChecked={draft.isActive}
                  isDisabled={unavailable || saving}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                <FormLabel htmlFor="calibration-active" fontSize="sm" mb={0}>
                  {t('settings.calibration.activeLabel')}
                </FormLabel>
              </FormControl>
              <Text fontSize="xs" color={mutedTextColor} mb={3}>
                {t('settings.calibration.activeHelp')}
              </Text>

              <FormControl maxW="420px" mb={3}>
                <FormLabel fontSize="sm">
                  {t('settings.calibration.noteLabel')}
                </FormLabel>
                <Input
                  size="sm"
                  value={draft.note}
                  isDisabled={unavailable || saving}
                  placeholder={t('settings.calibration.notePlaceholder')}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, note: e.target.value }))
                  }
                />
              </FormControl>

              {/* Live preview: what these coefficients would do to a reading. */}
              <Box
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
                p={3}
                mb={3}
              >
                <Text fontSize="sm" fontWeight="bold" mb={2}>
                  {t('settings.calibration.previewTitle')}
                </Text>
                <Flex align="center" gap={2} flexWrap="wrap">
                  <FormControl maxW="180px">
                    <FormLabel fontSize="xs" mb={1}>
                      {t('settings.calibration.previewRawLabel')}
                    </FormLabel>
                    <Input
                      size="sm"
                      type="number"
                      step="any"
                      value={rawSample}
                      aria-label={t('settings.calibration.previewRawLabel')}
                      placeholder={t(
                        'settings.calibration.previewRawPlaceholder'
                      )}
                      onChange={(e) => setRawSample(e.target.value)}
                    />
                  </FormControl>
                  <Text fontSize="sm" data-testid="calibration-preview">
                    {preview
                      ? t('settings.calibration.previewResult', {
                          raw: preview.raw,
                          corrected: roundCoefficient(preview.corrected),
                          unit: draft.unit || catalogUnit || '',
                        })
                      : t('settings.calibration.previewEmpty')}
                  </Text>
                </Flex>
                {preview?.disabled && (
                  <Text fontSize="xs" color="orange.500" mt={2}>
                    {t('settings.calibration.previewInactive')}
                  </Text>
                )}
                <Text fontSize="xs" color={mutedTextColor} mt={2}>
                  {t('settings.calibration.formulaHint')}
                </Text>
              </Box>

              <Flex justify="flex-end">
                <Button
                  size="sm"
                  colorScheme="brand"
                  isLoading={saving}
                  isDisabled={unavailable || draftError !== null}
                  onClick={() => void save()}
                >
                  {t('settings.calibration.saveButton')}
                </Button>
              </Flex>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default SensorCalibrationSettings;
