import {
  Box,
  Code,
  Link,
  ListItem,
  OrderedList,
  Text,
  UnorderedList,
} from '@chakra-ui/react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders an assistant reply written in Markdown as React elements (never raw
 * HTML — no `rehype-raw`, no `dangerouslySetInnerHTML`, so it stays XSS-safe
 * and CSP-clean). Font size, line-height and color are intentionally NOT set
 * here: they inherit from the parent bubble so light/dark theming and the
 * `13.5px` / `1.55` typography carry through untouched.
 */

// Each element maps onto a Chakra primitive so the markup inherits the bubble
// theme instead of the browser defaults.
const components: Components = {
  p: ({ children }) => (
    <Text mb="6px" _last={{ mb: 0 }}>
      {children}
    </Text>
  ),
  strong: ({ children }) => (
    <Text as="strong" fontWeight="700">
      {children}
    </Text>
  ),
  em: ({ children }) => (
    <Text as="em" fontStyle="italic">
      {children}
    </Text>
  ),
  ul: ({ children }) => (
    <UnorderedList pl="18px" mb="6px" mt="2px" spacing="2px" _last={{ mb: 0 }}>
      {children}
    </UnorderedList>
  ),
  ol: ({ children }) => (
    <OrderedList pl="18px" mb="6px" mt="2px" spacing="2px" _last={{ mb: 0 }}>
      {children}
    </OrderedList>
  ),
  li: ({ children }) => <ListItem>{children}</ListItem>,
  a: ({ children, href }) => (
    <Link
      href={href}
      isExternal
      target="_blank"
      rel="noopener noreferrer"
      textDecoration="underline"
      fontWeight="600"
    >
      {children}
    </Link>
  ),
  h1: ({ children }) => (
    <Text as="h1" fontSize="1.35em" fontWeight="700" mb="6px" mt="2px" _first={{ mt: 0 }}>
      {children}
    </Text>
  ),
  h2: ({ children }) => (
    <Text as="h2" fontSize="1.2em" fontWeight="700" mb="6px" mt="2px" _first={{ mt: 0 }}>
      {children}
    </Text>
  ),
  h3: ({ children }) => (
    <Text as="h3" fontSize="1.08em" fontWeight="700" mb="4px" mt="2px" _first={{ mt: 0 }}>
      {children}
    </Text>
  ),
  code: ({ children, className }) => {
    // react-markdown gives block-level code a `language-*` className; inline
    // code has none. Blocks are handled by `pre` below, so here we only style
    // the inline case.
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) {
      return (
        <Code className={className} bg="transparent" p="0" whiteSpace="pre">
          {children}
        </Code>
      );
    }
    return (
      <Code
        fontSize="0.9em"
        px="4px"
        py="1px"
        borderRadius="4px"
        wordBreak="break-word"
      >
        {children}
      </Code>
    );
  },
  pre: ({ children }) => (
    <Box
      as="pre"
      overflowX="auto"
      maxW="100%"
      my="6px"
      p="8px"
      borderRadius="6px"
      bg="blackAlpha.200"
      _dark={{ bg: 'whiteAlpha.200' }}
      fontSize="0.9em"
      lineHeight="1.4"
    >
      {children}
    </Box>
  ),
  // GFM tables can be wider than the 78%-max bubble — let them scroll rather
  // than overflow it.
  table: ({ children }) => (
    <Box overflowX="auto" maxW="100%" my="6px">
      <Box as="table" width="100%" sx={{ borderCollapse: 'collapse' }}>
        {children}
      </Box>
    </Box>
  ),
  th: ({ children }) => (
    <Box
      as="th"
      textAlign="left"
      fontWeight="700"
      px="6px"
      py="3px"
      borderBottom="1px solid"
      borderColor="currentColor"
      sx={{ borderColor: 'inherit' }}
    >
      {children}
    </Box>
  ),
  td: ({ children }) => (
    <Box as="td" px="6px" py="3px" borderBottom="1px solid" borderColor="inherit">
      {children}
    </Box>
  ),
};

interface MarkdownMessageProps {
  content: string;
}

export const MarkdownMessage = ({ content }: MarkdownMessageProps) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
    {content}
  </ReactMarkdown>
);
