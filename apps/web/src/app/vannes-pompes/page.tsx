'use client';

import React from 'react';
import VannesPompesMain from '../components/main/VannesPompesMain';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  return (
    <AppPageShell>
      <VannesPompesMain />
    </AppPageShell>
  );
};

export default Page;
