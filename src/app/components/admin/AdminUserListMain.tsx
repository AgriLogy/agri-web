'use client';

import {
  EditOutlined,
  PlusOutlined,
  StopOutlined,
  UnlockOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { App, Badge, Button, Space, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

import { PageInfoBar } from '@/app/components/layout/PageInfoBar';
import { AdminCrudTable } from '@/app/components/admin/_shared/AdminCrudTable';
import { adminUserApi, type AdminUserRow } from '@/app/lib/adminUserApi';
import UserCreateDrawer from './UserCreateDrawer';

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const AdminUserListMain = () => {
  const t = useTranslations();
  const { message, modal } = App.useApp();
  const router = useRouter();
  const [data, setData] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminUserApi.list();
      setData(rows);
    } catch {
      message.error(t('admin.userList.loadError'));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleToggle = useCallback(
    async (row: AdminUserRow) => {
      try {
        const updated = await adminUserApi.toggleActive(row.username);
        setData((prev) =>
          prev.map((u) =>
            u.username === row.username
              ? { ...u, is_active: updated.is_active }
              : u
          )
        );
        message.success(
          updated.is_active
            ? t('admin.userList.reactivated')
            : t('admin.userList.deactivated')
        );
      } catch {
        message.error(t('admin.userList.actionError'));
      }
    },
    [message, t]
  );

  const handleResetPassword = useCallback(
    (row: AdminUserRow) => {
      modal.confirm({
        title: t('admin.userList.resetConfirmTitle', {
          username: row.username,
        }),
        content: t('admin.userList.resetConfirmContent'),
        okText: t('admin.userList.reset'),
        cancelText: t('admin.userList.cancel'),
        onOk: async () => {
          try {
            const { password } = await adminUserApi.resetPassword(row.username);
            modal.info({
              title: t('admin.userList.newPasswordTitle'),
              content: (
                <Space direction="vertical">
                  <span>{t('admin.userList.newPasswordHint')}</span>
                  <code
                    style={{
                      background: 'rgba(0,0,0,0.06)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      userSelect: 'all',
                    }}
                  >
                    {password}
                  </code>
                </Space>
              ),
              okText: t('admin.userList.close'),
            });
          } catch {
            message.error(t('admin.userList.resetError'));
          }
        },
      });
    },
    [message, modal, t]
  );

  const columns = useMemo<ColumnsType<AdminUserRow>>(
    () => [
      {
        title: t('admin.userList.col.user'),
        dataIndex: 'username',
        key: 'username',
        sorter: (a, b) => a.username.localeCompare(b.username),
        render: (text: string, row) => (
          <Space direction="vertical" size={0}>
            <strong>{text}</strong>
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              {row.firstname} {row.lastname}
            </span>
          </Space>
        ),
      },
      {
        title: t('admin.userList.col.email'),
        dataIndex: 'email',
        key: 'email',
        sorter: (a, b) => a.email.localeCompare(b.email),
      },
      {
        title: t('admin.userList.col.role'),
        dataIndex: 'is_staff',
        key: 'is_staff',
        filters: [
          { text: t('admin.userList.role.admin'), value: true },
          { text: t('admin.userList.role.user'), value: false },
        ],
        onFilter: (val, row) => row.is_staff === val,
        render: (isStaff: boolean) =>
          isStaff ? (
            <Tag color="brand">{t('admin.userList.role.admin')}</Tag>
          ) : (
            <Tag>{t('admin.userList.role.user')}</Tag>
          ),
      },
      {
        title: t('admin.userList.col.status'),
        dataIndex: 'is_active',
        key: 'is_active',
        filters: [
          { text: t('admin.userList.status.active'), value: true },
          { text: t('admin.userList.status.inactive'), value: false },
        ],
        onFilter: (val, row) => row.is_active === val,
        render: (active: boolean) => (
          <Badge
            status={active ? 'success' : 'error'}
            text={
              active
                ? t('admin.userList.status.active')
                : t('admin.userList.status.inactive')
            }
          />
        ),
      },
      {
        title: t('admin.userList.col.payment'),
        dataIndex: 'payement_status',
        key: 'payement_status',
        render: (value: string) => (
          <Tag color={value === 'actif' ? 'green' : 'orange'}>
            {value === 'actif'
              ? t('admin.userList.payment.active')
              : value === 'suspended'
                ? t('admin.userList.payment.suspended')
                : value}
          </Tag>
        ),
      },
      {
        title: t('admin.userList.col.zones'),
        dataIndex: 'zones_count',
        key: 'zones_count',
        sorter: (a, b) => (a.zones_count ?? 0) - (b.zones_count ?? 0),
        align: 'right',
      },
      {
        title: t('admin.userList.col.joinedAt'),
        dataIndex: 'date_joined',
        key: 'date_joined',
        sorter: (a, b) => a.date_joined.localeCompare(b.date_joined),
        render: formatDate,
      },
      {
        title: t('admin.userList.col.lastLogin'),
        dataIndex: 'last_login',
        key: 'last_login',
        render: formatDate,
      },
      {
        title: t('admin.userList.col.actions'),
        key: 'actions',
        align: 'right',
        render: (_value, row) => (
          <Space>
            <Tooltip title={t('admin.userList.action.openDetail')}>
              <Button
                icon={<EditOutlined />}
                onClick={() =>
                  router.push(
                    `/admin/users/${encodeURIComponent(row.username)}`
                  )
                }
                aria-label={t('admin.userList.action.openAria', {
                  username: row.username,
                })}
              />
            </Tooltip>
            <Tooltip
              title={
                row.is_active
                  ? t('admin.userList.action.deactivate')
                  : t('admin.userList.action.reactivate')
              }
            >
              <Button
                icon={row.is_active ? <StopOutlined /> : <UserSwitchOutlined />}
                onClick={() => handleToggle(row)}
                aria-label={t('admin.userList.action.toggleAria', {
                  username: row.username,
                })}
              />
            </Tooltip>
            <Tooltip title={t('admin.userList.action.resetPassword')}>
              <Button
                icon={<UnlockOutlined />}
                onClick={() => handleResetPassword(row)}
                aria-label={t('admin.userList.action.resetAria', {
                  username: row.username,
                })}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [handleResetPassword, handleToggle, router, t]
  );

  return (
    <Box px={{ base: 3, md: 4 }} py={{ base: 3, md: 4 }}>
      <PageInfoBar
        title={t('admin.userList.title')}
        subtitle={t('admin.userList.subtitle')}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setDrawerOpen(true)}
            data-testid="admin-user-create"
          >
            {t('admin.userList.newUser')}
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
        <AdminCrudTable<AdminUserRow>
          rowKey="id"
          columns={columns}
          data={data}
          loading={loading}
          searchable
          searchKeys={['username', 'email', 'firstname', 'lastname']}
          searchPlaceholder={t('admin.userList.searchPlaceholder')}
          emptyDescription={t('admin.userList.empty')}
        />
      </Box>

      <UserCreateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setDrawerOpen(false);
          void refresh();
        }}
      />
    </Box>
  );
};

export default AdminUserListMain;
