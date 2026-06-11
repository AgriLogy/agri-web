/**
 * Design tokens — the single source of truth for visual style.
 *
 * Consumed by:
 *   - tailwind.config.ts        (theme.extend)
 *   - src/app/styles/antdTheme  (AntD ConfigProvider)
 *   - SCSS files                (via CSS variables in globals.scss)
 *
 * To change the brand color, edit colors.ts. Do not hard-code hex values
 * elsewhere in the codebase.
 */

export {
  colors,
  primary,
  neutral,
  semantic,
  surface,
  text,
  border,
} from './colors';
export { spacing } from './spacing';
export {
  typography,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} from './typography';
export { radii } from './radii';
export { shadows } from './shadows';

export type { ColorTokens } from './colors';
export type { SpacingTokens } from './spacing';
export type { TypographyTokens } from './typography';
export type { RadiiTokens } from './radii';
export type { ShadowTokens } from './shadows';
