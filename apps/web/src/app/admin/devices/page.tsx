'use client';
import React from 'react';
import DevicesMain from '@/app/components/admin/DevicesMain';
import { AdminPageShell } from '@/app/components/layout/AdminPageShell';

const Page = () => {
  return (
    <AdminPageShell>
      <DevicesMain />
    </AdminPageShell>
  );
};

export default Page;
