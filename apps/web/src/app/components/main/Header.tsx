import React from 'react';
import { useBreakpointValue } from '@chakra-ui/react';
import MobileMenu from './MobileMenu';
import BigMenu from './BigMenu';

const Header = () => {
  // Default to `md` until media queries run so desktop does not flash the mobile burger on refresh/SSR.
  const isMobile = useBreakpointValue(
    { base: true, md: false },
    { fallback: 'md' }
  );

  return <div>{isMobile ? <MobileMenu /> : <BigMenu />}</div>;
};

export default Header;
