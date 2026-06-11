'use client';
import React from 'react';
import PlantMain from '../components/main/PlantMain';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  return (
    <AppPageShell>
      <PlantMain />
    </AppPageShell>
  );
};

export default Page;
