'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Flex,
  Tooltip,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Spacer,
  VStack,
} from '@chakra-ui/react';
import { MdWarningAmber } from 'react-icons/md';
import { FaSeedling } from 'react-icons/fa6';
import { WiDaySunny } from 'react-icons/wi';
import { GiGrapes, GiValve } from 'react-icons/gi';
import { IoLogOut } from 'react-icons/io5';
import { FaBell, FaCog, FaHome, FaWater } from 'react-icons/fa';
import { logoutEverywhere } from '@agri/api-client/logoutEverywhere';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

const Sidebar = () => {
  const {
    hoverColor,
    iconColor,
    sidebarRailBorder,
    sidebarItemBgActive,
    sidebarItemColorActive,
  } = useColorModeStyles();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const t = useTranslations();

  const handleLogout = () => {
    onClose();
    // Revoke the session everywhere (best-effort), clear local state, then
    // full-navigate to the identity gateway login (NEXT_PUBLIC_LOGIN_PATH).
    logoutEverywhere();
  };

  const navItems: {
    href: string;
    icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
    label: string;
  }[] = [
    { href: '/', icon: FaHome, label: t('nav.home') },
    { href: '/soil', icon: FaSeedling, label: t('nav.soilData') },
    { href: '/station', icon: WiDaySunny, label: t('nav.station') },
    { href: '/plant', icon: GiGrapes, label: t('nav.plantData') },
    { href: '/water', icon: FaWater, label: t('nav.waterStation') },
    { href: '/vannes-pompes', icon: GiValve, label: t('nav.valvesPumps') },
    { href: '/notifications', icon: FaBell, label: t('nav.notifications') },
    { href: '/settings', icon: FaCog, label: t('nav.settings') },
    { href: '/alerts', icon: MdWarningAmber, label: t('nav.alerts') },
  ];

  const normalizedPath =
    pathname !== '/' && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;

  return (
    <>
      <Flex
        direction="column"
        align="stretch"
        h="100%"
        py={3}
        px={2}
        borderRight="1px solid"
        borderColor={sidebarRailBorder}
      >
        <VStack spacing={1} align="stretch" flex="1">
          {navItems.map((item) => {
            const active =
              item.href === '/'
                ? normalizedPath === '/'
                : normalizedPath === item.href ||
                  normalizedPath.startsWith(`${item.href}/`);
            const Icon = item.icon;

            const row = (
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                style={{
                  textDecoration: 'none',
                  width: '100%',
                  outline: 'none',
                }}
              >
                <Flex
                  align="center"
                  justify="center"
                  h="44px"
                  w="100%"
                  borderRadius="lg"
                  color={active ? sidebarItemColorActive : iconColor}
                  bg={active ? sidebarItemBgActive : 'transparent'}
                  transition="background 0.15s ease, color 0.15s ease"
                  _hover={{
                    bg: active ? sidebarItemBgActive : 'blackAlpha.50',
                    color: active ? sidebarItemColorActive : hoverColor,
                  }}
                  _dark={{
                    _hover: {
                      bg: active ? sidebarItemBgActive : 'whiteAlpha.100',
                    },
                  }}
                >
                  <Icon size={20} aria-hidden />
                </Flex>
              </Link>
            );

            return (
              <Tooltip
                key={item.href}
                label={item.label}
                placement="right"
                hasArrow
                openDelay={400}
              >
                {row}
              </Tooltip>
            );
          })}
        </VStack>

        <Spacer minH={4} />

        <Tooltip label={t('logout.signOut')} placement="right" hasArrow>
          <Flex
            align="center"
            justify="center"
            h="44px"
            w="100%"
            borderRadius="lg"
            color={iconColor}
            cursor="pointer"
            transition="background 0.15s ease, color 0.15s ease"
            onClick={onOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={t('logout.signOut')}
            _hover={{ color: 'red.500', bg: 'blackAlpha.50' }}
            _dark={{ _hover: { bg: 'whiteAlpha.100' } }}
          >
            <IoLogOut
              size={22}
              style={{ transform: 'scaleX(-1)' }}
              aria-hidden
            />
          </Flex>
        </Tooltip>
      </Flex>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.400" backdropFilter="blur(4px)">
          <AlertDialogContent borderRadius="xl" mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" pb={2}>
              {t('logout.confirmTitle')}
            </AlertDialogHeader>
            <AlertDialogBody color="gray.600" _dark={{ color: 'gray.300' }}>
              {t('logout.confirmBody')}
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} variant="ghost" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button colorScheme="red" onClick={handleLogout}>
                {t('logout.signOut')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default Sidebar;
