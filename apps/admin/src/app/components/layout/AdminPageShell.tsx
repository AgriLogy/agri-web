'use client';

import React from 'react';
import { Box, Grid, GridItem } from '@chakra-ui/react';
import HeaderAdmin from '@/app/components/main/AdminHeader';
import AdminSidebar from '@/app/components/main/AdminSidebar';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

export function AdminPageShell({ children }: { children: React.ReactNode }) {
  const { textColor, navBgColor } = useColorModeStyles();

  return (
    <Grid
      templateAreas={{
        base: `"header" "main"`,
        md: `"header header" "nav main"`,
      }}
      gridTemplateRows={{ base: 'auto 1fr', md: '50px 1fr' }}
      gridTemplateColumns={{
        base: 'minmax(0, 1fr)',
        md: '50px minmax(0, 1fr)',
      }}
      w="100%"
      maxW="100%"
      minW={0}
      h="100vh"
      maxH="100dvh"
      overflow="hidden"
      gap={0.5}
      color={textColor}
      fontWeight="bold"
    >
      <GridItem
        area="header"
        bg={navBgColor}
        minW={0}
        maxW="100%"
        overflow="hidden"
      >
        <HeaderAdmin />
      </GridItem>
      <GridItem
        bg={navBgColor}
        area="nav"
        display={{ base: 'none', md: 'block' }}
        minW={0}
        overflow="hidden"
      >
        <AdminSidebar />
      </GridItem>
      <GridItem
        area="main"
        pl={{ base: 1, md: 2 }}
        pr={{ base: 1, md: 2 }}
        bg={navBgColor}
        minW={0}
        minH={0}
        maxW="100%"
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        <Box
          flex="1"
          minH={0}
          minW={0}
          w="100%"
          maxW="100%"
          overflowY="auto"
          overflowX="hidden"
          sx={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </Box>
      </GridItem>
    </Grid>
  );
}
