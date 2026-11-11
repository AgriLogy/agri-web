'use client';

import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  chakra,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import type { CalibrationFitResponse } from '@agri/api-client/sensorCalibrationApi';
import {
  EQUATION_PRESETS,
  fitQuality,
  formatNumber,
  parseReferencePoints,
  scanCoefficientNames,
  type EquationDraft,
  type EquationDraftError,
  type FitMetrics,
} from '@agri/api-client/calibrationEquationModel';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

const QUALITY_COLOR = {
  excellent: 'green',
  good: 'teal',
  poor: 'red',
  unverified: 'gray',
} as const;

export interface EquationCalibrationEditorProps {
  draft: EquationDraft;
  onChange: (next: EquationDraft) => void;
  draftError: EquationDraftError | null;
  disabled: boolean;
  /** Unit of the REAL values the technician types. */
  unit: string;
  /** Latest fit for the CURRENT draft, or null when stale / not run. */
  fit: CalibrationFitResponse | null;
  /** Metrics stored with the saved calibration — shown until a new fit runs. */
  storedMetrics: FitMetrics | null;
  fitting: boolean;
  fitError: string | null;
  onFit: () => void;
}

/**
 * Equation calibration (agri-api #460): the equation in `x`, the reference
 * points `(captured, real)`, and the fit the SERVER computes from them.
 *
 * Fully controlled: the parent owns the draft (it saves it) and the fit
 * request; this component only renders and reports edits.
 */
const EquationCalibrationEditor = ({
  draft,
  onChange,
  draftError,
  disabled,
  unit,
  fit,
  storedMetrics,
  fitting,
  fitError,
  onFit,
}: EquationCalibrationEditorProps) => {
  const t = useTranslations();
  const { borderColor, bgColor, mutedTextColor } = useColorModeStyles();

  const names = fit?.coefficient_names ?? scanCoefficientNames(draft.equation);
  const { invalidRows } = parseReferencePoints(draft.points);
  const metrics = fit?.metrics ?? (fit ? null : storedMetrics);
  const quality = fitQuality(metrics);
  const presetId =
    EQUATION_PRESETS.find((p) => p.equation === draft.equation.trim())?.id ??
    '';

  const setPoint = (index: number, side: 'captured' | 'real', value: string) =>
    onChange({
      ...draft,
      points: draft.points.map((row, i) =>
        i === index ? { ...row, [side]: value } : row
      ),
    });

  const applyPreset = (id: string) => {
    const preset = EQUATION_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const coefficients: Record<string, string> = {};
    for (const [name, value] of Object.entries(preset.initial ?? {})) {
      coefficients[name] = String(value);
    }
    onChange({ ...draft, equation: preset.equation, coefficients });
  };

  const errorText = (() => {
    switch (draftError) {
      case 'equationEmpty':
        return t('settings.calibration.errors.equationEmpty');
      case 'equationNoVariable':
        return t('settings.calibration.errors.equationNoVariable');
      case 'notEnoughPoints':
        return t('settings.calibration.errors.notEnoughPoints', {
          needed: names.length,
        });
      case 'coefficientMissing':
        return t('settings.calibration.errors.coefficientMissing');
      default:
        return null;
    }
  })();

  return (
    <Box>
      <Flex gap={3} flexWrap="wrap" mb={3} align="flex-start">
        <FormControl maxW="220px">
          <FormLabel fontSize="sm">
            {t('settings.calibration.presetLabel')}
          </FormLabel>
          <chakra.select
            rounded="md"
            borderWidth="1px"
            borderColor={borderColor}
            w="100%"
            h="10"
            px={3}
            bg={bgColor}
            aria-label={t('settings.calibration.presetLabel')}
            value={presetId}
            disabled={disabled}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              applyPreset(e.target.value)
            }
          >
            <option value="">{t('settings.calibration.presetCustom')}</option>
            {EQUATION_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {t(`settings.calibration.presets.${preset.id}`)}
              </option>
            ))}
          </chakra.select>
        </FormControl>

        <FormControl
          flex="1"
          minW="260px"
          isInvalid={
            draftError === 'equationEmpty' ||
            draftError === 'equationNoVariable'
          }
        >
          <FormLabel fontSize="sm">
            {t('settings.calibration.equationLabel')}
          </FormLabel>
          <Input
            fontFamily="mono"
            value={draft.equation}
            isDisabled={disabled}
            aria-label={t('settings.calibration.equationLabel')}
            placeholder="a*x^2 + b*x + c"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => onChange({ ...draft, equation: e.target.value })}
          />
          {errorText &&
          (draftError === 'equationEmpty' ||
            draftError === 'equationNoVariable') ? (
            <FormErrorMessage fontSize="xs">{errorText}</FormErrorMessage>
          ) : (
            <FormHelperText fontSize="xs">
              {t('settings.calibration.equationHelp')}
            </FormHelperText>
          )}
        </FormControl>
      </Flex>

      {/* Reference points: the measurements the coefficients are fitted to. */}
      <Box
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="md"
        p={3}
        mb={3}
      >
        <Text fontSize="sm" fontWeight="bold">
          {t('settings.calibration.pointsTitle')}
        </Text>
        <Text fontSize="xs" color={mutedTextColor} mb={2}>
          {t('settings.calibration.pointsHelp', { unit: unit || '—' })}
        </Text>
        <Table size="sm" variant="simple" data-testid="calibration-points">
          <Thead>
            <Tr>
              <Th>#</Th>
              <Th>{t('settings.calibration.pointsCaptured')}</Th>
              <Th>
                {t('settings.calibration.pointsReal')}
                {unit ? ` (${unit})` : ''}
              </Th>
              {fit && fit.points.length > 0 && (
                <Th isNumeric>{t('settings.calibration.pointsResidual')}</Th>
              )}
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {draft.points.map((row, index) => {
              const invalid = invalidRows.includes(index);
              // Residuals are reported for the VALID rows, in order.
              const validIndex = draft.points
                .slice(0, index)
                .filter(
                  (r, i) =>
                    !invalidRows.includes(i) &&
                    (r.captured.trim() !== '' || r.real.trim() !== '')
                ).length;
              const residual =
                !invalid && (row.captured.trim() || row.real.trim())
                  ? fit?.points[validIndex]?.residual
                  : undefined;
              return (
                <Tr key={index}>
                  <Td>{index + 1}</Td>
                  <Td>
                    <Input
                      size="sm"
                      inputMode="decimal"
                      value={row.captured}
                      isDisabled={disabled}
                      isInvalid={invalid}
                      aria-label={`${t('settings.calibration.pointsCaptured')} ${index + 1}`}
                      onChange={(e) =>
                        setPoint(index, 'captured', e.target.value)
                      }
                    />
                  </Td>
                  <Td>
                    <Input
                      size="sm"
                      inputMode="decimal"
                      value={row.real}
                      isDisabled={disabled}
                      isInvalid={invalid}
                      aria-label={`${t('settings.calibration.pointsReal')} ${index + 1}`}
                      onChange={(e) => setPoint(index, 'real', e.target.value)}
                    />
                  </Td>
                  {fit && fit.points.length > 0 && (
                    <Td isNumeric fontFamily="mono" fontSize="xs">
                      {residual === undefined ? '' : formatNumber(residual)}
                    </Td>
                  )}
                  <Td>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      aria-label={`${t('settings.calibration.pointsRemove')} ${index + 1}`}
                      icon={<span aria-hidden>×</span>}
                      isDisabled={disabled}
                      onClick={() =>
                        onChange({
                          ...draft,
                          points: draft.points.filter((_, i) => i !== index),
                        })
                      }
                    />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
        {draftError === 'invalidPoints' && (
          <Text fontSize="xs" color="red.500" mt={1}>
            {t('settings.calibration.errors.invalidPoints')}
          </Text>
        )}
        {draftError === 'notEnoughPoints' && (
          <Text fontSize="xs" color="red.500" mt={1}>
            {errorText}
          </Text>
        )}
        <Button
          size="xs"
          mt={2}
          variant="outline"
          isDisabled={disabled}
          onClick={() =>
            onChange({
              ...draft,
              points: [...draft.points, { captured: '', real: '' }],
            })
          }
        >
          {t('settings.calibration.pointsAdd')}
        </Button>
      </Box>

      {/* Coefficients: fitted from the points, or typed when there are none. */}
      {names.length > 0 && (
        <Box mb={3}>
          <Text fontSize="sm" fontWeight="bold">
            {t('settings.calibration.coefficientsTitle')}
          </Text>
          <Text fontSize="xs" color={mutedTextColor} mb={2}>
            {t('settings.calibration.coefficientsHelp')}
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
            {names.map((name) => (
              <FormControl
                key={name}
                isInvalid={
                  draftError === 'coefficientMissing' &&
                  !(draft.coefficients[name] ?? '').trim()
                }
              >
                <FormLabel fontSize="xs" mb={1} fontFamily="mono">
                  {name}
                </FormLabel>
                <Input
                  size="sm"
                  fontFamily="mono"
                  inputMode="decimal"
                  value={draft.coefficients[name] ?? ''}
                  isDisabled={disabled}
                  aria-label={`${t('settings.calibration.coefficientLabel')} ${name}`}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      coefficients: {
                        ...draft.coefficients,
                        [name]: e.target.value,
                      },
                    })
                  }
                />
              </FormControl>
            ))}
          </SimpleGrid>
          {draftError === 'coefficientMissing' && (
            <Text fontSize="xs" color="red.500" mt={1}>
              {errorText}
            </Text>
          )}
        </Box>
      )}

      <Flex align="center" gap={3} mb={3} flexWrap="wrap">
        <Button
          size="sm"
          variant="outline"
          colorScheme="brand"
          onClick={onFit}
          isLoading={fitting}
          isDisabled={draftError !== null}
        >
          {t('settings.calibration.fitButton')}
        </Button>
        {metrics && (
          <Badge
            colorScheme={QUALITY_COLOR[quality]}
            data-testid="calibration-fit-quality"
          >
            {t(`settings.calibration.quality.${quality}`)}
          </Badge>
        )}
      </Flex>

      {fitError && (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm" data-testid="calibration-fit-error">
            {fitError}
          </AlertDescription>
        </Alert>
      )}

      {metrics && (
        <Box
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="md"
          p={3}
          mb={3}
          data-testid="calibration-fit-metrics"
        >
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            {fit
              ? t('settings.calibration.fitTitle')
              : t('settings.calibration.fitStoredTitle')}
          </Text>
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={2} fontSize="sm">
            <Metric label="R²" value={formatNumber(metrics.r2)} />
            <Metric
              label={t('settings.calibration.metricRmse')}
              value={`${formatNumber(metrics.rmse)} ${unit}`}
            />
            <Metric
              label={t('settings.calibration.metricMae')}
              value={`${formatNumber(metrics.mae)} ${unit}`}
            />
            <Metric
              label={t('settings.calibration.metricMax')}
              value={`${formatNumber(metrics.max_abs_error)} ${unit}`}
            />
            <Metric
              label={t('settings.calibration.metricPoints')}
              value={String(metrics.n_points)}
            />
          </SimpleGrid>
          {metrics.warnings.length > 0 && (
            <Box mt={2}>
              {metrics.warnings.map((warning) => (
                <Text key={warning} fontSize="xs" color="orange.500">
                  {warning}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Text fontSize="xs" opacity={0.7}>
      {label}
    </Text>
    <Text fontFamily="mono">{value}</Text>
  </Box>
);

export default EquationCalibrationEditor;
