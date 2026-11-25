import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ChartStateView from './ChartStateView';

/** A stand-in plot: invented soil-moisture bars, enough to show the frame. */
function FakePlot() {
  const values = [24, 26, 25, 23, 21, 28, 31, 30, 27, 25, 24, 22];
  return (
    <svg
      viewBox="0 0 240 100"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label="Humidité du sol (%)"
    >
      {values.map((v, i) => (
        <rect
          key={i}
          x={i * 20 + 4}
          y={100 - v * 3}
          width={12}
          height={v * 3}
          rx={2}
          fill="#2f9e5b"
        />
      ))}
    </svg>
  );
}

/**
 * Wrapper every chart sits in: shows a spinner while loading, an "empty"
 * message when the period has no readings, otherwise the chart itself, all
 * at the same height (350 px by default). No data source of its own.
 */
const meta = {
  title: 'Commun/ChartStateView',
  component: ChartStateView,
  args: { children: <FakePlot /> },
} satisfies Meta<typeof ChartStateView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Data present: the chart is rendered. */
export const WithChart: Story = {};

/** Readings are loading. */
export const Loading: Story = { args: { loading: true } };

/** No readings for the chosen period. */
export const Empty: Story = { args: { empty: true } };

/** Custom texts and a shorter area. */
export const CustomTextAndHeight: Story = {
  args: {
    empty: true,
    height: 180,
    emptyText: 'Aucune mesure de pH sur les 7 derniers jours',
  },
};
