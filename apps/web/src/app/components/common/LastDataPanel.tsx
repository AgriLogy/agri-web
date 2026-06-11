'use client';

import { Box, type BoxProps } from '@chakra-ui/react';
import { useColorModeValue } from '@chakra-ui/react';
import {
  LAST_DATA_VARIANT_STYLES,
  type LastDataPanelVariant,
} from './lastDataPanelVariants';

export type { LastDataPanelVariant };

export type LastDataPanelProps = BoxProps & {
  /** Tinted background unique to each feature; improves separation from the chart. */
  variant?: LastDataPanelVariant;
};

/** Shared shell for “latest reading” side panels next to charts. */
/**
 * On phones, hide the decorative metric icons so the card is a brief,
 * icon-free "label : value" summary (desktop keeps the icons). We hide every
 * SVG in the panel — `!important` is required because several icons carry an
 * inline `style="display:inline"` that would otherwise win — then re-show the
 * alert button's icon (it lives inside an antd `.ant-btn`).
 */
const HIDE_DECORATIVE_ICONS_SX = {
  '@media (max-width: 47.99em)': {
    '& svg': { display: 'none !important' },
    '& .ant-btn svg': { display: 'inline-block !important' },
  },
};

export default function LastDataPanel({
  children,
  variant,
  sx,
  ...props
}: LastDataPanelProps) {
  const borderBase = useColorModeValue('blackAlpha.08', 'whiteAlpha.14');
  const fallbackBg = useColorModeValue('white', 'whiteAlpha.40');

  const styles = variant ? LAST_DATA_VARIANT_STYLES[variant] : null;
  const bg = useColorModeValue(
    styles?.bgLight ?? fallbackBg,
    styles?.bgDark ?? fallbackBg
  );
  const borderAccent = useColorModeValue(
    styles?.borderLightTok,
    styles?.borderDarkTok
  );

  return (
    <Box
      borderWidth="1px"
      borderColor={borderBase}
      borderLeftWidth={variant ? '4px' : '1px'}
      borderLeftColor={variant && borderAccent ? borderAccent : undefined}
      bg={bg}
      borderRadius="2xl"
      p={{ base: 3, md: 5 }}
      // Brief on phones (content sets height); fixed tall block only on desktop
      // where it sits beside the chart.
      minH={{ base: 'auto', md: '280px' }}
      minW={0}
      w="100%"
      maxW="100%"
      flex={1}
      boxShadow="sm"
      display="flex"
      flexDirection="column"
      justifyContent="flex-start"
      alignItems="stretch"
      sx={{ ...HIDE_DECORATIVE_ICONS_SX, ...(sx as object) }}
      {...props}
    >
      {children}
    </Box>
  );
}
