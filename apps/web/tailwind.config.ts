import type { Config } from 'tailwindcss';
import {
  colors,
  spacing,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  radii,
  shadows,
} from './src/app/styles/tokens';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Dark mode is driven by `data-theme="dark"` on <html>, set by the
  // Chakra <-> AntD theme bridge in providers.tsx.
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        neutral: colors.neutral,
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        danger: colors.semantic.danger,
        info: colors.semantic.info,
        surface: colors.surface,
        // Legacy CSS-variable-driven tokens (kept for backwards compat).
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      spacing,
      borderRadius: radii,
      boxShadow: shadows,
      fontFamily: {
        sans: fontFamily.sans
          .split(',')
          .map((s) => s.trim().replace(/^"|"$/g, '')),
        mono: fontFamily.mono
          .split(',')
          .map((s) => s.trim().replace(/^"|"$/g, '')),
      },
      fontSize,
      fontWeight,
      lineHeight,
    },
  },
  plugins: [],
};

export default config;
