'use client';

import { MoonOutlined, SunOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Dropdown, Flex } from 'antd';
import { useColorMode } from '@chakra-ui/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import api from '@/app/lib/api';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import logo from '../../public/logo.png';

const AdminBigMenu = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { bg } = useColorModeStyles();
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

  return (
    <Flex
      align="center"
      justify="space-between"
      style={{
        background: bg,
        height: '100%',
        padding: '0 16px',
      }}
    >
      <Link href="/" aria-label="Accueil">
        <Image height={32} src={logo} alt="Logo" priority />
      </Link>

      <Flex align="center" gap={8}>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'hi',
                label: `Bonjour ${username}`,
                disabled: true,
              },
            ],
          }}
        >
          <Button type="text" icon={<UserOutlined />} aria-label="Profil" />
        </Dropdown>
        <Button
          type="text"
          aria-label="Basculer le mode sombre"
          icon={colorMode === 'light' ? <MoonOutlined /> : <SunOutlined />}
          onClick={toggleColorMode}
        />
      </Flex>
    </Flex>
  );
};

export default AdminBigMenu;
