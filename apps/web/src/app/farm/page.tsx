'use client';
import React from 'react';
import FarmMain from '../components/main/FarmMain';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  return (
    <AppPageShell>
      <FarmMain />
    </AppPageShell>
  );
};

export default Page;
