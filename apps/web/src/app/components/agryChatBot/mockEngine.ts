/**
 * Mock chat backend.
 *
 * This is a stand-in for the real assistant API. The whole chat experience is
 * built against this so the UI can ship before any backend exists; swapping in
 * the real service later means replacing `streamReply` only — the routing and
 * command surface stay the same.
 *
 * `routeMockReply` is intentionally PURE (no next-intl / React imports) so it
 * is unit-testable in jest, which can't parse the next-intl ESM. It returns an
 * i18n key + optional structured card; the React layer resolves the key and
 * drives the streaming.
 */

export type ChatCard = { type: 'sitemap' };

export interface MockResult {
  /** i18n key whose resolved string is the assistant's textual reply. */
  replyKey: string;
  /** Interpolation values passed to the i18n lookup. */
  values?: Record<string, string>;
  /** Structured attachment rendered after the text (e.g. the sitemap card). */
  card?: ChatCard;
  /** Whether to simulate token streaming (false = render instantly, e.g. commands). */
  stream: boolean;
  /** The command that matched, if any (for analytics / display). */
  command?: string;
}

import type { ChatEngine } from './types';

/** Normalize for matching: lowercase, trim, strip a leading slash. */
const norm = (s: string) => s.trim().toLowerCase();

/** Sitemap is requestable by slash-command or natural language (fr / en / ar). */
const SITEMAP_TRIGGERS = [
  '/sitemap',
  '/map',
  '/pages',
  '/help',
  '/aide',
  'sitemap',
  'site map',
  'plan du site',
  'quelles pages',
  'what pages',
  'show me the pages',
  'navigation',
  'خريطة الموقع',
  'الصفحات',
];

/**
 * Route a user message to a mock reply. Recognizes the `/sitemap` command (and
 * natural-language equivalents); everything else falls back to a generic
 * localized placeholder reply.
 */
export function routeMockReply(latest: string): MockResult {
  const text = norm(latest);

  const isSitemap =
    SITEMAP_TRIGGERS.includes(text) ||
    text.startsWith('/sitemap') ||
    text.startsWith('/help') ||
    text.includes('site map') ||
    text.includes('sitemap') ||
    text.includes('plan du site') ||
    text.includes('خريطة الموقع');

  if (isSitemap) {
    return {
      replyKey: 'misc.chatbot.sitemap.intro',
      card: { type: 'sitemap' },
      stream: false,
      command: 'sitemap',
    };
  }

  return { replyKey: 'misc.chatbot.mock.generic', stream: true };
}

/**
 * `ChatEngine` adapter over `routeMockReply` — lets ChatContext treat the mock
 * and the real backend uniformly. Kept as the offline/dev fallback behind
 * `NEXT_PUBLIC_ASSISTANT_MOCK`.
 */
export const mockEngine: ChatEngine = {
  async respond({ message }) {
    const r = routeMockReply(message);
    return {
      replyKey: r.replyKey,
      values: r.values,
      card: r.card,
      stream: r.stream,
    };
  },
};

/**
 * Simulate streaming a fully-resolved reply string to `onChunk`. For command
 * results (`instant`) the whole string lands at once; otherwise it is emitted
 * word-by-word with a small delay to mimic a live model. Honors the abort
 * signal so the "stop" button works exactly like the real stream.
 */
export async function streamReply(
  text: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
  opts: { instant?: boolean } = {}
): Promise<void> {
  if (opts.instant) {
    if (!signal.aborted) onChunk(text);
    return;
  }

  const tokens = text.split(/(\s+)/); // keep whitespace as its own tokens
  for (const token of tokens) {
    if (signal.aborted) return;
    await new Promise((resolve) => setTimeout(resolve, 18));
    if (signal.aborted) return;
    onChunk(token);
  }
}
