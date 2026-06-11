'use client';

import { App, Button, Empty, Form, InputNumber, Select, Space } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  adminZoneApi,
  type AdminZone,
  type AdminZoneParams,
} from '@agri/api-client/adminZoneApi';
import {
  adminSensorUnitsApi,
  type SensorUnitsMap,
} from '@agri/api-client/adminSensorUnitsApi';

type ParamsFormValues = {
  soil_param_TAW: number;
  soil_param_FC: number;
  soil_param_WP: number;
  soil_param_RAW: number;
  critical_moisture_threshold: number;
  pomp_flow_rate: number;
  irrigation_water_quantity: number;
  basin_max_depth_m?: number | null;
  basin_area_m2?: number | null;
  sensor_mount_offset_m?: number | null;
};

const SENSOR_UNIT_FAMILIES: Array<{
  sensor_key: string;
  i18nKey: string;
  options: string[];
}> = [
  {
    sensor_key: 'temperature_weather',
    i18nKey: 'sensors.temperature_weather',
    options: ['°C', '°F'],
  },
  {
    sensor_key: 'soil_temperature',
    i18nKey: 'sensors.soil_temperature',
    options: ['°C', '°F'],
  },
  {
    sensor_key: 'wind_speed',
    i18nKey: 'sensors.wind_speed',
    options: ['m/s', 'km/h', 'mph'],
  },
  {
    sensor_key: 'precipitation_rate',
    i18nKey: 'sensors.precipitation_rate',
    options: ['mm/h', 'mm/jour'],
  },
  {
    sensor_key: 'soil_moisture_medium',
    i18nKey: 'sensors.soil_moisture_medium',
    options: ['%', 'm³/m³'],
  },
  {
    sensor_key: 'water_flow',
    i18nKey: 'sensors.water_flow',
    options: ['L/s', 'L/min', 'm³/h'],
  },
];

export type ParamsTabProps = { username: string };

export function ParamsTab({ username }: ParamsTabProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [params, setParams] = useState<AdminZoneParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingParams, setSavingParams] = useState(false);

  const [units, setUnits] = useState<SensorUnitsMap>({});
  const [savingUnits, setSavingUnits] = useState(false);

  const [form] = Form.useForm<ParamsFormValues>();

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const [zoneList, unitsMap] = await Promise.all([
        adminZoneApi.list(username),
        adminSensorUnitsApi.get(username),
      ]);
      setZones(zoneList);
      setUnits(unitsMap);
      if (zoneList.length > 0) {
        setZoneId(zoneList[0].id);
      }
    } catch {
      message.error(t('admin.params.loadError'));
    } finally {
      setLoading(false);
    }
  }, [message, t, username]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  useEffect(() => {
    const loadParams = async () => {
      if (zoneId === null) return;
      try {
        const data = await adminZoneApi.params.get(username, zoneId);
        setParams(data);
        form.setFieldsValue({
          soil_param_TAW: data.soil_param_TAW,
          soil_param_FC: data.soil_param_FC,
          soil_param_WP: data.soil_param_WP,
          soil_param_RAW: data.soil_param_RAW,
          critical_moisture_threshold: data.critical_moisture_threshold,
          pomp_flow_rate: data.pomp_flow_rate,
          irrigation_water_quantity: data.irrigation_water_quantity,
          basin_max_depth_m: data.basin_max_depth_m,
          basin_area_m2: data.basin_area_m2,
          sensor_mount_offset_m: data.sensor_mount_offset_m,
        });
      } catch {
        message.error(t('admin.params.readError'));
      }
    };
    void loadParams();
  }, [form, message, t, username, zoneId]);

  const handleSaveParams = async (values: ParamsFormValues) => {
    if (zoneId === null) return;
    setSavingParams(true);
    try {
      const updated = await adminZoneApi.params.update(
        username,
        zoneId,
        values
      );
      setParams(updated);
      message.success(t('admin.params.saveSuccess'));
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: Record<string, unknown> } })
        ?.response?.data;
      const text = detail
        ? Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' · ') : v}`)
            .join(' · ')
        : t('admin.params.saveError');
      message.error(text);
    } finally {
      setSavingParams(false);
    }
  };

  const handleUnitChange = async (sensorKey: string, unit: string) => {
    setSavingUnits(true);
    const next = { ...units, [sensorKey]: unit };
    setUnits(next);
    try {
      const updated = await adminSensorUnitsApi.patch(username, {
        [sensorKey]: unit,
      });
      setUnits((prev) => ({ ...prev, ...updated }));
      message.success(t('admin.params.unitSaveSuccess'));
    } catch {
      setUnits(units); // rollback
      message.error(t('admin.params.unitSaveError'));
    } finally {
      setSavingUnits(false);
    }
  };

  if (loading) return null;
  if (zones.length === 0) {
    return <Empty description={t('admin.params.noZones')} />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space>
        <span>{t('admin.params.zoneLabel')}</span>
        <Select<number>
          value={zoneId ?? undefined}
          onChange={setZoneId}
          options={zones.map((z) => ({ value: z.id, label: z.name }))}
          style={{ minWidth: 220 }}
        />
      </Space>

      <section>
        <h3 style={{ margin: '0 0 8px' }}>
          {t('admin.params.soilIrrigationTitle')}
        </h3>
        <Form<ParamsFormValues>
          form={form}
          layout="vertical"
          onFinish={handleSaveParams}
          initialValues={
            params
              ? {
                  soil_param_TAW: params.soil_param_TAW,
                  soil_param_FC: params.soil_param_FC,
                  soil_param_WP: params.soil_param_WP,
                  soil_param_RAW: params.soil_param_RAW,
                  critical_moisture_threshold:
                    params.critical_moisture_threshold,
                  pomp_flow_rate: params.pomp_flow_rate,
                  irrigation_water_quantity: params.irrigation_water_quantity,
                  basin_max_depth_m: params.basin_max_depth_m,
                  basin_area_m2: params.basin_area_m2,
                  sensor_mount_offset_m: params.sensor_mount_offset_m,
                }
              : undefined
          }
        >
          <Space.Compact block>
            <Form.Item
              name="soil_param_TAW"
              label={t('admin.params.field.taw')}
              style={{ flex: 1 }}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="soil_param_RAW"
              label={t('admin.params.field.raw')}
              style={{ flex: 1 }}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item
              name="soil_param_FC"
              label={t('admin.params.field.fc')}
              style={{ flex: 1 }}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="soil_param_WP"
              label={t('admin.params.field.wp')}
              style={{ flex: 1 }}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item
            name="critical_moisture_threshold"
            label={t('admin.params.field.criticalMoisture')}
            rules={[{ required: true }, { type: 'number', min: 0, max: 100 }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="pomp_flow_rate"
            label={t('admin.params.field.pompFlowRate')}
            rules={[{ required: true }, { type: 'number', min: 0 }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="irrigation_water_quantity"
            label={t('admin.params.field.irrigationWaterQuantity')}
            rules={[{ type: 'number', min: 0 }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <h3 style={{ margin: '12px 0 8px' }}>
            {t('admin.params.basinTitle')}
          </h3>
          <Space.Compact block>
            <Form.Item
              name="basin_max_depth_m"
              label={t('admin.params.field.basinMaxDepth')}
              style={{ flex: 1 }}
              rules={[{ type: 'number', min: 0 }]}
            >
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="basin_area_m2"
              label={t('admin.params.field.basinArea')}
              style={{ flex: 1 }}
              rules={[{ type: 'number', min: 0 }]}
            >
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item
            name="sensor_mount_offset_m"
            label={t('admin.params.field.sensorMountOffset')}
            rules={[{ type: 'number', min: 0 }]}
          >
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={savingParams}>
              {t('admin.params.save')}
            </Button>
          </Form.Item>
        </Form>
      </section>

      <section>
        <h3 style={{ margin: '0 0 8px' }}>
          {t('admin.params.preferredUnitsTitle')}
        </h3>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {SENSOR_UNIT_FAMILIES.map((family) => (
            <Space
              key={family.sensor_key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <span>{t(family.i18nKey)}</span>
              <Select
                disabled={savingUnits}
                value={units[family.sensor_key] ?? family.options[0]}
                onChange={(v) => handleUnitChange(family.sensor_key, v)}
                options={family.options.map((o) => ({ value: o, label: o }))}
                style={{ minWidth: 140 }}
              />
            </Space>
          ))}
        </Space>
      </section>
    </Space>
  );
}

export default ParamsTab;
