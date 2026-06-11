'use client';

import { useEffect } from 'react';
import { ErrorState } from './components/common/ErrorState';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Route error boundary caught:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <ErrorState
      title="Something went wrong"
      description="We could not load this page. You can retry, or navigate elsewhere."
      details={isDev ? error.message : error.digest}
      onRetry={reset}
    />
  );
}
