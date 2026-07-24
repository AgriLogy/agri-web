import {
  Box,
  Text,
  Spinner,
  VStack,
  useBreakpointValue,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

export type EmptyBoxVariant = 'empty' | 'loading';

/** Non-React French fallbacks (kept for typing / non-hook callers). The
 *  rendered default text is resolved via i18n inside the component. */
const DEFAULT_EMPTY_TEXT = 'Pas de données';
const DEFAULT_LOADING_TEXT = 'Chargement...';

interface EmptyBoxProps {
  /** Message shown in the box. Default: "Pas de données" for empty, "Chargement..." for loading */
  text?: string;
  /** 'empty' = message only; 'loading' = spinner + message */
  variant?: EmptyBoxVariant;
}

const EmptyBox = ({ text, variant = 'empty' }: EmptyBoxProps) => {
  const t = useTranslations();
  const chartBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const p = useBreakpointValue({ base: 2, md: 4 });

  const displayText =
    text ??
    (variant === 'loading'
      ? t('misc.emptyBox.loading')
      : t('misc.emptyBox.empty'));

  return (
    <Box
      width="100%"
      height="100%"
      minHeight="200px"
      bg={chartBg}
      borderRadius="md"
      boxShadow="lg"
      p={p}
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {variant === 'loading' ? (
        <VStack spacing={3}>
          <Spinner size="lg" color="brand.500" thickness="3px" />
          <Text color={textColor} fontSize="sm">
            {displayText}
          </Text>
        </VStack>
      ) : (
        <Text color={textColor}>{displayText}</Text>
      )}
    </Box>
  );
};

export default EmptyBox;
export { DEFAULT_EMPTY_TEXT, DEFAULT_LOADING_TEXT };
