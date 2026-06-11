'use client';

import { EnvironmentOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Select, Space, Switch } from 'antd';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { AdminEntityDrawer } from '@/app/components/admin/_shared/AdminEntityDrawer';
import {
  adminUserApi,
  type AdminUserCreatePayload,
} from '@/app/lib/adminUserApi';

type FormValues = {
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  phone_number?: string;
  latitude?: number;
  longitude?: number;
  password: string;
  is_staff: boolean;
  payement_status: 'actif' | 'suspended';
};

export type UserCreateDrawerProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const UserCreateDrawer = ({
  open,
  onClose,
  onCreated,
}: UserCreateDrawerProps) => {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const fillLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      message.warning(t('admin.userCreate.geoUnavailable'));
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
        message.success(t('admin.userCreate.geoFilled'));
      },
      () => {
        setGeoLoading(false);
        message.error(t('admin.userCreate.geoError'));
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const handleSubmit = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    try {
      const payload: AdminUserCreatePayload = {
        username: values.username.trim(),
        email: values.email.trim(),
        firstname: values.firstname.trim(),
        lastname: values.lastname.trim(),
        phone_number: values.phone_number?.trim() || undefined,
        latitude: values.latitude,
        longitude: values.longitude,
        password: values.password,
        is_staff: values.is_staff,
        payement_status: values.payement_status,
      };
      await adminUserApi.create(payload);
      message.success(t('admin.userCreate.createSuccess'));
      form.resetFields();
      onCreated?.();
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
        : t('admin.userCreate.createError');
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
      title={t('admin.userCreate.title')}
      submitting={submitting}
      submitLabel={t('admin.userCreate.submit')}
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark
        initialValues={{
          is_staff: false,
          payement_status: 'actif',
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="username"
          label={t('admin.userCreate.field.username')}
          rules={[
            {
              required: true,
              message: t('admin.userCreate.validation.required'),
            },
            { min: 3, message: t('admin.userCreate.validation.minUsername') },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Space.Compact block>
          <Form.Item
            name="firstname"
            label={t('admin.userCreate.field.firstname')}
            style={{ flex: 1 }}
            rules={[
              {
                required: true,
                message: t('admin.userCreate.validation.required'),
              },
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="lastname"
            label={t('admin.userCreate.field.lastname')}
            style={{ flex: 1 }}
            rules={[
              {
                required: true,
                message: t('admin.userCreate.validation.required'),
              },
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>
        </Space.Compact>
        <Form.Item
          name="email"
          label={t('admin.userCreate.field.email')}
          rules={[
            {
              required: true,
              message: t('admin.userCreate.validation.required'),
            },
            { type: 'email', message: t('admin.userCreate.validation.email') },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="phone_number"
          label={t('admin.userCreate.field.phone')}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('admin.userCreate.field.password')}
          rules={[
            {
              required: true,
              message: t('admin.userCreate.validation.required'),
            },
            { min: 8, message: t('admin.userCreate.validation.minPassword') },
          ]}
          extra={t('admin.userCreate.passwordHint')}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Space.Compact block>
          <Form.Item
            name="latitude"
            label={t('admin.userCreate.field.latitude')}
            style={{ flex: 1 }}
            rules={[
              {
                type: 'number',
                min: -90,
                max: 90,
                message: t('admin.userCreate.validation.latitude'),
              },
            ]}
          >
            <Input type="number" step="any" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="longitude"
            label={t('admin.userCreate.field.longitude')}
            style={{ flex: 1 }}
            rules={[
              {
                type: 'number',
                min: -180,
                max: 180,
                message: t('admin.userCreate.validation.longitude'),
              },
            ]}
          >
            <Input type="number" step="any" autoComplete="off" />
          </Form.Item>
        </Space.Compact>
        <Form.Item>
          <Button
            icon={<EnvironmentOutlined />}
            onClick={fillLocation}
            loading={geoLoading}
          >
            {t('admin.userCreate.fillLocation')}
          </Button>
        </Form.Item>
        <Form.Item
          name="payement_status"
          label={t('admin.userCreate.field.paymentStatus')}
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: 'actif', label: t('admin.userCreate.payment.active') },
              {
                value: 'suspended',
                label: t('admin.userCreate.payment.suspended'),
              },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="is_staff"
          label={t('admin.userCreate.field.adminRole')}
          valuePropName="checked"
        >
          <Switch
            checkedChildren={t('admin.userCreate.role.admin')}
            unCheckedChildren={t('admin.userCreate.role.user')}
          />
        </Form.Item>
      </Form>
    </AdminEntityDrawer>
  );
};

export default UserCreateDrawer;
