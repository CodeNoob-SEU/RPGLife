// src/services/llm/mockClient.ts
import { GenerateOptions, LLMClient, LLMError, LLMMessage } from './types';

/** 确定性假 client：未配置 key 时由工厂返回，亦供 domain/store 测试使用，零网络。 */
export class MockLLMClient implements LLMClient {
  constructor(private fixtures: { text?: string; raw?: unknown } = {}) {}

  async generateText(_messages: LLMMessage[], _opts?: GenerateOptions): Promise<string> {
    return this.fixtures.text ?? '【示例】今天也辛苦啦，冒险者！明天继续推进你的委托吧。✨';
  }

  async generateStructured<T>(
    _messages: LLMMessage[],
    parse: (raw: unknown) => T,
    _opts?: GenerateOptions,
  ): Promise<T> {
    if (this.fixtures.raw === undefined) {
      throw new LLMError('unconfigured', 'mock 未提供结构化样本');
    }
    return parse(this.fixtures.raw);
  }

  async ping(_opts?: GenerateOptions): Promise<{ ok: boolean; detail?: string }> {
    return { ok: true, detail: 'mock' };
  }
}
