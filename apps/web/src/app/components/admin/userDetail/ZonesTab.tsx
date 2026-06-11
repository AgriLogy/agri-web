'use client';

import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminConfirmDelete } from '@/app/components/admin/_shared/AdminConfirmDelete';
import { AdminCrudTable } from '@/app/components/admin/_shared/AdminCrudTable';
import { adminZoneApi, type AdminZone } from '@/app/lib/adminZoneApi';
import ZoneFormDrawer from './ZoneFormDrawer';

export type ZonesTabProps = {
  username: string;
};

export function ZonesTab({ username }: ZonesTabProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminZone | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminZoneApi.list(username);
      setZones(rows);
    } catch {
      message.error(t('admin.zonesTab.listError'));
    } finally {
      setLoading(false);
    }
  }, [message, username]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (zoneId: number) => {
    await adminZoneApi.remove(username, zoneId);
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
  };

  const columns = useMemo<ColumnsType<AdminZone>>(
    () => [
      {
        title: t('admin.zonesTab.colName'),
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      {
        title: t('admin.zonesTab.colSurface'),
        dataIndex: 'space',
        key: 'space',
        sorter: (a, b) => a.space - b.space,
        align: 'right',
      },
      {
        title: t('admin.zonesTab.colMoistureThreshold'),
        dataIndex: 'critical_moisture_threshold',
        key: 'critical_moisture_threshold',
        align: 'right',
      },
      {
        title: t('admin.zonesTab.colPumpFlow'),
        dataIndex: 'pomp_flow_rate',
        key: 'pomp_flow_rate',
        align: 'right',
      },
      {
        title: t('admin.zonesTab.colTAW'),
        dataIndex: 'soil_param_TAW',
        key: 'soil_param_TAW',
        align: 'right',
      },
      {
        title: t('admin.zonesTab.colActions'),
        key: 'actions',
        align: 'right',
        render: (_v, row) => (
          <Space>
            <Tooltip title={t('admin.zonesTab.edit')}>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setEditing(row);
                  setDrawerOpen(true);
                }}
                aria-label={t('admin.zonesTab.editAria', { name: row.name })}
              />
            </Tooltip>
            <AdminConfirmDelete
              title={t('admin.zonesTab.deleteConfirm', { name: row.name })}
              successMessage={t('admin.zonesTab.deleteSuccess')}
              onConfirm={() => handleDelete(row.id)}
            />
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [username, t]
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <AdminCrudTable<AdminZone>
        rowKey="id"
        columns={columns}
        data={zones}
        loading={loading}
        emptyDescription={t('admin.zonesTab.empty')}
        toolbar={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
          >
            {t('admin.zonesTab.newZone')}
          </Button>
        }
      />
      <ZoneFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={(zone) => {
          setDrawerOpen(false);
          setEditing(null);
          setZones((prev) => {
            const idx = prev.findIndex((z) => z.id === zone.id);
            if (idx === -1) return [...prev, zone];
            const next = prev.slice();
            next[idx] = zone;
            return next;
          });
        }}
        username={username}
        editing={editing}
      />
    </Space>
  );
}

export default ZonesTab;
