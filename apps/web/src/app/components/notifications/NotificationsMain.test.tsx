/**
 * Tests for the notifications page after the card-grid → list refactor
 * (agri-web #107).
 *
 * They assert the page renders a vertical LIST (not a `<Row>`/`<Col>` grid of
 * cards): each row shows the decision indicator + zone title + date + an unread
 * marker, expanding a row reveals the reused detail component and marks it read,
 * and per-row delete still opens the confirm modal and removes the row.
 */

import React from 'react';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { App as AntdApp } from 'antd';

const mockGet = jest.fn();
jest.mock('@agri/api-client/api', () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockGet(...args) },
}));

const mockRefresh = jest.fn().mockResolvedValue(undefined);
jest.mock('@/app/hooks/useNotificationBellCounts', () => ({
  __esModule: true,
  useNotificationBellCounts: () => ({
    totalUnread: 0,
    unreadByZoneId: {},
    unreadForZone: () => 0,
    refresh: mockRefresh,
  }),
}));

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// Wrap the shared decision engine so the row indicator renders without hitting
// live-metrics / config storage; row 1 is critical, others ok.
jest.mock('@/app/hooks/useNotificationDecision', () => ({
  __esModule: true,
  useNotificationDecision: (id: number) => ({
    decision: {
      decision: id === 1 ? 'critical' : 'ok',
      et0TimesKc: 1,
      rulesFired: [],
    },
    config: undefined,
  }),
}));

// The reused detail body — replaced by a marker so we can assert it mounts.
jest.mock('@/app/components/notifications/NotificationDetailFrench', () => ({
  __esModule: true,
  default: () => <div data-testid="detail-french">detail</div>,
}));

jest.mock(
  '@/app/components/notifications/ZoneNotificationConfigureForm',
  () => ({
    __esModule: true,
    default: () => <div data-testid="zone-notif-configure-form">configure</div>,
  })
);

import NotificationsMain from './NotificationsMain';

const ROWS = [
  {
    id: 1,
    is_read: false,
    zone_id: 5,
    zone_name: 'Parcelle Nord',
    notification: {
      notification_date: '2026-07-20T10:00:00Z',
      today_temperature: '20',
    },
  },
  {
    id: 2,
    is_read: true,
    zone_id: 6,
    zone_name: 'Parcelle Sud',
    notification: { notification_date: '2026-07-19T09:00:00Z' },
  },
];

function renderPage() {
  return render(
    <ChakraProvider>
      <AntdApp>
        <NotificationsMain />
      </AntdApp>
    </ChakraProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockRefresh.mockResolvedValue(undefined);
  mockGet.mockResolvedValue({ data: { notifications: ROWS } });
});

describe('NotificationsMain — list layout (agri-web #107)', () => {
  it('renders notifications as a vertical list, not a grid of cards', async () => {
    const { container } = renderPage();

    expect(await screen.findByTestId('notif-item-1')).toBeTruthy();
    expect(screen.getByTestId('notif-item-2')).toBeTruthy();

    // The old layout used antd <Col> grid cells; the list must not.
    expect(container.querySelectorAll('[class*="ant-col"]').length).toBe(0);
  });

  it('shows decision indicator, zone title, date and an unread marker on a row', async () => {
    renderPage();

    const row = await screen.findByTestId('notif-item-1');

    // Decision indicator (reused critical/advisory/ok classification).
    const decision = row.querySelector('[data-testid="notif-decision"]');
    expect(decision).not.toBeNull();
    expect(decision?.getAttribute('data-decision')).toBe('critical');

    // Zone title + a formatted date.
    expect(row.querySelector('[data-testid="notif-title"]')?.textContent).toBe(
      'Parcelle Nord'
    );
    expect(
      row.querySelector('[data-testid="notif-date"]')?.textContent
    ).toBeTruthy();

    // Unread marker present on the unread row, absent on the read one.
    expect(row.querySelector('[data-testid="notif-unread"]')).not.toBeNull();
    const readRow = screen.getByTestId('notif-item-2');
    expect(readRow.querySelector('[data-testid="notif-unread"]')).toBeNull();
  });

  it('expanding a row reveals the reused detail and marks it read', async () => {
    renderPage();

    const title = await screen.findByText('Parcelle Nord');
    expect(screen.queryByTestId('detail-french')).toBeNull();

    fireEvent.click(title);

    expect(await screen.findByTestId('detail-french')).toBeTruthy();
    // Opening an unread row refreshes the bell counts (mark-as-read wiring).
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it('per-row delete opens the Chakra confirm dialog and confirming removes the row', async () => {
    renderPage();

    const row = await screen.findByTestId('notif-item-1');
    const del = row.querySelector(
      '[data-testid="notif-delete"]'
    ) as HTMLElement;
    fireEvent.click(del);

    // Confirm dialog is a Chakra AlertDialog (role="alertdialog"), not antd.
    const dialog = await screen.findByRole('alertdialog');
    expect(
      screen.getByText('notifications.main.deleteDialogTitle')
    ).toBeTruthy();
    expect(document.querySelector('.ant-modal')).toBeNull();

    // Confirm the deletion via the red Delete button inside the dialog.
    const ok = within(dialog).getByText('notifications.main.delete');
    fireEvent.click(ok);

    await waitFor(() =>
      expect(screen.queryByTestId('notif-item-1')).toBeNull()
    );
    expect(screen.getByTestId('notif-item-2')).toBeTruthy();
  });

  it('add-zone-notification opens a Chakra dialog hosting the configure form', async () => {
    renderPage();

    await screen.findByTestId('notif-item-1');
    expect(screen.queryByTestId('zone-notif-configure-form')).toBeNull();

    fireEvent.click(screen.getByTestId('add-zone-notif'));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByTestId('zone-notif-configure-form')
    ).toBeTruthy();
    expect(document.querySelector('.ant-modal')).toBeNull();
  });
});
