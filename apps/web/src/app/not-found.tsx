'use client';

import Link from 'next/link';
import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';

export default function NotFound() {
  return (
    <Box
      maxW="lg"
      mx="auto"
      my={16}
      p={8}
      borderWidth="1px"
      borderRadius="lg"
      bg="white"
      _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
      textAlign="center"
    >
      <Stack spacing={4}>
        <Heading as="h1" size="md">
          Page not found
        </Heading>
        <Text color="gray.600" _dark={{ color: 'gray.300' }}>
          The page you are looking for does not exist or has been moved.
        </Text>
        <Button as={Link} href="/" colorScheme="brand" alignSelf="center">
          Go back home
        </Button>
      </Stack>
    </Box>
  );
}
