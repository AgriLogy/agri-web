'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  App,
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import {
  adminDeviceApi,
  type AdminDevice,
  type AdminDeviceWritePayload,
  type DeviceType,
} from '@agri/api-client/adminDeviceApi';
import { adminZoneApi, type AdminZone } from '@agri/api-client/adminZoneApi';

const DEVICE_TYPES: DeviceType[] = ['dragon', 'lora', 'bivocom'];

type FormValues = {
  device_type: DeviceType;
  serial: string;
  name?: string;
  username: string;
  zone_id?: number | null;
  is_active: boolean;
};

const DevicesMain: React.FC = () => {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDevice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [zones, setZones] = useState<AdminZone[]>([]);

  const refresh = () => {
    setLoading(true);
    adminDeviceApi
      .list()
      .then(setDevices)
      .catch(() => message.error(t('admin.devices.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadZonesFor = (username?: string) => {
    if (!username) {
      setZones([]);
      return;
    }
    adminZoneApi
      .list(username)
      .then(setZones)
      .catch(() => setZones([]));
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ device_type: 'lora', is_active: true });
    setZones([]);
    setDrawerOpen(true);
  };

  const openEdit = (d: AdminDevice) => {
    setEditing(d);
    form.setFieldsValue({
      device_type: d.device_type,
      serial: d.serial,
      name: d.name,
      username: d.user ?? '',
      zone_id: d.zone,
      is_active: d.is_active,
    });
    loadZonesFor(d.user ?? undefined);
    setDrawerOpen(true);
  };

  const submit = async (values: FormValues) => {
    setSubmitting(true);
    const payload: AdminDeviceWritePayload = {
      device_type: values.device_type,
      serial: values.serial.trim(),
      name: (values.name ?? '').trim(),
      username: values.username.trim(),
      zone_id: values.zone_id ?? null,
      is_active: values.is_active,
    };
    try {
      if (editing) {
        await adminDeviceApi.update(editing.id, payload);
        message.success(t('admin.devices.updated'));
      } else {
        await adminDeviceApi.create(payload);
        message.success(t('admin.devices.created'));
      }
      setDrawerOpen(false);
      refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      message.error(detail || t('admin.devices.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await adminDeviceApi.remove(id);
      message.success(t('admin.devices.deleted'));
      refresh();
    } catch {
      message.error(t('admin.devices.saveError'));
    }
  };

  const columns = [
    {
      title: t('admin.devices.col.type'),
      dataIndex: 'device_type',
      render: (v: DeviceType) => <Tag color="blue">{v}</Tag>,
    },
    { title: t('admin.devices.col.serial'), dataIndex: 'serial' },
    { title: t('admin.devices.col.name'), dataIndex: 'name' },
    { title: t('admin.devices.col.owner'), dataIndex: 'user' },
    {
      title: t('admin.devices.col.zone'),
      dataIndex: 'zone',
      render: (z: number | null) => z ?? '—',
    },
    {
      title: t('admin.devices.col.status'),
      dataIndex: 'is_active',
      render: (a: boolean) => (
        <Tag color={a ? 'green' : 'red'}>
          {a ? t('admin.devices.active') : t('admin.devices.inactive')}
        </Tag>
      ),
    },
    {
      title: t('admin.devices.col.actions'),
      key: 'actions',
      render: (_: unknown, row: AdminDevice) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>
            {t('admin.devices.edit')}
          </Button>
          <Popconfirm
            title={t('admin.devices.confirmDelete')}
            onConfirm={() => remove(row.id)}
          >
            <Button size="small" danger>
              {t('admin.devices.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <PageInfoBar
        title={t('admin.devices.title')}
        subtitle={t('admin.devices.subtitle')}
      />
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={openCreate}>
          {t('admin.devices.register')}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={devices}
        columns={columns}
        pagination={{ pageSize: 20 }}
        scroll={{ x: true }}
      />

      <Drawer
        title={
          editing ? t('admin.devices.editTitle') : t('admin.devices.newTitle')
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDrawerOpen(false)} disabled={submitting}>
              {t('admin.devices.cancel')}
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => form.submit()}
            >
              {editing ? t('admin.devices.update') : t('admin.devices.create')}
            </Button>
          </Space>
        }
      >
        <Form<FormValues> form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            name="device_type"
            label={t('admin.devices.col.type')}
            rules={[{ required: true }]}
          >
            <Select
              options={DEVICE_TYPES.map((d) => ({ value: d, label: d }))}
            />
          </Form.Item>
          <Form.Item
            name="serial"
            label={t('admin.devices.serialLabel')}
            rules={[{ required: true }]}
          >
            <Input placeholder={t('admin.devices.serialPlaceholder')} />
          </Form.Item>
          <Form.Item name="name" label={t('admin.devices.col.name')}>
            <Input />
          </Form.Item>
          <Form.Item
            name="username"
            label={t('admin.devices.ownerLabel')}
            rules={[{ required: true }]}
          >
            <Input
              onBlur={(e) => loadZonesFor(e.target.value.trim())}
              placeholder={t('admin.devices.ownerPlaceholder')}
            />
          </Form.Item>
          <Form.Item name="zone_id" label={t('admin.devices.zoneLabel')}>
            <Select
              allowClear
              placeholder={t('admin.devices.zonePlaceholder')}
              options={zones.map((z) => ({
                value: z.id,
                label: `${z.name} (#${z.id})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="is_active"
            label={t('admin.devices.activeLabel')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default DevicesMain;
