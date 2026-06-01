// src/services/llm/parseStructured.ts
import { GenerateOptions, LLMError, LLMMessage } from './types';

/** 从模型输出中抽取第一个 JSON 对象：容忍 ```json 围栏与前后噪声。 */
export function extractJSON(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) throw new Error('no JSON object found');
  return JSON.parse(t.slice(start, end + 1));
}

const CORRECTION =
  '上次输出无法解析为要求的 JSON。请只返回一个符合要求的 JSON 对象，不要任何解释或代码块。';

/**
 * 调用 callText → 抽 JSON → 跑业务校验 parse。失败带纠正消息重试 1 次；仍失败抛 LLMError('parse')。
 * callText 自身抛出的网络/超时/HTTP 错误直接冒泡（不计入 parse 重试）。
 */
export async function parseStructured<T>(
  callText: (messages: LLMMessage[], opts?: GenerateOptions) => Promise<string>,
  messages: LLMMessage[],
  parse: (raw: unknown) => T,
  opts?: GenerateOptions,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const msgs = attempt === 0
      ? messages
      : [...messages, { role: 'user' as const, content: CORRECTION }];
    const text = await callText(msgs, opts); // 网络错误在此冒泡
    try {
      return parse(extractJSON(text));
    } catch (e) {
      lastErr = e;
    }
  }
  throw new LLMError('parse', `结构化解析失败：${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}
