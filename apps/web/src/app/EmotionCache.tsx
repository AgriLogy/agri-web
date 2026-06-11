'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { useServerInsertedHTML } from 'next/navigation';

/**
 * Next.js App Router + Emotion: collects injected CSS during SSR so the first
 * client render matches the server (avoids Chakra / styled div vs style-tag drift).
 *
 * RTL (Arabic) is handled by Chakra's `theme.direction` + the `dir` attribute
 * on <html>, so no stylis RTL transform is needed here.
 */
export function EmotionCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache] = React.useState(() => {
    const c = createCache({ key: 'chakra', prepend: true });
    c.compat = true;
    return c;
  });

  useServerInsertedHTML(() => {
    const names: string[] = [];
    const css: string[] = [];
    for (const name of Object.keys(cache.inserted)) {
      const value = cache.inserted[name];
      if (typeof value === 'string' && value.length > 0) {
        names.push(name);
        css.push(value);
      }
    }
    if (css.length === 0) return null;
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: css.join('') }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
