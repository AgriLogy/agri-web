/**
 * Integration tests for Réglages → "Groupes de capteurs" (agri-web #95).
 *
 * The component is driven for real; only the HTTP layer is faked, by a tiny
 * in-memory stand-in for `/sensor-groups` that behaves like agri-api — so the
 * whole chain (component → sensorGroupApi → axios) is exercised, including the
 * degraded mode where the agri-db migration `f4b6d2e8c1a9` is not applied.
 *
 * What these prove, concretely: reverting persistence to `localStorage` breaks
 * every one of them, because each asserts on a REQUEST reaching the account
 * endpoint, not on stored state.
 */

import React from 'react';
import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

import SensorGroupsSettings from './SensorGroupsSettings';
import {
  makeFakeSensorGroupServer,
  wireFakeServer,
  type FakeSensorGroupServer,
} from '@/app/lib/fakeSensorGroupServer';

let server: FakeSensorGroupServer;

const renderSettings = async () => {
  const utils = render(
    <ChakraProvider>
      <SensorGroupsSettings />
    </ChakraProvider>
  );
  await waitFor(() =>
    expect(
      screen.queryByText(frMessages.common.loading)
    ).not.toBeInTheDocument()
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

describe('SensorGroupsSettings — account persistence', () => {
  it('lists the groups the ACCOUNT holds (a fresh browser still sees them)', async () => {
    server.seedGroup('Serre A', [
      { device_id: 10, sensor_key: 'soil_temperature' },
    ]);
    await renderSettings();

    expect(mockGet).toHaveBeenCalledWith('/sensor-groups');
    expect(screen.getByDisplayValue('Serre A')).toBeInTheDocument();
    expect(screen.getByText('Température sol')).toBeInTheDocument();
    // Nothing was read from this device's storage.
    expect(localStorage.getItem('sensorGroupsV1')).toBeNull();
  });

  it('creates a group through POST /sensor-groups', async () => {
    await renderSettings();

    fireEvent.change(
      screen.getByPlaceholderText(
        frMessages.settings.groups.newNamePlaceholder
      ),
      { target: { value: 'Irrigation' } }
    );
    await act(async () => {
      fireEvent.click(
        screen.getByText(frMessages.settings.groups.createButton)
      );
    });

    expect(mockPost).toHaveBeenCalledWith('/sensor-groups', {
      name: 'Irrigation',
    });
    await waitFor(() =>
      expect(screen.getByDisplayValue('Irrigation')).toBeInTheDocument()
    );
  });

  it('renames a group through PATCH /sensor-groups/{id}', async () => {
    const group = server.seedGroup('Serre A', []);
    await renderSettings();

    const nameInput = screen.getByDisplayValue('Serre A');
    fireEvent.change(nameInput, { target: { value: 'Serre B' } });
    await act(async () => {
      fireEvent.blur(nameInput);
    });

    expect(mockPatch).toHaveBeenCalledWith(`/sensor-groups/${group.id}`, {
      name: 'Serre B',
    });
    await waitFor(() =>
      expect(screen.getByDisplayValue('Serre B')).toBeInTheDocument()
    );
  });

  it('deletes a group through DELETE /sensor-groups/{id}', async () => {
    const group = server.seedGroup('Serre A', []);
    await renderSettings();

    await act(async () => {
      fireEvent.click(
        screen.getByLabelText(frMessages.settings.groups.deleteGroupAria)
      );
    });

    expect(mockDelete).toHaveBeenCalledWith(`/sensor-groups/${group.id}`);
    await waitFor(() =>
      expect(screen.queryByDisplayValue('Serre A')).not.toBeInTheDocument()
    );
  });

  it('adds a sensor as the (device_id, sensor_key) pair the API keys on', async () => {
    const group = server.seedGroup('Serre A', []);
    await renderSettings();

    await act(async () => {
      fireEvent.change(
        screen.getByLabelText(frMessages.settings.groups.addSensorOption),
        { target: { value: '10:soil_moisture' } }
      );
    });

    expect(mockPost).toHaveBeenCalledWith(
      `/sensor-groups/${group.id}/sensors`,
      {
        device_id: 10,
        sensor_key: 'soil_moisture',
        zone_id: 5,
      }
    );
    await waitFor(() =>
      expect(screen.getByText('Humidité sol')).toBeInTheDocument()
    );
  });

  it('moves a sensor between groups: added to the target, dropped from the source', async () => {
    const source = server.seedGroup('Serre A', [
      { device_id: 10, sensor_key: 'soil_temperature' },
    ]);
    const target = server.seedGroup('Irrigation', []);
    const membershipId = source.sensors[0].id;
    await renderSettings();

    await act(async () => {
      fireEvent.change(
        screen.getAllByLabelText(frMessages.settings.groups.moveAria)[0],
        { target: { value: String(target.id) } }
      );
    });

    expect(mockPost).toHaveBeenCalledWith(
      `/sensor-groups/${target.id}/sensors`,
      {
        device_id: 10,
        sensor_key: 'soil_temperature',
        zone_id: 5,
      }
    );
    expect(mockDelete).toHaveBeenCalledWith(
      `/sensor-groups/${source.id}/sensors/${membershipId}`
    );
  });

  it('keeps a sensor visible in BOTH groups it belongs to', async () => {
    server.seedGroup('Serre A', [
      { device_id: 10, sensor_key: 'soil_temperature' },
    ]);
    server.seedGroup('Irrigation', [
      { device_id: 10, sensor_key: 'soil_temperature' },
    ]);
    await renderSettings();

    expect(screen.getAllByText('Température sol')).toHaveLength(2);
    // Each row names the other group it also belongs to.
    expect(screen.getByText('Aussi dans : Irrigation')).toBeInTheDocument();
    expect(screen.getByText('Aussi dans : Serre A')).toBeInTheDocument();
  });
});

describe('SensorGroupsSettings — degraded schema', () => {
  it('says grouping is unavailable instead of inviting a doomed creation', async () => {
    server.degraded = true;
    await renderSettings();

    // The honest state, detected from the API's own refusal…
    expect(screen.getByTestId('groups-unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(frMessages.settings.groups.unavailableBody)
    ).toBeInTheDocument();
    // …not the "you have no groups yet" invitation.
    expect(
      screen.queryByText(frMessages.settings.groups.emptyGroups)
    ).not.toBeInTheDocument();
    // …and the create path is closed rather than failing on submit.
    expect(
      screen.getByPlaceholderText(frMessages.settings.groups.newNamePlaceholder)
    ).toBeDisabled();
  });

  it('flips to the degraded state when a write comes back naming the migration', async () => {
    await renderSettings();
    expect(screen.queryByTestId('groups-unavailable')).not.toBeInTheDocument();

    server.degraded = true; // the migration is rolled back under our feet
    fireEvent.change(
      screen.getByPlaceholderText(
        frMessages.settings.groups.newNamePlaceholder
      ),
      { target: { value: 'Irrigation' } }
    );
    await act(async () => {
      fireEvent.click(
        screen.getByText(frMessages.settings.groups.createButton)
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId('groups-unavailable')).toBeInTheDocument()
    );
  });
});

describe('SensorGroupsSettings — legacy device-local groups', () => {
  const legacy = [
    { id: 'g_1', name: 'Ancien groupe', sensorKeys: ['soil_moisture'] },
  ];

  it('offers a one-time import and creates the group on the account', async () => {
    localStorage.setItem('sensorGroupsV1', JSON.stringify(legacy));
    await renderSettings();

    expect(screen.getByTestId('groups-import-offer')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(
        screen.getByText(frMessages.settings.groups.importButton)
      );
    });

    expect(mockPost).toHaveBeenCalledWith('/sensor-groups', {
      name: 'Ancien groupe',
    });
    await waitFor(() =>
      expect(screen.getByDisplayValue('Ancien groupe')).toBeInTheDocument()
    );
    // The user's local data is kept, only the offer is marked as answered.
    expect(localStorage.getItem('sensorGroupsV1')).not.toBeNull();
    expect(localStorage.getItem('sensorGroupsV1.imported')).toContain(
      'imported'
    );
  });

  it('dismissing keeps the local data and never nags again', async () => {
    localStorage.setItem('sensorGroupsV1', JSON.stringify(legacy));
    await renderSettings();

    fireEvent.click(screen.getByText(frMessages.settings.groups.importDismiss));

    await waitFor(() =>
      expect(
        screen.queryByTestId('groups-import-offer')
      ).not.toBeInTheDocument()
    );
    expect(mockPost).not.toHaveBeenCalled();
    expect(localStorage.getItem('sensorGroupsV1')).not.toBeNull();
    expect(localStorage.getItem('sensorGroupsV1.imported')).toContain(
      'dismissed'
    );
  });

  it('does not offer the import when grouping is unavailable', async () => {
    localStorage.setItem('sensorGroupsV1', JSON.stringify(legacy));
    server.degraded = true;
    await renderSettings();

    expect(screen.queryByTestId('groups-import-offer')).not.toBeInTheDocument();
  });
});
