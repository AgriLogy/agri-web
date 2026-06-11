'use client';

import { Box, Grid, GridItem } from '@chakra-ui/react';
import Header from '@/app/components/main/Header';
import Navbar from '@/app/components/main/Sidebar';
import useColorModeStyles from '@/app/utils/useColorModeStyles';

export type AppPageShellProps = {
  children: React.ReactNode;
  /** Narrower header/sidebar (legacy vannes-pompes) */
  density?: 'default' | 'compact';
};

/**
 * Viewport-bound shell: clips horizontal overflow; main column scrolls vertically only inside the content area.
 */
export function AppPageShell({
  children,
  density = 'default',
}: AppPageShellProps) {
  const { textColor, navBgColor, SideBarbg } = useColorModeStyles();
  const compact = density === 'compact';

  return (
    <Grid
      templateAreas={{
        base: `"header" "main"`,
        md: `"header header" "nav main"`,
      }}
      gridTemplateRows={
        compact
          ? { base: 'auto 1fr', md: '50px 1fr' }
          : { base: 'auto 1fr', md: '64px 1fr' }
      }
      gridTemplateColumns={
        compact
          ? { base: 'minmax(0, 1fr)', md: '50px minmax(0, 1fr)' }
          : { base: 'minmax(0, 1fr)', md: '72px minmax(0, 1fr)' }
      }
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
      <GridItem area="header" minW={0} maxW="100%" overflow="hidden">
        <Header />
      </GridItem>
      <GridItem
        bg={SideBarbg}
        area="nav"
        display={{ base: 'none', md: 'block' }}
        minW={0}
        overflow="hidden"
      >
        <Navbar />
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
