'use client';

import {
  AuditOutlined,
  DashboardOutlined,
  LogoutOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { App, Menu, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useMemo } from 'react';

import useColorModeStyles from '@/app/utils/useColorModeStyles';

const AdminSidebar = () => {
  const t = useTranslations();
  const { bg } = useColorModeStyles();
  const router = useRouter();
  const pathname = usePathname() ?? '/admin';
  const { modal } = App.useApp();

  const selectedKey = useMemo(() => {
    if (pathname.startsWith('/admin/users')) return 'users';
    if (pathname.startsWith('/admin/affirmations')) return 'affirmations';
    return 'dashboard';
  }, [pathname]);

  const handleLogout = () => {
    modal.confirm({
      title: t('shell.admin.logoutConfirmTitle'),
      content: t('shell.admin.logoutConfirmBody'),
      okText: t('shell.admin.logoutConfirmOk'),
      okType: 'danger',
      cancelText: t('shell.admin.cancel'),
      onOk: () => {
        localStorage.clear();
        router.push('/login');
      },
    });
  };

  return (
    <div
      style={{
        background: bg,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Menu
        mode="inline"
        inlineCollapsed
        selectedKeys={[selectedKey]}
        style={{ borderInlineEnd: 'none', background: 'transparent' }}
        items={[
          {
            key: 'dashboard',
            icon: (
              <Tooltip title={t('shell.admin.dashboard')} placement="right">
                <DashboardOutlined />
              </Tooltip>
            ),
            onClick: () => router.push('/admin'),
          },
          {
            key: 'users',
            icon: (
              <Tooltip title={t('shell.admin.users')} placement="right">
                <TeamOutlined />
              </Tooltip>
            ),
            onClick: () => router.push('/admin/users'),
          },
          {
            key: 'affirmations',
            icon: (
              <Tooltip title={t('shell.admin.affirmations')} placement="right">
                <AuditOutlined />
              </Tooltip>
            ),
            onClick: () => router.push('/admin/affirmations'),
          },
        ]}
      />
      <Menu
        mode="inline"
        inlineCollapsed
        selectable={false}
        style={{ borderInlineEnd: 'none', background: 'transparent' }}
        items={[
          {
            key: 'logout',
            danger: true,
            icon: (
              <Tooltip title={t('shell.admin.logout')} placement="right">
                <LogoutOutlined />
              </Tooltip>
            ),
            onClick: handleLogout,
          },
        ]}
      />
    </div>
  );
};

export default AdminSidebar;
