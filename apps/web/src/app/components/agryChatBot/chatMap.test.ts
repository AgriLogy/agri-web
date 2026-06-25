import {
  mapChatResponse,
  messagesToJSON,
  conversationFromDTO,
} from './chatMap';
import type { Message } from './types';

const base = {
  intent: 'smalltalk',
  reply_key: null,
  reply: null,
  tool: null,
  data: null,
};

describe('mapChatResponse', () => {
  it('uses free-text reply as streamed prose when present', () => {
    const r = mapChatResponse({
      ...base,
      intent: 'soil',
      reply: '  Your soil is fine.  ',
    });
    expect(r.text).toBe('Your soil is fine.');
    expect(r.stream).toBe(true);
    expect(r.replyKey).toBeUndefined();
    expect(r.card).toBeUndefined();
  });

  it('falls back to the reply_key (rendered instantly) when no free text', () => {
    const r = mapChatResponse({
      ...base,
      intent: 'active_alerts',
      reply_key: 'misc.chatbot.alertsCard.intro',
    });
    expect(r.replyKey).toBe('misc.chatbot.alertsCard.intro');
    expect(r.stream).toBe(false);
    expect(r.text).toBeUndefined();
  });

  it('attaches the sitemap card for the sitemap intent', () => {
    const r = mapChatResponse({
      ...base,
      intent: 'sitemap',
      reply_key: 'misc.chatbot.sitemap.intro',
    });
    expect(r.card).toEqual({ type: 'sitemap' });
  });

  it('attaches the sitemap card even on the free-text path', () => {
    const r = mapChatResponse({
      ...base,
      intent: 'sitemap',
      reply: 'Here are the pages.',
    });
    expect(r.card).toEqual({ type: 'sitemap' });
    expect(r.text).toBe('Here are the pages.');
  });

  it('defaults to the generic key when neither reply nor reply_key is set', () => {
    const r = mapChatResponse({ ...base });
    expect(r.replyKey).toBe('misc.chatbot.mock.generic');
    expect(r.stream).toBe(false);
  });

  it('treats a whitespace-only reply as empty', () => {
    const r = mapChatResponse({
      ...base,
      reply: '   ',
      reply_key: 'misc.chatbot.weatherCard.intro',
    });
    expect(r.text).toBeUndefined();
    expect(r.replyKey).toBe('misc.chatbot.weatherCard.intro');
  });
});

describe('messagesToJSON', () => {
  it('serializes timestamps to ISO and fills defaults', () => {
    const msgs: Message[] = [
      {
        id: 'a',
        role: 'user',
        content: 'hi',
        timestamp: new Date('2026-01-02T03:04:05.000Z'),
      },
      {
        id: 'b',
        role: 'assistant',
        content: 'hey',
        isError: true,
        card: { type: 'sitemap' },
        timestamp: new Date('2026-01-02T03:04:06.000Z'),
      },
    ];
    const json = messagesToJSON(msgs) as Array<Record<string, unknown>>;
    expect(json[0]).toMatchObject({
      id: 'a',
      role: 'user',
      content: 'hi',
      isError: false,
      card: null,
      timestamp: '2026-01-02T03:04:05.000Z',
    });
    expect(json[1]).toMatchObject({
      id: 'b',
      isError: true,
      card: { type: 'sitemap' },
      timestamp: '2026-01-02T03:04:06.000Z',
    });
  });
});

describe('conversationFromDTO', () => {
  it('revives dates and tolerates partial messages', () => {
    const conv = conversationFromDTO({
      id: 'c1',
      title: 'Soil',
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: 'soil?',
          timestamp: '2026-01-02T03:04:05.000Z',
        },
        { role: 'assistant', content: 'ok' },
        null,
      ] as unknown[],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(conv.id).toBe('c1');
    expect(conv.title).toBe('Soil');
    expect(conv.createdAt).toBeInstanceOf(Date);
    expect(conv.updatedAt.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(conv.messages).toHaveLength(3);
    expect(conv.messages[0]).toMatchObject({
      id: 'm1',
      role: 'user',
      content: 'soil?',
    });
    expect(conv.messages[0].timestamp).toBeInstanceOf(Date);
    // Missing role defaults to assistant; missing id gets a synthetic one.
    expect(conv.messages[1].role).toBe('assistant');
    expect(conv.messages[2].id).toBe('srv-2');
    expect(conv.messages[2].content).toBe('');
  });
});
