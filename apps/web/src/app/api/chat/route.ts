import Anthropic from '@anthropic-ai/sdk';
import type { ChatErrorCode } from '@/app/components/agryChatBot/types';

// Server-side proxy for the in-app assistant. The Anthropic key lives ONLY on the
// server (ANTHROPIC_API_KEY — no NEXT_PUBLIC_), so it is never shipped to the browser.
// The client (ChatBot.tsx) POSTs { system, messages } and reads a simple SSE stream
// of { text } chunks, terminated by [DONE], or a single { error } event.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'claude-haiku-4-5'; // existing product choice — fast, low-cost assistant
const MAX_TOKENS = 1024;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function errorCode(e: unknown): ChatErrorCode {
  if (e instanceof Anthropic.RateLimitError) return 'rate_limit';
  if (e instanceof Anthropic.InternalServerError) return 'internal';
  if (e instanceof Anthropic.APIError) {
    if (e.status === 429) return 'rate_limit';
    if (e.status === 503 || e.status === 529) return 'overloaded';
    if (e.status >= 500) return 'internal';
  }
  return 'network';
}

function isValidMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (m) =>
        m &&
        typeof m === 'object' &&
        (m as ChatMessage).role !== undefined &&
        ((m as ChatMessage).role === 'user' ||
          (m as ChatMessage).role === 'assistant') &&
        typeof (m as ChatMessage).content === 'string'
    )
  );
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'internal' satisfies ChatErrorCode },
      {
        status: 500,
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: 'network' satisfies ChatErrorCode },
      {
        status: 400,
      }
    );
  }

  const { system, messages } = (body ?? {}) as {
    system?: unknown;
    messages?: unknown;
  };
  if (!isValidMessages(messages) || typeof system !== 'string') {
    return Response.json(
      { error: 'network' satisfies ChatErrorCode },
      {
        status: 400,
      }
    );
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      try {
        const anthropic = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages,
        });
        anthropic.on('text', (delta) => send({ text: delta }));
        await anthropic.finalMessage();
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        send({ error: errorCode(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
