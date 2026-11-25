import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button as ChakraButton } from '@chakra-ui/react';
import { Button as AntdButton } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { PermissionGate } from './PermissionGate';

const REASON =
  'Réservé aux éditeurs : votre compte est en lecture seule (moniteur).';

/**
 * Wraps a write action (create, edit, delete, run irrigation) and, when the
 * user's role does not allow it, disables the control and explains why in a
 * tooltip (agri-web #99). UX only — the API still enforces roles. The caller
 * decides `blocked` from `useCan()` (role from `GET /users/me`).
 */
const meta = {
  title: 'Commun/PermissionGate',
  component: PermissionGate,
  args: {
    blocked: false,
    reason: REASON,
    ui: 'antd',
    children: (
      <AntdButton type="primary" icon={<PlusOutlined />}>
        Nouvelle alerte
      </AntdButton>
    ),
  },
  // Room for the tooltip above the button.
  decorators: [
    (Story) => (
      <div style={{ paddingTop: 72 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PermissionGate>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Allowed (editor/admin): the antd button renders untouched. */
export const AllowedAntd: Story = {};

/** Blocked (monitor/technician): antd button disabled, reason on hover. */
export const BlockedAntd: Story = {
  args: { blocked: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /Nouvelle alerte/ });
    await expect(button).toBeDisabled();
    // antd listens on the wrapping span, since a disabled button gets no events.
    await userEvent.hover(button.parentElement as HTMLElement);
    await expect(
      await within(document.body).findByText(REASON)
    ).toBeInTheDocument();
  },
};

/** Allowed, Chakra control. */
export const AllowedChakra: Story = {
  args: {
    ui: 'chakra',
    children: (
      <ChakraButton colorScheme="red" variant="outline">
        Supprimer la zone
      </ChakraButton>
    ),
  },
};

/** Blocked, Chakra control: disabled via `isDisabled`, reason on hover. */
export const BlockedChakra: Story = {
  args: {
    ...AllowedChakra.args,
    blocked: true,
    reason: 'Seul un administrateur peut supprimer une zone.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Supprimer la zone' });
    await expect(button).toBeDisabled();
    await userEvent.hover(button.parentElement as HTMLElement);
    await expect(
      await within(document.body).findByText(
        'Seul un administrateur peut supprimer une zone.'
      )
    ).toBeInTheDocument();
  },
};
