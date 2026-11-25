import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import GoogleMapWeather from './GoogleMapWeather';

/**
 * "Exploitation & secteurs" card on the dashboard. Like the Météo card, a
 * click anywhere on the map opens the big map window; "Outils carte" opens it
 * with the sector and sensor tools out (editors only), and the arrows button
 * opens it without them.
 *
 * In Storybook the Mapbox map is replaced by a drawn preview (no token, no
 * tiles); in the app it is the farm's real map with its sectors.
 */
const meta = {
  title: 'Tableau de bord/GoogleMapWeather',
  component: GoogleMapWeather,
  parameters: {
    docs: { story: { inline: false, iframeHeight: 640 } },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GoogleMapWeather>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The card as it sits on the dashboard. */
export const Default: Story = {};

/** A click on the map opens the big map window (same as Météo). */
export const OpenOnClick: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('farm-map-card-open'));
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog).toHaveTextContent('Exploitation & secteurs');
  },
};

/** "Outils carte" opens the window with the tools panel out. */
export const OpenWithTools: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Outils carte' })
    );
    const dialog = await within(document.body).findByRole('dialog');
    await expect(
      await within(dialog).findByText('Dessiner un secteur')
    ).toBeInTheDocument();
  },
};
