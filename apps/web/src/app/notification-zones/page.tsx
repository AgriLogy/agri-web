'use client';
import React, { Suspense } from 'react';
import NotificationZonesManager from '../components/notifications/NotificationZonesManager';
import EmptyBox from '../components/common/EmptyBox';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  return (
    <AppPageShell>
      <Suspense fallback={<EmptyBox variant="loading" />}>
        <NotificationZonesManager />
      </Suspense>
    </AppPageShell>
  );
};

export default Page;
