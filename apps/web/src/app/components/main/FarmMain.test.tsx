/**
 * Ma ferme: deleting a sector asks first (agri-web #193).
 *
 * The trash button used to call DELETE /sectors/{id} straight away. Now it
 * opens a confirmation naming the sector; only "Supprimer" sends the request,
 * and "Annuler" keeps the sector.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';

jest.mock('next-intl', () => {
  const catalogue = jest.requireActual(
    '../../../../../../packages/i18n/src/messages/fr.json'
  );
  const resolve = (key: string): string | undefined => {
    let node: unknown = catalogue;
    for (const part of key.split('.')) {
      if (node && typeof node === 'object' && part in (node as object)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return typeof node === 'string' ? node : undefined;
  };
  const t = (key: string, values?: Record<string, unknown>) => {
    const raw = resolve(key);
    if (raw == null) return key;
    if (!values) return raw;
    return Object.entries(values).reduce(
      (acc, [name, value]) => acc.split(`{${name}}`).join(String(value)),
      raw
    );
  };
  t.has = (key: string) => resolve(key) != null;
  return { __esModule: true, useTranslations: () => t, useLocale: () => 'fr' };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/app/hooks/useAccessLevel', () => ({
  useCan: () => ({ canEdit: true }),
}));

const mockOverview = jest.fn();
const mockDeleteSector = jest.fn();

jest.mock('@agri/api-client', () => ({
  farmApi: {
    overview: (...a: unknown[]) => mockOverview(...a),
    deleteSector: (...a: unknown[]) => mockDeleteSector(...a),
    createSector: jest.fn(),
    setSectorZones: jest.fn(),
  },
}));

import FarmMain from './FarmMain';

const SECTORS = [
  { sector_id: 17, sector_name: 'Parcelle Nord', zones: [] },
  { sector_id: null, sector_name: null, zones: [] },
];

function renderPage() {
  return render(
    <ChakraProvider>
      <FarmMain />
    </ChakraProvider>
  );
}

beforeEach(() => {
  mockOverview.mockReset().mockResolvedValue(SECTORS);
  mockDeleteSector.mockReset().mockResolvedValue(undefined);
});

async function clickTrash() {
  const trash = await screen.findByRole('button', {
    name: 'Supprimer le secteur',
  });
  fireEvent.click(trash);
  return screen.findByRole('alertdialog');
}

it('asks before deleting and names the sector', async () => {
  renderPage();
  const dialog = await clickTrash();

  expect(dialog).toHaveTextContent('Supprimer le secteur « Parcelle Nord » ?');
  expect(dialog).toHaveTextContent('redeviennent non assignées');
  expect(mockDeleteSector).not.toHaveBeenCalled();
});

it('keeps the sector when the farmer cancels', async () => {
  renderPage();
  await clickTrash();

  fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  );
  expect(mockDeleteSector).not.toHaveBeenCalled();
});

it('deletes only after "Supprimer", then reloads the farm', async () => {
  renderPage();
  await clickTrash();
  expect(mockOverview).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

  await waitFor(() => expect(mockDeleteSector).toHaveBeenCalledWith(17));
  await waitFor(() => expect(mockOverview).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  );
});
