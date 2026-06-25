/**
 * Real chat engine — calls agri-api's orchestrated `POST /assistant/chat` and
 * maps the response onto the chat UI model. Drop-in for `mockEngine`: same
 * `ChatEngine` interface, so ChatContext swaps between them behind a flag.
 *
 * The response→UI mapping lives in the pure, jest-tested `chatMap`; this module
 * only does the network call + error classification.
 */
import { assistantApi } from '@agri/api-client/assistantApi';
import { mapChatResponse } from './chatMap';
import type { ChatEngine, EngineReply } from './types';

/** Map a failed request to a localized error reply key (all already in the
 *  `misc.chatbot.error.*` bundle). */
function errorReply(err: unknown): EngineReply {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const code = (err as { code?: string })?.code;
  let key = 'misc.chatbot.error.internal';
  if (status === 429) key = 'misc.chatbot.error.rateLimit';
  else if (status && status >= 500) key = 'misc.chatbot.error.overloaded';
  else if (!status || code === 'ERR_NETWORK' || code === 'ECONNABORTED')
    key = 'misc.chatbot.error.network';
  return { replyKey: key, stream: false, isError: true };
}

export const realEngine: ChatEngine = {
  async respond({ message }) {
    try {
      const res = await assistantApi.chat({ message });
      return mapChatResponse(res);
    } catch (err) {
      return errorReply(err);
    }
  },
};
