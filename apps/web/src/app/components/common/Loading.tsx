import { Box, Spinner } from '@chakra-ui/react';
import React from 'react';

const Loading = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="200px"
    >
      <Spinner size="xl" color="brand.500" />
    </Box>
  );
};

export default Loading;
