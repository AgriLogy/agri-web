'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuthTokens } from './lib/checkAuthTokens';
import MainContent from './components/dashboard/MainContent';
import { AppPageShell } from './components/layout/AppPageShell';

const Page = () => {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = checkAuthTokens();
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [router]);
  return (
    <AppPageShell>
      <MainContent />
    </AppPageShell>
  );
};

export default Page;
