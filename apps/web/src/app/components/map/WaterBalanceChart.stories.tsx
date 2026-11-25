import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import WaterBalanceChart from './WaterBalanceChart';
import type { BalanceChartRow } from '@/app/lib/farmMap/insights';

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

// 14 days of a drying soil, one rain event and two irrigations.
const DR = [12, 16, 20, 24.5, 5, 8.5, 12, 16, 20.5, 25, 29.5, 34, 14, 18];
const RAIN = [0, 0, 0, 0, 19.5, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const IRR = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 0];

const ROWS: BalanceChartRow[] = DR.map((dr, i) => ({
  date: day(i - 13),
  dr,
  rain: RAIN[i],
  irrigation: IRR[i],
  et: 4.1 + (i % 3) * 0.3,
}));

/**
 * 14-day root-zone depletion (Dr, orange line) with rain and irrigation bars
 * and the RAW threshold (red dashes), in the sector insights panel of the
 * farm map. Rows come from `GET /farm-map/sectors/{id}/insights`. Draws
 * nothing with fewer than 2 days.
 */
const meta = {
  title: 'Carte/WaterBalanceChart',
  component: WaterBalanceChart,
  args: { rows: ROWS, rawMm: 30 },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WaterBalanceChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two weeks with rain, irrigation and the RAW line. */
export const Default: Story = {};

/** RAW unknown (crop not set): no threshold line. */
export const NoRawThreshold: Story = { args: { rawMm: null } };

/** Days with no depletion value leave a gap in the line. */
export const MissingDays: Story = {
  args: {
    rows: ROWS.map((r, i) => (i >= 6 && i <= 8 ? { ...r, dr: null } : r)),
  },
};

/** Only one day of data: the chart is not drawn. */
export const TooFewDays: Story = { args: { rows: ROWS.slice(-1) } };
