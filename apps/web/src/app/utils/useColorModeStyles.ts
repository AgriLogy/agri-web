// utils/useColorModeStyles.ts
import { useColorMode, useColorModeValue } from '@chakra-ui/react';

/**
 * Single hook every component imports to grab a brand-aware colour.
 *
 * Every value here is a Chakra token (token names live in src/app/theme.ts
 * and the underlying palette in src/app/styles/tokens/colors.ts). Do not
 * hardcode hex values - if a colour is missing here, add it here so a
 * future palette swap is a one-file edit.
 *
 * Naming convention: `<area><variant>`. `bg`/`textColor` stay as legacy
 * aliases because they're consumed in dozens of components.
 */
const useColorModeStyles = () => {
  const { toggleColorMode } = useColorMode();

  // Surfaces -----------------------------------------------------------------
  const bg = useColorModeValue('neutral.0', 'neutral.800');
  const bgColor = bg;
  const SideBarbg = useColorModeValue('neutral.50', 'neutral.900');
  const headerBarBg = useColorModeValue('neutral.0', 'neutral.900');
  const navBgColor = useColorModeValue('neutral.100', 'neutral.700');
  const thBg = useColorModeValue('neutral.100', 'neutral.800');

  // Borders ------------------------------------------------------------------
  const borderColor = useColorModeValue('neutral.200', 'neutral.700');
  const headerBarBorder = useColorModeValue('neutral.200', 'neutral.700');
  const sidebarRailBorder = useColorModeValue('neutral.200', 'neutral.700');

  // Text ---------------------------------------------------------------------
  const textColor = useColorModeValue('neutral.900', 'neutral.100');
  const mutedTextColor = useColorModeValue('neutral.500', 'neutral.400');
  const zoneColor = useColorModeValue('neutral.500', 'neutral.500');
  const iconColor = useColorModeValue('neutral.600', 'neutral.300');

  // Brand-driven accents -----------------------------------------------------
  // `tabAccent` and `hoverColor` used to be Chakra `blue.*`; we route them
  // through the brand palette so the entire app shares a single accent.
  const tabAccent = useColorModeValue('primary.600', 'primary.300');
  const hoverColor = useColorModeValue('primary.500', 'primary.300');
  const sidebarItemBgActive = useColorModeValue('primary.50', 'primary.900');
  const sidebarItemColorActive = useColorModeValue(
    'primary.700',
    'primary.200'
  );

  // Status indicator triplets (red/yellow/green) used by the gauge components.
  // Greens reach for the brand primary; reds and yellows stay semantic so
  // alerting colour is universally readable.
  const humidityColors = {
    red: useColorModeValue('danger.500', 'red.300'),
    yellow: useColorModeValue('warning.500', 'yellow.300'),
    green: useColorModeValue('primary.500', 'primary.300'),
  };
  const solarRadiationColors = humidityColors;
  const solarPanelVoltageColors = humidityColors;

  const tableStripeClore = useColorModeValue('neutral.50', 'neutral.700');

  return {
    bg,
    bgColor,
    textColor,
    mutedTextColor,
    tabAccent,
    zoneColor,
    toggleColorMode,
    hoverColor,
    navBgColor,
    humidityColors,
    solarRadiationColors,
    solarPanelVoltageColors,
    tableStripeClore,
    thBg,
    borderColor,
    SideBarbg,
    headerBarBg,
    headerBarBorder,
    sidebarRailBorder,
    sidebarItemBgActive,
    sidebarItemColorActive,
    iconColor,
  };
};

export default useColorModeStyles;
