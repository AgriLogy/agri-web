/**
 * Behaviour tests for the alert form model + the controlled AlertForm.
 *
 * Post-antd, the form is plain React state: the normalisation, validation and
 * edit-prefill logic live in pure helpers (`useAlertForm`), and AlertForm is a
 * controlled presentational component. We test the contract — what the form
 * *produces* — not the Chakra markup:
 *   1. buildAlertPayload emits the normalised (trimmed / numeric) payload.
 *   2. validateAlertForm blocks an empty name (mirrors the antd `required` rule).
 *   3. toFormValues pre-fills the editable shape from an existing alert.
 *   4. AlertForm renders the current values and reports edits via onChange.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import AlertForm from './AlertForm';
import {
  ALERT_FORM_DEFAULTS,
  buildAlertPayload,
  toFormValues,
  validateAlertForm,
  type AlertFormValues,
} from './useAlertForm';
import type { AlertRecord } from '@agri/api-client/alertApi';

const SENSOR_KEYS = [
  { key: 'temperature_weather', label: 'Air', unit: '°C' },
  { key: 'soil_moisture_medium', label: 'Sol', unit: '%' },
];

describe('alert form model', () => {
  it('builds the normalised payload (trim + numeric threshold)', () => {
    const values: AlertFormValues = {
      ...ALERT_FORM_DEFAULTS,
      name: '   Heat   ',
      type: 'Weather Temperature',
      description: '  hot zone  ',
      sensor_key: 'temperature_weather',
      zone: null,
      condition: '>',
      condition_nbr: 30.5,
      is_active: true,
    };

    expect(buildAlertPayload(values)).toEqual({
      name: 'Heat',
      type: 'Weather Temperature',
      description: 'hot zone',
      condition: '>',
      condition_nbr: 30.5,
      sensor_key: 'temperature_weather',
      zone: null,
      notification_zone: null,
      is_active: true,
      notify_email: true,
      notify_whatsapp: false,
      notify_sms: false,
      override_phone: null,
      override_email: null,
    });
  });

  it('rejects an empty name and a cleared threshold', () => {
    const named: AlertFormValues = { ...ALERT_FORM_DEFAULTS, name: 'Heat' };
    expect(validateAlertForm({ ...named, name: '' })).toEqual({
      name: 'alertsPage.form.nameRequired',
    });
    expect(validateAlertForm({ ...named, condition_nbr: '' })).toEqual({
      condition_nbr: 'alertsPage.form.thresholdRequired',
    });
    // A fully valid set (name filled, threshold present) passes clean.
    expect(validateAlertForm(named)).toEqual({});
  });

  it('pre-fills the editable shape from an existing alert', () => {
    const initial: AlertRecord = {
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

    const values = toFormValues(initial);
    expect(values.name).toBe('Existing');
    expect(values.sensor_key).toBe('soil_moisture_medium');
    expect(values.condition).toBe('<');
    expect(values.condition_nbr).toBe(20);
    expect(values.is_active).toBe(false);
  });
});

describe('AlertForm (controlled)', () => {
  it('renders the current values and reports edits via onChange', () => {
    const onChange = jest.fn();
    render(
      <ChakraProvider>
        <AlertForm
          values={{ ...ALERT_FORM_DEFAULTS, name: 'Gel' }}
          errors={{}}
          onChange={onChange}
          sensorKeys={SENSOR_KEYS}
        />
      </ChakraProvider>
    );

    const nameInput = screen.getByTestId(
      'alert-name-input'
    ) as HTMLInputElement;
    expect(nameInput.value).toBe('Gel');

    fireEvent.change(nameInput, { target: { value: 'Canicule' } });
    expect(onChange).toHaveBeenCalledWith('name', 'Canicule');
  });
});
