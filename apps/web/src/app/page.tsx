'use client';
import React from 'react';
import { useRequireAuth } from './hooks/useRequireAuth';
import MainContent from './components/dashboard/MainContent';
import { AppPageShell } from './components/layout/AppPageShell';

const Page = () => {
  // Gate the render on auth so the dashboard never paints (and MainContent
  // never starts fetching) for users who get bounced to /login.
  const ready = useRequireAuth();
  if (!ready) return null;

  return (
    <AppPageShell>
      <MainContent />
    </AppPageShell>
  );
};

export default Page;
