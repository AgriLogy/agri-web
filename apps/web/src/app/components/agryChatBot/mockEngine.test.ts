import { routeMockReply, streamReply } from './mockEngine';

describe('routeMockReply', () => {
  it('routes the /sitemap command to the sitemap card (instant)', () => {
    const r = routeMockReply('/sitemap');
    expect(r.command).toBe('sitemap');
    expect(r.card).toEqual({ type: 'sitemap' });
    expect(r.stream).toBe(false);
    expect(r.replyKey).toBe('misc.chatbot.sitemap.intro');
  });

  it('treats /help as a sitemap request', () => {
    expect(routeMockReply('/help').command).toBe('sitemap');
  });

  it.each([
    'show me the site map',
    'SITEMAP please',
    'plan du site',
    'خريطة الموقع',
  ])('recognizes natural-language sitemap request: %s', (input) => {
    const r = routeMockReply(input);
    expect(r.card).toEqual({ type: 'sitemap' });
  });

  it('falls back to a generic streamed reply otherwise', () => {
    const r = routeMockReply('how is my soil doing?');
    expect(r.command).toBeUndefined();
    expect(r.card).toBeUndefined();
    expect(r.stream).toBe(true);
    expect(r.replyKey).toBe('misc.chatbot.mock.generic');
  });
});

describe('streamReply', () => {
  it('emits the whole text at once in instant mode', async () => {
    const chunks: string[] = [];
    const ctrl = new AbortController();
    await streamReply('hello world', (c) => chunks.push(c), ctrl.signal, {
      instant: true,
    });
    expect(chunks.join('')).toBe('hello world');
    expect(chunks).toHaveLength(1);
  });

  it('emits nothing once aborted', async () => {
    const chunks: string[] = [];
    const ctrl = new AbortController();
    ctrl.abort();
    await streamReply('hello world', (c) => chunks.push(c), ctrl.signal);
    expect(chunks).toHaveLength(0);
  });

  it('streams the full text token-by-token when not aborted', async () => {
    const chunks: string[] = [];
    const ctrl = new AbortController();
    await streamReply('one two three', (c) => chunks.push(c), ctrl.signal);
    expect(chunks.join('')).toBe('one two three');
    expect(chunks.length).toBeGreaterThan(1);
  });
});
