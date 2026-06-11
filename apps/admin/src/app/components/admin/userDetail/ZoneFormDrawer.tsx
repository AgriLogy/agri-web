'use client';

import { App, Form, InputNumber, Input, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { AdminEntityDrawer } from '@/app/components/admin/_shared/AdminEntityDrawer';
import {
  adminZoneApi,
  type AdminZone,
  type AdminZoneCreatePayload,
  type AdminZonePatchPayload,
} from '@agri/api-client/adminZoneApi';

type FormValues = {
  name: string;
  space: number;
  critical_moisture_threshold: number;
  pomp_flow_rate: number;
  irrigation_water_quantity: number;
  soil_param_TAW: number;
  soil_param_FC: number;
  soil_param_WP: number;
  soil_param_RAW: number;
};

const toFormValues = (zone?: AdminZone | null): FormValues => ({
  name: zone?.name ?? '',
  space: zone?.space ?? 1000,
  critical_moisture_threshold: zone?.critical_moisture_threshold ?? 20,
  pomp_flow_rate: zone?.pomp_flow_rate ?? 1,
  irrigation_water_quantity: zone?.irrigation_water_quantity ?? 100,
  soil_param_TAW: zone?.soil_param_TAW ?? 50,
  soil_param_FC: zone?.soil_param_FC ?? 50,
  soil_param_WP: zone?.soil_param_WP ?? 50,
  soil_param_RAW: zone?.soil_param_RAW ?? 50,
});

export type ZoneFormDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (zone: AdminZone) => void;
  username: string;
  editing?: AdminZone | null;
};

export function ZoneFormDrawer({
  open,
  onClose,
  onSaved,
  username,
  editing,
}: ZoneFormDrawerProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(toFormValues(editing));
    }
  }, [editing, form, open]);

  const handleSubmit = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const payload: AdminZonePatchPayload = values;
        const saved = await adminZoneApi.update(username, editing.id, payload);
        message.success(t('admin.zoneForm.updateSuccess'));
        onSaved(saved);
      } else {
        const payload: AdminZoneCreatePayload = values;
        const saved = await adminZoneApi.create(username, payload);
        message.success(t('admin.zoneForm.createSuccess'));
        onSaved(saved);
      }
      form.resetFields();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: Record<string, unknown> } })
        ?.response?.data;
      const text = detail
        ? Object.entries(detail)
            .map(
              ([k, v]) =>
                `${k}: ${Array.isArray(v) ? v.join(' · ') : String(v)}`
            )
            .join(' · ')
        : t('admin.zoneForm.saveError');
      message.error(text);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminEntityDrawer
      open={open}
      onClose={() => {
        if (submitting) return;
        form.resetFields();
        onClose();
      }}
      onSubmit={handleSubmit}
      title={
        editing
          ? t('admin.zoneForm.editTitle', { name: editing.name })
          : t('admin.zoneForm.newTitle')
      }
      submitting={submitting}
      submitLabel={
        editing ? t('admin.zoneForm.update') : t('admin.zoneForm.create')
      }
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={toFormValues(editing)}
        onFinish={handleSubmit}
      >
        <Tabs
          items={[
            {
              key: 'general',
              label: t('admin.zoneForm.tab.general'),
              children: (
                <>
                  <Form.Item
                    label={t('admin.zoneForm.field.name')}
                    name="name"
                    rules={[
                      {
                        required: true,
                        message: t('admin.zoneForm.validation.required'),
                      },
                    ]}
                  >
                    <Input autoComplete="off" />
                  </Form.Item>
                  <Form.Item
                    label={t('admin.zoneForm.field.space')}
                    name="space"
                    rules={[
                      { required: true },
                      {
                        type: 'number',
                        min: 0.0001,
                        message: t('admin.zoneForm.validation.positive'),
                      },
                    ]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label={t('admin.zoneForm.field.criticalMoisture')}
                    name="critical_moisture_threshold"
                    rules={[
                      { required: true },
                      {
                        type: 'number',
                        min: 0,
                        max: 100,
                        message: t('admin.zoneForm.validation.range0to100'),
                      },
                    ]}
                  >
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'irrigation',
              label: t('admin.zoneForm.tab.irrigation'),
              children: (
                <>
                  <Form.Item
                    label={t('admin.zoneForm.field.pompFlowRate')}
                    name="pomp_flow_rate"
                    rules={[
                      { required: true },
                      {
                        type: 'number',
                        min: 0,
                        message: t('admin.zoneForm.validation.nonNegative'),
                      },
                    ]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label={t('admin.zoneForm.field.irrigationWaterQuantity')}
                    name="irrigation_water_quantity"
                    rules={[
                      {
                        type: 'number',
                        min: 0,
                        message: t('admin.zoneForm.validation.nonNegative'),
                      },
                    ]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'soil',
              label: t('admin.zoneForm.tab.soil'),
              children: (
                <>
                  <Form.Item
                    label={t('admin.zoneForm.field.taw')}
                    name="soil_param_TAW"
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label={t('admin.zoneForm.field.fc')}
                    name="soil_param_FC"
                  >
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label={t('admin.zoneForm.field.wp')}
                    name="soil_param_WP"
                  >
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label={t('admin.zoneForm.field.raw')}
                    name="soil_param_RAW"
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
      </Form>
    </AdminEntityDrawer>
  );
}

export default ZoneFormDrawer;
