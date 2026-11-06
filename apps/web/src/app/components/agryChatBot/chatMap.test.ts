import {
  mapChatResponse,
  messagesToJSON,
  conversationFromDTO,
  dataCardFor,
  historyFor,
  isClearCommand,
  pendingActionFrom,
  readingAge,
  sourcesFrom,
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

describe('dataCardFor', () => {
  const base = {
    intent: 'smalltalk',
    reply_key: null,
    reply: null,
    tool: null,
    data: null,
  };

  it('returns the sitemap card for the sitemap intent', () => {
    expect(dataCardFor({ ...base, intent: 'sitemap' })).toEqual({
      type: 'sitemap',
    });
  });

  it('maps an alerts payload to an alerts card', () => {
    const card = dataCardFor({
      ...base,
      intent: 'active_alerts',
      data: {
        alerts: [
          {
            name: 'Heat',
            zone: 'Z1',
            condition: '>',
            threshold: 30,
            severity: 'warning',
          },
        ],
      },
    });
    expect(card).toEqual({
      type: 'alerts',
      items: [
        {
          name: 'Heat',
          zone: 'Z1',
          condition: '>',
          threshold: 30,
          severity: 'warning',
        },
      ],
    });
  });

  it('maps a metrics payload (null value tolerated)', () => {
    const card = dataCardFor({
      ...base,
      intent: 'weather',
      data: {
        metrics: [
          { label: 'Temp', value: 21.5, unit: '°C' },
          { key: 'rh', value: null },
        ],
      },
    });
    expect(card).toEqual({
      type: 'metrics',
      items: [
        { label: 'Temp', value: 21.5, unit: '°C' },
        { label: 'rh', value: null },
      ],
    });
  });

  it('maps a notifications payload', () => {
    const card = dataCardFor({
      ...base,
      intent: 'notifications',
      data: {
        notifications: [
          { title: 'Irrigation', message: 'sol 30 %', date: '2026-01-01' },
        ],
      },
    });
    expect(card).toEqual({
      type: 'notifications',
      items: [{ title: 'Irrigation', message: 'sol 30 %', date: '2026-01-01' }],
    });
  });

  it('maps an error payload', () => {
    expect(
      dataCardFor({ ...base, intent: 'water', data: { error: 'boom' } })
    ).toEqual({ type: 'error', message: 'boom' });
  });

  it('returns undefined for an unrecognised / empty payload', () => {
    expect(
      dataCardFor({ ...base, intent: 'soil', data: null })
    ).toBeUndefined();
    expect(
      dataCardFor({ ...base, intent: 'soil', data: { foo: 1 } })
    ).toBeUndefined();
  });
});

describe('isClearCommand', () => {
  it('matches the slash form and fr/ar phrases', () => {
    expect(isClearCommand('/clear')).toBe(true);
    expect(isClearCommand('  CLEAR ')).toBe(true);
    expect(isClearCommand('effacer')).toBe(true);
    expect(isClearCommand('مسح')).toBe(true);
  });

  it('does not match ordinary messages', () => {
    expect(isClearCommand('clear the field?')).toBe(false);
    expect(isClearCommand('/sitemap')).toBe(false);
    expect(isClearCommand('hello')).toBe(false);
  });
});

describe('AI answer extras (agri-api#472)', () => {
  const llm = {
    ...base,
    intent: 'llm',
    reply: 'Rtoba mzyana.',
    sources: [
      {
        tool: 'get_soil_status',
        as_of: '2026-06-22T08:26:00+00:00',
        items: [
          {
            label: 'Soil moisture (medium)',
            value: 27,
            unit: '%',
            as_of: '2026-06-22T08:26:00+00:00',
          },
        ],
      },
      { tool: '', as_of: null },
    ],
    pending_action: {
      tool: 'create_alert',
      params: { name: 'Sol sec', condition_nbr: 20 },
    },
  };

  it('maps sources (dropping malformed ones) and the pending action', () => {
    const r = mapChatResponse(llm);
    expect(r.text).toBe('Rtoba mzyana.');
    expect(r.sources).toEqual([
      {
        tool: 'get_soil_status',
        asOf: '2026-06-22T08:26:00+00:00',
        items: [
          {
            label: 'Soil moisture (medium)',
            value: 27,
            unit: '%',
            asOf: '2026-06-22T08:26:00+00:00',
          },
        ],
      },
    ]);
    expect(r.pendingAction).toEqual({
      tool: 'create_alert',
      params: { name: 'Sol sec', condition_nbr: 20 },
      state: 'proposed',
    });
  });

  it('an AI answer with dated sources does not repeat the undated data card', () => {
    const r = mapChatResponse({
      ...llm,
      tool: 'get_soil_status',
      data: { metrics: [{ label: 'Soil moisture', value: 27, unit: '%' }] },
    });
    expect(r.card).toBeUndefined();
    expect(r.sources).toHaveLength(1);
  });

  it('no extras on the rule-based path', () => {
    const r = mapChatResponse({
      ...base,
      reply_key: 'misc.chatbot.alertsCard.intro',
    });
    expect(r.sources).toBeUndefined();
    expect(r.pendingAction).toBeUndefined();
    expect(sourcesFrom(base)).toEqual([]);
    expect(pendingActionFrom(base)).toBeUndefined();
  });

  it('says the AI is unavailable when the server fell back to nothing', () => {
    const r = mapChatResponse({
      ...base,
      reply_key: 'misc.chatbot.mock.generic',
      fallback_reason: 'unavailable',
    });
    expect(r.replyKey).toBe('misc.chatbot.llmUnavailable');
  });

  it('a fallback that still matched a command keeps the command reply', () => {
    const r = mapChatResponse({
      ...base,
      intent: 'active_alerts',
      reply_key: 'misc.chatbot.alertsCard.intro',
      fallback_reason: 'rate_limit',
    });
    expect(r.replyKey).toBe('misc.chatbot.alertsCard.intro');
  });

  it('readingAge flags data older than 2 days', () => {
    const now = new Date('2026-06-25T08:26:00Z');
    expect(readingAge('2026-06-25T05:26:00Z', now)).toEqual({
      hours: 3,
      stale: false,
    });
    expect(readingAge('2026-06-22T08:26:00Z', now)?.stale).toBe(true);
    expect(readingAge(null, now)).toBeNull();
    expect(readingAge('not a date', now)).toBeNull();
  });

  it('historyFor keeps the last finished text turns only', () => {
    const at = new Date(0);
    const msgs: Message[] = [
      { id: '1', role: 'user', content: 'salam', timestamp: at },
      {
        id: '2',
        role: 'assistant',
        content: 'oops',
        isError: true,
        timestamp: at,
      },
      { id: '3', role: 'assistant', content: '  ', timestamp: at },
      { id: '4', role: 'assistant', content: ' wa3alaykum ', timestamp: at },
    ];
    expect(historyFor(msgs)).toEqual([
      { role: 'user', content: 'salam' },
      { role: 'assistant', content: 'wa3alaykum' },
    ]);
    expect(historyFor(msgs, 1)).toEqual([
      { role: 'assistant', content: 'wa3alaykum' },
    ]);
  });

  it('sources and actions survive the server round-trip', () => {
    const msg: Message = {
      id: 'a',
      role: 'assistant',
      content: 'x',
      timestamp: new Date('2026-06-22T08:26:00Z'),
      sources: [{ tool: 'get_weather', asOf: null, items: [] }],
      pendingAction: { tool: 'create_alert', params: {}, state: 'confirmed' },
    };
    const conv = conversationFromDTO({
      id: 'c',
      messages: messagesToJSON([msg]),
    });
    expect(conv.messages[0].sources).toEqual(msg.sources);
    expect(conv.messages[0].pendingAction?.state).toBe('confirmed');
  });
});
