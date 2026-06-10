'use client';

import {
  Box,
  Flex,
  Heading,
  HStack,
  Stack,
  Text,
  useToken,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';

export type PageInfoBarProps = {
  /** Page title - e.g. "Données sur le sol". Required. */
  title: string;
  /**
   * One-line muted line under the title. Pages typically render the
   * active zone, the date window, or both. Optional.
   */
  subtitle?: ReactNode;
  /** Controls slot - usually a zone selector. */
  zoneControl?: ReactNode;
  /** Controls slot - usually a ChartDateRangeControl. */
  dateRange?: ReactNode;
  /** Controls slot - usually a ChartFrequencyControl (data density picker). */
  frequencyControl?: ReactNode;
  /** Trailing actions (notification bell, export buttons, etc.). */
  actions?: ReactNode;
};

/**
 * The single info bar that every page renders directly under the
 * AppPageShell main area. Pages compose it from props rather than each
 * page reinventing a `<HStack> + <Text> + <select>` block.
 *
 * Desktop / tablet (>= md): one row - title-left, controls-right.
 * Mobile (< md): the title row stacks above a controls row so the
 * controls do not push the title off-screen.
 *
 * Visual style is driven by semantic tokens from src/app/theme.ts so a
 * future palette swap does not require editing this component.
 */
export function PageInfoBar({
  title,
  subtitle,
  zoneControl,
  dateRange,
  frequencyControl,
  actions,
}: PageInfoBarProps) {
  const [borderColor] = useToken('colors', ['app.border']);

  const hasControls = Boolean(
    zoneControl || dateRange || frequencyControl || actions
  );

  return (
    <Box
      as="section"
      role="region"
      aria-label={title}
      bg="app.surface"
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      px={{ base: 4, md: 5 }}
      py={{ base: 3, md: 4 }}
      mb={{ base: 3, md: 4 }}
    >
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'stretch', md: 'center' }}
        justify="space-between"
        gap={{ base: 3, md: 4 }}
      >
        {/* Title row. On mobile the actions (alert bell) sit top-right beside
            the title so they never wrap onto their own line under the filters. */}
        <Flex
          align="flex-start"
          justify="space-between"
          gap={3}
          flex="1"
          minW={0}
        >
          <Stack spacing={1} minW={0}>
            <Heading
              as="h1"
              size={{ base: 'md', md: 'lg' }}
              color="app.text"
              fontWeight="semibold"
              lineHeight="short"
              noOfLines={1}
            >
              {title}
            </Heading>
            {subtitle ? (
              <Text
                color="app.text.muted"
                fontSize={{ base: 'sm', md: 'sm' }}
                fontWeight="normal"
                lineHeight="short"
                noOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
          </Stack>
          {actions ? (
            <Box display={{ base: 'flex', md: 'none' }} flexShrink={0}>
              {actions}
            </Box>
          ) : null}
        </Flex>

        {hasControls ? (
          <HStack
            spacing={{ base: 2, md: 3 }}
            align="center"
            flexWrap="wrap"
            justify={{ base: 'flex-start', md: 'flex-end' }}
          >
            {zoneControl}
            {dateRange}
            {frequencyControl}
            {/* Desktop keeps the bell at the end of the controls cluster. */}
            {actions ? (
              <Box display={{ base: 'none', md: 'flex' }}>{actions}</Box>
            ) : null}
          </HStack>
        ) : null}
      </Flex>
    </Box>
  );
}
