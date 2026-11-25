import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageInfoBar } from './PageInfoBar';
import { ZoneSelect } from './ZoneSelect';
import {
  ChartDateRangeControl,
  defaultChartDateRange,
} from './ChartDateRangeControl';
import { ChartFrequencyControl } from './ChartFrequencyControl';
import type { ChartFrequency } from '@/app/utils/chartDateWindow';
import ZoneNotificationBell from '@/app/components/common/ZoneNotificationBell';
import { demoZones } from '@/stories/mocks/api';
import {
  clearNotificationCache,
  fakeNotifications,
  notificationsHandler,
} from '@/stories/mocks/shell';

/** The controls a real analytics page puts in the bar, with live state. */
function useControls() {
  const [zone, setZone] = useState<number>(demoZones[0].id);
  const [range, setRange] = useState(defaultChartDateRange);
  const [freq, setFreq] = useState<ChartFrequency>({ kind: 'hour' });
  return {
    zoneControl: (
      <ZoneSelect zones={demoZones} value={zone} onChange={setZone} />
    ),
    dateRange: <ChartDateRangeControl value={range} onChange={setRange} />,
    frequencyControl: <ChartFrequencyControl value={freq} onChange={setFreq} />,
    actions: (
      <ZoneNotificationBell
        zoneId={zone}
        zoneName={demoZones.find((z) => z.id === zone)?.name ?? ''}
      />
    ),
  };
}

function WithControls(props: { title: string; subtitle?: string }) {
  return <PageInfoBar {...props} {...useControls()} />;
}

/**
 * Header card at the top of every page: title, a muted line (sector · zone ·
 * dates) and the controls (zone, dates, frequency, bell). One row on
 * desktop, stacked on phones. Pure layout; the slots come from the page.
 * The bell in these stories reads `GET /notifications`.
 */
const meta = {
  title: 'Mise en page/PageInfoBar',
  component: PageInfoBar,
  args: {
    title: 'Données sur le sol',
    subtitle: 'Parcelle Nord · Zone A1 — Tomates · du 24 au 25 novembre 2026',
  },
  beforeEach: clearNotificationCache,
  parameters: {
    msw: {
      handlers: {
        notifications: [
          notificationsHandler(fakeNotifications(1, 'Zone A1 — Tomates', 4, 2)),
        ],
      },
    },
  },
} satisfies Meta<typeof PageInfoBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Title and subtitle only, no controls. */
export const TitleOnly: Story = {};

/** A full analytics header: zone, dates, frequency and the zone bell. */
export const WithAllControls: Story = {
  render: (args) => (
    <WithControls
      title={args.title}
      subtitle="Parcelle Nord · Zone A1 — Tomates"
    />
  ),
};

/** Long title and subtitle: title cuts to one line, subtitle to two. */
export const LongText: Story = {
  args: {
    title:
      'Données de la station météo et de l’évapotranspiration de référence pour la zone sélectionnée',
    subtitle:
      'Parcelle Nord · Zone A2 — Agrumes (clémentiniers, goutte-à-goutte) · du 26 août au 25 novembre 2026 · moyennes journalières, valeurs calibrées, unités personnalisées',
  },
  render: (args) => (
    <WithControls title={args.title} subtitle={String(args.subtitle)} />
  ),
};
