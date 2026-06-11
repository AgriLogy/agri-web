import React from 'react';
import { useBreakpointValue } from '@chakra-ui/react';
import AdminMobileMenu from './AdminMobileMenu';
import AdminBigMenu from './AdminBigMenu';

const AdminHeader = () => {
  const isMobile = useBreakpointValue(
    { base: true, md: false },
    { fallback: 'md' }
  );

  return <div>{isMobile ? <AdminMobileMenu /> : <AdminBigMenu />}</div>;
};

export default AdminHeader;
