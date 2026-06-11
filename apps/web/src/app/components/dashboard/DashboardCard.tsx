import React, { ReactNode } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';

interface DashboardCardProps {
  title: string;
  titleAddon?: ReactNode;
  content: ReactNode;
  maxHeight?: string; // Optional: Max height for card
}

const DashboardCard = ({ title, titleAddon, content }: DashboardCardProps) => {
  return (
    <Box
      width="100%"
      height="100%"
      bg="app.surface"
      borderRadius="md"
      overflow="hidden"
    >
      <Flex
        mb={2}
        align="center"
        justify="space-between"
        gap={3}
        wrap="wrap"
        pr={titleAddon ? 0 : 2}
      >
        <Text
          color="app.text"
          fontSize="lg"
          fontWeight="bold"
          flex="1"
          minW="0"
        >
          {title}
        </Text>
        {titleAddon ? <Box flexShrink={0}>{titleAddon}</Box> : null}
      </Flex>

      {/* Content area */}
      <Box
        width="100%"
        pb={2}
        pr={2} // Padding for the content area
      >
        {content} {/* Dynamic content */}
      </Box>
    </Box>
  );
};

export default DashboardCard;
