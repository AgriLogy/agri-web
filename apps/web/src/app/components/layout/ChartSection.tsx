'use client';

import { Box, type BoxProps } from '@chakra-ui/react';

/**
 * Token-driven container that hosts a single chart panel. Replaces the
 * legacy `style.module.css` `.box`/`.wide` blocks so every analytics
 * card shares the same surface, border, radius and padding.
 */
export function ChartSection({ children, ...rest }: BoxProps) {
  return (
    <Box
      bg="app.surface"
      borderWidth="1px"
      borderColor="app.border"
      borderRadius="lg"
      px={{ base: 3, md: 4 }}
      py={{ base: 3, md: 4 }}
      minW={0}
      {...rest}
    >
      {children}
    </Box>
  );
}
