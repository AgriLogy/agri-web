'use client';
import React, { Suspense } from 'react';
import NotificationsMain from '../components/notifications/NotificationsMain';
import EmptyBox from '../components/common/EmptyBox';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  return (
    <AppPageShell>
      <Suspense fallback={<EmptyBox variant="loading" />}>
        <NotificationsMain />
      </Suspense>
    </AppPageShell>
  );
};

export default Page;
