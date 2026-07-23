/**
 * RBAC gating on a representative mutation page (agri-web #99).
 *
 * AlertMain carries the full spread of action controls — create, per-row edit,
 * per-row delete — so it is where the tiers are proven end to end: a monitor
 * still SEES the alerts (data is never gated on the client tier) but its write
 * controls are disabled; an editor may create/edit but not delete; an admin may
 * do all three. The final case proves the 403 handler turns a server refusal
 * into a readable message.
 *
 * What regresses if the `useCan` helper is bypassed: a component hard-coding a
 * tier check would let these cases pass while silently drifting from the single
 * mapping — and the monitor row here would flip from "data visible, buttons
 * off" to either hiding the data or exposing a delete that 403s on click.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { App as AntdApp } from 'antd';

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

jest.mock('@/app/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

// Drive the tier from the test, mapping through the REAL helper so this never
// duplicates the monitor/editor/admin rules it is meant to prove.
let mockLevel: 'monitor' | 'editor' | 'admin' = 'monitor';
jest.mock('@/app/hooks/useAccessLevel', () => {
  const real = jest.requireActual('@agri/api-client/accessLevel');
  return {
    useCan: () => ({
      level: mockLevel,
      loading: false,
      canEdit: real.canEdit(mockLevel),
      canDelete: real.canDelete(mockLevel),
      canManageUsers: real.canManageUsers(mockLevel),
    }),
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
  FORBIDDEN_EVENT: 'agri:forbidden',
}));

import AlertMain from './AlertMain';
import ForbiddenNotifier from '@/app/components/common/ForbiddenNotifier';
import frMessages from '../../../../../../packages/i18n/src/messages/fr.json';

const ALERT = {
  id: 7,
  name: 'Gel',
  type: 'weather',
  description: '',
  condition: '<' as const,
  condition_nbr: 2,
  threshold: 2,
  sensor_key: 'temperature_weather',
  zone: null,
  notification_zone: null,
  is_active: true,
  last_triggered_at: null,
  created_at: null,
  updated_at: null,
  user: 1,
  notify_email: true,
  notify_whatsapp: false,
  notify_sms: false,
  override_phone: null,
  override_email: null,
};

const renderPage = async () => {
  const utils = render(
    <ChakraProvider>
      <AntdApp>
        <AlertMain />
      </AntdApp>
    </ChakraProvider>
  );
  // The row (proof the data itself is NOT gated) is present for every tier.
  await waitFor(() =>
    expect(screen.getByLabelText('Modifier Gel')).toBeInTheDocument()
  );
  return utils;
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPatch.mockReset();
  mockDelete.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url === '/alerts') return Promise.resolve({ data: [ALERT] });
    if (url === '/sensors') return Promise.resolve({ data: { keys: [] } });
    return Promise.resolve({ data: [] });
  });
});

const createButton = () => screen.getByTestId('alert-create-button');
const editButton = () => screen.getByLabelText('Modifier Gel');
const deleteButton = () => screen.getByLabelText('Supprimer Gel');

describe('AlertMain — RBAC gating per tier', () => {
  it('monitor: sees the alert but every write control is disabled', async () => {
    mockLevel = 'monitor';
    await renderPage();

    // Data is visible — never gated on the client tier.
    expect(screen.getByText('Gel')).toBeInTheDocument();
    // …but nothing that mutates is usable.
    expect(createButton()).toBeDisabled();
    expect(editButton()).toBeDisabled();
    expect(deleteButton()).toBeDisabled();
  });

  it('editor: may create and edit, but not delete', async () => {
    mockLevel = 'editor';
    await renderPage();

    expect(createButton()).toBeEnabled();
    expect(editButton()).toBeEnabled();
    expect(deleteButton()).toBeDisabled();
  });

  it('admin: may create, edit and delete', async () => {
    mockLevel = 'admin';
    await renderPage();

    expect(createButton()).toBeEnabled();
    expect(editButton()).toBeEnabled();
    expect(deleteButton()).toBeEnabled();
  });
});

describe('ForbiddenNotifier — the single 403 handler', () => {
  it('turns a server 403 into a readable access message', async () => {
    render(
      <ChakraProvider>
        <AntdApp>
          <ForbiddenNotifier />
        </AntdApp>
      </ChakraProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent('agri:forbidden'));
    });

    expect(
      await screen.findByText(frMessages.access.forbiddenBody)
    ).toBeInTheDocument();
  });
});
