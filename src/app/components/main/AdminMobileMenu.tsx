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
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import api from '@/app/lib/api';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import logo from '../../public/logo.png';

const AdminMobileMenu = () => {
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
      title: 'Confirmer la déconnexion',
      content: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      okText: 'Se déconnecter',
      okType: 'danger',
      cancelText: 'Annuler',
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
      <Link href="/" aria-label="Accueil">
        <Image height={32} src={logo} alt="Logo" priority />
      </Link>

      <Flex align="center" gap={8}>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'hi', label: `Bonjour ${username}`, disabled: true },
              { type: 'divider' },
              {
                key: 'logout',
                label: 'Déconnexion',
                icon: <LogoutOutlined />,
                danger: true,
                onClick: askLogout,
              },
            ],
          }}
        >
          <Button type="text" icon={<UserOutlined />} aria-label="Profil" />
        </Dropdown>
        <Button
          type="text"
          aria-label="Ouvrir le menu"
          icon={<MenuOutlined />}
          onClick={() => setOpen(true)}
        />
      </Flex>

      <Drawer
        title="Menu"
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
              label: 'Tableau de bord',
              onClick: () => {
                router.push('/admin');
                setOpen(false);
              },
            },
            {
              key: 'users',
              icon: <TeamOutlined />,
              label: 'Utilisateurs',
              onClick: () => {
                router.push('/admin/users');
                setOpen(false);
              },
            },
            {
              key: 'affirmations',
              icon: <AuditOutlined />,
              label: 'Affirmations manager',
              onClick: () => {
                router.push('/admin/affirmations');
                setOpen(false);
              },
            },
            { type: 'divider' },
            {
              key: 'theme',
              icon: colorMode === 'light' ? <MoonOutlined /> : <SunOutlined />,
              label: colorMode === 'light' ? 'Mode sombre' : 'Mode clair',
              onClick: () => {
                toggleColorMode();
                setOpen(false);
              },
            },
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              danger: true,
              label: 'Déconnexion',
              onClick: askLogout,
            },
          ]}
        />
      </Drawer>
    </Flex>
  );
};

export default AdminMobileMenu;
