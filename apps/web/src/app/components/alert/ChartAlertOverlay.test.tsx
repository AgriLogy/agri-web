/**
 * Behaviour tests for ChartAlertOverlay.
 *
 * We focus on three behaviours, none of which depend on rendering DOM
 * pixels:
 *   1. Returns null when no alerts apply (so charts don't reserve space).
 *   2. Renders one ReferenceLine per active alert, using the right color
 *      depending on triggered state.
 *   3. Filters out inactive alerts and rows with non-finite thresholds.
 *
 * Recharts' <ReferenceLine> is a thin wrapper that records its props on
 * the rendered element; we mock it with a plain <div> so the tests stay
 * environment-light and don't need an SVG host.
 */

import React from 'react';
import { render } from '@testing-library/react';

jest.mock('recharts', () => ({
  __esModule: true,
  ReferenceLine: (props: Record<string, unknown>) => (
    <div data-testid="reference-line" data-props={JSON.stringify(props)} />
  ),
}));

import ChartAlertOverlay, {
  TRIGGERED_COLOR,
  IDLE_COLOR,
} from './ChartAlertOverlay';
import type { GraphAlert } from '@/app/lib/alertApi';

const baseAlert: GraphAlert = {
  id: 1,
  name: 'Hot',
  sensor_key: 'temperature_weather',
  zone_id: null,
  condition: '>',
  threshold: 30,
  unit: '°C',
  label: 'Air',
  is_active: true,
  latest_value: 32,
  latest_timestamp: null,
  is_triggered: true,
  last_triggered_at: null,
};

const renderProps = (el: HTMLElement) =>
  JSON.parse(el.getAttribute('data-props') ?? '{}');

describe('ChartAlertOverlay', () => {
  it('renders nothing when alerts array is empty', () => {
    const { container } = render(
      <ChartAlertOverlay sensorKey="temperature_weather" alerts={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders one ReferenceLine per active alert', () => {
    const { getAllByTestId } = render(
      <ChartAlertOverlay
        sensorKey="temperature_weather"
        alerts={[
          baseAlert,
          { ...baseAlert, id: 2, threshold: 35, is_triggered: false },
        ]}
      />
    );
    const lines = getAllByTestId('reference-line');
    expect(lines).toHaveLength(2);
    expect(renderProps(lines[0]).y).toBe(30);
    expect(renderProps(lines[1]).y).toBe(35);
  });

  it('uses triggered color when alert is firing', () => {
    const { getAllByTestId } = render(
      <ChartAlertOverlay
        sensorKey="temperature_weather"
        alerts={[
          { ...baseAlert, is_triggered: true },
          { ...baseAlert, id: 2, threshold: 40, is_triggered: false },
        ]}
      />
    );
    const [hot, cold] = getAllByTestId('reference-line');
    expect(renderProps(hot).stroke).toBe(TRIGGERED_COLOR);
    expect(renderProps(cold).stroke).toBe(IDLE_COLOR);
  });

  it('skips inactive alerts and non-finite thresholds', () => {
    const { queryAllByTestId } = render(
      <ChartAlertOverlay
        sensorKey="temperature_weather"
        alerts={[
          { ...baseAlert, is_active: false },
          { ...baseAlert, id: 2, threshold: Number.NaN },
        ]}
      />
    );
    expect(queryAllByTestId('reference-line')).toHaveLength(0);
  });

  it('forwards yAxisId so multi-axis charts pin the line correctly', () => {
    const { getByTestId } = render(
      <ChartAlertOverlay
        sensorKey="temperature_weather"
        yAxisId="temp"
        alerts={[baseAlert]}
      />
    );
    expect(renderProps(getByTestId('reference-line')).yAxisId).toBe('temp');
  });
});
