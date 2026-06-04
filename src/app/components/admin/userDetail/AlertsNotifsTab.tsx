'use client';

import { App, Space, Switch, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { AdminConfirmDelete } from '@/app/components/admin/_shared/AdminConfirmDelete';
import { AdminCrudTable } from '@/app/components/admin/_shared/AdminCrudTable';
import { adminAlertApi, type AdminAlertRow } from '@/app/lib/adminAlertApi';

export type AlertsNotifsTabProps = { username: string };

export function AlertsNotifsTab({ username }: AlertsNotifsTabProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [alerts, setAlerts] = useState<AdminAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminAlertApi.listForUser(username);
      setAlerts(rows);
    } catch {
      message.error(t('admin.alertsTab.loadError'));
    } finally {
      setLoading(false);
    }
  }, [message, username]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleToggle = async (row: AdminAlertRow, next: boolean) => {
    setBusy(row.id);
    try {
      const updated = await adminAlertApi.setActive(row.id, next);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === updated.id ? { ...a, is_active: updated.is_active } : a
        )
      );
    } catch {
      message.error(t('admin.alertsTab.actionError'));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: number) => {
    await adminAlertApi.remove(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const columns: ColumnsType<AdminAlertRow> = [
    {
      title: t('admin.alertsTab.colName'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, row) => (
        <Space direction="vertical" size={0}>
          <strong>{text}</strong>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            {row.sensor_key || row.type}
          </span>
        </Space>
      ),
    },
    {
      title: t('admin.alertsTab.colCondition'),
      key: 'condition',
      render: (_v, row) => (
        <span>
          {row.condition} <strong>{row.condition_nbr}</strong>
        </span>
      ),
    },
    {
      title: t('admin.alertsTab.colActive'),
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center',
      render: (active: boolean, row) => (
        <Switch
          checked={active}
          loading={busy === row.id}
          onChange={(v) => handleToggle(row, v)}
          size="small"
        />
      ),
    },
    {
      title: t('admin.alertsTab.colLastTriggered'),
      dataIndex: 'last_triggered_at',
      key: 'last_triggered_at',
      render: (iso: string | null) =>
        iso ? (
          <Tag color="red">{new Date(iso).toLocaleString('fr-FR')}</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: t('admin.alertsTab.colActions'),
      key: 'actions',
      align: 'right',
      render: (_v, row) => (
        <AdminConfirmDelete
          title={t('admin.alertsTab.deleteConfirm', { name: row.name })}
          successMessage={t('admin.alertsTab.deleteSuccess')}
          onConfirm={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <AdminCrudTable<AdminAlertRow>
      rowKey="id"
      columns={columns}
      data={alerts}
      loading={loading}
      emptyDescription={t('admin.alertsTab.empty')}
    />
  );
}

export default AlertsNotifsTab;
