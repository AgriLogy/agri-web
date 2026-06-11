import type { ThemeConfig } from 'antd';
import { colors, fontFamily, fontSize, radii, shadows } from './tokens';

const remToPx = (rem: string): number => parseFloat(rem) * 16;

/**
 * Maps our design tokens to Ant Design's theme tokens.
 * See: https://ant.design/docs/react/customize-theme
 *
 * AntD uses a single primary color and derives shades algorithmically;
 * we feed it the 600 step (the brand value).
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: colors.primary[600],
    colorSuccess: colors.semantic.success,
    colorWarning: colors.semantic.warning,
    colorError: colors.semantic.danger,
    colorInfo: colors.semantic.info,

    // Note: colorTextBase / colorBgBase are intentionally NOT set here.
    // AntD's algorithm derives them per mode (dark vs light) — overriding
    // them with static hex values defeats the dark theme.

    fontFamily: fontFamily.sans,
    fontSize: remToPx(fontSize.base),

    borderRadius: remToPx(radii.md),
    borderRadiusLG: remToPx(radii.lg),
    borderRadiusSM: remToPx(radii.sm),

    boxShadow: shadows.card,
    boxShadowSecondary: shadows.floating,
  },
  components: {
    Button: {
      controlHeight: 40,
      controlHeightLG: 48,
      fontWeight: 500,
    },
    Input: {
      controlHeight: 40,
      controlHeightLG: 48,
    },
    Select: {
      controlHeight: 40,
      controlHeightLG: 48,
    },
    DatePicker: {
      controlHeight: 40,
      controlHeightLG: 48,
    },
  },
};
