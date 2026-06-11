'use client';

import React from 'react';
import VannesPompesSchemaMain from '@/app/components/vannes-pompes/VannesPompesSchemaMain';
import { AppPageShell } from '@/app/components/layout/AppPageShell';

const Page = () => {
  return (
    <AppPageShell density="compact">
      <VannesPompesSchemaMain />
    </AppPageShell>
  );
};

export default Page;
