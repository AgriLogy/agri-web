'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  App,
  Button,
  Checkbox,
  Collapse,
  Drawer,
  Empty,
  Form,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'antd';
import api from '@/app/lib/api';
import {
  technicianApi,
  type Technician,
  type ZoneScope,
} from '@/app/lib/technicianApi';
import {
  GRAPH_SCOPE_GROUPS,
  graphKeyLabel,
} from '@/app/utils/graphScopeCatalog';

type ZoneOpt = { id: number; name: string };

const TechniciansSection: React.FC = () => {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // zoneId -> set of allowed graph keys
  const [scope, setScope] = useState<Record<number, string[]>>({});

  const refresh = () => {
    setLoading(true);
    technicianApi
      .list()
      .then(setTechnicians)
      .catch(() => message.error(t('settings.technicians.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    api
      .get<ZoneOpt[]>('/zones')
      .then((r) => setZones(r.data ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scopeFromTechnician = (techn: Technician): Record<number, string[]> => {
    const m: Record<number, string[]> = {};
    for (const s of techn.scope) m[s.zone_id] = s.allowed_graphs;
    return m;
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setScope({});
    setDrawerOpen(true);
  };

  const openEditScope = (techn: Technician) => {
    setEditing(techn);
    form.resetFields();
    setScope(scopeFromTechnician(techn));
    setDrawerOpen(true);
  };

  const toggleGraph = (zoneId: number, key: string, on: boolean) => {
    setScope((prev) => {
      const cur = new Set(prev[zoneId] ?? []);
      if (on) cur.add(key);
      else cur.delete(key);
      return { ...prev, [zoneId]: [...cur] };
    });
  };

  const buildScopePayload = (): ZoneScope[] =>
    Object.entries(scope)
      .filter(([, keys]) => keys.length > 0)
      .map(([zoneId, keys]) => ({
        zone_id: Number(zoneId),
        allowed_graphs: keys,
      }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const scopePayload = buildScopePayload();
      if (editing) {
        await technicianApi.setScope(editing.id, scopePayload);
        message.success(t('settings.technicians.scopeUpdated'));
      } else {
        const values = await form.validateFields();
        await technicianApi.create({
          username: values.username.trim(),
          password: values.password,
          firstname: values.firstname,
          lastname: values.lastname,
          scope: scopePayload,
        });
        message.success(t('settings.technicians.created'));
      }
      setDrawerOpen(false);
      refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      if (detail) message.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (id: number) => {
    try {
      await technicianApi.revoke(id);
      message.success(t('settings.technicians.revoked'));
      refresh();
    } catch {
      message.error(t('settings.technicians.saveError'));
    }
  };

  const resetPw = async (id: number) => {
    try {
      const res = await technicianApi.resetPassword(id);
      message.success(
        `${t('settings.technicians.pwReset')}: ${res.password}`,
        8
      );
    } catch {
      message.error(t('settings.technicians.saveError'));
    }
  };

  const zoneName = useMemo(() => {
    const m: Record<number, string> = {};
    for (const z of zones) m[z.id] = z.name;
    return m;
  }, [zones]);

  const columns = [
    { title: t('settings.technicians.col.username'), dataIndex: 'username' },
    {
      title: t('settings.technicians.col.zones'),
      key: 'zones',
      render: (_: unknown, row: Technician) =>
        row.scope.length === 0 ? (
          '—'
        ) : (
          <Space size={[0, 4]} wrap>
            {row.scope.map((s) => (
              <Tag key={s.zone_id}>
                {zoneName[s.zone_id] ?? `#${s.zone_id}`} (
                {s.allowed_graphs.length})
              </Tag>
            ))}
          </Space>
        ),
    },
    {
      title: t('settings.technicians.col.status'),
      dataIndex: 'is_active',
      render: (a: boolean) => (
        <Tag color={a ? 'green' : 'red'}>
          {a
            ? t('settings.technicians.active')
            : t('settings.technicians.revokedTag')}
        </Tag>
      ),
    },
    {
      title: t('settings.technicians.col.actions'),
      key: 'actions',
      render: (_: unknown, row: Technician) => (
        <Space>
          <Button size="small" onClick={() => openEditScope(row)}>
            {t('settings.technicians.editScope')}
          </Button>
          <Button size="small" onClick={() => resetPw(row.id)}>
            {t('settings.technicians.resetPw')}
          </Button>
          <Popconfirm
            title={t('settings.technicians.confirmRevoke')}
            onConfirm={() => revoke(row.id)}
          >
            <Button size="small" danger>
              {t('settings.technicians.revoke')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const scopeEditor = (
    <div>
      <p style={{ marginBottom: 8, color: '#888' }}>
        {t('settings.technicians.scopeHint')}
      </p>
      {zones.length === 0 ? (
        <Empty description={t('settings.technicians.noZones')} />
      ) : (
        <Collapse
          items={zones.map((z) => {
            const selected = new Set(scope[z.id] ?? []);
            return {
              key: String(z.id),
              label: `${z.name} (${selected.size})`,
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {GRAPH_SCOPE_GROUPS.map((group) => (
                    <div key={group.id}>
                      <strong style={{ fontSize: 12 }}>
                        {group.emoji} {t(group.titleKey)}
                      </strong>
                      <div style={{ paddingLeft: 8 }}>
                        {group.keys.map((key) => (
                          <div key={key}>
                            <Checkbox
                              checked={selected.has(key)}
                              onChange={(e) =>
                                toggleGraph(z.id, key, e.target.checked)
                              }
                            >
                              {graphKeyLabel(key)}
                            </Checkbox>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </Space>
              ),
            };
          })}
        />
      )}
    </div>
  );

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={openCreate}>
          {t('settings.technicians.add')}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={technicians}
        columns={columns}
        pagination={false}
        scroll={{ x: true }}
      />

      <Drawer
        title={
          editing
            ? t('settings.technicians.editTitle')
            : t('settings.technicians.newTitle')
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
        destroyOnHidden
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDrawerOpen(false)} disabled={submitting}>
              {t('settings.technicians.cancel')}
            </Button>
            <Button type="primary" loading={submitting} onClick={submit}>
              {editing
                ? t('settings.technicians.save')
                : t('settings.technicians.create')}
            </Button>
          </Space>
        }
      >
        {!editing && (
          <Form form={form} layout="vertical">
            <Form.Item
              name="username"
              label={t('settings.technicians.usernameLabel')}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="password"
              label={t('settings.technicians.passwordLabel')}
              rules={[{ required: true, min: 8 }]}
            >
              <Input.Password />
            </Form.Item>
            <Space style={{ width: '100%' }}>
              <Form.Item
                name="firstname"
                label={t('settings.technicians.firstnameLabel')}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="lastname"
                label={t('settings.technicians.lastnameLabel')}
              >
                <Input />
              </Form.Item>
            </Space>
          </Form>
        )}
        {scopeEditor}
      </Drawer>
    </div>
  );
};

export default TechniciansSection;
