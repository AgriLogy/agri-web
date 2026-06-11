export type MessageRole = 'user' | 'assistant';

export type ChatErrorCode =
  | 'timeout'
  | 'overloaded'
  | 'rate_limit'
  | 'internal'
  | 'network';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isError?: boolean;
  timestamp: Date;
}
