// app/providers.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { ChakraProvider, useColorMode } from '@chakra-ui/react';
import {
  App as AntdApp,
  ConfigProvider as AntdConfigProvider,
  theme as antdAlgorithm,
} from 'antd';
import arEG from 'antd/locale/ar_EG';
import enUS from 'antd/locale/en_US';
import frFR from 'antd/locale/fr_FR';
import type { Locale as AntdLocale } from 'antd/es/locale';
import { EmotionCacheProvider } from './EmotionCache';
import { theme } from './theme';
import { antdTheme } from './styles/antdTheme';
import PeriodicZoneNotificationScheduler from './components/main/PeriodicZoneNotificationScheduler';
import { dirFor, type Locale } from '../i18n/config';

const antdLocales: Record<Locale, AntdLocale> = {
  fr: frFR,
  en: enUS,
  ar: arEG,
};

/**
 * Bridges Chakra's color mode to:
 *   - the `data-theme` attribute on <html> (consumed by SCSS + Tailwind `dark:` utilities)
 *   - AntD's `darkAlgorithm` / `defaultAlgorithm`
 *
 * Keeps a single source of truth (Chakra) for the toggle while every
 * library renders the matching theme. Also propagates the active locale's
 * text direction to AntD.
 */
function ThemedAntdProvider({
  children,
  locale,
  dir,
}: {
  children: React.ReactNode;
  locale: Locale;
  dir: 'ltr' | 'rtl';
}) {
  const { colorMode } = useColorMode();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = colorMode;
    }
  }, [colorMode]);

  return (
    <AntdConfigProvider
      direction={dir}
      locale={antdLocales[locale]}
      theme={{
        ...antdTheme,
        algorithm:
          colorMode === 'dark'
            ? antdAlgorithm.darkAlgorithm
            : antdAlgorithm.defaultAlgorithm,
      }}
    >
      <AntdApp
        component={false}
        message={{ maxCount: 3 }}
        notification={{ placement: dir === 'rtl' ? 'topLeft' : 'topRight' }}
      >
        {children}
      </AntdApp>
    </AntdConfigProvider>
  );
}

export function Providers({
  children,
  locale = 'fr',
}: {
  children: React.ReactNode;
  locale?: Locale;
}) {
  const dir = dirFor(locale);
  const chakraTheme = useMemo(() => ({ ...theme, direction: dir }), [dir]);

  return (
    <EmotionCacheProvider>
      <ChakraProvider theme={chakraTheme}>
        <ThemedAntdProvider locale={locale} dir={dir}>
          <PeriodicZoneNotificationScheduler />
          {children}
        </ThemedAntdProvider>
      </ChakraProvider>
    </EmotionCacheProvider>
  );
}
