'use client';
import React from 'react';
import AdminDashboardMain from '@/app/components/admin/AdminDashboardMain';
import { AdminPageShell } from '@/app/components/layout/AdminPageShell';

const Page = () => {
  return (
    <AdminPageShell>
      <AdminDashboardMain />
    </AdminPageShell>
  );
};

export default Page;
