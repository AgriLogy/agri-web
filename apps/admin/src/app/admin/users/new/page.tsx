'use client';
import React, { useState } from 'react';
import { AdminPageShell } from '@/app/components/layout/AdminPageShell';
import AdminUserListMain from '@/app/components/admin/AdminUserListMain';
import UserCreateDrawer from '@/app/components/admin/UserCreateDrawer';
import { useRouter } from 'next/navigation';

/**
 * Deep-link `/admin/users/new` opens the list with the create drawer
 * already on screen. On close, we drop back to /admin/users.
 */
const Page = () => {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <AdminPageShell>
      <AdminUserListMain />
      <UserCreateDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          router.replace('/admin/users');
        }}
        onCreated={() => {
          setOpen(false);
          router.replace('/admin/users');
        }}
      />
    </AdminPageShell>
  );
};

export default Page;
