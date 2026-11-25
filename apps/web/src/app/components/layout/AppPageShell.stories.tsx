import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Text } from '@chakra-ui/react';
import { AppPageShell } from './AppPageShell';
import { PageInfoBar } from './PageInfoBar';
import { ChartSection } from './ChartSection';
import {
  affirmationsHandler,
  clearNotificationCache,
  fakeNotifications,
  notificationsHandler,
} from '@/stories/mocks/shell';

const CONTENT = (
  <>
    <PageInfoBar
      title="Données sur le sol"
      subtitle="Parcelle Nord · Zone A1 — Tomates"
    />
    <ChartSection>
      <Text fontWeight="normal">
        Le contenu de la page s’affiche ici et défile seul ; l’en-tête et la
        barre latérale restent fixes.
      </Text>
    </ChartSection>
  </>
);

/**
 * Page frame of the logged-in app: header (logo, notifications, language,
 * theme, account), icon sidebar on desktop, and a scrolling main column with
 * the manager-approval banner on top. Wraps every page.
 *
 * Data: `GET /users/me` (name in the header), `GET /notifications` (header
 * bell), `GET /manager-affirmations?status=pending` (banner).
 */
const meta = {
  title: 'Mise en page/AppPageShell',
  component: AppPageShell,
  args: { children: CONTENT },
  beforeEach: clearNotificationCache,
  parameters: {
    layout: 'fullscreen',
    nextjs: { navigation: { pathname: '/soil' } },
    msw: {
      handlers: {
        notifications: [
          notificationsHandler(fakeNotifications(1, 'Zone A1 — Tomates', 5, 2)),
        ],
        affirmations: [affirmationsHandler(0)],
      },
    },
  },
} satisfies Meta<typeof AppPageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Normal page frame. */
export const Default: Story = {};

/** Two requests await a manager's decision: the amber banner shows. */
export const PendingApprovals: Story = {
  parameters: {
    msw: { handlers: { affirmations: [affirmationsHandler(2)] } },
  },
};

/** Compact density (narrower header and sidebar). */
export const Compact: Story = { args: { density: 'compact' } };
