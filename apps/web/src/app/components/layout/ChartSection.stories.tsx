import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChartSection } from './ChartSection';
import ChartPanelHeading from '@/app/components/common/ChartPanelHeading';
import ChartStateView from '@/app/components/common/ChartStateView';

/**
 * Bordered card that holds one chart panel on the analytics pages (surface,
 * border, radius and padding from the theme tokens). Pure layout.
 */
const meta = {
  title: 'Mise en page/ChartSection',
  component: ChartSection,
  args: {
    children: (
      <>
        <ChartPanelHeading
          title="Pression de l'eau"
          subtitle="Station de pompage · moyenne horaire"
          color="app.text"
        />
        <ChartStateView height={220} empty>
          {null}
        </ChartStateView>
      </>
    ),
  },
} satisfies Meta<typeof ChartSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A panel with heading and an empty chart area. */
export const Default: Story = {};

/** Loading chart inside the card. */
export const Loading: Story = {
  args: {
    children: (
      <>
        <ChartPanelHeading title="Débit d'eau" color="app.text" />
        <ChartStateView height={220} loading>
          {null}
        </ChartStateView>
      </>
    ),
  },
};

/** Plain text content and a narrow width. */
export const Narrow: Story = {
  args: {
    maxW: '300px',
    children: 'Contenu libre : le cadre ne dépend pas de ce qu’il contient.',
  },
};
