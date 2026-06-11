'use client';
import React, { useEffect, useState } from 'react';
import SettingsMain from '../components/settings/SettingsMain';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AppPageShell>
      <SettingsMain />
    </AppPageShell>
  );
};

export default Page;
