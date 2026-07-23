'use client';

/**
 * Irrigation-decision history (agri-web #102, RPT-1): the engine's verdicts,
 * newest first. Columns: when · zone · irrigate + reason + summary. The
 * water-balance INPUTS behind each decision are not columns — they sit behind
 * an expandable row (desktop) / a details toggle (mobile), driven by the
 * outcome-vs-inputs split in `reportsModel.splitDecision`.
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Flex,
  Grid,
  IconButton,
  Select,
  SimpleGrid,
  Table,
  Tag,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useTranslations } from 'next-intl';
import {
  reportsApi,
  type IrrigationDecision,
  type ReportEnvelope,
} from '@agri/api-client/reportsApi';
import {
  buildIrrigationDecisionParams,
  enumKeySegment,
  formatMeasure,
  formatTimestamp,
  humanizeEnum,
  REPORTS_PAGE_SIZE,
  reportViewState,
  splitDecision,
  type DecisionInputRow,
} from '@agri/api-client/reportsModel';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import {
  MobileRecordCards,
  type RecordCard,
} from '@/app/components/common/MobileRecordCards';
import {
  ReportPager,
  ReportStateNotice,
  type ReportZone,
  type SharedReportFilters,
} from './reportsShared';

/** Tri-state for the irrigate filter as a plain <select> value. */
type IrrigateFilter = 'all' | 'yes' | 'no';
const irrigateFromSelect = (v: IrrigateFilter): boolean | null =>
  v === 'yes' ? true : v === 'no' ? false : null;

export function DecisionHistoryPanel({
  shared,
  zones,
}: {
  shared: SharedReportFilters;
  zones: ReportZone[];
}) {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const [source, setSource] = useState('');
  const [irrigate, setIrrigate] = useState<IrrigateFilter>('all');
  const [offset, setOffset] = useState(0);
  const [envelope, setEnvelope] =
    useState<ReportEnvelope<IrrigationDecision> | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [knownSources, setKnownSources] = useState<string[]>([]);

  const zoneName = useMemo(() => {
    const map = new Map(zones.map((z) => [z.id, z.name]));
    return (id: number | null): string =>
      id == null
        ? t('reports.allZones')
        : (map.get(id) ?? t('reports.zoneFallback', { id }));
  }, [zones, t]);

  const labelFor = (ns: string, value: string): string => {
    const i18nKey = `reports.${ns}.${enumKeySegment(value)}`;
    return t.has(i18nKey) ? t(i18nKey) : humanizeEnum(value);
  };
  const inputLabel = (key: string): string => {
    const i18nKey = `reports.inputEnum.${enumKeySegment(key)}`;
    return t.has(i18nKey) ? t(i18nKey) : humanizeEnum(key);
  };

  const resetToFirstPage = () => setOffset(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExpanded(null);
    const params = buildIrrigationDecisionParams({
      start: shared.start,
      end: shared.end,
      zoneId: shared.zoneId,
      source,
      irrigate: irrigateFromSelect(irrigate),
      limit: REPORTS_PAGE_SIZE,
      offset,
    });
    reportsApi
      .irrigationDecisions(params)
      .then((env) => {
        if (cancelled) return;
        setEnvelope(env);
        setKnownSources((prev) => {
          const set = new Set(prev);
          for (const r of env.results) set.add(r.source);
          return [...set];
        });
      })
      .catch(() => {
        if (!cancelled) setEnvelope(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shared.start, shared.end, shared.zoneId, source, irrigate, offset]);

  const state = reportViewState(envelope, loading);
  const rows = envelope?.results ?? [];

  const sourceOptions = useMemo(() => {
    const set = new Set(knownSources);
    if (source) set.add(source);
    return [...set];
  }, [knownSources, source]);

  const IrrigateTag = ({ value }: { value: boolean }) => (
    <Tag
      size="sm"
      colorScheme={value ? 'green' : 'gray'}
      data-testid={value ? 'decision-irrigate-yes' : 'decision-irrigate-no'}
    >
      {value ? t('reports.irrigateYes') : t('reports.irrigateNo')}
    </Tag>
  );

  const InputsGrid = ({ inputs }: { inputs: DecisionInputRow[] }) => {
    if (inputs.length === 0) {
      return (
        <Text fontSize="sm" color="app.text.muted">
          {t('reports.noInputs')}
        </Text>
      );
    }
    return (
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        {inputs.map((input) => (
          <Box key={input.key}>
            <Text
              fontSize="xs"
              color="app.text.muted"
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing="0.3px"
            >
              {inputLabel(input.key)}
            </Text>
            <Text fontSize="sm" color="app.text" fontWeight="500">
              {formatMeasure(input.value)}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    );
  };

  return (
    <Box>
      <Flex gap={3} mb={4} align="center" flexWrap="wrap">
        <Flex align="center" gap={2}>
          <Text fontSize="sm" whiteSpace="nowrap" fontWeight="600">
            {t('reports.sourceLabel')}
          </Text>
          <Select
            aria-label={t('reports.sourceLabel')}
            size="sm"
            maxW="220px"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              resetToFirstPage();
            }}
            bg="app.surface"
          >
            <option value="">{t('reports.allSources')}</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {labelFor('sourceEnum', s)}
              </option>
            ))}
          </Select>
        </Flex>
        <Flex align="center" gap={2}>
          <Text fontSize="sm" whiteSpace="nowrap" fontWeight="600">
            {t('reports.irrigateLabel')}
          </Text>
          <Select
            aria-label={t('reports.irrigateLabel')}
            size="sm"
            maxW="180px"
            value={irrigate}
            onChange={(e) => {
              setIrrigate(e.target.value as IrrigateFilter);
              resetToFirstPage();
            }}
            bg="app.surface"
          >
            <option value="all">{t('reports.irrigateAll')}</option>
            <option value="yes">{t('reports.irrigateOnlyYes')}</option>
            <option value="no">{t('reports.irrigateOnlyNo')}</option>
          </Select>
        </Flex>
      </Flex>

      {state !== 'ready' ? (
        <ReportStateNotice state={state} />
      ) : isMobile ? (
        <MobileRecordCards
          cards={rows.map((row, i): RecordCard => {
            const { outcome, inputs } = splitDecision(row);
            const key = `${row.decided_at}#${i}`;
            const open = expanded === key;
            return {
              key,
              title: (
                <Flex align="center" gap={2}>
                  <IrrigateTag value={outcome.irrigate} />
                  <Text>{labelFor('reasonEnum', outcome.reason)}</Text>
                </Flex>
              ),
              fields: [
                {
                  label: t('reports.colWhen'),
                  value: formatTimestamp(outcome.decidedAt),
                },
                {
                  label: t('reports.colZone'),
                  value: zoneName(outcome.zoneId),
                },
                {
                  label: t('reports.colSummary'),
                  value: outcome.summary || '—',
                  block: true,
                },
                {
                  label: t('reports.inputsTitle'),
                  block: true,
                  value: (
                    <Box w="100%">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setExpanded(open ? null : key)}
                        rightIcon={open ? <FaChevronUp /> : <FaChevronDown />}
                        data-testid={`decision-details-${i}`}
                      >
                        {open
                          ? t('reports.hideDetails')
                          : t('reports.showDetails')}
                      </Button>
                      <Collapse in={open} animateOpacity unmountOnExit>
                        <Box mt={3}>
                          <InputsGrid inputs={inputs} />
                        </Box>
                      </Collapse>
                    </Box>
                  ),
                },
              ],
            };
          })}
        />
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th w="1%" />
                <Th>{t('reports.colWhen')}</Th>
                <Th>{t('reports.colZone')}</Th>
                <Th>{t('reports.colDecision')}</Th>
                <Th>{t('reports.colReason')}</Th>
                <Th>{t('reports.colSummary')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, i) => {
                const { outcome, inputs } = splitDecision(row);
                const key = `${row.decided_at}#${i}`;
                const open = expanded === key;
                return (
                  <Fragment key={key}>
                    <Tr>
                      <Td>
                        <IconButton
                          aria-label={
                            open
                              ? t('reports.hideDetails')
                              : t('reports.showDetails')
                          }
                          size="xs"
                          variant="ghost"
                          icon={open ? <FaChevronUp /> : <FaChevronDown />}
                          onClick={() => setExpanded(open ? null : key)}
                          data-testid={`decision-details-${i}`}
                        />
                      </Td>
                      <Td whiteSpace="nowrap">
                        {formatTimestamp(outcome.decidedAt)}
                      </Td>
                      <Td>{zoneName(outcome.zoneId)}</Td>
                      <Td>
                        <IrrigateTag value={outcome.irrigate} />
                      </Td>
                      <Td>{labelFor('reasonEnum', outcome.reason)}</Td>
                      <Td>{outcome.summary || '—'}</Td>
                    </Tr>
                    <Tr>
                      <Td
                        colSpan={6}
                        py={0}
                        borderBottomWidth={open ? '1px' : 0}
                      >
                        <Collapse in={open} animateOpacity unmountOnExit>
                          <Box
                            py={4}
                            data-testid={
                              open ? `decision-inputs-${i}` : undefined
                            }
                          >
                            <Text
                              fontSize="sm"
                              fontWeight="700"
                              mb={3}
                              color="app.text"
                            >
                              {t('reports.inputsTitle')}
                            </Text>
                            <Grid>
                              <InputsGrid inputs={inputs} />
                            </Grid>
                          </Box>
                        </Collapse>
                      </Td>
                    </Tr>
                  </Fragment>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}

      {state === 'ready' && envelope && (
        <ReportPager
          offset={envelope.offset}
          limit={envelope.limit}
          count={envelope.count}
          resultCount={rows.length}
          onPrev={() => setOffset(Math.max(0, offset - REPORTS_PAGE_SIZE))}
          onNext={() => setOffset(offset + REPORTS_PAGE_SIZE)}
        />
      )}
    </Box>
  );
}
