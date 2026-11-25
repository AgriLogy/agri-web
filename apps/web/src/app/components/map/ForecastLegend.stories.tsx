import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import ForecastLegend from './ForecastLegend';
import type {
  ForecastHorizon,
  ForecastMetric,
} from '@/app/lib/farmMap/forecast';

/**
 * Legend over the farm map when the "Prévisions" layer is on: horizon
 * (1 / 3 / 7 days) and metric (rain, or rain − ET₀) pickers plus the colour
 * scale. Props only; the map gets the forecast from `GET /farm-map/forecast`.
 */
const meta = {
  title: 'Carte/ForecastLegend',
  component: ForecastLegend,
  args: {
    horizon: 3,
    metric: 'rain',
    state: 'ready',
    provider: 'open-meteo',
    sectorCount: 4,
    bg: 'app.surface',
    border: 'app.border',
    onHorizon: fn(),
    onMetric: fn(),
  },
  argTypes: {
    horizon: { control: 'inline-radio', options: [1, 3, 7] },
    metric: { control: 'inline-radio', options: ['rain', 'balance'] },
    state: { control: 'inline-radio', options: ['loading', 'ready', 'error'] },
  },
  // The pickers update the args, so the legend reacts like on the map.
  render: function Render(args) {
    const [, update] = useArgs();
    return (
      <ForecastLegend
        {...args}
        onHorizon={(h: ForecastHorizon) => {
          args.onHorizon(h);
          update({ horizon: h });
        }}
        onMetric={(m: ForecastMetric) => {
          args.onMetric(m);
          update({ metric: m });
        }}
      />
    );
  },
} satisfies Meta<typeof ForecastLegend>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rain total over the next 3 days. */
export const Rain: Story = {};

/** Water balance (rain − ET₀) over 7 days. */
export const Balance: Story = { args: { metric: 'balance', horizon: 7 } };

/** While the forecast loads: small spinner next to the title. */
export const Loading: Story = { args: { state: 'loading' } };

/** The forecast request failed. */
export const LoadError: Story = { args: { state: 'error' } };

/** No sector drawn yet, and the server is on its mock provider. */
export const NoSectorsMockProvider: Story = {
  args: { sectorCount: 0, provider: 'mock' },
};
