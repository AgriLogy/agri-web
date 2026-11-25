import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ZoneNotificationBell from './ZoneNotificationBell';
import {
  clearNotificationCache,
  fakeNotifications,
  notificationsHandler,
} from '@/stories/mocks/shell';

const ZONE = 'Zone A1 — Tomates';

/**
 * Bell next to a zone's name with its unread-notification count; a click
 * opens `/notifications?zoneId=…`. Hover shows the zone name.
 *
 * Data: `GET /notifications` (merged with the local notification cache).
 */
const meta = {
  title: 'Commun/ZoneNotificationBell',
  component: ZoneNotificationBell,
  args: { zoneId: 1, zoneName: ZONE },
  beforeEach: clearNotificationCache,
  decorators: [
    (Story) => (
      <div style={{ paddingTop: 12, paddingInlineStart: 12 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    msw: {
      handlers: {
        notifications: [notificationsHandler(fakeNotifications(1, ZONE, 6, 3))],
      },
    },
  },
} satisfies Meta<typeof ZoneNotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three unread notifications for this zone. */
export const WithUnread: Story = {};

/** All read: plain bell, no badge. */
export const AllRead: Story = {
  parameters: {
    msw: {
      handlers: {
        notifications: [notificationsHandler(fakeNotifications(1, ZONE, 4, 0))],
      },
    },
  },
};

/** Over 99 unread: the badge caps at "99+". */
export const ManyUnread: Story = {
  parameters: {
    msw: {
      handlers: {
        notifications: [
          notificationsHandler(fakeNotifications(1, ZONE, 120, 120)),
        ],
      },
    },
  },
};

/** Unread rows belong to another zone: this zone's bell shows no badge. */
export const OtherZoneOnly: Story = {
  parameters: {
    msw: {
      handlers: {
        notifications: [
          notificationsHandler(fakeNotifications(2, 'Zone A2 — Agrumes', 5, 5)),
        ],
      },
    },
  },
};
