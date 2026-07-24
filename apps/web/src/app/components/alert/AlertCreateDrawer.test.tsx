/**
 * Integration tests for the Chakra alert create/edit Drawer.
 *
 * The drawer owns the form state (via useAlertForm), so this is where the full
 * flow is proven end to end against a mocked API client:
 *   - it renders the form fields;
 *   - a missing required field blocks submit (no API call);
 *   - a valid CREATE submit posts the normalised payload to /alerts;
 *   - EDIT mode pre-fills from the passed alert and PATCHes /alerts/{id};
 *   - closing with unsaved user edits shows the discard confirm first.
 */

import React from 'react';
import '@testing-library/jest-dom';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';

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

import AlertCreateDrawer from './AlertCreateDrawer';
import type { AlertRecord } from '@agri/api-client/alertApi';

const EDITING: AlertRecord = {
  id: 9,
  name: 'Existing',
  type: 'Humidity',
  description: 'd',
  condition: '<',
  condition_nbr: '20',
  threshold: 20,
  sensor_key: 'soil_moisture_medium',
  zone: null,
  notification_zone: null,
  is_active: false,
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

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPatch.mockReset();
  mockDelete.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url === '/users/me')
      return Promise.resolve({ data: { phone_number: '', email: '' } });
    if (url === '/sensors') return Promise.resolve({ data: { keys: [] } });
    if (url === '/zones') return Promise.resolve({ data: [] });
    if (url === '/notification-zones') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
  mockPost.mockResolvedValue({ data: { id: 1 } });
  mockPatch.mockResolvedValue({ data: { id: 9 } });
});

const renderDrawer = (
  props: Partial<React.ComponentProps<typeof AlertCreateDrawer>> = {}
) => {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  const utils = render(
    <ChakraProvider>
      <AlertCreateDrawer open onClose={onClose} onSaved={onSaved} {...props} />
    </ChakraProvider>
  );
  return { onClose, onSaved, ...utils };
};

const submit = () => screen.getByTestId('alert-submit-button');

describe('AlertCreateDrawer', () => {
  it('renders the form fields', async () => {
    renderDrawer();
    expect(await screen.findByTestId('alert-form')).toBeInTheDocument();
    expect(screen.getByTestId('alert-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('alert-sensor-select')).toBeInTheDocument();
    expect(screen.getByTestId('alert-threshold-input')).toBeInTheDocument();
    expect(submit()).toBeInTheDocument();
  });

  it('blocks submit when a required field is missing', async () => {
    renderDrawer();
    await screen.findByTestId('alert-form');
    // create mode defaults the name to empty → submit must not call the API.
    fireEvent.click(submit());
    expect(
      await screen.findByText('alertsPage.form.nameRequired')
    ).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('posts the normalised payload on a valid create', async () => {
    const { onSaved } = renderDrawer();
    await screen.findByTestId('alert-form');
    fireEvent.change(screen.getByTestId('alert-name-input'), {
      target: { value: '  Canicule  ' },
    });
    fireEvent.click(submit());

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost.mock.calls[0][0]).toBe('/alerts');
    expect(mockPost.mock.calls[0][1]).toMatchObject({
      name: 'Canicule',
      type: 'Weather Temperature',
      sensor_key: 'temperature_weather',
      condition: '>',
      condition_nbr: 30,
      zone: null,
      notification_zone: null,
      is_active: true,
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('pre-fills and PATCHes in edit mode', async () => {
    renderDrawer({ editing: EDITING });
    await screen.findByTestId('alert-form');
    const nameInput = screen.getByTestId(
      'alert-name-input'
    ) as HTMLInputElement;
    await waitFor(() => expect(nameInput.value).toBe('Existing'));

    fireEvent.click(submit());
    await waitFor(() => expect(mockPatch).toHaveBeenCalled());
    expect(mockPatch.mock.calls[0][0]).toBe('/alerts/9');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows the discard confirm when closing with unsaved edits', async () => {
    const { onClose } = renderDrawer();
    await screen.findByTestId('alert-form');
    // A genuine user edit marks the form touched.
    fireEvent.change(screen.getByTestId('alert-name-input'), {
      target: { value: 'Draft' },
    });
    fireEvent.click(screen.getByText('alertsPage.createDrawer.cancel'));

    // The confirm intercepts the close — onClose has NOT fired yet.
    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText('alertsPage.createDrawer.discardTitle')
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByText('alertsPage.createDrawer.discardOk')
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
