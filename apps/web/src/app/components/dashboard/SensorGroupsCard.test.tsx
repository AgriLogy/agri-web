/**
 * Integration tests for the dashboard's grouped sensor block (agri-web #95).
 *
 * The dashboard used to render one flat list of every sensor. It must now show
 * collapsible groups fed by the ACCOUNT's groups, keep ungrouped sensors
 * reachable, list a sensor under each group that holds it, and say so honestly
 * when the backend cannot store groups yet.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import frMessages from '../../../../../../packages/i18n/src/messages/fr.json';

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
  const translator = () => {
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
    t.rich = (key: string) => key;
    return t;
  };
  return {
    __esModule: true,
    useTranslations: translator,
    useLocale: () => 'fr',
  };
});

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('@agri/api-client/api', () => ({
  __esModule: true,
  default: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
  },
}));

import SensorGroupsCard from './SensorGroupsCard';
import {
  makeFakeSensorGroupServer,
  wireFakeServer,
  type FakeSensorGroupServer,
} from '@/app/lib/fakeSensorGroupServer';

let server: FakeSensorGroupServer;

const renderCard = async () => {
  const utils = render(
    <ChakraProvider>
      <SensorGroupsCard />
    </ChakraProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId('sensor-groups-card')).toBeInTheDocument()
  );
  return utils;
};

beforeEach(() => {
  localStorage.clear();
  mockGet.mockReset();
  mockPost.mockReset();
  mockPatch.mockReset();
  mockDelete.mockReset();
  server = makeFakeSensorGroupServer();
  wireFakeServer(server, { mockGet, mockPost, mockPatch, mockDelete });
});

describe('SensorGroupsCard', () => {
  it('renders one collapsible section per account group, expanded by default', async () => {
    server.seedGroup('Serre A', [
      { device_id: 10, sensor_key: 'soil_temperature' },
    ]);
    await renderCard();

    const header = screen.getByRole('button', { name: /Serre A/ });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Température sol')).toBeInTheDocument();
    expect(screen.getByText('Zone 5')).toBeInTheDocument();
  });

  it('collapses and re-expands a group on click', async () => {
    server.seedGroup('Serre A', [
      { device_id: 10, sensor_key: 'soil_temperature' },
    ]);
    await renderCard();

    const header = screen.getByRole('button', { name: /Serre A/ });
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Température sol')).not.toBeInTheDocument();

    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Température sol')).toBeInTheDocument();
  });

  it('keeps ungrouped sensors reachable in their own collapsed section', async () => {
    server.seedGroup('Serre A', [
      { device_id: 10, sensor_key: 'soil_temperature' },
    ]);
    await renderCard();

    const ungrouped = screen.getByRole('button', {
      name: new RegExp(frMessages.sensorGroups.ungrouped),
    });
    expect(ungrouped).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Humidité sol')).not.toBeInTheDocument();

    fireEvent.click(ungrouped);
    // Everything not in a group — nothing the farmer owns disappears.
    expect(screen.getByText('Humidité sol')).toBeInTheDocument();
    expect(screen.getByText('pH sol')).toBeInTheDocument();
  });

  it('lists a sensor under BOTH groups holding it, and not as ungrouped', async () => {
    server.seedGroup('Serre A', [
      { device_id: 10, sensor_key: 'soil_temperature' },
    ]);
    server.seedGroup('Irrigation', [
      { device_id: 10, sensor_key: 'soil_temperature' },
    ]);
    await renderCard();

    expect(screen.getAllByText('Température sol')).toHaveLength(2);
    // The sensor lives in both groups: under each it shows a compact "also in
    // 1 other" badge (the group names move into the tile tooltip). #127.
    expect(screen.getAllByText('+1')).toHaveLength(2);

    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(frMessages.sensorGroups.ungrouped),
      })
    );
    // Still exactly two — the ungrouped bucket did not pick it up again.
    expect(screen.getAllByText('Température sol')).toHaveLength(2);
  });

  it('reads the grouping from the account, not from this device', async () => {
    localStorage.setItem(
      'sensorGroupsV1',
      JSON.stringify([
        { id: 'g_1', name: 'Groupe local', sensorKeys: ['soil_temperature'] },
      ])
    );
    server.seedGroup('Serre A', []);
    await renderCard();

    expect(mockGet).toHaveBeenCalledWith('/sensor-groups');
    expect(screen.getByRole('button', { name: /Serre A/ })).toBeInTheDocument();
    expect(screen.queryByText('Groupe local')).not.toBeInTheDocument();
  });

  it('says grouping is unavailable when the migration is missing, and still lists the sensors', async () => {
    server.degraded = true;
    await renderCard();

    expect(screen.getByTestId('sensor-groups-unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(frMessages.sensorGroups.unavailableBody)
    ).toBeInTheDocument();
    // No empty "no groups" pretence, and the sensors are still listed.
    expect(
      screen.queryByText(frMessages.sensorGroups.empty)
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(frMessages.sensorGroups.ungrouped),
      })
    );
    expect(screen.getByText('Température sol')).toBeInTheDocument();
  });
});
