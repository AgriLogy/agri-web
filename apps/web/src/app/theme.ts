'use client';

import { extendTheme, type StyleFunctionProps } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import { chakraColorModeConfig } from './colorModeConfig';
import { neutral, primary, semantic } from './styles/tokens/colors';

/**
 * Chakra theme wired to the design tokens in src/app/styles/tokens/.
 *
 * Tokens here mirror the same values consumed by the antd ConfigProvider
 * (src/app/styles/antdTheme.ts) and Tailwind, so a single change in
 * tokens/colors.ts ripples through every UI surface. Aliases ("brand",
 * "surface", …) are exposed so a future palette swap does not have to
 * touch every component that hardcodes `primary.600` etc.
 */
export const theme = extendTheme({
  config: chakraColorModeConfig,
  colors: {
    primary,
    neutral,
    success: { 500: semantic.success },
    warning: { 500: semantic.warning },
    danger: { 500: semantic.danger },
    info: { 500: semantic.info },
    // Alias kept so existing Chakra `colorScheme="brand"` callers (and
    // any future ones) resolve to the brand primary.
    brand: primary,
  },
  semanticTokens: {
    colors: {
      'app.bg': { default: 'neutral.50', _dark: 'neutral.900' },
      'app.surface': { default: 'neutral.0', _dark: 'neutral.800' },
      'app.surface.muted': { default: 'neutral.50', _dark: 'neutral.700' },
      'app.text': { default: 'neutral.900', _dark: 'neutral.100' },
      'app.text.muted': { default: 'neutral.500', _dark: 'neutral.400' },
      'app.border': { default: 'neutral.200', _dark: 'neutral.700' },
      'app.border.strong': { default: 'neutral.300', _dark: 'neutral.600' },
      'app.accent': { default: 'primary.600', _dark: 'primary.300' },
      'app.accent.soft': { default: 'primary.50', _dark: 'primary.900' },
    },
  },
  styles: {
    global: (props: StyleFunctionProps) => ({
      html: {
        overflowX: 'hidden',
        maxWidth: '100%',
      },
      body: {
        bg: mode('neutral.50', 'neutral.900')(props),
        color: mode('neutral.900', 'neutral.100')(props),
        overflowX: 'hidden',
        maxWidth: '100%',
      },
    }),
  },
});
