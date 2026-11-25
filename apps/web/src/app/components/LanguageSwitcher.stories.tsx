import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import LanguageSwitcher from './LanguageSwitcher';

/**
 * Language menu in the header (FR / العربية / EN). Picking a language saves it
 * in the NEXT_LOCALE cookie (server action) and refreshes the page. In
 * Storybook the language follows the "Langue" toolbar instead; choosing an
 * item here does nothing visible. No API call.
 */
const meta = {
  title: 'Mise en page/LanguageSwitcher',
  component: LanguageSwitcher,
  decorators: [
    (Story) => (
      <div style={{ minHeight: 180 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LanguageSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: shows the current locale code. */
export const Default: Story = {};

/** Menu open; the current language is bold. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(await within(document.body).findByRole('menu')).toBeVisible();
  },
};
