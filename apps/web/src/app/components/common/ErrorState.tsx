'use client';

import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';

type ErrorStateProps = {
  title?: string;
  description?: string;
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. You can try again, or come back in a moment.',
  details,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <Box
      role="alert"
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
          {title}
        </Heading>
        <Text color="gray.600" _dark={{ color: 'gray.300' }}>
          {description}
        </Text>
        {details && (
          <Text as="code" fontSize="sm" color="gray.500" wordBreak="break-word">
            {details}
          </Text>
        )}
        {onRetry && (
          <Button colorScheme="brand" onClick={onRetry} alignSelf="center">
            {retryLabel}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
