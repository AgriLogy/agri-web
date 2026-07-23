/**
 * The assistant used to render Markdown replies as raw text — farmers saw
 * literal `**` and `*` instead of bold text and bullets (agri-web #104).
 * Assistant bubbles must now render formatted Markdown, while user input must
 * stay literal (never markdown-parsed).
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { MarkdownMessage } from './MarkdownMessage';
import { AgrilogyMessageBubble } from './MessageBubble';
import type { Message } from './types';

const wrap = (ui: React.ReactElement) =>
  render(<ChakraProvider>{ui}</ChakraProvider>);

const makeMessage = (over: Partial<Message>): Message => ({
  id: 'm1',
  role: 'assistant',
  content: '',
  timestamp: new Date('2026-07-22T10:00:00Z'),
  ...over,
});

describe('MarkdownMessage', () => {
  it('renders **bold** as a bold element, not literal asterisks', () => {
    const { container } = wrap(
      <MarkdownMessage content="Il y a **3** alertes actives" />
    );
    const strong = container.querySelector('strong');
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveTextContent('3');
    // The literal markdown syntax must be gone.
    expect(container.textContent).not.toContain('**');
    expect(container.textContent).toContain('Il y a 3 alertes actives');
  });

  it('renders a `*` bullet list as real list items', () => {
    const { container } = wrap(
      <MarkdownMessage content={'Résumé :\n\n* **29.1** % humidité\n* 21 °C température'} />
    );
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(container.querySelector('ul')).toBeInTheDocument();
    expect(container.textContent).not.toContain('* ');
    expect(container.textContent).not.toContain('**');
    expect(screen.getByText('29.1')).toBeInTheDocument();
  });

  it('renders an ordered list and a link', () => {
    const { container } = wrap(
      <MarkdownMessage content={'1. Premier\n2. Second\n\n[docs](https://example.com)'} />
    );
    expect(container.querySelector('ol')).toBeInTheDocument();
    expect(container.querySelectorAll('ol > li')).toHaveLength(2);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});

describe('AgrilogyMessageBubble', () => {
  it('renders assistant markdown formatted', () => {
    const { container } = wrap(
      <AgrilogyMessageBubble
        message={makeMessage({ content: 'Il y a **3** alertes' })}
      />
    );
    expect(container.querySelector('strong')).toBeInTheDocument();
    expect(container.textContent).not.toContain('**');
  });

  it('keeps user messages literal (no markdown parsing)', () => {
    const { container } = wrap(
      <AgrilogyMessageBubble
        message={makeMessage({ role: 'user', content: '**x**' })}
      />
    );
    expect(container.querySelector('strong')).not.toBeInTheDocument();
    expect(container.textContent).toContain('**x**');
  });

  it('renders an error message as literal text without crashing', () => {
    const { container } = wrap(
      <AgrilogyMessageBubble
        message={makeMessage({ isError: true, content: 'Réseau indisponible **' })}
      />
    );
    expect(container.textContent).toContain('Réseau indisponible **');
  });
});
