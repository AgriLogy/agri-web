'use client';
import React from 'react';
import AdminAffirmationsMain from '@/app/components/admin/AdminAffirmationsMain';
import { AdminPageShell } from '@/app/components/layout/AdminPageShell';

const Page = () => {
  return (
    <AdminPageShell>
      <AdminAffirmationsMain />
    </AdminPageShell>
  );
};

export default Page;
