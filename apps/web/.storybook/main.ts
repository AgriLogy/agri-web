import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/nextjs-vite';

// Mapbox needs a token, WebGL and real tiles: stories get a drawn stand-in.
const fakeMap = fileURLToPath(
  new URL('../src/stories/mocks/FakeMapboxMap.tsx', import.meta.url)
);

/**
 * Component documentation for the farmer web app (agri-web #195).
 * Stories sit next to their component (`Foo.stories.tsx`); overview pages
 * are MDX under `src/stories/`. Built into `public/storybook` by the Vercel
 * workflows, so every preview and production deploy serves it at /storybook.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    'msw-storybook-addon',
  ],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  staticDirs: ['./public'],
  core: { disableTelemetry: true },
  docs: { defaultName: 'Docs' },
  // Never let a story reach the real backend: the API client falls back to
  // production when NEXT_PUBLIC_API_URL is unset. It is compiled in as a
  // non-routable host, and MSW answers from src/stories/mocks. preview.tsx
  // also forces the axios baseURL, in case a .env file overrides this.
  viteFinal: async (cfg) => ({
    ...cfg,
    resolve: {
      ...cfg.resolve,
      alias: [
        {
          find: /^@component\/map\/AgricultureMapboxMap$/,
          replacement: fakeMap,
        },
        ...(Array.isArray(cfg.resolve?.alias)
          ? cfg.resolve.alias
          : Object.entries(cfg.resolve?.alias ?? {}).map(
              ([find, replacement]) => ({
                find,
                replacement: String(replacement),
              })
            )),
      ],
    },
    define: {
      ...cfg.define,
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(
        'https://api.storybook.invalid'
      ),
    },
  }),
};

export default config;
