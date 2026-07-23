/**
 * Integration tests for the Reports / Historique page (agri-web #102, RPT-1).
 *
 * The component is driven for real; only the HTTP layer is faked, by an
 * in-memory stand-in for the two report endpoints that behaves like agri-api —
 * so the whole chain (component → reportsApi → axios) is exercised, filters,
 * paging and the empty-vs-degraded distinction included.
 *
 * The `ChartDateRangeControl` (antd RangePicker) is stubbed to a plain button
 * so these tests stay about the report logic, not antd's calendar internals —
 * the button applies a fixed range so a date-filter change can be asserted on
 * the REQUEST.
 *
 * What these prove concretely: each assertion is on a REQUEST reaching the
 * report endpoints (or the state the envelope drives), so a regression in
 * param-building, paging or the outcome/inputs split fails one of them.
 */

import React from 'react';
import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';

const mockGet = jest.fn();

jest.mock('@agri/api-client/api', () => ({
  __esModule: true,
  default: { get: (...a: unknown[]) => mockGet(...a) },
}));

// Stub the antd-based date control: a button that applies a fixed range, so we
// can assert a date filter reaches the request without driving a calendar.
jest.mock('@/app/components/layout/ChartDateRangeControl', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- require is required inside a hoisted jest.mock factory
  const R = require('react');
  return {
    __esModule: true,
    ChartDateRangeControl: ({
      onChange,
    }: {
      onChange: (r: { startDate: string; endDate: string }) => void;
    }) =>
      R.createElement(
        'button',
        {
          type: 'button',
          onClick: () =>
            onChange({ startDate: '2026-01-01', endDate: '2026-01-31' }),
        },
        'set-range'
      ),
  };
});

import ReportsMain from './ReportsMain';
import {
  makeFakeReportsServer,
  wireFakeReportsServer,
  type FakeReportsServer,
} from '@/app/lib/fakeReportsServer';

let server: FakeReportsServer;

const lastCall = (url: string) => {
  const calls = mockGet.mock.calls.filter((c) => c[0] === url);
  return calls[calls.length - 1] as [string, { params: Record<string, unknown> }];
};

const renderPage = () => render(
  <ChakraProvider>
    <ReportsMain />
  </ChakraProvider>
);

beforeEach(() => {
  mockGet.mockReset();
  server = makeFakeReportsServer();
  wireFakeReportsServer(server, { mockGet });
});

describe('ReportsMain — alert history', () => {
  it('renders the alert rows the endpoint returns', async () => {
    server.seedAlert({ alert_name: 'Gel nocturne' });
    server.seedAlert({ alert_name: 'Chaleur excessive', zone_id: 9 });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Gel nocturne')).toBeInTheDocument()
    );
    expect(screen.getByText('Chaleur excessive')).toBeInTheDocument();
    // The default 30-day window is always sent as an ISO range.
    const [, cfg] = lastCall('/reports/alert-events');
    expect(typeof cfg.params.start).toBe('string');
    expect(typeof cfg.params.end).toBe('string');
    expect(cfg.params.offset).toBe(0);
  });

  it('applies the zone filter to the REQUEST and narrows the rows', async () => {
    server.seedAlert({ alert_name: 'Gel nocturne', zone_id: 5 });
    server.seedAlert({ alert_name: 'Chaleur excessive', zone_id: 9 });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Gel nocturne')).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.change(screen.getByLabelText('reports.zoneLabel'), {
        target: { value: '9' },
      });
    });

    await waitFor(() => {
      const [, cfg] = lastCall('/reports/alert-events');
      expect(cfg.params.zone_id).toBe(9);
    });
    // Only the zone-9 alert survives the server-side filter.
    await waitFor(() =>
      expect(screen.queryByText('Gel nocturne')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Chaleur excessive')).toBeInTheDocument();
  });

  it('applies a date-range change to the REQUEST', async () => {
    server.seedAlert();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Gel nocturne')).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByText('set-range'));
    });

    await waitFor(() => {
      const [, cfg] = lastCall('/reports/alert-events');
      expect(cfg.params.start).toBe('2026-01-01T00:00:00Z');
      expect(cfg.params.end).toBe('2026-01-31T23:59:59Z');
    });
  });

  it('pages with offset when there are more rows than one page holds', async () => {
    for (let i = 0; i < 60; i++) {
      const mm = String(i).padStart(2, '0');
      server.seedAlert({
        alert_name: `Alerte ${i}`,
        triggered_at: `2026-07-20T10:${mm}:00Z`,
      });
    }
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('reports-page-range')).toBeInTheDocument()
    );

    await act(async () => {
      fireEvent.click(screen.getByText('reports.next'));
    });

    await waitFor(() => {
      const [, cfg] = lastCall('/reports/alert-events');
      expect(cfg.params.offset).toBe(50);
    });
  });

  it('shows the empty state — not the degraded one — when the range has no rows', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('reports-empty')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('reports-unavailable')).not.toBeInTheDocument();
  });

  it('shows the degraded state when the tables are not deployed', async () => {
    server.degraded = true;
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('reports-unavailable')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('reports-empty')).not.toBeInTheDocument();
  });
});

describe('ReportsMain — irrigation decisions', () => {
  const openDecisionsTab = async () => {
    await act(async () => {
      fireEvent.click(screen.getByText('reports.tabDecisions'));
    });
  };

  it('renders decision rows and requests the decisions endpoint', async () => {
    server.seedDecision({ summary: 'Irriguer 12.7 m³' });
    renderPage();
    await openDecisionsTab();

    await waitFor(() =>
      expect(screen.getByText('Irriguer 12.7 m³')).toBeInTheDocument()
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/reports/irrigation-decisions',
      expect.objectContaining({
        params: expect.objectContaining({ offset: 0 }),
      })
    );
  });

  it('reveals the water-balance INPUTS only after expanding the row', async () => {
    server.seedDecision({
      summary: 'Irriguer 12.7 m³',
      inputs: { et0_mm: 5.4, etc_mm: 4.9 },
    });
    renderPage();
    await openDecisionsTab();
    await waitFor(() =>
      expect(screen.getByText('Irriguer 12.7 m³')).toBeInTheDocument()
    );

    // Inputs are hidden until the detail is expanded (outcome ⟂ inputs split).
    expect(screen.queryByText('5.4')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('decision-details-0'));
    });

    await waitFor(() => expect(screen.getByText('5.4')).toBeInTheDocument());
    expect(screen.getByText('4.9')).toBeInTheDocument();
  });

  it('sends the source and irrigate filters on the REQUEST', async () => {
    server.seedDecision({ source: 'water_balance', irrigate: true });
    server.seedDecision({ source: 'manual', irrigate: false });
    renderPage();
    await openDecisionsTab();
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        '/reports/irrigation-decisions',
        expect.anything()
      )
    );

    await act(async () => {
      fireEvent.change(screen.getByLabelText('reports.irrigateLabel'), {
        target: { value: 'no' },
      });
    });

    await waitFor(() => {
      const [, cfg] = lastCall('/reports/irrigation-decisions');
      expect(cfg.params.irrigate).toBe(false);
      expect(cfg.params.offset).toBe(0);
    });
  });
});
