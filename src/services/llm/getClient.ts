// src/services/llm/getClient.ts
import { LLMClient } from './types';
import { OpenAICompatClient } from './openaiCompatClient';
import { MockLLMClient } from './mockClient';
import { getCachedApiKey } from './secureConfig';
import { useGameStore } from '../../store/useGameStore';

/** 配置齐全（启用 + baseURL + key）才视为就绪。 */
export function isLLMReady(): boolean {
  const { llmEnabled, llmBaseURL } = useGameStore.getState().config;
  return !!(llmEnabled && llmBaseURL.trim() && getCachedApiKey());
}

/** 同步返回一个 LLMClient：就绪用真实 client，否则用 mock（保证调用方永不拿到 null）。 */
export function getClient(): LLMClient {
  const { llmEnabled, llmBaseURL, llmModel } = useGameStore.getState().config;
  const apiKey = getCachedApiKey();
  if (llmEnabled && llmBaseURL.trim() && apiKey) {
    return new OpenAICompatClient({
      baseURL: llmBaseURL.trim().replace(/\/+$/, ''),
      apiKey,
      model: llmModel.trim() || 'gpt-4o-mini',
    });
  }
  return new MockLLMClient();
}
