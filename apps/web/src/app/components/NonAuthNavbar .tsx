'use client';

import { Flex, IconButton, Spacer, useColorMode } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import Image from 'next/image';
import logo from '../public/logo.png';

const NonAuthNavbar = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      padding="1rem"
      bg="var(--surface-page)"
      borderBottom="1px solid var(--border-subtle)"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Image src={logo} alt="Agrilogy" height={50} priority />
      <Spacer />
      <IconButton
        aria-label={
          colorMode === 'light'
            ? 'Activer le mode sombre'
            : 'Activer le mode clair'
        }
        icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
        variant="ghost"
      />
    </Flex>
  );
};

export default NonAuthNavbar;
