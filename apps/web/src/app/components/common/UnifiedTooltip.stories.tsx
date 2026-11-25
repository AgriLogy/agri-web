import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import UnifiedTooltip from './UnifiedTooltip';

const at = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

/**
 * The hover box every Recharts chart shows: one line per series (coloured
 * dot, name : value + unit), then the full date and time of the point.
 * Recharts passes `active`, `payload` and `label`; shown here standalone.
 */
const meta = {
  title: 'Commun/UnifiedTooltip',
  component: UnifiedTooltip,
  args: {
    active: true,
    valuesAlreadyCalibrated: true,
    label: at(2),
    payload: [
      {
        name: "Température de l'air",
        value: 31.84,
        dataKey: 'value',
        color: '#e53e3e',
        payload: { timestamp: at(2), default_unit: '°C' },
      },
    ],
  },
} satisfies Meta<typeof UnifiedTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One series, unit taken from the reading (°C). */
export const SingleSeries: Story = {};

/** Three soil-moisture depths at the same instant, with a title. */
export const MultiSeries: Story = {
  args: {
    labelTitle: 'Humidité du sol',
    valueUnit: '%',
    payload: [
      { name: '10 cm', value: 24.6, dataKey: 'h10', color: '#2f9e5b' },
      { name: '20 cm', value: 28.1, dataKey: 'h20', color: '#d69e2e' },
      { name: '30 cm', value: 31.25, dataKey: 'h30', color: '#805ad5' },
    ].map((p) => ({ ...p, payload: { timestamp: at(5) } })),
  },
};

/** Custom value formatter (e.g. ET0 in mm/j) and a missing value shown as "—". */
export const CustomFormatter: Story = {
  args: {
    valueFormatter: (v) =>
      typeof v === 'number' ? `${v.toFixed(1)} mm/j` : String(v),
    payload: [
      {
        name: 'ET0 calculée',
        value: 5.73,
        dataKey: 'et0',
        color: '#3182ce',
        payload: { timestamp: at(24) },
      },
      {
        name: 'Pluie',
        value: '—',
        dataKey: 'rain',
        color: '#805ad5',
        payload: { timestamp: at(24) },
      },
    ],
  },
};
