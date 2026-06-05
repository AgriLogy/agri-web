'use client';

import {
  AuditOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Button, Drawer, Dropdown, Flex, Menu } from 'antd';
import { useColorMode } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import api from '@/app/lib/api';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import logo from '../../public/logo.png';

const AdminMobileMenu = () => {
  const t = useTranslations();
  const { colorMode, toggleColorMode } = useColorMode();
  const { bg } = useColorModeStyles();
  const { modal } = App.useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('User');

  useEffect(() => {
    api
      .get('/users/me')
      .then((res) => {
        if (res.data?.username) setUsername(res.data.username);
      })
      .catch(() => {
        /* keep default */
      });
  }, []);

  const askLogout = () => {
    setOpen(false);
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
    <Flex
      align="center"
      justify="space-between"
      style={{ background: bg, height: '100%', padding: '0 12px' }}
    >
      <Link href="/" aria-label={t('shell.mobileMenu.home')}>
        <Image height={32} src={logo} alt="Logo" priority />
      </Link>

      <Flex align="center" gap={8}>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'hi',
                label: t('shell.mobileMenu.greeting', { name: username }),
                disabled: true,
              },
              { type: 'divider' },
              {
                key: 'logout',
                label: t('shell.admin.logout'),
                icon: <LogoutOutlined />,
                danger: true,
                onClick: askLogout,
              },
            ],
          }}
        >
          <Button
            type="text"
            icon={<UserOutlined />}
            aria-label={t('shell.mobileMenu.profile')}
          />
        </Dropdown>
        <Button
          type="text"
          aria-label={t('shell.mobileMenu.openMenu')}
          icon={<MenuOutlined />}
          onClick={() => setOpen(true)}
        />
      </Flex>

      <Drawer
        title={t('shell.mobileMenu.menu')}
        placement="right"
        open={open}
        onClose={() => setOpen(false)}
        width={280}
      >
        <Menu
          mode="inline"
          style={{ borderInlineEnd: 'none' }}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: t('shell.admin.dashboard'),
              onClick: () => {
                router.push('/admin');
                setOpen(false);
              },
            },
            {
              key: 'users',
              icon: <TeamOutlined />,
              label: t('shell.admin.users'),
              onClick: () => {
                router.push('/admin/users');
                setOpen(false);
              },
            },
            {
              key: 'affirmations',
              icon: <AuditOutlined />,
              label: t('shell.admin.affirmations'),
              onClick: () => {
                router.push('/admin/affirmations');
                setOpen(false);
              },
            },
            { type: 'divider' },
            {
              key: 'theme',
              icon: colorMode === 'light' ? <MoonOutlined /> : <SunOutlined />,
              label:
                colorMode === 'light'
                  ? t('shell.mobileMenu.darkMode')
                  : t('shell.mobileMenu.lightMode'),
              onClick: () => {
                toggleColorMode();
                setOpen(false);
              },
            },
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              danger: true,
              label: t('shell.admin.logout'),
              onClick: askLogout,
            },
          ]}
        />
      </Drawer>
    </Flex>
  );
};

export default AdminMobileMenu;
