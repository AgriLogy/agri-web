'use client';

import { useEffect } from 'react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error boundary caught:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          padding: '4rem 1rem',
          background: '#f7fafc',
          color: '#1a202c',
          minHeight: '100vh',
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: 480,
            margin: '0 auto',
            padding: '2rem',
            background: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
            Application error
          </h1>
          <p style={{ color: '#4a5568', marginBottom: '1.5rem' }}>
            A critical error stopped the page from loading. Please try again.
          </p>
          {isDev && (
            <code
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: '#718096',
                marginBottom: '1.5rem',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
            </code>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#2f855a',
              color: '#ffffff',
              border: 0,
              borderRadius: 8,
              padding: '0.6rem 1.25rem',
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
