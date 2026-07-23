'use client';

/**
 * Small pieces shared by the two report panels (agri-web #102, RPT-1): the
 * degraded/empty/loading notice, the pager, and the filter types the parent
 * threads down.
 */

import { Box, Button, Flex, HStack, Spinner, Text } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import type { ReportViewState } from '@agri/api-client/reportsModel';
import { pageWindow } from '@agri/api-client/reportsModel';

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
    return (
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap={3}
        minH="200px"
        w="100%"
      >
        <Spinner size="lg" color="teal.500" thickness="3px" />
        <Text fontSize="sm" color="app.text.muted">
          {t('reports.loadingText')}
        </Text>
      </Flex>
    );
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

  // empty
  return (
    <Box
      data-testid="reports-empty"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="app.border"
      borderRadius="lg"
      p={6}
      textAlign="center"
    >
      <Text fontWeight="700" mb={1}>
        {t('reports.emptyTitle')}
      </Text>
      <Text fontSize="sm" color="app.text.muted">
        {t('reports.emptyBody')}
      </Text>
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
    <Flex
      align="center"
      justify="space-between"
      gap={3}
      mt={4}
      flexWrap="wrap"
    >
      <Text fontSize="sm" color="app.text.muted" data-testid="reports-page-range">
        {t('reports.pageRange', { from, to, total })}
      </Text>
      <HStack spacing={2}>
        <Button
          size="sm"
          variant="outline"
          onClick={onPrev}
          isDisabled={!canPrev}
        >
          {t('reports.prev')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onNext}
          isDisabled={!canNext}
        >
          {t('reports.next')}
        </Button>
      </HStack>
    </Flex>
  );
}
