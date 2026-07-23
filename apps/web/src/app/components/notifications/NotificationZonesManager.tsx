'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import {
  emitNotificationZonesUpdated,
  notificationZoneApi,
  type AvailableZoneSensors,
  type NotificationZone,
} from '@agri/api-client/notificationZoneApi';
import { useCan } from '@/app/hooks/useAccessLevel';
import { PermissionGate } from '@/app/components/common/PermissionGate';

interface ZoneFormValues {
  name: string;
  description?: string;
  is_active: boolean;
  /** Encoded `${zone_id}:${sensor_key}` pairs from the available-sensors list. */
  sensors: string[];
}

const encode = (zoneId: number, sensorKey: string) => `${zoneId}:${sensorKey}`;
const decode = (token: string): { source_zone: number; sensor_key: string } => {
  const [zoneId, ...rest] = token.split(':');
  return { source_zone: Number(zoneId), sensor_key: rest.join(':') };
};

const NotificationZonesManager: React.FC = () => {
  const t = useTranslations();
  const { message } = App.useApp();
  const { canEdit, canDelete } = useCan();
  const [zones, setZones] = useState<NotificationZone[]>([]);
  const [available, setAvailable] = useState<AvailableZoneSensors[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationZone | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ZoneFormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, avail] = await Promise.all([
        notificationZoneApi.list(),
        notificationZoneApi.availableSensors(),
      ]);
      setZones(Array.isArray(list) ? list : []);
      setAvailable(Array.isArray(avail) ? avail : []);
    } catch {
      message.error(t('notificationZones.loadError'));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const sensorOptions = useMemo(
    () =>
      available.flatMap((z) =>
        z.sensors.map((s) => ({
          value: encode(z.zone_id, s.sensor_key),
          label: `${z.zone_name} · ${s.label ?? s.sensor_key}${
            s.unit ? ` (${s.unit})` : ''
          }`,
        }))
      ),
    [available]
  );

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      name: '',
      description: '',
      is_active: true,
      sensors: [],
    });
    setModalOpen(true);
  };

  const openEdit = (zone: NotificationZone) => {
    setEditing(zone);
    form.setFieldsValue({
      name: zone.name,
      description: zone.description,
      is_active: zone.is_active,
      sensors: zone.sensors
        .filter((s) => s.source_zone != null)
        .map((s) => encode(s.source_zone as number, s.sensor_key)),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: (values.description ?? '').trim(),
        is_active: values.is_active,
        sensors: (values.sensors ?? []).map(decode),
      };
      if (editing) {
        await notificationZoneApi.update(editing.id, payload);
        message.success(t('notificationZones.updated'));
      } else {
        await notificationZoneApi.create(payload);
        message.success(t('notificationZones.created'));
      }
      setModalOpen(false);
      emitNotificationZonesUpdated();
      await load();
    } catch {
      message.error(t('notificationZones.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zone: NotificationZone) => {
    try {
      await notificationZoneApi.remove(zone.id);
      message.success(t('notificationZones.deleted'));
      emitNotificationZonesUpdated();
      await load();
    } catch {
      message.error(t('notificationZones.saveError'));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 16 }}>
          {t('notificationZones.title')}
        </span>
        <PermissionGate
          blocked={!canEdit}
          reason={t('access.editRequiresEditor')}
          ui="antd"
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('notificationZones.create')}
          </Button>
        </PermissionGate>
      </Space>

      {zones.length === 0 ? (
        <Empty description={t('notificationZones.empty')} />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {zones.map((zone) => (
            <Card
              key={zone.id}
              size="small"
              title={
                <Space>
                  {zone.name}
                  {!zone.is_active && (
                    <Tag color="default">{t('notificationZones.inactive')}</Tag>
                  )}
                </Space>
              }
              extra={
                <Space>
                  <PermissionGate
                    blocked={!canEdit}
                    reason={t('access.editRequiresEditor')}
                    ui="antd"
                  >
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(zone)}
                      aria-label={t('notificationZones.editTitle')}
                    />
                  </PermissionGate>
                  <Popconfirm
                    title={t('notificationZones.confirmDelete')}
                    disabled={!canDelete}
                    onConfirm={() => handleDelete(zone)}
                  >
                    <PermissionGate
                      blocked={!canDelete}
                      reason={t('access.deleteRequiresAdmin')}
                      ui="antd"
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={t('notificationZones.confirmDelete')}
                      />
                    </PermissionGate>
                  </Popconfirm>
                </Space>
              }
            >
              {zone.description && (
                <p style={{ marginTop: 0, color: 'rgba(0,0,0,0.55)' }}>
                  {zone.description}
                </p>
              )}
              <Space wrap>
                {zone.sensors.length === 0 ? (
                  <span style={{ color: 'rgba(0,0,0,0.45)' }}>
                    {t('notificationZones.noSensors')}
                  </span>
                ) : (
                  zone.sensors.map((s) => (
                    <Tag key={s.id} color="blue">
                      {s.label ?? s.sensor_key}
                    </Tag>
                  ))
                )}
              </Space>
            </Card>
          ))}
        </Space>
      )}

      <Modal
        open={modalOpen}
        title={
          editing
            ? t('notificationZones.editTitle')
            : t('notificationZones.create')
        }
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t('notificationZones.save')}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('notificationZones.name')}
            rules={[{ required: true }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item
            name="description"
            label={t('notificationZones.description')}
          >
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Form.Item
            name="sensors"
            label={t('notificationZones.sensors')}
            tooltip={t('notificationZones.sensorsHint')}
          >
            <Select
              mode="multiple"
              allowClear
              options={sensorOptions}
              placeholder={t('notificationZones.sensorsPlaceholder')}
              optionFilterProp="label"
              notFoundContent={t('notificationZones.noAvailableSensors')}
            />
          </Form.Item>
          <Form.Item
            name="is_active"
            label={t('notificationZones.active')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationZonesManager;
