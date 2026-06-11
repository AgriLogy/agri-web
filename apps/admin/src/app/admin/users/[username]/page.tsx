'use client';

import React, { useEffect, useState } from 'react';
import { AdminPageShell } from '@/app/components/layout/AdminPageShell';
import UserDetailShell from '@/app/components/admin/userDetail/UserDetailShell';

type Params = { username: string };

const Page = ({ params }: { params: Params }) => {
  const { username } = params;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <AdminPageShell>
      <UserDetailShell username={decodeURIComponent(username)} />
    </AdminPageShell>
  );
};

export default Page;
