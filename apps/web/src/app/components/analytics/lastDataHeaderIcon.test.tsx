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
import type { SensorData } from '@/app/types';

const reading: SensorData = {
  value: 12.3,
  timestamp: new Date().toISOString(),
  default_unit: 'mm',
} as SensorData;

const renderWithChakra = (ui: React.ReactElement) =>
  render(<ChakraProvider>{ui}</ChakraProvider>);

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
