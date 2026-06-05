'use client';

import React, { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  type FormInstance,
} from 'antd';
import type { AlertRecord, AlertWritePayload } from '@/app/lib/alertApi';
import {
  ALERT_CHOICES,
  CONDITION_CHOICES,
  DEFAULT_SENSOR_KEYS,
  type SensorKeyOption,
} from '@/app/utils/alertChoices';
import styles from './AlertMain.module.scss';

export interface AlertFormValues {
  name: string;
  type: string;
  description?: string;
  sensor_key: string;
  zone?: number | null;
  condition: '>' | '<' | '=';
  condition_nbr: number;
  is_active: boolean;
}

export interface AlertFormProps {
  form: FormInstance<AlertFormValues>;
  initial?: AlertRecord | null;
  sensorKeys: SensorKeyOption[];
  zones?: { id: number; name: string }[];
  onSubmit: (payload: AlertWritePayload) => Promise<void> | void;
}

const toFormValues = (alert: AlertRecord): AlertFormValues => ({
  name: alert.name,
  type: alert.type,
  description: alert.description ?? '',
  sensor_key: alert.sensor_key || 'temperature_weather',
  zone: alert.zone ?? null,
  condition: alert.condition,
  condition_nbr:
    alert.threshold ??
    (typeof alert.condition_nbr === 'string'
      ? Number(alert.condition_nbr)
      : Number(alert.condition_nbr ?? 0)),
  is_active: alert.is_active ?? true,
});

const DEFAULT_VALUES: AlertFormValues = {
  name: '',
  type: 'Weather Temperature',
  description: '',
  sensor_key: 'temperature_weather',
  zone: null,
  condition: '>',
  condition_nbr: 30,
  is_active: true,
};

const AlertForm: React.FC<AlertFormProps> = ({
  form,
  initial,
  sensorKeys,
  zones = [],
  onSubmit,
}) => {
  const t = useTranslations();
  useEffect(() => {
    if (initial) {
      form.setFieldsValue(toFormValues(initial));
    } else {
      form.setFieldsValue(DEFAULT_VALUES);
    }
  }, [initial, form]);

  const sensorOptions = useMemo(() => {
    const list = sensorKeys.length > 0 ? sensorKeys : DEFAULT_SENSOR_KEYS;
    return list.map((s) => {
      const name = t.has(`sensors.${s.key}`) ? t(`sensors.${s.key}`) : s.label;
      return {
        value: s.key,
        label: `${name} (${s.unit})`,
      };
    });
  }, [sensorKeys, t]);

  const handleFinish = (values: AlertFormValues) => {
    const payload: AlertWritePayload = {
      name: values.name.trim(),
      type: values.type,
      description: (values.description ?? '').trim(),
      condition: values.condition,
      condition_nbr: Number(values.condition_nbr),
      sensor_key: values.sensor_key,
      zone: values.zone ?? null,
      is_active: values.is_active ?? true,
    };
    return onSubmit(payload);
  };

  return (
    <Form<AlertFormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={DEFAULT_VALUES}
      onFinish={handleFinish}
      data-testid="alert-form"
    >
      <Form.Item
        name="name"
        label={
          <span className={styles.label}>{t('alertsPage.form.name')}</span>
        }
        rules={[{ required: true, message: t('alertsPage.form.nameRequired') }]}
      >
        <Input
          className={styles.input}
          placeholder={t('alertsPage.form.namePlaceholder')}
          maxLength={200}
        />
      </Form.Item>

      <Form.Item
        name="type"
        label={
          <span className={styles.label}>{t('alertsPage.form.category')}</span>
        }
        rules={[{ required: true }]}
      >
        <Select
          options={ALERT_CHOICES.map((c) => ({
            value: c.value,
            label: t(`alertTypes.${c.i18nKey}`),
          }))}
        />
      </Form.Item>

      <Form.Item
        name="sensor_key"
        label={
          <span className={styles.label}>{t('alertsPage.form.sensor')}</span>
        }
        tooltip={t('alertsPage.form.sensorTooltip')}
        rules={[
          { required: true, message: t('alertsPage.form.sensorRequired') },
        ]}
      >
        <Select options={sensorOptions} showSearch optionFilterProp="label" />
      </Form.Item>

      {zones.length > 0 && (
        <Form.Item
          name="zone"
          label={
            <span className={styles.label}>{t('alertsPage.form.zone')}</span>
          }
        >
          <Select
            allowClear
            placeholder={t('alertsPage.form.zonePlaceholder')}
            options={zones.map((z) => ({ value: z.id, label: z.name }))}
          />
        </Form.Item>
      )}

      <Form.Item
        label={
          <span className={styles.label}>{t('alertsPage.form.condition')}</span>
        }
        required
      >
        <Space.Compact block>
          <Form.Item name="condition" noStyle rules={[{ required: true }]}>
            <Select
              style={{ width: 140 }}
              options={CONDITION_CHOICES.map((c) => ({
                value: c.value,
                label: t(`conditions.${c.i18nKey}`),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="condition_nbr"
            noStyle
            rules={[
              {
                required: true,
                message: t('alertsPage.form.thresholdRequired'),
                type: 'number',
              },
            ]}
          >
            <InputNumber
              className={styles.input}
              style={{ width: 140 }}
              step={0.1}
              placeholder={t('alertsPage.form.thresholdPlaceholder')}
            />
          </Form.Item>
        </Space.Compact>
        <div className={styles.thresholdHint}>
          {t('alertsPage.form.thresholdHint')}
        </div>
      </Form.Item>

      <Form.Item
        name="description"
        label={
          <span className={styles.label}>
            {t('alertsPage.form.description')}
          </span>
        }
      >
        <Input.TextArea
          className={styles.input}
          rows={3}
          maxLength={400}
          showCount
        />
      </Form.Item>

      <Form.Item
        name="is_active"
        label={
          <span className={styles.label}>{t('alertsPage.form.active')}</span>
        }
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
    </Form>
  );
};

export default AlertForm;
