'use client';

/**
 * Alert-event history (agri-web #102, RPT-1): the rules that fired, newest
 * first, filterable by the shared date/zone plus an optional sensor. Columns:
 * when · rule · sensor + zone · observed-vs-threshold · channels.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Flex,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { reportsApi, type AlertEvent } from '@agri/api-client/reportsApi';
import type { ReportEnvelope } from '@agri/api-client/reportsApi';
import {
  buildAlertEventParams,
  enumKeySegment,
  formatChannels,
  formatObservedVsThreshold,
  formatTimestamp,
  humanizeEnum,
  REPORTS_PAGE_SIZE,
  reportViewState,
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

const union = (a: string[], b: string[]): string[] => {
  const set = new Set(a);
  for (const v of b) set.add(v);
  return [...set];
};

export function AlertHistoryPanel({
  shared,
  zones,
}: {
  shared: SharedReportFilters;
  zones: ReportZone[];
}) {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const [sensorKey, setSensorKey] = useState('');
  const [offset, setOffset] = useState(0);
  const [envelope, setEnvelope] = useState<ReportEnvelope<AlertEvent> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [knownSensorKeys, setKnownSensorKeys] = useState<string[]>([]);

  const zoneName = useMemo(() => {
    const map = new Map(zones.map((z) => [z.id, z.name]));
    return (id: number | null): string =>
      id == null
        ? t('reports.allZones')
        : (map.get(id) ?? t('reports.zoneFallback', { id }));
  }, [zones, t]);

  const sensorLabel = (key: string): string => {
    const i18nKey = `sensorCatalog.${key}.reading`;
    return t.has(i18nKey) ? t(i18nKey) : humanizeEnum(key);
  };

  const conditionLabel = (condition: string): string => {
    const i18nKey = `reports.conditionEnum.${enumKeySegment(condition)}`;
    return t.has(i18nKey) ? t(i18nKey) : humanizeEnum(condition);
  };

  // A filter change always returns to the first page.
  const resetToFirstPage = () => setOffset(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = buildAlertEventParams({
      start: shared.start,
      end: shared.end,
      zoneId: shared.zoneId,
      sensorKey,
      limit: REPORTS_PAGE_SIZE,
      offset,
    });
    reportsApi
      .alertEvents(params)
      .then((env) => {
        if (cancelled) return;
        setEnvelope(env);
        setKnownSensorKeys((prev) =>
          union(
            prev,
            env.results.map((r) => r.sensor_key)
          )
        );
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
  }, [shared.start, shared.end, shared.zoneId, sensorKey, offset]);

  const state = reportViewState(envelope, loading);
  const rows = envelope?.results ?? [];

  const sensorOptions = useMemo(
    () => union(knownSensorKeys, sensorKey ? [sensorKey] : []),
    [knownSensorKeys, sensorKey]
  );

  return (
    <Box>
      <Flex gap={3} mb={4} align="center" flexWrap="wrap">
        <Flex align="center" gap={2}>
          <Text fontSize="sm" whiteSpace="nowrap" fontWeight="600">
            {t('reports.sensorLabel')}
          </Text>
          <Select
            aria-label={t('reports.sensorLabel')}
            size="sm"
            maxW="240px"
            value={sensorKey}
            onChange={(e) => {
              setSensorKey(e.target.value);
              resetToFirstPage();
            }}
            bg="app.surface"
          >
            <option value="">{t('reports.allSensors')}</option>
            {sensorOptions.map((key) => (
              <option key={key} value={key}>
                {sensorLabel(key)}
              </option>
            ))}
          </Select>
        </Flex>
      </Flex>

      {state !== 'ready' ? (
        <ReportStateNotice state={state} />
      ) : isMobile ? (
        <MobileRecordCards
          cards={rows.map(
            (row, i): RecordCard => ({
              key: `${row.triggered_at}#${i}`,
              title: row.alert_name,
              fields: [
                {
                  label: t('reports.colWhen'),
                  value: formatTimestamp(row.triggered_at),
                },
                {
                  label: t('reports.colSensor'),
                  value: sensorLabel(row.sensor_key),
                },
                { label: t('reports.colZone'), value: zoneName(row.zone_id) },
                {
                  label: t('reports.colCondition'),
                  value: conditionLabel(row.condition),
                },
                {
                  label: t('reports.colObservedVsThreshold'),
                  value: formatObservedVsThreshold(
                    row.observed_value,
                    row.threshold_value,
                    row.unit
                  ),
                },
                {
                  label: t('reports.colChannels'),
                  value: formatChannels(row.notified_channels),
                },
              ],
            })
          )}
        />
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>{t('reports.colWhen')}</Th>
                <Th>{t('reports.colRule')}</Th>
                <Th>{t('reports.colSensorZone')}</Th>
                <Th>{t('reports.colCondition')}</Th>
                <Th>{t('reports.colObservedVsThreshold')}</Th>
                <Th>{t('reports.colChannels')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, i) => (
                <Tr key={`${row.triggered_at}#${i}`}>
                  <Td whiteSpace="nowrap">{formatTimestamp(row.triggered_at)}</Td>
                  <Td>{row.alert_name}</Td>
                  <Td>
                    <Text>{sensorLabel(row.sensor_key)}</Text>
                    <Text fontSize="xs" color="app.text.muted">
                      {zoneName(row.zone_id)}
                    </Text>
                  </Td>
                  <Td>{conditionLabel(row.condition)}</Td>
                  <Td whiteSpace="nowrap">
                    {formatObservedVsThreshold(
                      row.observed_value,
                      row.threshold_value,
                      row.unit
                    )}
                  </Td>
                  <Td>{formatChannels(row.notified_channels)}</Td>
                </Tr>
              ))}
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
