/**
 * Header-icon alignment regression test (agri-web #121).
 *
 * The per-sensor "last data" cards next to the charts render a decorative
 * header icon above the title. When that icon is a *bare* flex child it obeys
 * `align-items` (cross-start = left) instead of the card's `textAlign="center"`,
 * so the icon drifts left while the title/value stay centered. The fix wraps
 * the header icon in a centering container (`display:flex; justify-content:center`)
 * matching the already-correct cards. This test pins that behaviour: a
 * representative fixed card and an already-correct reference card must both keep
 * their header icon horizontally centered.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import CumulPrecipitationLastData from './CumulPrecipitation/CumulPrecipitationLastData';
import SoilSalinityConductivityLastData from './SoilSalinityConductivity/SoilSalinityConductivityLastData';
import VPDLastData from './VPD/VPDLastData';
import TempuratureHumidtyLastData from './WeatherTempuratureHumidty/TempuratureHumidtyLastData';
import WaterLevelLastData from './WaterLevel/WaterLevelLastData';
import EtForecastMain from './EtForecast/EtForecastMain';
import type { SensorData } from '@/app/types';

// The ET₀ card embeds the weather-location picker, whose mount effect calls
// `fetch` (absent in jsdom). Stub it out — this suite only pins the header icon.
jest.mock('@/app/components/weather/WeatherLocationPicker', () => ({
  __esModule: true,
  default: () => null,
}));

const reading: SensorData = {
  value: 12.3,
  timestamp: new Date().toISOString(),
  default_unit: 'mm',
} as SensorData;

const renderWithChakra = (ui: React.ReactElement) =>
  render(<ChakraProvider>{ui}</ChakraProvider>);

const expectCenteredHeaderIcon = (container: HTMLElement) => {
  const svg = container.querySelector('svg');
  expect(svg).not.toBeNull();
  const wrapper = svg!.parentElement as HTMLElement;
  expect(wrapper).toHaveStyle({
    display: 'flex',
    justifyContent: 'center',
  });
};

describe('last-data header icon alignment (#121)', () => {
  it('centers the header icon of a fixed card (CumulPrecipitation)', () => {
    const { container } = renderWithChakra(
      <CumulPrecipitationLastData data={[reading]} />
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const wrapper = svg!.parentElement as HTMLElement;
    expect(wrapper).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
    });
  });

  it('keeps the reference card header icon centered (SoilSalinityConductivity)', () => {
    const { container } = renderWithChakra(
      <SoilSalinityConductivityLastData
        salinityData={[reading]}
        conductivityData={[reading]}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const wrapper = svg!.parentElement as HTMLElement;
    expect(wrapper).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
    });
  });
});

describe('last-data header icon added to previously icon-less cards (#123)', () => {
  it('adds a centered header icon to VPD', () => {
    const { container } = renderWithChakra(
      <VPDLastData data={[{ timestamp: reading.timestamp, vpd: 1.2 }]} />
    );
    expectCenteredHeaderIcon(container);
  });

  it('adds a centered header icon to Temperature/Humidity', () => {
    const weather = [
      { timestamp: reading.timestamp, value: 21.5, default_unit: '°C' },
    ];
    const { container } = renderWithChakra(
      <TempuratureHumidtyLastData
        temperatureData={weather}
        humidityData={weather}
      />
    );
    expectCenteredHeaderIcon(container);
  });

  it('adds a centered header icon to Water level', () => {
    const { container } = renderWithChakra(
      <WaterLevelLastData data={[reading]} />
    );
    expectCenteredHeaderIcon(container);
  });

  it('adds a centered header icon to ET₀ forecast', () => {
    const { container } = renderWithChakra(
      <EtForecastMain filters={{ selectedZone: null }} />
    );
    expectCenteredHeaderIcon(container);
  });
});
