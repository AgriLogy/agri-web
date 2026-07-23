/**
 * Integration tests for the Zone dropdown of the "Nouvelle notification de
 * zone" form (agri-web #62 / PR #92).
 *
 * The bug: the picker was populated from `GET /zones` only — the read-only farm
 * zones — while users create their own zones on `/notification-zones`. Those
 * live in a different id space, so a zone the user had just created could never
 * be selected.
 *
 * These tests drive the real component with both endpoints mocked and assert on
 * what the user sees and what gets persisted:
 *   1. both lists show up, under their own <optgroup>;
 *   2. a zone created moments earlier appears without a reload (update event);
 *   3. selecting a notification zone saves the right notificationZoneId AND the
 *      right derived farm zoneId;
 *   4. custom zones are selectable even when the account only has the single
 *      provisioned farm zone (the regression);
 *   5. a notification zone with no sensor assigned falls back to the first farm
 *      zone.
 */

import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import frMessages from '../../../../../../packages/i18n/src/messages/fr.json';

// next-intl ships ESM that jest cannot parse; resolve keys against the real
// French catalogue so the assertions read like the UI.
jest.mock('next-intl', () => ({
  __esModule: true,
  useTranslations: () => (key: string) => {
    const parts = key.split('.');
    let node: unknown = jest.requireActual(
      '../../../../../../packages/i18n/src/messages/fr.json'
    );
    for (const p of parts) {
      if (node && typeof node === 'object' && p in (node as object)) {
        node = (node as Record<string, unknown>)[p];
      } else {
        return key;
      }
    }
    return typeof node === 'string' ? node : key;
  },
  useLocale: () => 'fr',
}));

const mockApiGet = jest.fn();
jest.mock('@agri/api-client/api', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

const mockListNotificationZones = jest.fn();
jest.mock('@agri/api-client/notificationZoneApi', () => {
  const actual = jest.requireActual('@agri/api-client/notificationZoneApi');
  return {
    ...actual,
    notificationZoneApi: {
      ...actual.notificationZoneApi,
      list: () => mockListNotificationZones(),
    },
  };
});

jest.mock('@/app/utils/fetchSensorLastValue', () => ({
  __esModule: true,
  fetchLastSensorSample: jest.fn().mockResolvedValue(null),
}));

const mockDispatchOutbound = jest.fn().mockResolvedValue(undefined);
jest.mock('@agri/api-client/notificationDispatch', () => ({
  __esModule: true,
  dispatchZoneNotificationOutbound: (...a: unknown[]) =>
    mockDispatchOutbound(...a),
}));

import ZoneNotificationConfigureForm from './ZoneNotificationConfigureForm';
import {
  emitNotificationZonesUpdated,
  type NotificationZone,
} from '@agri/api-client/notificationZoneApi';
import { getAllZoneNotificationConfigs } from '@agri/api-client/zoneNotificationConfigStorage';

const FARM_GROUP = frMessages.notifications.configForm.zoneGroupFarm;
const NOTIF_GROUP = frMessages.notifications.configForm.zoneGroupNotification;

function notifZone(
  id: number,
  name: string,
  sourceZones: (number | null)[] = [],
  is_active = true
): NotificationZone {
  return {
    id,
    name,
    description: '',
    is_active,
    user: 1,
    created_at: null,
    updated_at: null,
    sensors: sourceZones.map((source_zone, i) => ({
      id: id * 100 + i,
      sensor_key: `sensor_${i}`,
      source_zone,
      label: null,
      unit: null,
    })),
  };
}

function setup(
  farmZones: { id: number; name: string }[],
  notificationZones: NotificationZone[]
) {
  mockApiGet.mockImplementation((url: string) => {
    if (url === '/zones') return Promise.resolve({ data: farmZones });
    return Promise.resolve({ data: [] });
  });
  mockListNotificationZones.mockResolvedValue(notificationZones);
}

function renderForm(
  props: Partial<
    React.ComponentProps<typeof ZoneNotificationConfigureForm>
  > = {}
) {
  return render(
    <ChakraProvider>
      <ZoneNotificationConfigureForm onClose={() => {}} {...props} />
    </ChakraProvider>
  );
}

/** The Zone <select>, once the async zone load has settled. */
async function zoneSelect() {
  const select = await screen.findByTestId('notif-zone-select');
  return select as HTMLSelectElement;
}

function optionsUnder(select: HTMLSelectElement, groupLabel: string) {
  const group = Array.from(select.querySelectorAll('optgroup')).find(
    (g) => g.getAttribute('label') === groupLabel
  );
  if (!group) return null;
  return Array.from(group.querySelectorAll('option')).map((o) => ({
    value: o.getAttribute('value'),
    label: o.textContent,
  }));
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockDispatchOutbound.mockResolvedValue(undefined);
});

describe('ZoneNotificationConfigureForm — zone picker', () => {
  it('lists BOTH farm zones and notification zones under their own group', async () => {
    setup(
      [
        { id: 1, name: 'Parcelle Nord' },
        { id: 2, name: 'Parcelle Sud' },
      ],
      [notifZone(1, 'Mes oliviers', [2]), notifZone(7, 'Serre tomates', [1])]
    );

    renderForm();
    const select = await zoneSelect();

    expect(optionsUnder(select, FARM_GROUP)).toEqual([
      { value: 'farm:1', label: 'Parcelle Nord' },
      { value: 'farm:2', label: 'Parcelle Sud' },
    ]);
    expect(optionsUnder(select, NOTIF_GROUP)).toEqual([
      { value: 'notif:1', label: 'Mes oliviers' },
      { value: 'notif:7', label: 'Serre tomates' },
    ]);
    // Farm zone 1 and notification zone 1 coexist without clobbering each other.
    expect(select.querySelectorAll('option')).toHaveLength(4);
  });

  it('REGRESSION: custom notification zones are selectable when the account only has the provisioned farm zone', async () => {
    setup(
      [{ id: 1, name: 'Zone 1' }],
      [notifZone(2, 'Zone perso A', [1]), notifZone(3, 'Zone perso B', [1])]
    );

    renderForm();
    const select = await zoneSelect();

    // Before the fix the dropdown held only the pre-existing farm zone.
    expect(screen.getByRole('option', { name: 'Zone perso A' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Zone perso B' })).toBeDefined();
    expect(optionsUnder(select, NOTIF_GROUP)).toEqual([
      { value: 'notif:2', label: 'Zone perso A' },
      { value: 'notif:3', label: 'Zone perso B' },
    ]);

    fireEvent.change(select, { target: { value: 'notif:3' } });
    await waitFor(() => expect(select.value).toBe('notif:3'));
  });

  it('hides notification zones the user deactivated', async () => {
    setup(
      [{ id: 1, name: 'Zone 1' }],
      [notifZone(2, 'Active', [1]), notifZone(3, 'Archivee', [1], false)]
    );

    const select = (renderForm(), await zoneSelect());
    expect(optionsUnder(select, NOTIF_GROUP)).toEqual([
      { value: 'notif:2', label: 'Active' },
    ]);
  });

  it('shows a zone created moments earlier without a reload', async () => {
    setup([{ id: 1, name: 'Zone 1' }], []);

    renderForm();
    const select = await zoneSelect();
    expect(optionsUnder(select, NOTIF_GROUP)).toBeNull();

    // The manager page created a zone and broadcast the change.
    mockListNotificationZones.mockResolvedValue([
      notifZone(11, 'Zone toute neuve', [1]),
    ]);
    await act(async () => {
      emitNotificationZonesUpdated();
    });

    await waitFor(() =>
      expect(optionsUnder(select, NOTIF_GROUP)).toEqual([
        { value: 'notif:11', label: 'Zone toute neuve' },
      ])
    );
  });

  it('saves the picked notification zone with the derived farm zoneId', async () => {
    setup(
      [
        { id: 1, name: 'Parcelle Nord' },
        { id: 2, name: 'Parcelle Sud' },
      ],
      [notifZone(5, 'Mes oliviers', [2])]
    );

    renderForm();
    const select = await zoneSelect();

    fireEvent.change(select, { target: { value: 'notif:5' } });
    fireEvent.change(screen.getByTestId('notif-name-input'), {
      target: { value: 'Arrosage oliviers' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('zone-config-save'));
    });

    await waitFor(() =>
      expect(getAllZoneNotificationConfigs()).toHaveLength(1)
    );
    const saved = getAllZoneNotificationConfigs()[0];
    expect(saved.notificationZoneId).toBe(5);
    // Sensors / outbound dispatch still resolve to the sensor's source zone.
    expect(saved.zoneId).toBe(2);
    expect(saved.notificationName).toBe('Arrosage oliviers');
  });

  it('falls back to the first farm zone for a notification zone with no sensor', async () => {
    setup(
      [
        { id: 4, name: 'Parcelle Nord' },
        { id: 8, name: 'Parcelle Sud' },
      ],
      [notifZone(6, 'Zone sans capteur')]
    );

    renderForm();
    const select = await zoneSelect();

    fireEvent.change(select, { target: { value: 'notif:6' } });
    fireEvent.change(screen.getByTestId('notif-name-input'), {
      target: { value: 'Sans capteur' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('zone-config-save'));
    });

    await waitFor(() =>
      expect(getAllZoneNotificationConfigs()).toHaveLength(1)
    );
    const saved = getAllZoneNotificationConfigs()[0];
    expect(saved.notificationZoneId).toBe(6);
    expect(saved.zoneId).toBe(4);
  });

  it('keeps saving a plain farm zone with no notificationZoneId', async () => {
    setup(
      [
        { id: 1, name: 'Parcelle Nord' },
        { id: 2, name: 'Parcelle Sud' },
      ],
      [notifZone(5, 'Mes oliviers', [2])]
    );

    renderForm();
    const select = await zoneSelect();

    fireEvent.change(select, { target: { value: 'farm:2' } });
    fireEvent.change(screen.getByTestId('notif-name-input'), {
      target: { value: 'Parcelle sud' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('zone-config-save'));
    });

    await waitFor(() =>
      expect(getAllZoneNotificationConfigs()).toHaveLength(1)
    );
    const saved = getAllZoneNotificationConfigs()[0];
    expect(saved.zoneId).toBe(2);
    expect(saved.notificationZoneId).toBeNull();
  });

  it('keeps the farm zones when the notification-zones endpoint fails', async () => {
    mockApiGet.mockImplementation((url: string) =>
      url === '/zones'
        ? Promise.resolve({ data: [{ id: 1, name: 'Parcelle Nord' }] })
        : Promise.resolve({ data: [] })
    );
    mockListNotificationZones.mockRejectedValue(new Error('boom'));

    renderForm();
    const select = await zoneSelect();
    expect(optionsUnder(select, FARM_GROUP)).toEqual([
      { value: 'farm:1', label: 'Parcelle Nord' },
    ]);
    expect(optionsUnder(select, NOTIF_GROUP)).toBeNull();
  });
});
