import { Box, Spinner } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import React from 'react';

const Loading = () => {
  const t = useTranslations();
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="200px"
    >
      {/* Spinner's default label is English ("Loading..."); screen readers
          should hear the farmer's language. */}
      <Spinner size="xl" color="brand.500" label={t('common.loading')} />
    </Box>
  );
};

export default Loading;
