'use client';
import React from 'react';
import AdminUserListMain from '@/app/components/admin/AdminUserListMain';
import { AdminPageShell } from '@/app/components/layout/AdminPageShell';

const Page = () => {
  return (
    <AdminPageShell>
      <AdminUserListMain />
    </AdminPageShell>
  );
};

export default Page;
