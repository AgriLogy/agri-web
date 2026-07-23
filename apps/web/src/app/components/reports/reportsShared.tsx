'use client';

/**
 * Small pieces shared by the two report panels (agri-web #102, RPT-1): the
 * degraded/empty/loading notice, the pager, and the filter types the parent
 * threads down.
 */

import { Box, Button, Flex, HStack, Text } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import type { ReportViewState } from '@agri/api-client/reportsModel';
import { pageWindow } from '@agri/api-client/reportsModel';
import EmptyBox from '@/app/components/common/EmptyBox';

/** The date + zone filters both panels obey, resolved to the wire shape. */
export interface SharedReportFilters {
  /** ISO-8601 UTC lower bound, inclusive. */
  start: string;
  /** ISO-8601 UTC upper bound, inclusive. */
  end: string;
  /** null = every zone. */
  zoneId: number | null;
}

export interface ReportZone {
  id: number;
  name: string;
}

/**
 * The non-ready panel states. Kept distinct so "no rows in this range"
 * (`empty`) never looks like "the history tables are not deployed"
 * (`unavailable`) — the same degraded-vs-empty split the sensor-groups feature
 * makes.
 */
export function ReportStateNotice({ state }: { state: ReportViewState }) {
  const t = useTranslations();

  if (state === 'loading') {
    return <EmptyBox variant="loading" text={t('reports.loadingText')} />;
  }

  if (state === 'unavailable') {
    return (
      <Box
        data-testid="reports-unavailable"
        borderWidth="1px"
        borderColor="orange.300"
        bg="orange.50"
        _dark={{ bg: 'rgba(251,146,60,0.12)', borderColor: 'orange.400' }}
        borderRadius="lg"
        p={5}
        textAlign="center"
      >
        <Text fontWeight="700" mb={1}>
          {t('reports.unavailableTitle')}
        </Text>
        <Text fontSize="sm" color="app.text.muted">
          {t('reports.unavailableBody')}
        </Text>
      </Box>
    );
  }

  // empty — the app-canonical empty state (EmptyBox), wrapped so the
  // degraded-vs-empty test hook stays addressable.
  return (
    <Box data-testid="reports-empty" w="100%">
      <EmptyBox variant="empty" text={t('reports.emptyBody')} />
    </Box>
  );
}

export interface ReportPagerProps {
  offset: number;
  limit: number;
  count: number;
  /** Rows actually returned on this page (so the caption never overstates). */
  resultCount: number;
  onPrev: () => void;
  onNext: () => void;
}

/** Prev / Next pager with a `from–to of total` caption, driven by the envelope. */
export function ReportPager({
  offset,
  limit,
  count,
  resultCount,
  onPrev,
  onNext,
}: ReportPagerProps) {
  const t = useTranslations();
  const { from, to, total } = pageWindow(offset, resultCount, count);
  const canPrev = offset > 0;
  const canNext = offset + limit < count;

  return (
    <Flex align="center" justify="space-between" gap={3} mt={4} flexWrap="wrap">
      <Text
        fontSize="sm"
        color="app.text.muted"
        data-testid="reports-page-range"
      >
        {t('reports.pageRange', { from, to, total })}
      </Text>
      <HStack spacing={2}>
        <Button
          size="sm"
          variant="outline"
          colorScheme="brand"
          onClick={onPrev}
          isDisabled={!canPrev}
        >
          {t('reports.prev')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          colorScheme="brand"
          onClick={onNext}
          isDisabled={!canNext}
        >
          {t('reports.next')}
        </Button>
      </HStack>
    </Flex>
  );
}
