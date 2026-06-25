'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@chakra-ui/react';
import {
  App,
  Button,
  Empty,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslations } from 'next-intl';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { alertApi, type AlertRecord } from '@agri/api-client/alertApi';
import {
  ALERT_CHOICES,
  CONDITION_CHOICES,
  DEFAULT_SENSOR_KEYS,
  type SensorKeyOption,
} from '@/app/utils/alertChoices';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import {
  MobileRecordCards,
  type RecordCard,
} from '@/app/components/common/MobileRecordCards';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import AlertCreateDrawer from './AlertCreateDrawer';
import styles from './AlertMain.module.scss';

const AlertMain: React.FC = () => {
  const t = useTranslations();
  const { message } = App.useApp();
  const isMobile = useIsMobile();

  const conditionLabel = (c: string) => {
    const choice = CONDITION_CHOICES.find((cc) => cc.value === c);
    return choice ? t(`conditions.${choice.i18nKey}`) : c;
  };

  const typeLabel = (type: string) => {
    const choice = ALERT_CHOICES.find((c) => c.value === type);
    return choice ? t(`alertTypes.${choice.i18nKey}`) : type;
  };
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sensorKeys, setSensorKeys] =
    useState<SensorKeyOption[]>(DEFAULT_SENSOR_KEYS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AlertRecord | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await alertApi.list();
      setAlerts(data);
    } catch {
      message.error(t('alertsPage.main.loadError'));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
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
        /* keep DEFAULT_SENSOR_KEYS */
      });
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (alert: AlertRecord) => {
    setEditing(alert);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: number) => {
    try {
      await alertApi.remove(id);
      message.success(t('alertsPage.main.deleteSuccess'));
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      message.error(t('alertsPage.main.deleteError'));
    }
  };

  const handleToggleActive = async (alert: AlertRecord) => {
    try {
      const updated = await alertApi.update(alert.id, {
        is_active: !alert.is_active,
      });
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      message.error(t('alertsPage.main.toggleError'));
    }
  };

  const columns: ColumnsType<AlertRecord> = useMemo(
    () => [
      {
        title: t('alertsPage.main.columnName'),
        dataIndex: 'name',
        key: 'name',
        render: (text: string, row) => (
          <Space size={8}>
            <strong>{text}</strong>
            {row.last_triggered_at && (
              <Tag color="red" className={styles.triggeredTag}>
                {t('alertsPage.main.recentlyTriggered')}
              </Tag>
            )}
          </Space>
        ),
      },
      {
        title: t('alertsPage.main.columnSensor'),
        dataIndex: 'sensor_key',
        key: 'sensor_key',
        render: (key: string) =>
          key && t.has(`sensors.${key}`)
            ? t(`sensors.${key}`)
            : (sensorKeys.find((s) => s.key === key)?.label ?? key ?? '—'),
      },
      {
        title: t('alertsPage.main.columnCategory'),
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => <Tag>{typeLabel(type)}</Tag>,
      },
      {
        title: t('alertsPage.main.columnCondition'),
        key: 'condition',
        render: (_, row) => (
          <span>
            {conditionLabel(row.condition)}{' '}
            <strong>{row.threshold ?? row.condition_nbr}</strong>{' '}
            <span className={styles.thresholdHint}>
              {sensorKeys.find((s) => s.key === row.sensor_key)?.unit ?? ''}
            </span>
          </span>
        ),
      },
      {
        title: t('alertsPage.main.columnActive'),
        dataIndex: 'is_active',
        key: 'is_active',
        render: (on: boolean, row) => (
          <Tooltip
            title={
              on
                ? t('alertsPage.main.deactivate')
                : t('alertsPage.main.activate')
            }
          >
            <Tag
              color={on ? 'green' : 'default'}
              onClick={() => handleToggleActive(row)}
              style={{ cursor: 'pointer' }}
            >
              {on ? t('alertsPage.main.yes') : t('alertsPage.main.no')}
            </Tag>
          </Tooltip>
        ),
      },
      {
        title: t('alertsPage.main.columnActions'),
        key: 'actions',
        align: 'right',
        render: (_, row) => (
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => openEdit(row)}
              aria-label={t('alertsPage.main.editAria', { name: row.name })}
            >
              {t('alertsPage.main.edit')}
            </Button>
            <Popconfirm
              title={t('alertsPage.main.deleteConfirm')}
              okText={t('alertsPage.main.delete')}
              cancelText={t('alertsPage.main.cancel')}
              onConfirm={() => handleDelete(row.id)}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                aria-label={t('alertsPage.main.deleteAria', { name: row.name })}
              >
                {t('alertsPage.main.delete')}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sensorKeys, t]
  );

  const sensorLabel = useCallback(
    (key: string) =>
      key && t.has(`sensors.${key}`)
        ? t(`sensors.${key}`)
        : (sensorKeys.find((s) => s.key === key)?.label ?? key ?? '—'),
    [sensorKeys, t]
  );

  const mobileCards: RecordCard[] = useMemo(
    () =>
      alerts.map((row) => ({
        key: row.id,
        title: (
          <Space size={8} wrap>
            <span>{row.name}</span>
            {row.last_triggered_at && (
              <Tag color="red" className={styles.triggeredTag}>
                {t('alertsPage.main.recentlyTriggered')}
              </Tag>
            )}
          </Space>
        ),
        fields: [
          {
            label: t('alertsPage.main.columnSensor'),
            value: sensorLabel(row.sensor_key),
          },
          {
            label: t('alertsPage.main.columnCategory'),
            value: <Tag>{typeLabel(row.type)}</Tag>,
          },
          {
            label: t('alertsPage.main.columnCondition'),
            value: (
              <span>
                {conditionLabel(row.condition)}{' '}
                <strong>{row.threshold ?? row.condition_nbr}</strong>{' '}
                {sensorKeys.find((s) => s.key === row.sensor_key)?.unit ?? ''}
              </span>
            ),
          },
          {
            label: t('alertsPage.main.columnActive'),
            value: (
              <Tag
                color={row.is_active ? 'green' : 'default'}
                onClick={() => handleToggleActive(row)}
                style={{ cursor: 'pointer', marginInlineEnd: 0 }}
              >
                {row.is_active
                  ? t('alertsPage.main.yes')
                  : t('alertsPage.main.no')}
              </Tag>
            ),
          },
        ],
        footer: (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(row)}
              aria-label={t('alertsPage.main.editAria', { name: row.name })}
            >
              {t('alertsPage.main.edit')}
            </Button>
            <Popconfirm
              title={t('alertsPage.main.deleteConfirm')}
              okText={t('alertsPage.main.delete')}
              cancelText={t('alertsPage.main.cancel')}
              onConfirm={() => handleDelete(row.id)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={t('alertsPage.main.deleteAria', { name: row.name })}
              >
                {t('alertsPage.main.delete')}
              </Button>
            </Popconfirm>
          </Space>
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alerts, sensorKeys, t, sensorLabel]
  );

  return (
    <Box
      px={{ base: 3, md: 4 }}
      py={{ base: 3, md: 4 }}
      data-testid="alert-main"
    >
      <PageInfoBar
        title={t('alertsPage.main.pageTitle')}
        subtitle={t('alertsPage.main.pageSubtitle')}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            data-testid="alert-create-button"
          >
            {t('alertsPage.main.newAlert')}
          </Button>
        }
      />

      <Box
        bg="app.surface"
        borderWidth="1px"
        borderColor="app.border"
        borderRadius="lg"
        px={{ base: 3, md: 4 }}
        py={{ base: 3, md: 4 }}
        minW={0}
      >
        {isMobile && !loading && alerts.length > 0 ? (
          <MobileRecordCards cards={mobileCards} />
        ) : (
          <Table<AlertRecord>
            rowKey="id"
            columns={columns}
            dataSource={alerts}
            loading={loading}
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('alertsPage.main.emptyText')}
                />
              ),
            }}
          />
        )}
      </Box>

      <AlertCreateDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        editing={editing}
        onSaved={() => {
          closeDrawer();
          void fetchAlerts();
        }}
      />
    </Box>
  );
};

export default AlertMain;
