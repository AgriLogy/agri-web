'use client';

import { EnvironmentOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
} from 'antd';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  adminUserApi,
  type AdminUserDetail,
  type AdminUserPatchPayload,
} from '@agri/api-client/adminUserApi';

type FormValues = {
  email: string;
  firstname: string;
  lastname: string;
  phone_number: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_staff: boolean;
  payement_status: 'actif' | 'suspended';
  notify_every: number;
};

const toFormValues = (u: AdminUserDetail): FormValues => ({
  email: u.email,
  firstname: u.firstname,
  lastname: u.lastname,
  phone_number: u.phone_number,
  latitude: u.latitude,
  longitude: u.longitude,
  is_active: u.is_active,
  is_staff: u.is_staff,
  payement_status: (u.payement_status as 'actif' | 'suspended') ?? 'actif',
  notify_every: u.notify_every,
});

export type ProfileTabProps = {
  user: AdminUserDetail;
  onChange: (next: AdminUserDetail) => void;
};

export function ProfileTab({ user, onChange }: ProfileTabProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    form.setFieldsValue(toFormValues(user));
  }, [form, user]);

  const fillLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      message.warning(t('admin.profile.geoUnavailable'));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setFieldsValue({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        message.error(t('admin.profile.geoError'));
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload: AdminUserPatchPayload = {
        email: values.email,
        firstname: values.firstname,
        lastname: values.lastname,
        phone_number: values.phone_number,
        latitude: values.latitude,
        longitude: values.longitude,
        is_active: values.is_active,
        is_staff: values.is_staff,
        payement_status: values.payement_status,
        notify_every: values.notify_every,
      };
      const updated = await adminUserApi.update(user.username, payload);
      onChange(updated);
      message.success(t('admin.profile.saveSuccess'));
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
        : t('admin.profile.saveError');
      message.error(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      initialValues={toFormValues(user)}
      onFinish={handleSubmit}
    >
      <Form.Item
        label={t('admin.profile.field.email')}
        name="email"
        rules={[
          { required: true, message: t('admin.profile.validation.required') },
          { type: 'email', message: t('admin.profile.validation.email') },
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Space.Compact block>
        <Form.Item
          label={t('admin.profile.field.firstname')}
          name="firstname"
          style={{ flex: 1 }}
          rules={[
            { required: true, message: t('admin.profile.validation.required') },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          label={t('admin.profile.field.lastname')}
          name="lastname"
          style={{ flex: 1 }}
          rules={[
            { required: true, message: t('admin.profile.validation.required') },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
      </Space.Compact>
      <Form.Item label={t('admin.profile.field.phone')} name="phone_number">
        <Input autoComplete="off" />
      </Form.Item>
      <Space.Compact block>
        <Form.Item
          label={t('admin.profile.field.latitude')}
          name="latitude"
          style={{ flex: 1 }}
          rules={[
            {
              type: 'number',
              min: -90,
              max: 90,
              message: t('admin.profile.validation.latitude'),
            },
          ]}
        >
          <InputNumber style={{ width: '100%' }} step={0.000001} />
        </Form.Item>
        <Form.Item
          label={t('admin.profile.field.longitude')}
          name="longitude"
          style={{ flex: 1 }}
          rules={[
            {
              type: 'number',
              min: -180,
              max: 180,
              message: t('admin.profile.validation.longitude'),
            },
          ]}
        >
          <InputNumber style={{ width: '100%' }} step={0.000001} />
        </Form.Item>
      </Space.Compact>
      <Form.Item>
        <Button
          icon={<EnvironmentOutlined />}
          onClick={fillLocation}
          loading={geoLoading}
        >
          {t('admin.profile.fillLocation')}
        </Button>
      </Form.Item>

      <Space.Compact block>
        <Form.Item
          label={t('admin.profile.field.status')}
          name="is_active"
          valuePropName="checked"
          style={{ flex: 1 }}
        >
          <Switch
            checkedChildren={t('admin.profile.status.active')}
            unCheckedChildren={t('admin.profile.status.inactive')}
          />
        </Form.Item>
        <Form.Item
          label={t('admin.profile.field.adminRole')}
          name="is_staff"
          valuePropName="checked"
          style={{ flex: 1 }}
        >
          <Switch
            checkedChildren={t('admin.profile.role.admin')}
            unCheckedChildren={t('admin.profile.role.user')}
          />
        </Form.Item>
      </Space.Compact>

      <Form.Item
        label={t('admin.profile.field.payment')}
        name="payement_status"
        rules={[{ required: true }]}
      >
        <Select
          options={[
            { value: 'actif', label: t('admin.profile.payment.active') },
            { value: 'suspended', label: t('admin.profile.payment.suspended') },
          ]}
        />
      </Form.Item>

      <Form.Item
        label={t('admin.profile.field.notifyEvery')}
        name="notify_every"
        rules={[{ required: true }, { type: 'number', min: 1, max: 168 }]}
      >
        <InputNumber min={1} max={168} style={{ width: 160 }} />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          {t('admin.profile.save')}
        </Button>
      </Form.Item>
    </Form>
  );
}

export default ProfileTab;
