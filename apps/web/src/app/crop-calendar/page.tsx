'use client';
import React from 'react';
import { useRequireAuth } from '../hooks/useRequireAuth';
import CropCalendarMain from '../components/cropCalendar/CropCalendarMain';
import { AppPageShell } from '../components/layout/AppPageShell';

const Page = () => {
  // Gate the render on auth so the protected UI never paints (and the crop
  // list never starts fetching) for users who get bounced to /login.
  const ready = useRequireAuth();
  if (!ready) return null;

  return (
    <AppPageShell>
      <CropCalendarMain />
    </AppPageShell>
  );
};

export default Page;
