/**
 * Dashboard "Exploitation & secteurs" card: like the Météo card, a click
 * anywhere on the card map opens the big map window.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';

jest.mock('next-intl', () => {
  const catalogue = jest.requireActual(
    '../../../../../packages/i18n/src/messages/fr.json'
  );
  const t = (key: string) => {
    let node: unknown = catalogue;
    for (const part of key.split('.')) {
      node = (node as Record<string, unknown> | undefined)?.[part];
    }
    return typeof node === 'string' ? node : key;
  };
  return { __esModule: true, useTranslations: () => t, useLocale: () => 'fr' };
});

jest.mock('@/app/hooks/useAccessLevel', () => ({
  useCan: () => ({ canEdit: true }),
}));

// Mapbox needs WebGL; a marker stands in for each map instance.
jest.mock('next/dynamic', () => () => {
  const FakeMap = ({ showToolsPanel }: { showToolsPanel?: boolean }) => (
    <div data-testid="fake-map" data-tools={String(!!showToolsPanel)} />
  );
  return FakeMap;
});

import GoogleMapWeather from './GoogleMapWeather';

const renderCard = () =>
  render(
    <ChakraProvider>
      <GoogleMapWeather />
    </ChakraProvider>
  );

test('a click on the card map opens the big map window without tools', async () => {
  renderCard();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(screen.getByTestId('farm-map-card-open'));

  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('Exploitation & secteurs');
  // One map at a time: the card map gives way to the modal's.
  const maps = screen.getAllByTestId('fake-map');
  expect(maps).toHaveLength(1);
  expect(maps[0]).toHaveAttribute('data-tools', 'false');
  expect(screen.getByText('Carte ouverte en vue agrandie')).toBeInTheDocument();
});

test('"Outils carte" still opens the window with the tools out', async () => {
  renderCard();

  fireEvent.click(screen.getByRole('button', { name: 'Outils carte' }));

  await screen.findByRole('dialog');
  expect(screen.getByTestId('fake-map')).toHaveAttribute('data-tools', 'true');
});
