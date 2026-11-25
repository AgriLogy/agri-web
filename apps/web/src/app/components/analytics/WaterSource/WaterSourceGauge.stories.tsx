import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import WaterSourceGauge from './WaterSourceGauge';

/**
 * Water column of a water source card (water sources section): fill
 * height = last fill %, dashed marks for the critical (red), low (orange) and
 * high (purple) thresholds. Props only; the card gets the values from
 * `GET /water-sources/{id}/status`.
 */
const meta = {
  title: 'Capteurs/Eau/WaterSourceGauge',
  component: WaterSourceGauge,
  args: {
    fillPercent: 52.4,
    criticalPct: 10,
    lowPct: 25,
    highPct: 90,
    scheme: 'blue',
  },
  argTypes: {
    fillPercent: { control: { type: 'range', min: 0, max: 100, step: 0.5 } },
    scheme: {
      control: 'inline-radio',
      options: ['blue', 'orange', 'red', 'purple'],
    },
  },
} satisfies Meta<typeof WaterSourceGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** About half full, normal level. */
export const Half: Story = {};

/** Under the low mark: orange warning colour. */
export const LowWarning: Story = {
  args: { fillPercent: 18.2, scheme: 'orange' },
};

/** Empty tank (0 %), critical colour. */
export const Empty: Story = { args: { fillPercent: 0, scheme: 'red' } };

/** Full (a value over 100 % is capped at 100 %). */
export const Full: Story = { args: { fillPercent: 104, scheme: 'purple' } };

/** No reading yet: shows "—". */
export const NoReading: Story = { args: { fillPercent: null } };
