'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@chakra-ui/react';
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { kcApi, type Kc, type ZoneOption } from '@agri/api-client/kcApi';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';

type PeriodForm = {
  period_name: string;
  range: [dayjs.Dayjs, dayjs.Dayjs];
  kc_value: number;
};
type KcForm = {
  name: string;
  plant_name: string;
  zone_id: number | null;
  periods: PeriodForm[];
};

const CropCalendarMain = () => {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm<KcForm>();

  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zoneFilter, setZoneFilter] = useState<number | undefined>(undefined);
  const [crops, setCrops] = useState<Kc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Kc | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [z, list] = await Promise.all([
        zones.length ? Promise.resolve(zones) : kcApi.listZones(),
        kcApi.list(zoneFilter),
      ]);
      if (!zones.length) setZones(z);
      setCrops(list);
    } catch {
      message.error(t('cropCalendar.loadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const zoneName = useMemo(
    () => (id: number | null) =>
      id == null ? '—' : (zones.find((z) => z.id === id)?.name ?? `#${id}`),
    [zones]
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ zone_id: zoneFilter ?? null, periods: [] });
    setDrawerOpen(true);
  };

  const openEdit = (crop: Kc) => {
    setEditing(crop);
    form.setFieldsValue({
      name: crop.name,
      plant_name: crop.plant_name,
      zone_id: crop.zone_id,
      periods: crop.periods.map((p) => ({
        period_name: p.period_name,
        range: [dayjs(p.start_date), dayjs(p.end_date)],
        kc_value: p.kc_value,
      })),
    });
    setDrawerOpen(true);
  };

  const submit = async () => {
    let values: KcForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      name: values.name,
      plant_name: values.plant_name,
      zone_id: values.zone_id ?? null,
      periods: (values.periods ?? []).map((p) => ({
        period_name: p.period_name,
        start_date: p.range[0].format('YYYY-MM-DD'),
        end_date: p.range[1].format('YYYY-MM-DD'),
        kc_value: p.kc_value,
      })),
    };
    setSaving(true);
    try {
      if (editing) await kcApi.update(editing.id, payload);
      else await kcApi.create(payload);
      message.success(t('cropCalendar.saved'));
      setDrawerOpen(false);
      await load();
    } catch {
      message.error(t('cropCalendar.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await kcApi.remove(id);
      message.success(t('cropCalendar.deleted'));
      await load();
    } catch {
      message.error(t('cropCalendar.deleteError'));
    }
  };

  const columns: ColumnsType<Kc> = [
    { title: t('cropCalendar.col.crop'), dataIndex: 'name', key: 'name' },
    {
      title: t('cropCalendar.col.plant'),
      dataIndex: 'plant_name',
      key: 'plant_name',
    },
    {
      title: t('cropCalendar.col.zone'),
      key: 'zone',
      render: (_, r) => zoneName(r.zone_id),
    },
    {
      title: t('cropCalendar.col.stages'),
      key: 'periods',
      render: (_, r) => (
        <Space size={[4, 4]} wrap>
          {r.periods.length === 0 && <Tag>{t('cropCalendar.noStages')}</Tag>}
          {r.periods.map((p) => (
            <Tag key={p.id ?? p.period_name} color="green">
              {p.period_name}: Kc {p.kc_value}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t('cropCalendar.col.actions'),
      key: 'actions',
      width: 110,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(r)}
            aria-label={t('cropCalendar.edit')}
          />
          <Popconfirm
            title={t('cropCalendar.confirmDelete')}
            onConfirm={() => remove(r.id)}
            okText={t('cropCalendar.yes')}
            cancelText={t('cropCalendar.no')}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Box>
      <PageInfoBar
        title={t('cropCalendar.title')}
        subtitle={t('cropCalendar.subtitle')}
        actions={
          <Space>
            <Select
              allowClear
              placeholder={t('cropCalendar.allZones')}
              style={{ minWidth: 160 }}
              value={zoneFilter}
              onChange={(v) => setZoneFilter(v)}
              options={zones.map((z) => ({ value: z.id, label: z.name }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t('cropCalendar.newCrop')}
            </Button>
          </Space>
        }
      />

      <Box mt={3}>
        <Table<Kc>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={crops}
          locale={{
            emptyText: <Empty description={t('cropCalendar.empty')} />,
          }}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Box>

      <Drawer
        title={editing ? t('cropCalendar.editCrop') : t('cropCalendar.newCrop')}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={460}
        extra={
          <Button type="primary" loading={saving} onClick={submit}>
            {t('cropCalendar.save')}
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('cropCalendar.field.crop')}
            rules={[{ required: true }]}
          >
            <Input placeholder={t('cropCalendar.field.cropPh')} />
          </Form.Item>
          <Form.Item
            name="plant_name"
            label={t('cropCalendar.field.plant')}
            rules={[{ required: true }]}
          >
            <Input placeholder={t('cropCalendar.field.plantPh')} />
          </Form.Item>
          <Form.Item name="zone_id" label={t('cropCalendar.field.zone')}>
            <Select
              allowClear
              placeholder={t('cropCalendar.field.zonePh')}
              options={zones.map((z) => ({ value: z.id, label: z.name }))}
            />
          </Form.Item>

          <Form.List name="periods">
            {(fields, { add, remove: rm }) => (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {fields.map(({ key, name, ...rest }) => (
                  <Space
                    key={key}
                    align="baseline"
                    wrap
                    style={{ width: '100%' }}
                  >
                    <Form.Item
                      {...rest}
                      name={[name, 'period_name']}
                      rules={[{ required: true }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input
                        placeholder={t('cropCalendar.field.stage')}
                        style={{ width: 120 }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, 'range']}
                      rules={[{ required: true }]}
                      style={{ marginBottom: 8 }}
                    >
                      <DatePicker.RangePicker />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, 'kc_value']}
                      rules={[{ required: true }]}
                      style={{ marginBottom: 8 }}
                    >
                      <InputNumber
                        min={0}
                        step={0.05}
                        placeholder="Kc"
                        style={{ width: 80 }}
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => rm(name)} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  {t('cropCalendar.addStage')}
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </Box>
  );
};

export default CropCalendarMain;
