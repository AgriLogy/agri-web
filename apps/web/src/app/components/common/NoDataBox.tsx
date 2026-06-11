'use client';

import useColorModeStyles from '@/app/utils/useColorModeStyles';
import { Box, Text } from '@chakra-ui/react';

const NoDataBox = ({ name }: { name: string }) => {
  const { bg, textColor } = useColorModeStyles();

  return (
    <Box
      width="100%"
      height="100%"
      borderRadius="md"
      boxShadow="lg"
      p={2}
      bg={bg}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize="lg" fontWeight="medium" color={textColor}>
        {name} non disponible
      </Text>
    </Box>
  );
};

export default NoDataBox;
