import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse, delay } from 'msw';
import RecentNotificationsCard from './RecentNotificationsCard';
import { api } from '@/stories/mocks/api';

const CACHE_KEY = 'agrilogy_notifications_cache_v1';
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const ROWS = [
  {
    id: 101,
    notification_name: 'Humidité du sol basse',
    zone_name: 'Zone A1 — Tomates',
    notification_date: ago(0.5),
    is_read: false,
  },
  {
    id: 102,
    notification_name: 'Température élevée sous serre',
    zone_name: 'Serre 1',
    notification_date: ago(5),
    is_read: false,
  },
  {
    id: 103,
    notification_name: 'Capteur sans données depuis 24 h',
    zone_name: 'Zone B1 — Olivier',
    notification_date: ago(28),
    is_read: true,
  },
];

const MANY = [
  ...ROWS,
  ...Array.from({ length: 6 }, (_, i) => ({
    id: 200 + i,
    notification_name:
      i === 0
        ? 'Conductivité électrique de la solution du sol au-dessus du seuil configuré pour la culture'
        : `Niveau du bassin sous ${30 - i * 3} %`,
    zone_name:
      i === 0
        ? 'Zone A2 — Agrumes (goutte-à-goutte, jeunes plants, secteur Sud)'
        : 'Bassin principal',
    notification_date: ago(48 + i * 12),
    is_read: true,
  })),
];

const notifications = (rows: unknown[]) => [
  http.get(api('/notifications'), () =>
    HttpResponse.json({ notifications: rows })
  ),
];

/**
 * "Notifications récentes" tile on the dashboard: the 5 newest alerts, each
 * linking to `/notifications`. Keeps a local cache (localStorage) and shows
 * it when the API fails.
 *
 * Data: `GET /notifications` (`{ notifications: [...] }`).
 */
const meta = {
  title: 'Tableau de bord/RecentNotificationsCard',
  component: RecentNotificationsCard,
  parameters: {
    msw: { handlers: { notifications: notifications(ROWS) } },
  },
  beforeEach: () => {
    // Each story starts with an empty local cache.
    try {
      window.localStorage.removeItem(CACHE_KEY);
    } catch {
      /* storage blocked */
    }
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecentNotificationsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three recent alerts, newest first. */
export const Default: Story = {};

/** More than five alerts and long texts: only the 5 newest, cut to one line. */
export const ManyAndLongTexts: Story = {
  parameters: { msw: { handlers: { notifications: notifications(MANY) } } },
};

/** No alert at all. */
export const Empty: Story = {
  parameters: { msw: { handlers: { notifications: notifications([]) } } },
};

/** While `/notifications` is loading. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        notifications: [
          http.get(api('/notifications'), async () => {
            await delay('infinite');
            return HttpResponse.json({ notifications: [] });
          }),
        ],
      },
    },
  },
};

/** The API fails: the card falls back to the alerts cached earlier. */
export const ApiErrorShowsCache: Story = {
  parameters: {
    msw: {
      handlers: {
        notifications: [
          http.get(api('/notifications'), () =>
            HttpResponse.json({ detail: 'Erreur serveur' }, { status: 500 })
          ),
        ],
      },
    },
  },
  beforeEach: () => {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(ROWS.slice(0, 2)));
    } catch {
      /* storage blocked */
    }
  },
};
