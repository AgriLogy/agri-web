import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ErrorState } from './ErrorState';

/**
 * Full-width error card shown when a page or a route segment fails to load
 * (the app's error boundaries render it). No data source: the caller passes
 * the texts and an optional retry handler.
 */
const meta = {
  title: 'Commun/ErrorState',
  component: ErrorState,
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default English texts, no retry button. */
export const Default: Story = {};

/** French texts with a "Réessayer" button. */
export const WithRetry: Story = {
  args: {
    title: 'Impossible de charger les capteurs',
    description:
      'Le serveur ne répond pas pour le moment. Réessayez dans un instant.',
    retryLabel: 'Réessayer',
    onRetry: fn(),
  },
};

/** Technical details (error message) shown under the description; long text wraps. */
export const WithDetails: Story = {
  args: {
    title: 'Erreur inattendue',
    description: 'La page « Données sur le sol » a rencontré un problème.',
    details:
      'TypeError: Cannot read properties of undefined (reading "soil_moisture_10") at SoilMain (soil/page.tsx:142:31) — digest 3920481175',
    retryLabel: 'Réessayer',
    onRetry: fn(),
  },
};
