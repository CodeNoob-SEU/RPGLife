// src/services/llm/openaiCompatClient.ts
import { GenerateOptions, LLMClient, LLMError, LLMMessage } from './types';
import { parseStructured } from './parseStructured';

export interface OpenAICompatConfig {
  baseURL: string;   // 末尾不带斜杠，如 https://api.deepseek.com/v1
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

export class OpenAICompatClient implements LLMClient {
  constructor(private cfg: OpenAICompatConfig) {}

  private async raw(messages: LLMMessage[], opts?: GenerateOptions): Promise<string> {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (opts?.signal) opts.signal.addEventListener('abort', onAbort);
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs ?? 20000);

    let res: Response;
    try {
      res = await fetch(`${this.cfg.baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.apiKey}` },
        body: JSON.stringify({
          model: this.cfg.model,
          messages,
          temperature: opts?.temperature ?? 0.7,
          max_tokens: opts?.maxTokens,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      throw new LLMError(controller.signal.aborted ? 'timeout' : 'network', String(e));
    } finally {
      clearTimeout(timer);
      if (opts?.signal) opts.signal.removeEventListener('abort', onAbort);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new LLMError('http', `HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  generateText(messages: LLMMessage[], opts?: GenerateOptions): Promise<string> {
    return this.raw(messages, opts);
  }

  generateStructured<T>(messages: LLMMessage[], parse: (raw: unknown) => T, opts?: GenerateOptions): Promise<T> {
    return parseStructured((m, o) => this.raw(m, o), messages, parse, opts);
  }

  async ping(opts?: GenerateOptions): Promise<{ ok: boolean; detail?: string }> {
    try {
      await this.raw([{ role: 'user', content: 'ping' }], { ...opts, maxTokens: 1 });
      return { ok: true };
    } catch (e) {
      return { ok: false, detail: e instanceof LLMError ? `${e.kind}: ${e.message}` : String(e) };
    }
  }
}
