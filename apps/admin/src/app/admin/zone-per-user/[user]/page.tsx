'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Params = { user: string };

const Page = ({ params }: { params: Params }) => {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/admin/users/${encodeURIComponent(params.user)}?tab=zones`);
  }, [params.user, router]);
  return null;
};

export default Page;
