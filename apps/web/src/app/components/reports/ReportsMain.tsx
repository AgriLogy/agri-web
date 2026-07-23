'use client';

/**
 * Reports / Historique (agri-web #102, RPT-1): a read-only view of what the
 * platform DID — the alerts that fired and the irrigation decisions the engine
 * took. Two tabbed sections share a date-range + zone filter; each section owns
 * its own extra filter, paging and empty/degraded handling.
 *
 * Read-only: this page is intentionally NOT gated on RBAC access level — every
 * tier, monitor included, may read history. It still lives behind auth like
 * every other page (the route guard is in `reports/page.tsx`).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Flex,
  Select,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import api from '@agri/api-client/api';
import { isoRangeFromDates } from '@agri/api-client/reportsModel';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import {
  ChartDateRangeControl,
  type ChartDateRange,
} from '@/app/components/layout/ChartDateRangeControl';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import { AlertHistoryPanel } from './AlertHistoryPanel';
import { DecisionHistoryPanel } from './DecisionHistoryPanel';
import type { ReportZone, SharedReportFilters } from './reportsShared';

/** History reads back further than the live charts do — default to 30 days. */
function defaultReportRange(): ChartDateRange {
  return {
    startDate: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
  };
}

const ReportsMain = () => {
  const t = useTranslations();
  const [range, setRange] = useState<ChartDateRange>(defaultReportRange);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [zones, setZones] = useState<ReportZone[]>([]);

  useEffect(() => {
    api
      .get<ReportZone[]>('/zones')
      .then((res) => setZones(res.data ?? []))
      .catch((error) => {
        logOptionalApiFailure('ReportsMain: zones', error);
        setZones([]);
      });
  }, []);

  const shared = useMemo<SharedReportFilters>(() => {
    const { start, end } = isoRangeFromDates(range.startDate, range.endDate);
    return { start, end, zoneId };
  }, [range.startDate, range.endDate, zoneId]);

  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
      />

      <Flex
        gap={3}
        mb={5}
        align="center"
        flexWrap="wrap"
        borderWidth="1px"
        borderColor="app.border"
        borderRadius="lg"
        bg="app.surface"
        p={3}
      >
        <Flex align="center" gap={2}>
          <Text fontSize="sm" fontWeight="600" whiteSpace="nowrap">
            {t('reports.dateLabel')}
          </Text>
          <ChartDateRangeControl value={range} onChange={setRange} />
        </Flex>
        <Flex align="center" gap={2}>
          <Text fontSize="sm" fontWeight="600" whiteSpace="nowrap">
            {t('reports.zoneLabel')}
          </Text>
          <Select
            aria-label={t('reports.zoneLabel')}
            size="sm"
            maxW="220px"
            value={zoneId ?? ''}
            onChange={(e) =>
              setZoneId(e.target.value ? Number(e.target.value) : null)
            }
            bg="app.surface"
          >
            <option value="">{t('reports.allZones')}</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </Select>
        </Flex>
      </Flex>

      <Tabs colorScheme="brand" variant="enclosed" isLazy>
        <TabList>
          <Tab>{t('reports.tabAlerts')}</Tab>
          <Tab>{t('reports.tabDecisions')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <AlertHistoryPanel shared={shared} zones={zones} />
          </TabPanel>
          <TabPanel px={0}>
            <DecisionHistoryPanel shared={shared} zones={zones} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default ReportsMain;
