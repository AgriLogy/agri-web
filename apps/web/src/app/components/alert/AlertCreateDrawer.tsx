'use client';

/**
 * Reusable alert create/edit Drawer.
 *
 * Drop it next to any chart, sensor card, or list view; mount it once
 * with `open={…}` controlled state. Used by both the sensor "last
 * value" cards (inline, never navigates) and by the /alerts page
 * (Nouvelle alerte / Modifier).
 *
 * When `sensorKey` is provided the drawer hits /alerts/suggest on
 * open and prefills the form with mean-based defaults so the user only
 * has to nudge the threshold.
 */

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { App, Button, Drawer, Form, Space } from 'antd';
import {
  alertApi,
  type AlertRecord,
  type AlertWritePayload,
} from '@agri/api-client/alertApi';
import {
  DEFAULT_SENSOR_KEYS,
  type SensorKeyOption,
} from '@/app/utils/alertChoices';
import api from '@agri/api-client/api';
import { notificationZoneApi } from '@agri/api-client/notificationZoneApi';
import { userProfileApi } from '@agri/api-client/userProfileApi';
import AlertForm, { type AlertFormValues } from './AlertForm';

export interface AlertCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select a sensor (and optionally a zone) and prefill the form
   *  from /alerts/suggest. Ignored when `editing` is set. */
  sensorKey?: string;
  zoneId?: number;
  /** When set, the drawer becomes an "edit" drawer for that alert. */
  editing?: AlertRecord | null;
  /** Called after a successful create / update so the parent can
   *  refresh its alert list (or anything else). */
  onSaved?: () => void;
}

const AlertCreateDrawer: React.FC<AlertCreateDrawerProps> = ({
  open,
  onClose,
  sensorKey,
  zoneId,
  editing = null,
  onSaved,
}) => {
  const t = useTranslations();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<AlertFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [sensorKeys, setSensorKeys] =
    useState<SensorKeyOption[]>(DEFAULT_SENSOR_KEYS);
  const [zones, setZones] = useState<{ id: number; name: string }[]>([]);
  const [notificationZones, setNotificationZones] = useState<
    { id: number; name: string }[]
  >([]);
  const [defaultContact, setDefaultContact] = useState<{
    phone?: string;
    email?: string;
  }>({});

  // Lazy-load the registry + the zone list once the drawer first opens.
  useEffect(() => {
    if (!open) return;
    void userProfileApi
      .get()
      .then((p) => setDefaultContact({ phone: p.phone_number, email: p.email }))
      .catch(() => {});
    void alertApi
      .sensorKeys()
      .then((keys) => {
        if (Array.isArray(keys) && keys.length > 0) {
          setSensorKeys(
            keys.map((k) => ({ key: k.key, label: k.label, unit: k.unit }))
          );
        }
      })
      .catch(() => {
        /* fall back to defaults */
      });
    void api
      .get<{ id: number; name: string }[]>('/zones')
      .then((r) => {
        if (Array.isArray(r.data)) setZones(r.data);
      })
      .catch(() => {});
    void notificationZoneApi
      .list()
      .then((list) => {
        if (Array.isArray(list)) {
          setNotificationZones(list.map((z) => ({ id: z.id, name: z.name })));
        }
      })
      .catch(() => {});
  }, [open]);

  // Prefill on open: either edit-mode (uses AlertForm's own initial
  // logic) or create-mode with a sensorKey hint.
  useEffect(() => {
    if (!open) return;
    if (editing) return; // AlertForm handles edit-mode prefill itself.
    if (!sensorKey) {
      form.resetFields();
      return;
    }
    form.resetFields();
    void alertApi
      .suggest({
        sensor_key: sensorKey,
        ...(zoneId ? { zone_id: zoneId } : {}),
      })
      .then((suggestion) => {
        form.setFieldsValue({
          name: suggestion.name,
          type: suggestion.type,
          description: suggestion.description,
          sensor_key: suggestion.sensor_key,
          condition: suggestion.condition,
          condition_nbr: suggestion.condition_nbr,
          is_active: suggestion.is_active,
          ...(zoneId ? { zone: zoneId } : {}),
        });
        if (suggestion.sample_size === 0) {
          message.info(t('alertsPage.createDrawer.noRecentReadings'));
        }
      })
      .catch(() => {
        form.setFieldsValue({
          sensor_key: sensorKey,
          ...(zoneId ? { zone: zoneId } : {}),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sensorKey, zoneId, editing]);

  const close = () => {
    if (submitting) return;
    if (!editing && form.isFieldsTouched()) {
      modal.confirm({
        title: t('alertsPage.createDrawer.discardTitle'),
        okText: t('alertsPage.createDrawer.discardOk'),
        cancelText: t('alertsPage.createDrawer.discardCancel'),
        onOk: () => {
          form.resetFields();
          onClose();
        },
      });
      return;
    }
    form.resetFields();
    onClose();
  };

  const handleSubmit = async (payload: AlertWritePayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await alertApi.update(editing.id, payload);
        message.success(t('alertsPage.createDrawer.updateSuccess'));
      } else {
        await alertApi.create(payload);
        message.success(t('alertsPage.createDrawer.createSuccess'));
      }
      form.resetFields();
      onClose();
      onSaved?.();
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: Record<string, unknown> };
        message?: string;
      };
      const data = e?.response?.data;
      const detail =
        (data &&
          typeof data === 'object' &&
          Object.values(data).flat().filter(Boolean).map(String).join(' · ')) ||
        e?.message ||
        t('alertsPage.createDrawer.saveError');
      message.error(detail);
      console.error('alert save failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={
        editing
          ? t('alertsPage.createDrawer.editTitle')
          : t('alertsPage.createDrawer.newTitle')
      }
      size="default"
      open={open}
      onClose={close}
      destroyOnHidden
      footer={
        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={close} disabled={submitting}>
            {t('alertsPage.createDrawer.cancel')}
          </Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={() => form.submit()}
            data-testid="alert-submit-button"
          >
            {editing
              ? t('alertsPage.createDrawer.update')
              : t('alertsPage.createDrawer.create')}
          </Button>
        </Space>
      }
    >
      <AlertForm
        form={form}
        initial={editing}
        sensorKeys={sensorKeys}
        zones={zones}
        notificationZones={notificationZones}
        defaultContact={defaultContact}
        onSubmit={handleSubmit}
      />
    </Drawer>
  );
};

export default AlertCreateDrawer;
