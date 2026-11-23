/**
 * SectorInsightsPanel against a faked `farmMapApi.sectorInsights` (the
 * endpoint does not exist on any server yet). next-intl is the global mock, so
 * translated chrome shows up as its key.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import type { SectorInsights } from '@agri/api-client/farmMapApi';
import SectorInsightsPanel from './SectorInsightsPanel';

jest.mock('./WaterBalanceChart', () => ({
  __esModule: true,
  default: ({ rows }: { rows: unknown[] }) => (
    <div data-testid="balance-chart">{rows.length}</div>
  ),
}));

// The UI locale, switchable per test (the global mock always says "fr").
let mockLocale = 'fr';
jest.mock('next-intl', () => ({
  ...jest.requireActual('next-intl'),
  useLocale: () => mockLocale,
}));

const mockSectorInsights = jest.fn();
jest.mock('@agri/api-client/farmMapApi', () => ({
  farmMapApi: {
    sectorInsights: (...a: unknown[]) => mockSectorInsights(...a),
  },
}));

const full: SectorInsights = {
  sector_id: 3,
  sector_name: 'Parcelle Nord',
  date: '2026-11-23',
  crop: 'tomate',
  zone_ids: [1],
  kc: { value: 0.85, source: 'kc_period', period_name: 'Mi-saison' },
  water_balance: {
    available: true,
    reason: null,
    taw_mm: 81,
    raw_mm: 40.5,
    dr_mm: 32.1,
    depletion_pct: 39.6,
    status: 'irrigate_soon',
    start_date: '2026-11-09',
    assumption: 'Sol supposé à la capacité au champ le 2026-11-09.',
    days: [
      {
        date: '2026-11-22',
        et0_mm: 3,
        kc: 0.85,
        etc_mm: 2.6,
        rain_mm: 0,
        irrigation_mm: 0,
        dr_mm: 29.5,
      },
      {
        date: '2026-11-23',
        et0_mm: 3,
        kc: 0.85,
        etc_mm: 2.6,
        rain_mm: 0,
        irrigation_mm: 0,
        dr_mm: 32.1,
      },
    ],
  },
  recommendation: {
    action: 'irrigate',
    volume_m3: 12.5,
    duration_min: 45,
    rain_next_48h_mm: 0.4,
    message: 'Irriguer 12,5 m³ (≈ 45 min).',
  },
  vegetation: {
    status: 'water_stress',
    label: 'Stress hydrique probable',
    message: 'NDVI en baisse et sol sec.',
    confidence: 'medium',
    ndvi: { date: '2026-11-18', mean: 0.42, trend_per_week: -0.06, points: 5 },
    soil_moisture_pct: 18.4,
    soil_moisture_at: '2026-11-23T10:00:00Z',
    critical_moisture_pct: 25,
  },
};

const panel = (satellite?: React.ReactNode) => (
  <ChakraProvider>
    <SectorInsightsPanel sectorId={3} satellite={satellite} />
  </ChakraProvider>
);
const renderPanel = (satellite?: React.ReactNode) => render(panel(satellite));

beforeEach(() => {
  mockSectorInsights.mockReset();
  mockLocale = 'fr';
});

it('shows the balance, recommendation, chart, vegetation and assumption', async () => {
  mockSectorInsights.mockResolvedValue(full);
  renderPanel();
  expect(await screen.findByText('Irriguer 12,5 m³ (≈ 45 min).')).toBeVisible();
  expect(mockSectorInsights).toHaveBeenCalledWith(3, 'fr');
  expect(
    screen.getByText('misc.map.insights.status.irrigate_soon')
  ).toBeInTheDocument();
  expect(screen.getByText('32.1 mm')).toBeInTheDocument();
  expect(screen.getByText('12.5 m³')).toBeInTheDocument();
  expect(screen.getByText('45 min')).toBeInTheDocument();
  expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '32.1');
  expect(screen.getByTestId('balance-chart')).toHaveTextContent('2');
  expect(
    screen.getByText('misc.map.insights.vegStatus.water_stress')
  ).toBeInTheDocument();
  expect(screen.getByText('Stress hydrique probable')).toBeInTheDocument();
  expect(screen.getByText('0.42')).toBeInTheDocument();
  expect(screen.getByText(/−0\.06/)).toBeInTheDocument();
  expect(screen.getByText('18 %')).toBeInTheDocument();
  expect(
    screen.getByText('Sol supposé à la capacité au champ le 2026-11-09.')
  ).toBeInTheDocument();
});

it('explains available:false and renders every null as a dash', async () => {
  mockSectorInsights.mockResolvedValue({
    ...full,
    kc: { value: null, source: 'default', period_name: null },
    water_balance: {
      ...full.water_balance,
      available: false,
      reason: 'no_soil_params',
      taw_mm: null,
      raw_mm: null,
      dr_mm: null,
      depletion_pct: null,
      status: null,
      assumption: null,
      days: [],
    },
    recommendation: null,
    vegetation: {
      ...full.vegetation!,
      status: 'insufficient_data',
      ndvi: null,
      soil_moisture_pct: null,
      critical_moisture_pct: null,
    },
  });
  renderPanel();
  expect(
    await screen.findByText(/misc\.map\.insights\.unavailable/)
  ).toHaveTextContent('misc.map.insights.reason.no_soil_params');
  expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  expect(screen.queryByTestId('balance-chart')).not.toBeInTheDocument();
  expect(
    screen.queryByText('misc.map.insights.recommendation')
  ).not.toBeInTheDocument();
  // NDVI, trend, soil moisture → three dashes, never NaN.
  expect(screen.getAllByText('—')).toHaveLength(3);
  expect(document.body.textContent).not.toMatch(/NaN/);
});

it('shows an error when the endpoint fails', async () => {
  mockSectorInsights.mockRejectedValue({ response: { status: 404 } });
  renderPanel();
  await waitFor(() =>
    // Both insights tabs say so; the Satellite tab is unaffected.
    expect(screen.getAllByText('misc.map.insights.loadError')).toHaveLength(2)
  );
});

it('asks for the UI language and refetches when the locale changes', async () => {
  mockSectorInsights.mockResolvedValue(full);
  const { rerender } = renderPanel();
  await screen.findByText('Irriguer 12,5 m³ (≈ 45 min).');
  expect(mockSectorInsights).toHaveBeenCalledTimes(1);
  expect(mockSectorInsights).toHaveBeenLastCalledWith(3, 'fr');

  mockSectorInsights.mockResolvedValue({
    ...full,
    lang: 'ar',
    recommendation: { ...full.recommendation!, message: 'اسقِ 12.5 م³.' },
  });
  mockLocale = 'ar';
  rerender(panel());
  const msg = await screen.findByText('اسقِ 12.5 م³.');
  expect(mockSectorInsights).toHaveBeenCalledTimes(2);
  expect(mockSectorInsights).toHaveBeenLastCalledWith(3, 'ar');
  // Arabic wording from the server is laid out right-to-left.
  expect(msg).toHaveAttribute('dir', 'rtl');
});

it('keeps dir="auto" for an older server that sends no lang', async () => {
  mockSectorInsights.mockResolvedValue(full);
  renderPanel();
  expect(
    await screen.findByText('Irriguer 12,5 m³ (≈ 45 min).')
  ).toHaveAttribute('dir', 'auto');
});

it('splits the panel into tabs and mounts Satellite only once opened', async () => {
  mockSectorInsights.mockResolvedValue(full);
  renderPanel(<div data-testid="ndvi">ndvi</div>);
  await screen.findByText('Irriguer 12,5 m³ (≈ 45 min).');
  const tabs = screen.getAllByRole('tab');
  expect(tabs.map((el) => el.textContent)).toEqual([
    'misc.map.insights.tabs.irrigation',
    'misc.map.insights.tabs.vegetation',
    'misc.map.insights.tabs.satellite',
  ]);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByTestId('ndvi')).not.toBeInTheDocument();

  // Vegetation reads the same response: no second request.
  fireEvent.click(tabs[1]!);
  expect(screen.getByText('Stress hydrique probable')).toBeVisible();
  expect(screen.queryByTestId('ndvi')).not.toBeInTheDocument();

  fireEvent.click(tabs[2]!);
  expect(await screen.findByTestId('ndvi')).toBeInTheDocument();
  // Back to Irrigation: the satellite panel stays mounted (no refetch).
  fireEvent.click(tabs[0]!);
  expect(screen.getByTestId('ndvi')).toBeInTheDocument();
  expect(mockSectorInsights).toHaveBeenCalledTimes(1);
});

it('remembers the chosen tab when the panel is mounted again', async () => {
  mockSectorInsights.mockResolvedValue(full);
  const first = renderPanel(<div data-testid="ndvi">ndvi</div>);
  await screen.findByText('Irriguer 12,5 m³ (≈ 45 min).');
  fireEvent.click(screen.getAllByRole('tab')[2]!);
  first.unmount();

  const second = renderPanel(<div data-testid="ndvi">ndvi</div>);
  await screen.findByText('Irriguer 12,5 m³ (≈ 45 min).');
  expect(screen.getAllByRole('tab')[2]).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(screen.getByTestId('ndvi')).toBeInTheDocument();
  second.unmount();

  // Without a satellite tab the remembered one falls back to the first.
  const again = renderPanel();
  expect(again.getAllByRole('tab')).toHaveLength(2);
  expect(again.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
  // Leave the session default behind for any later test.
  fireEvent.click(screen.getAllByRole('tab')[0]!);
});
