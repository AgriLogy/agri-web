'use client';

import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { App, Button, Input, Modal, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminCrudTable } from '@/app/components/admin/_shared/AdminCrudTable';
import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import {
  managerAffirmationApi,
  type Affirmation,
  type AffirmationStatus,
} from '@/app/lib/managerAffirmationApi';

const STATUS_COLOR: Record<AffirmationStatus, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
};

const ACTION_I18N_KEY: Record<string, string> = {
  zone_params_change: 'admin.affirmations.action.zone_params_change',
  kc_periods_change: 'admin.affirmations.action.kc_periods_change',
  user_reactivate: 'admin.affirmations.action.user_reactivate',
};

const localeTag = (locale: string): string =>
  locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR';

const formatDate = (iso: string | null, tag: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(tag);
  } catch {
    return iso;
  }
};

const AdminAffirmationsMain = () => {
  const t = useTranslations();
  const tag = localeTag(useLocale());
  const { message } = App.useApp();
  const actionLabel = (action: string) =>
    ACTION_I18N_KEY[action] ? t(ACTION_I18N_KEY[action]) : action;
  const [filter, setFilter] = useState<AffirmationStatus | 'all'>('pending');
  const [rows, setRows] = useState<Affirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await managerAffirmationApi.list(
        filter === 'all' ? undefined : filter
      );
      setRows(data);
    } catch {
      message.error(t('admin.affirmations.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filter, message, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const decide = (row: Affirmation, decision: 'approve' | 'reject') => {
    let note = '';
    Modal.confirm({
      title:
        decision === 'approve'
          ? t('admin.affirmations.approveConfirmTitle', { id: row.id })
          : t('admin.affirmations.rejectConfirmTitle', { id: row.id }),
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <span>{actionLabel(row.action)}</span>
          <Input.TextArea
            rows={2}
            placeholder={t('admin.affirmations.notePlaceholder')}
            onChange={(e) => {
              note = e.target.value;
            }}
          />
        </Space>
      ),
      okText:
        decision === 'approve'
          ? t('admin.affirmations.approve')
          : t('admin.affirmations.reject'),
      okType: decision === 'approve' ? 'primary' : 'danger',
      cancelText: t('admin.affirmations.cancel'),
      onOk: async () => {
        setBusy(row.id);
        try {
          const updated = await managerAffirmationApi.decide(
            row.id,
            decision,
            note || undefined
          );
          setRows((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r))
          );
          message.success(
            decision === 'approve'
              ? t('admin.affirmations.approveSuccess')
              : t('admin.affirmations.rejectSuccess')
          );
        } catch {
          message.error(t('admin.affirmations.actionError'));
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const columns: ColumnsType<Affirmation> = [
    {
      title: t('admin.affirmations.col.request'),
      dataIndex: 'id',
      key: 'id',
      render: (id: number, row) => (
        <Space direction="vertical" size={0}>
          <strong>#{id}</strong>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            {actionLabel(row.action)}
          </span>
        </Space>
      ),
    },
    {
      title: t('admin.affirmations.col.requester'),
      dataIndex: 'requested_by_username',
      key: 'requested_by_username',
    },
    {
      title: t('admin.affirmations.col.status'),
      dataIndex: 'status',
      key: 'status',
      render: (s: AffirmationStatus) => (
        <Tag color={STATUS_COLOR[s]}>{t(`admin.affirmations.status.${s}`)}</Tag>
      ),
    },
    {
      title: t('admin.affirmations.col.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (iso: string | null) => formatDate(iso, tag),
    },
    {
      title: t('admin.affirmations.col.decidedAt'),
      dataIndex: 'decided_at',
      key: 'decided_at',
      render: (iso: string | null) => formatDate(iso, tag),
    },
    {
      title: t('admin.affirmations.col.decidedBy'),
      dataIndex: 'decided_by_username',
      key: 'decided_by_username',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: t('admin.affirmations.col.actions'),
      key: 'actions',
      align: 'right',
      render: (_v, row) =>
        row.status === 'pending' ? (
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={busy === row.id}
              onClick={() => decide(row, 'approve')}
            >
              {t('admin.affirmations.approve')}
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              loading={busy === row.id}
              onClick={() => decide(row, 'reject')}
            >
              {t('admin.affirmations.reject')}
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar
        title={t('admin.affirmations.title')}
        subtitle={t('admin.affirmations.subtitle')}
        actions={
          <Space>
            {(['pending', 'approved', 'rejected', 'all'] as const).map(
              (key) => (
                <Button
                  key={key}
                  size="small"
                  type={filter === key ? 'primary' : 'default'}
                  onClick={() => setFilter(key)}
                >
                  {key === 'all'
                    ? t('admin.affirmations.filter.all')
                    : t(`admin.affirmations.status.${key}`)}
                </Button>
              )
            )}
          </Space>
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
        <AdminCrudTable<Affirmation>
          rowKey="id"
          columns={columns}
          data={rows}
          loading={loading}
          emptyDescription={t('admin.affirmations.empty')}
        />
      </Box>
    </Box>
  );
};

export default AdminAffirmationsMain;
