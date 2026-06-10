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
  notify_email: boolean;
  notify_whatsapp: boolean;
  notify_sms: boolean;
  override_phone?: string;
  override_email?: string;
}

export interface AlertFormProps {
  form: FormInstance<AlertFormValues>;
  initial?: AlertRecord | null;
  sensorKeys: SensorKeyOption[];
  zones?: { id: number; name: string }[];
  /** The user's default contact, shown as placeholders for the overrides. */
  defaultContact?: { phone?: string; email?: string };
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
  notify_email: alert.notify_email ?? true,
  notify_whatsapp: alert.notify_whatsapp ?? false,
  notify_sms: alert.notify_sms ?? false,
  override_phone: alert.override_phone ?? '',
  override_email: alert.override_email ?? '',
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
  notify_email: true,
  notify_whatsapp: false,
  notify_sms: false,
  override_phone: '',
  override_email: '',
};

const AlertForm: React.FC<AlertFormProps> = ({
  form,
  initial,
  sensorKeys,
  zones = [],
  defaultContact,
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
      notify_email: values.notify_email ?? true,
      notify_whatsapp: values.notify_whatsapp ?? false,
      notify_sms: values.notify_sms ?? false,
      override_phone: (values.override_phone ?? '').trim() || null,
      override_email: (values.override_email ?? '').trim() || null,
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
        label={
          <span className={styles.label}>{t('alertsPage.form.channels')}</span>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Form.Item name="notify_email" noStyle valuePropName="checked">
              <Switch size="small" />
            </Form.Item>
            <span>{t('alertsPage.form.channelEmail')}</span>
          </Space>
          <Space>
            <Form.Item name="notify_whatsapp" noStyle valuePropName="checked">
              <Switch size="small" />
            </Form.Item>
            <span>{t('alertsPage.form.channelWhatsapp')}</span>
          </Space>
          <Space>
            <Form.Item name="notify_sms" noStyle valuePropName="checked">
              <Switch size="small" />
            </Form.Item>
            <span>{t('alertsPage.form.channelSms')}</span>
          </Space>
        </Space>
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prev, cur) =>
          prev.notify_whatsapp !== cur.notify_whatsapp ||
          prev.notify_sms !== cur.notify_sms ||
          prev.notify_email !== cur.notify_email
        }
      >
        {({ getFieldValue }) => {
          const phoneChannels =
            getFieldValue('notify_whatsapp') || getFieldValue('notify_sms');
          const emailChannel = getFieldValue('notify_email');
          if (!phoneChannels && !emailChannel) return null;
          return (
            <>
              {phoneChannels && (
                <Form.Item
                  name="override_phone"
                  label={
                    <span className={styles.label}>
                      {t('alertsPage.form.overridePhone')}
                    </span>
                  }
                  tooltip={t('alertsPage.form.overridePhoneHint')}
                >
                  <Input
                    className={styles.input}
                    placeholder={
                      defaultContact?.phone ||
                      t('alertsPage.form.overridePhonePlaceholder')
                    }
                  />
                </Form.Item>
              )}
              {emailChannel && (
                <Form.Item
                  name="override_email"
                  label={
                    <span className={styles.label}>
                      {t('alertsPage.form.overrideEmail')}
                    </span>
                  }
                  tooltip={t('alertsPage.form.overridePhoneHint')}
                >
                  <Input
                    className={styles.input}
                    placeholder={
                      defaultContact?.email ||
                      t('alertsPage.form.overrideEmailPlaceholder')
                    }
                  />
                </Form.Item>
              )}
            </>
          );
        }}
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
