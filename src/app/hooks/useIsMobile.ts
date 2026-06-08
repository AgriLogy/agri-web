'use client';

import { useBreakpointValue } from '@chakra-ui/react';

/**
 * True below Chakra's `md` breakpoint (≈ phones / small tablets).
 *
 * Uses Chakra's SSR-safe default (`ssr: true`): the server and first client
 * paint render the `base` value (mobile), then it resolves to the real
 * breakpoint after mount. `ssr: false` is NOT used — it reads `window`
 * during the server render and throws `window is not defined`.
 */
export function useIsMobile(): boolean {
  return useBreakpointValue({ base: true, md: false }, { ssr: true }) ?? false;
}
