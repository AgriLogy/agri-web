'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Tooltip,
  useColorMode,
  Avatar,
  Text,
  HStack,
  Box,
  Divider,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { FaCog } from 'react-icons/fa';
import { IoLogOut } from 'react-icons/io5';
import Image from 'next/image';
import api from '@/app/lib/api';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import logo from '../../public/logo.png';
import NavbarNotificationsButton from '@/app/components/main/NavbarNotificationsButton';

const HEADER_H = '64px';

const BigMenu = () => {
  const router = useRouter();
  const { colorMode, toggleColorMode } = useColorMode();
  const { hoverColor, headerBarBg, headerBarBorder, textColor } =
    useColorModeStyles();
  const [username, setUsername] = useState('');

  useEffect(() => {
    api
      .get('/users/me')
      .then((response) => setUsername(response.data.username ?? ''))
      .catch(() => setUsername(''));
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <Flex
      as="header"
      w="100%"
      maxW="100%"
      minW={0}
      justify="space-between"
      align="center"
      px={{ base: 2, md: 6 }}
      h={HEADER_H}
      minH={HEADER_H}
      bg={headerBarBg}
      borderBottom="1px solid"
      borderColor={headerBarBorder}
      boxShadow="0 1px 0 rgba(0,0,0,0.03)"
      _dark={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
        <Image
          height={40}
          width={140}
          src={logo}
          alt="Agrilogy"
          priority
          style={{ objectFit: 'contain' }}
        />
      </Link>

      <HStack
        spacing={{ base: 1, md: 2 }}
        align="center"
        minW={0}
        flexShrink={1}
      >
        <NavbarNotificationsButton />

        <Divider orientation="vertical" h={6} borderColor={headerBarBorder} />

        <Menu placement="bottom-end" gutter={8}>
          <MenuButton
            py={1}
            px={2}
            borderRadius="xl"
            transition="background 0.15s ease"
            _hover={{ bg: 'blackAlpha.50' }}
            _dark={{ _hover: { bg: 'whiteAlpha.100' } }}
            _expanded={{ bg: 'blackAlpha.50' }}
          >
            <HStack spacing={3}>
              <Avatar
                size="sm"
                name={username || 'Utilisateur'}
                bg="primary.500"
              />
              <Box display={{ base: 'none', lg: 'block' }} textAlign="left">
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={textColor}
                  noOfLines={1}
                  maxW="160px"
                >
                  {username || 'Utilisateur'}
                </Text>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  _dark={{ color: 'gray.400' }}
                >
                  Compte
                </Text>
              </Box>
            </HStack>
          </MenuButton>
          <MenuList
            borderRadius="xl"
            py={2}
            boxShadow="lg"
            border="1px solid"
            borderColor={headerBarBorder}
            minW="220px"
          >
            <MenuItem
              isDisabled
              fontSize="sm"
              opacity={0.9}
              _hover={{ bg: 'transparent' }}
            >
              Bonjour{username ? `, ${username}` : ''}
            </MenuItem>
            <MenuItem
              as={Link}
              href="/settings"
              icon={<FaCog />}
              borderRadius="md"
              mx={1}
            >
              Paramètres
            </MenuItem>
            <MenuDivider />
            <MenuItem
              icon={<IoLogOut />}
              onClick={handleLogout}
              color="red.500"
              borderRadius="md"
              mx={1}
            >
              Se déconnecter
            </MenuItem>
          </MenuList>
        </Menu>

        <Tooltip
          label={colorMode === 'light' ? 'Mode sombre' : 'Mode clair'}
          hasArrow
          openDelay={300}
        >
          <IconButton
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            aria-label={
              colorMode === 'light'
                ? 'Activer le mode sombre'
                : 'Activer le mode clair'
            }
            variant="ghost"
            size="md"
            borderRadius="xl"
            onClick={toggleColorMode}
            _hover={{ bg: 'blackAlpha.50', color: hoverColor }}
            _dark={{ _hover: { bg: 'whiteAlpha.100', color: hoverColor } }}
          />
        </Tooltip>
      </HStack>
    </Flex>
  );
};

export default BigMenu;
