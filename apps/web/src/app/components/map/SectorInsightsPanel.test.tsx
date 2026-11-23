/**
 * SectorInsightsPanel against a faked `farmMapApi.sectorInsights` (the
 * endpoint does not exist on any server yet). next-intl is the global mock, so
 * translated chrome shows up as its key.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import type { SectorInsights } from '@agri/api-client/farmMapApi';
import SectorInsightsPanel from './SectorInsightsPanel';

jest.mock('./WaterBalanceChart', () => ({
  __esModule: true,
  default: ({ rows }: { rows: unknown[] }) => (
    <div data-testid="balance-chart">{rows.length}</div>
  ),
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

const renderPanel = () =>
  render(
    <ChakraProvider>
      <SectorInsightsPanel sectorId={3} />
    </ChakraProvider>
  );

beforeEach(() => mockSectorInsights.mockReset());

it('shows the balance, recommendation, chart, vegetation and assumption', async () => {
  mockSectorInsights.mockResolvedValue(full);
  renderPanel();
  expect(await screen.findByText('Irriguer 12,5 m³ (≈ 45 min).')).toBeVisible();
  expect(mockSectorInsights).toHaveBeenCalledWith(3);
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
    expect(screen.getByText('misc.map.insights.loadError')).toBeInTheDocument()
  );
});
