import { useEffect, useMemo, type ReactNode } from 'react';
import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { ChakraProvider, useColorMode } from '@chakra-ui/react';
import {
  App as AntdApp,
  ConfigProvider as AntdConfigProvider,
  theme as antdAlgorithm,
} from 'antd';
import arEG from 'antd/locale/ar_EG';
import enUS from 'antd/locale/en_US';
import frFR from 'antd/locale/fr_FR';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/ar';
import { NextIntlClientProvider } from 'next-intl';
import { antdTheme, theme } from '@agri/ui';
import { dirFor, type Locale } from '@agri/i18n';
import fr from '../../../packages/i18n/src/messages/fr.json';
import en from '../../../packages/i18n/src/messages/en.json';
import ar from '../../../packages/i18n/src/messages/ar.json';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { setupWorker } from 'msw/browser';
import { http, HttpResponse } from 'msw';
import apiClient from '@agri/api-client/api';
import { API_BASE, api, demoMe } from '../src/stories/mocks/api';
import '../src/app/globals.scss';

// Fake API (src/stories/mocks). Unmatched requests are only warned about:
// they go to api.storybook.invalid and fail, never to production.
// Second guard: whatever the env says, the shared axios instance only ever
// talks to the fake host in Storybook.
apiClient.defaults.baseURL = API_BASE;

const startWorker = async () => {
  const worker = setupWorker();
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: './mockServiceWorker.js' },
  });
  return worker;
};

// Components read the JWT from localStorage; a dummy one keeps them from
// redirecting to /login.
if (typeof window !== 'undefined') {
  window.localStorage.setItem('accessToken', 'storybook');
  window.localStorage.setItem('refreshToken', 'storybook');
}

const MESSAGES = { fr, en, ar } as const;
const ANTD_LOCALES = { fr: frFR, en: enUS, ar: arEG } as const;

/** Keeps Chakra's colour mode in step with the toolbar. */
function ColorModeSync({ mode }: { mode: 'light' | 'dark' }) {
  const { colorMode, setColorMode } = useColorMode();
  useEffect(() => {
    if (colorMode !== mode) setColorMode(mode);
    document.documentElement.dataset.theme = mode;
  }, [mode, colorMode, setColorMode]);
  return null;
}

function Themed({
  locale,
  mode,
  children,
}: {
  locale: Locale;
  mode: 'light' | 'dark';
  children: ReactNode;
}) {
  const dir = dirFor(locale);
  const chakraTheme = useMemo(() => ({ ...theme, direction: dir }), [dir]);
  dayjs.locale(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="Africa/Casablanca"
    >
      <ChakraProvider theme={chakraTheme}>
        <ColorModeSync mode={mode} />
        <AntdConfigProvider
          direction={dir}
          locale={ANTD_LOCALES[locale]}
          theme={{
            ...antdTheme,
            algorithm:
              mode === 'dark'
                ? antdAlgorithm.darkAlgorithm
                : antdAlgorithm.defaultAlgorithm,
          }}
        >
          <AntdApp component="div" style={{ display: 'contents' }}>
            <div dir={dir}>{children}</div>
          </AntdApp>
        </AntdConfigProvider>
      </ChakraProvider>
    </NextIntlClientProvider>
  );
}

const withProviders: Decorator = (Story, ctx) => (
  <Themed
    locale={(ctx.globals.locale ?? 'fr') as Locale}
    mode={(ctx.globals.theme ?? 'light') as 'light' | 'dark'}
  >
    <Story />
  </Themed>
);

const preview: Preview = {
  decorators: [withProviders],
  loaders: [mswLoader(startWorker)],
  globalTypes: {
    locale: {
      description: 'Interface language',
      toolbar: {
        title: 'Langue',
        icon: 'globe',
        items: [
          { value: 'fr', title: 'Français' },
          { value: 'ar', title: 'العربية (RTL)' },
          { value: 'en', title: 'English' },
        ],
        dynamicTitle: true,
      },
    },
    theme: {
      description: 'Colour mode',
      toolbar: {
        title: 'Thème',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Clair' },
          { value: 'dark', title: 'Sombre' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'fr', theme: 'light' },
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    nextjs: { appDirectory: true },
    // Answers every story needs; a story adds its own under msw.handlers.
    msw: {
      handlers: {
        me: [http.get(api('/users/me'), () => HttpResponse.json(demoMe))],
      },
    },
    a11y: { test: 'todo' },
    options: {
      storySort: {
        order: ['Introduction', 'Fondations', 'Commun', '*'],
      },
    },
  },
  tags: ['autodocs'],
};

export default preview;
