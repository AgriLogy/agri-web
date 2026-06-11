'use client';
import React from 'react';
import AlertMain from '../components/alert/AlertMain';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  return (
    <AppPageShell>
      <AlertMain />
    </AppPageShell>
  );
};

export default Page;
