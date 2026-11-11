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
import {
  sensorCalibrationApi,
  type CalibrationFitResponse,
} from '@agri/api-client/sensorCalibrationApi';
import {
  formatNumber,
  parseCoefficientInputs,
  parseReferencePoints,
  referencePointsToDrafts,
  validateEquationDraft,
  type EquationDraft,
} from '@agri/api-client/calibrationEquationModel';
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
import { useCan } from '@/app/hooks/useAccessLevel';
import { PermissionGate } from '@/app/components/common/PermissionGate';
import EquationCalibrationEditor from './EquationCalibrationEditor';

const EMPTY_DRAFT: CalibrationDraft = {
  scaleA: 1,
  offsetB: 0,
  unit: '',
  isActive: true,
  note: '',
};

type CalibrationMode = 'linear' | 'equation';

/** A fresh equation draft: the linear preset and three blank point rows. */
const EMPTY_EQUATION: EquationDraft = {
  equation: 'a*x + b',
  points: [
    { captured: '', real: '' },
    { captured: '', real: '' },
    { captured: '', real: '' },
  ],
  coefficients: {},
};

/** The API's 400 `detail`, when there is one. */
const errorDetail = (err: unknown): string | null => {
  const detail = (err as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;
  return typeof detail === 'string' ? detail : null;
};

/**
 * Réglages → "Étalonnage des capteurs" (agri-web #97, CAL-1).
 *
 * PER SENSOR — the pair `(device_id, sensor_key)` — not per reading and not
 * per catalogue entry: two probes reporting `soil_temperature` are two
 * different pieces of hardware and drift differently. Everything here is
 * account data, stored through `/sensor-calibrations`.
 *
 * Two modes (agri-api #460):
 *   • LINEAR — `real = raw × a + b`, the original affine correction;
 *   • EQUATION — the general case: any equation in `x` (the captured value)
 *     whose coefficients the SERVER fits from reference points
 *     `(captured, real)`, with R² / RMSE / max error to judge the fit.
 *
 * Things this screen is careful about:
 *   1. it SAYS that a saved calibration changes what the dashboard, the alerts
 *      and the reports show — all three are corrected server-side (#446);
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
    equationAvailable,
    reloadCalibration,
    markUnavailable,
  } = useSensorCalibration();

  const [draft, setDraft] = useState<CalibrationDraft>(EMPTY_DRAFT);
  const [scaleText, setScaleText] = useState('1');
  const [offsetText, setOffsetText] = useState('0');
  const [rawSample, setRawSample] = useState('');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<CalibrationMode>('linear');
  const [equationDraft, setEquationDraft] =
    useState<EquationDraft>(EMPTY_EQUATION);
  const [fit, setFit] = useState<CalibrationFitResponse | null>(null);
  const [fitting, setFitting] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);
  const { canEdit } = useCan();

  const unavailable = availability === 'unavailable';
  // Editing a calibration is an editor+ action (agri-web #99); a monitor may
  // still read the coefficients and use the live preview.
  const blockEdit = unavailable || saving || !canEdit;

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
    setFit(null);
    setFitError(null);
    if (!calibration) {
      setDraft(EMPTY_DRAFT);
      setScaleText('1');
      setOffsetText('0');
      setMode('linear');
      setEquationDraft(EMPTY_EQUATION);
      return;
    }
    const storedEquation = (calibration.equation ?? '').trim();
    setMode(storedEquation ? 'equation' : 'linear');
    const storedPoints = referencePointsToDrafts(calibration.referencePoints);
    setEquationDraft(
      storedEquation
        ? {
            equation: storedEquation.replace(/\*\*/g, '^'),
            points: storedPoints.length ? storedPoints : EMPTY_EQUATION.points,
            coefficients: Object.fromEntries(
              Object.entries(calibration.coefficients ?? {}).map(
                ([name, value]) => [name, formatNumber(value)]
              )
            ),
          }
        : {
            ...EMPTY_EQUATION,
            points: storedPoints.length ? storedPoints : EMPTY_EQUATION.points,
          }
    );
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

  const isEquation = mode === 'equation';
  const linearError = validateCalibrationDraft(draft);
  const equationError = validateEquationDraft(equationDraft);
  const draftError = isEquation ? equationError : linearError;
  const preview = isEquation ? null : previewCalibration(rawSample, draft);
  const equationPreview = fit?.preview[0];

  /** Any edit to the equation invalidates the fit shown for it. */
  const changeEquationDraft = (next: EquationDraft) => {
    setEquationDraft(next);
    setFit(null);
    setFitError(null);
  };

  /** Ask the server to fit (or, with no points, just evaluate) + preview. */
  const runFit = async () => {
    if (equationError) return;
    const raw = Number(rawSample.replace(',', '.'));
    setFitting(true);
    setFitError(null);
    try {
      const result = await sensorCalibrationApi.fit({
        equation: equationDraft.equation,
        reference_points: parseReferencePoints(equationDraft.points).points,
        initial: parseCoefficientInputs(equationDraft.coefficients),
        preview_raw:
          rawSample.trim() !== '' && Number.isFinite(raw) ? [raw] : [],
      });
      setFit(result);
      // Show the fitted values in the inputs (they also seed the save).
      setEquationDraft((prev) => ({
        ...prev,
        coefficients: Object.fromEntries(
          Object.entries(result.coefficients).map(([name, value]) => [
            name,
            formatNumber(value),
          ])
        ),
      }));
    } catch (err) {
      setFit(null);
      setFitError(
        errorDetail(err) ?? t('settings.calibration.errors.fitFailed')
      );
    } finally {
      setFitting(false);
    }
  };

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
      const base = {
        // In equation mode a/b are kept untouched: switching back to linear
        // restores them.
        scale_a: linearError ? 1 : draft.scaleA,
        offset_b: linearError ? 0 : draft.offsetB,
        unit: draft.unit,
        is_active: draft.isActive,
        note: draft.note || null,
      };
      const points = parseReferencePoints(equationDraft.points).points;
      await sensorCalibrationApi.save(
        selected.deviceId,
        selected.sensorKey,
        isEquation
          ? {
              ...base,
              equation: equationDraft.equation,
              coefficients: parseCoefficientInputs(equationDraft.coefficients),
              reference_points: points,
            }
          : equationAvailable
            ? // Clear a previous equation; keep verification points.
              {
                ...base,
                equation: '',
                coefficients: null,
                reference_points: points.length ? points : null,
              }
            : base
      );
      await reloadCalibration();
      toast({
        title: t('settings.calibration.toastSaved'),
        // Never claim the numbers changed when the correction is switched off.
        description: draft.isActive
          ? t('settings.calibration.appliedShort')
          : t('settings.calibration.savedInactiveShort'),
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
          description: errorDetail(err) ?? undefined,
          status: 'error',
          duration: 6000,
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

      {/* The one thing a farmer must not misunderstand: saving changes the
          numbers everywhere — dashboard, alerts and reports (#446). */}
      <Alert
        status="info"
        borderRadius="md"
        mb={3}
        alignItems="flex-start"
        data-testid="calibration-applied"
      >
        <AlertIcon />
        <Box>
          <AlertTitle fontSize="sm">
            {t('settings.calibration.appliedTitle')}
          </AlertTitle>
          <AlertDescription fontSize="sm">
            {t('settings.calibration.appliedBody')}
          </AlertDescription>
        </Box>
      </Alert>

      {error && (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {t('settings.calibration.loadError')}
          </AlertDescription>
          <Button size="xs" ml="auto" onClick={() => void reloadCalibration()}>
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

              <FormControl maxW="420px" mb={3}>
                <FormLabel fontSize="sm">
                  {t('settings.calibration.modeLabel')}
                </FormLabel>
                <chakra.select
                  {...selectProps}
                  aria-label={t('settings.calibration.modeLabel')}
                  value={mode}
                  disabled={blockEdit}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setMode(e.target.value as CalibrationMode);
                    setFit(null);
                    setFitError(null);
                  }}
                >
                  <option value="linear">
                    {t('settings.calibration.modeLinear')}
                  </option>
                  <option
                    value="equation"
                    disabled={!equationAvailable && mode !== 'equation'}
                  >
                    {t('settings.calibration.modeEquation')}
                  </option>
                </chakra.select>
                <FormHelperText fontSize="xs">
                  {equationAvailable
                    ? t('settings.calibration.modeHelp')
                    : t('settings.calibration.modeEquationUnavailable')}
                </FormHelperText>
              </FormControl>

              <Flex gap={3} flexWrap="wrap" mb={3}>
                <FormControl maxW="200px">
                  <FormLabel fontSize="sm">
                    {t('settings.calibration.unitLabel')}
                  </FormLabel>
                  <chakra.select
                    {...selectProps}
                    aria-label={t('settings.calibration.unitLabel')}
                    value={draft.unit}
                    disabled={blockEdit}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      if (isEquation) {
                        // The unit of the REAL reference values: a label for
                        // what the points are expressed in, refitted on save.
                        const unit = e.target.value;
                        setDraft((prev) => ({ ...prev, unit }));
                        setFit(null);
                      } else {
                        changeUnit(e.target.value);
                      }
                    }}
                  >
                    {unitOptions.length === 0 && <option value="">—</option>}
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </chakra.select>
                  <FormHelperText fontSize="xs">
                    {isEquation
                      ? t('settings.calibration.unitHelpEquation')
                      : t('settings.calibration.unitHelp')}
                  </FormHelperText>
                </FormControl>

                {!isEquation && (
                  <>
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
                        isDisabled={blockEdit}
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
                        isDisabled={blockEdit}
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
                  </>
                )}
              </Flex>

              {isEquation && (
                <EquationCalibrationEditor
                  draft={equationDraft}
                  onChange={changeEquationDraft}
                  draftError={equationError}
                  disabled={blockEdit}
                  unit={draft.unit || catalogUnit}
                  fit={fit}
                  storedMetrics={calibration?.fitMetrics ?? null}
                  fitting={fitting}
                  fitError={fitError}
                  onFit={() => void runFit()}
                />
              )}

              <FormControl display="flex" alignItems="center" gap={2} mb={3}>
                <Switch
                  id="calibration-active"
                  isChecked={draft.isActive}
                  isDisabled={blockEdit}
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
                  isDisabled={blockEdit}
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
                      onChange={(e) => {
                        setRawSample(e.target.value);
                        if (isEquation) setFit(null);
                      }}
                    />
                  </FormControl>
                  <Text fontSize="sm" data-testid="calibration-preview">
                    {isEquation
                      ? equationPreview && equationPreview.real != null
                        ? t('settings.calibration.previewResult', {
                            raw: equationPreview.raw,
                            corrected: formatNumber(equationPreview.real),
                            unit: draft.unit || catalogUnit || '',
                          })
                        : equationPreview
                          ? t('settings.calibration.previewOutOfDomain')
                          : t('settings.calibration.previewEquationEmpty')
                      : preview
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
                  {isEquation
                    ? t('settings.calibration.formulaHintEquation', {
                        equation: equationDraft.equation,
                      })
                    : t('settings.calibration.formulaHint')}
                </Text>
              </Box>

              <Flex justify="flex-end">
                <PermissionGate
                  blocked={!canEdit}
                  reason={t('access.editRequiresEditor')}
                  ui="chakra"
                >
                  <Button
                    size="sm"
                    colorScheme="brand"
                    isLoading={saving}
                    isDisabled={unavailable || draftError !== null}
                    onClick={() => void save()}
                  >
                    {t('settings.calibration.saveButton')}
                  </Button>
                </PermissionGate>
              </Flex>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default SensorCalibrationSettings;
