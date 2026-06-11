// app/providers.tsx (admin)
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
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/ar';
import { EmotionCacheProvider } from '@agri/ui';
import { theme } from '@agri/ui';
import { antdTheme } from '@agri/ui';
import { dirFor, type Locale } from '@agri/i18n';

const antdLocales: Record<Locale, AntdLocale> = {
  fr: frFR,
  en: enUS,
  ar: arEG,
};

/** Active UI locale → dayjs locale tag (en is dayjs's built-in default). */
const dayjsLocales: Record<Locale, string> = {
  fr: 'fr',
  en: 'en',
  ar: 'ar',
};

/**
 * Bridges Chakra's color mode to the `data-theme` attribute and AntD's
 * algorithm, and propagates the active locale's text direction to AntD.
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

  dayjs.locale(dayjsLocales[locale]);

  return (
    <EmotionCacheProvider>
      <ChakraProvider theme={chakraTheme}>
        <ThemedAntdProvider locale={locale} dir={dir}>
          {children}
        </ThemedAntdProvider>
      </ChakraProvider>
    </EmotionCacheProvider>
  );
}
