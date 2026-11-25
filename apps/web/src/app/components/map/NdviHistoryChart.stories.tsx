import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import NdviHistoryChart from './NdviHistoryChart';
import type { HistoryRow } from '@/app/lib/farmMap/ndvi';

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const r2 = (v: number) => Math.round(v * 100) / 100;

// One clear-sky image every ~15 days over a year; vegetation peaks in spring.
const YEAR: HistoryRow[] = Array.from({ length: 24 }, (_, i) => {
  const mean = r2(0.45 + 0.25 * Math.sin(((i - 4) / 24) * 2 * Math.PI));
  return {
    date: day(-360 + i * 15),
    mean,
    range: [r2(mean - 0.12), r2(Math.min(0.95, mean + 0.1))],
  };
});

/**
 * 12-month trend of the satellite vegetation index (NDVI) for one sector:
 * mean line and min–max band, in the NDVI panel of the farm map.
 * Data: `GET /farm-map/ndvi/sectors/{id}/history`. Draws nothing with fewer
 * than 2 dates.
 */
const meta = {
  title: 'Carte/NdviHistoryChart',
  component: NdviHistoryChart,
  args: { rows: YEAR },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NdviHistoryChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A full year: month/year ticks. */
export const TwelveMonths: Story = {};

/** Only the last two months: day/month ticks. */
export const TwoMonths: Story = { args: { rows: YEAR.slice(-4) } };

/** Min/max missing on some dates: the band has holes. */
export const MissingRange: Story = {
  args: { rows: YEAR.map((r, i) => (i % 3 ? r : { ...r, range: null })) },
};

/** A single usable date: the chart is not drawn. */
export const TooFewDates: Story = { args: { rows: YEAR.slice(-1) } };
