/**
 * Behaviour tests for AlertForm.
 *
 * We test the contract — what the form *does* when the user submits —
 * not the rendering. Specifically:
 *   1. Submitting valid values calls onSubmit with the normalised payload.
 *   2. Editing an existing alert pre-fills the form via setFieldsValue.
 *   3. Description trimming happens at submit time (server is happy).
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Form, App as AntdApp } from 'antd';
import AlertForm, { type AlertFormValues } from './AlertForm';
import type { AlertRecord } from '@/app/lib/alertApi';

const SENSOR_KEYS = [
  { key: 'temperature_weather', label: 'Air', unit: '°C' },
  { key: 'soil_moisture_medium', label: 'Sol', unit: '%' },
];

function FormHost({
  initial,
  onSubmit,
  expose,
}: {
  initial?: AlertRecord | null;
  onSubmit: (p: unknown) => void;
  expose: (form: ReturnType<typeof Form.useForm<AlertFormValues>>[0]) => void;
}) {
  const [form] = Form.useForm<AlertFormValues>();
  React.useEffect(() => {
    expose(form);
  }, [form, expose]);
  return (
    <AntdApp>
      <AlertForm
        form={form}
        initial={initial ?? null}
        sensorKeys={SENSOR_KEYS}
        onSubmit={onSubmit}
      />
    </AntdApp>
  );
}

describe('AlertForm', () => {
  it('submits the normalised payload', async () => {
    let formRef: ReturnType<typeof Form.useForm<AlertFormValues>>[0] | null =
      null;
    const onSubmit = jest.fn();
    render(
      <FormHost
        onSubmit={onSubmit}
        expose={(f) => {
          formRef = f;
        }}
      />
    );
    await waitFor(() => expect(formRef).not.toBeNull());

    formRef!.setFieldsValue({
      name: '   Heat   ',
      type: 'Weather Temperature',
      description: '  hot zone  ',
      sensor_key: 'temperature_weather',
      zone: null,
      condition: '>',
      condition_nbr: 30.5,
      is_active: true,
    });
    await formRef!.submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Heat',
      type: 'Weather Temperature',
      description: 'hot zone',
      condition: '>',
      condition_nbr: 30.5,
      sensor_key: 'temperature_weather',
      zone: null,
      is_active: true,
    });
  });

  it('rejects an empty name (validation runs before onSubmit)', async () => {
    let formRef: ReturnType<typeof Form.useForm<AlertFormValues>>[0] | null =
      null;
    const onSubmit = jest.fn();
    render(
      <FormHost
        onSubmit={onSubmit}
        expose={(f) => {
          formRef = f;
        }}
      />
    );
    await waitFor(() => expect(formRef).not.toBeNull());

    formRef!.setFieldsValue({
      name: '',
      type: 'Weather Temperature',
      sensor_key: 'temperature_weather',
      zone: null,
      condition: '>',
      condition_nbr: 30,
      is_active: true,
    });

    await expect(formRef!.validateFields()).rejects.toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('pre-fills the form when editing an existing alert', async () => {
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
    let formRef: ReturnType<typeof Form.useForm<AlertFormValues>>[0] | null =
      null;
    render(
      <FormHost
        initial={initial}
        onSubmit={() => {}}
        expose={(f) => {
          formRef = f;
        }}
      />
    );
    await waitFor(() => expect(formRef).not.toBeNull());
    await waitFor(() => {
      expect(formRef!.getFieldValue('name')).toBe('Existing');
    });
    expect(formRef!.getFieldValue('sensor_key')).toBe('soil_moisture_medium');
    expect(formRef!.getFieldValue('condition')).toBe('<');
    expect(formRef!.getFieldValue('condition_nbr')).toBe(20);
    expect(formRef!.getFieldValue('is_active')).toBe(false);
  });
});
