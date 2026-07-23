'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Flex,
  IconButton,
  useColorModeValue,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  useColorMode,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useDisclosure,
  Text,
  VStack,
  Box,
  Divider,
  HStack,
  Avatar,
} from '@chakra-ui/react';
import { HamburgerIcon, MoonIcon, SunIcon, BellIcon } from '@chakra-ui/icons';
import { FaUser, FaHome, FaCog } from 'react-icons/fa';
import { IoLogOut } from 'react-icons/io5';
import Image from 'next/image';
import logo from '../../public/logo.png';
import useColorModeStyles from '@/app/utils/useColorModeStyles';
import api from '@agri/api-client/api';
import { logoutEverywhere } from '@agri/api-client/logoutEverywhere';
import { logOptionalApiFailure } from '@/app/utils/apiClientErrors';
import {
  FaBell,
  FaFileAlt,
  FaRegCalendarAlt,
  FaSeedling,
  FaThLarge,
  FaWater,
} from 'react-icons/fa';
import { WiDaySunny } from 'react-icons/wi';
import { GiGrapes, GiValve } from 'react-icons/gi';
import NavbarNotificationsButton from '@/app/components/main/NavbarNotificationsButton';
import ReportIssueButton from '@/app/components/main/ReportIssueButton';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

const HEADER_H = '64px';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactElement;
};

const MobileMenu = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { headerBarBg, headerBarBorder, hoverColor, textColor } =
    useColorModeStyles();
  const navActiveBg = useColorModeValue('primary.50', 'whiteAlpha.100');
  const navActiveColor = useColorModeValue('primary.800', 'primary.300');
  const navActiveBorder = useColorModeValue('primary.200', 'whiteAlpha.200');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [username, setUsername] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleLogout = () => {
    onClose();
    // Revoke the session everywhere (best-effort), clear local state, then
    // full-navigate to the identity gateway login (NEXT_PUBLIC_LOGIN_PATH).
    logoutEverywhere();
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/users/me');
        setUsername(response.data.first_name ?? response.data.username ?? '');
      } catch (error) {
        logOptionalApiFailure('MobileMenu: header', error);
        setUsername('');
      }
    };
    fetchUser();
  }, []);

  const normalizedPath =
    pathname !== '/' && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;

  const navItems: NavItem[] = [
    { href: '/', label: t('nav.home'), icon: <FaHome /> },
    { href: '/farm', label: t('nav.farm'), icon: <FaThLarge /> },
    { href: '/soil', label: t('nav.soilData'), icon: <FaSeedling /> },
    { href: '/station', label: t('nav.station'), icon: <WiDaySunny /> },
    { href: '/plant', label: t('nav.plantData'), icon: <GiGrapes /> },
    {
      href: '/crop-calendar',
      label: t('nav.cropCalendar'),
      icon: <FaRegCalendarAlt />,
    },
    { href: '/water', label: t('nav.waterStation'), icon: <FaWater /> },
    { href: '/vannes-pompes', label: t('nav.valvesPumps'), icon: <GiValve /> },
    { href: '/alerts', label: t('nav.alerts'), icon: <FaBell /> },
    {
      href: '/notifications',
      label: t('nav.notifications'),
      icon: <BellIcon />,
    },
    { href: '/reports', label: t('nav.reports'), icon: <FaFileAlt /> },
    { href: '/settings', label: t('nav.settings'), icon: <FaCog /> },
  ];

  const NavRow = ({ item }: { item: NavItem }) => {
    const active =
      item.href === '/'
        ? normalizedPath === '/'
        : normalizedPath === item.href ||
          normalizedPath.startsWith(`${item.href}/`);

    return (
      <Link
        href={item.href}
        style={{ width: '100%', textDecoration: 'none' }}
        onClick={() => setIsDrawerOpen(false)}
      >
        <HStack
          w="full"
          px={4}
          py={3}
          borderRadius="xl"
          bg={active ? navActiveBg : 'transparent'}
          color={active ? navActiveColor : textColor}
          borderWidth="1px"
          borderColor={active ? navActiveBorder : 'transparent'}
          transition="all 0.15s ease"
          _hover={{
            bg: active ? navActiveBg : 'blackAlpha.50',
            borderColor: active ? navActiveBorder : headerBarBorder,
          }}
          _dark={{
            _hover: {
              bg: active ? navActiveBg : 'whiteAlpha.50',
            },
          }}
        >
          <Box as="span" fontSize="lg" display="flex">
            {item.icon}
          </Box>
          <Text fontWeight="semibold" color="inherit">
            {item.label}
          </Text>
        </HStack>
      </Link>
    );
  };

  return (
    <Flex
      as="header"
      w="100%"
      maxW="100%"
      minW={0}
      justify="space-between"
      align="center"
      px={{ base: 2, md: 4 }}
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
          width={120}
          src={logo}
          alt="Agrogo"
          priority
          style={{ objectFit: 'contain' }}
        />
      </Link>

      <HStack spacing={1}>
        <LanguageSwitcher />
        <ReportIssueButton />
        <NavbarNotificationsButton />
        <Menu placement="bottom-end">
          <MenuButton
            as={IconButton}
            icon={
              <Avatar
                size="sm"
                name={username || t('nav.account')}
                bg="primary.500"
              />
            }
            aria-label={t('nav.accountMenu')}
            variant="ghost"
            borderRadius="full"
            _hover={{ bg: 'blackAlpha.50' }}
            _dark={{ _hover: { bg: 'whiteAlpha.100' } }}
          />
          <MenuList
            borderRadius="xl"
            py={2}
            minW="200px"
            border="1px solid"
            borderColor={headerBarBorder}
            boxShadow="lg"
          >
            <MenuItem isDisabled fontSize="sm">
              {t('nav.greeting')}
              {username ? `, ${username}` : ''}
            </MenuItem>
            <MenuItem as={Link} href="/profile" icon={<FaUser />}>
              {t('nav.profile')}
            </MenuItem>
            <MenuItem as={Link} href="/notifications" icon={<BellIcon />}>
              {t('nav.notifications')}
            </MenuItem>
            <MenuItem
              onClick={onOpen}
              icon={<IoLogOut style={{ transform: 'scaleX(-1)' }} />}
              color="red.500"
            >
              {t('logout.signOut')}
            </MenuItem>
          </MenuList>
        </Menu>

        <IconButton
          icon={<HamburgerIcon boxSize={6} />}
          aria-label={t('nav.openMenu')}
          variant="ghost"
          size="md"
          borderRadius="xl"
          onClick={() => setIsDrawerOpen(true)}
          _hover={{ bg: 'blackAlpha.50', color: hoverColor }}
          _dark={{ _hover: { bg: 'whiteAlpha.100', color: hoverColor } }}
        />
      </HStack>

      <Drawer
        isOpen={isDrawerOpen}
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        size="xs"
      >
        <DrawerOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <DrawerContent
          borderLeftRadius="2xl"
          maxW="320px"
          borderLeft="1px solid"
          borderColor={headerBarBorder}
        >
          <DrawerCloseButton top={4} borderRadius="full" />
          <DrawerHeader
            pb={2}
            pt={14}
            borderBottomWidth="1px"
            borderColor={headerBarBorder}
          >
            <Text fontSize="sm" fontWeight="normal" color="gray.500" mb={1}>
              {t('nav.navigation')}
            </Text>
            <Text fontSize="xl" fontWeight="bold">
              Agrogo
            </Text>
          </DrawerHeader>
          <DrawerBody px={3} py={5}>
            <VStack align="stretch" spacing={2}>
              {navItems.map((item) => (
                <NavRow key={item.href} item={item} />
              ))}

              <Divider my={2} borderColor={headerBarBorder} />

              <Button
                leftIcon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                justifyContent="flex-start"
                w="full"
                borderRadius="xl"
                py={6}
              >
                {colorMode === 'light'
                  ? t('common.darkMode')
                  : t('common.lightMode')}
              </Button>

              <Button
                leftIcon={<IoLogOut />}
                colorScheme="red"
                variant="outline"
                onClick={onOpen}
                justifyContent="flex-start"
                w="full"
                borderRadius="xl"
                py={6}
              >
                {t('logout.signOut')}
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

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
    </Flex>
  );
};

export default MobileMenu;
