'use client';
import React from 'react';
import { useRequireAuth } from '../hooks/useRequireAuth';
import ReportsMain from '../components/reports/ReportsMain';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  // Behind auth like every page, but NOT behind an RBAC access level — reports
  // are read-only, so every tier (monitor included) may view them.
  const ready = useRequireAuth();
  if (!ready) return null;

  return (
    <AppPageShell>
      <ReportsMain />
    </AppPageShell>
  );
};

export default Page;
