// src/services/llm/types.ts
export type LLMRole = 'system' | 'user' | 'assistant';
export interface LLMMessage { role: LLMRole; content: string; }

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export type LLMErrorKind = 'unconfigured' | 'network' | 'timeout' | 'http' | 'parse';

export class LLMError extends Error {
  kind: LLMErrorKind;
  constructor(kind: LLMErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'LLMError';
  }
}

export interface LLMClient {
  generateText(messages: LLMMessage[], opts?: GenerateOptions): Promise<string>;
  generateStructured<T>(
    messages: LLMMessage[],
    parse: (raw: unknown) => T,
    opts?: GenerateOptions,
  ): Promise<T>;
  ping(opts?: GenerateOptions): Promise<{ ok: boolean; detail?: string }>;
}
