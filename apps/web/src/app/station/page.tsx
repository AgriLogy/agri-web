'use client';
import React from 'react';
import StationMain from '../components/main/StationMain';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  return (
    <AppPageShell>
      <StationMain />
    </AppPageShell>
  );
};

export default Page;
