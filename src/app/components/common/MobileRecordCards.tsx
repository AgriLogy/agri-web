'use client';

import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export type RecordField = {
  /** Column / field label, e.g. "Capteur". */
  label: ReactNode;
  /** Field value — any node (text, Tag, badge…). */
  value: ReactNode;
  /** When true the value renders on its own line under the label (long content). */
  block?: boolean;
};

export type RecordCard = {
  key: string | number;
  /** Prominent first line (the row's "name"). Optional. */
  title?: ReactNode;
  fields: RecordField[];
  /** Trailing row — typically action buttons. Optional. */
  footer?: ReactNode;
};

/**
 * Mobile fallback for wide data tables: each row becomes a self-contained
 * card with label:value pairs, so every column stays visible without
 * horizontal scrolling. Library-agnostic (plain Chakra) so antd- and
 * Chakra-based tables can both reuse it.
 */
export function MobileRecordCards({ cards }: { cards: RecordCard[] }) {
  return (
    <Stack spacing={3} w="100%" minW={0}>
      {cards.map((card) => (
        <Box
          key={card.key}
          borderWidth="1px"
          borderColor="app.border"
          borderRadius="lg"
          bg="app.surface"
          p={3}
          minW={0}
        >
          {card.title != null && (
            <Box
              fontWeight="700"
              fontSize="sm"
              color="app.text"
              mb={2}
              pb={2}
              borderBottomWidth="1px"
              borderColor="app.border"
            >
              {card.title}
            </Box>
          )}

          <Stack spacing={1.5}>
            {card.fields.map((field, i) => (
              <Flex
                key={i}
                direction={field.block ? 'column' : 'row'}
                justify="space-between"
                align={field.block ? 'flex-start' : 'center'}
                gap={field.block ? 0.5 : 3}
                minW={0}
              >
                <Text
                  fontSize="xs"
                  color="app.text.muted"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="0.3px"
                  flexShrink={0}
                >
                  {field.label}
                </Text>
                <Box
                  fontSize="sm"
                  color="app.text"
                  fontWeight="500"
                  textAlign={field.block ? 'left' : 'right'}
                  minW={0}
                  sx={{ wordBreak: 'break-word' }}
                >
                  {field.value}
                </Box>
              </Flex>
            ))}
          </Stack>

          {card.footer != null && (
            <Flex
              mt={3}
              pt={2}
              borderTopWidth="1px"
              borderColor="app.border"
              justify="flex-end"
              gap={2}
            >
              {card.footer}
            </Flex>
          )}
        </Box>
      ))}
    </Stack>
  );
}
