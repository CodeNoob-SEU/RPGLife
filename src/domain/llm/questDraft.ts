import { LLMMessage } from '../../services/llm/types';
import { asRecord, clampInt } from './validate';

export interface GeneratedQuest {
  kind: 'daily' | 'weekly' | 'oneoff';
  name: string;
  gold: number;
  exp: number;
  icon: string;
  category?: string;
}

const KINDS = ['daily', 'weekly', 'oneoff'] as const;

export function buildQuestPrompt(userText: string): LLMMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是像素 RPG 习惯养成 App 的任务设计助手。把用户一句话目标转成一个结构化「委托」。' +
        '只返回一个 JSON 对象，不要解释、不要代码块。字段：' +
        'kind（"daily" 每日重复 / "weekly" 每周一次 / "oneoff" 一次性），' +
        'name（简短中文任务名，不超过 16 字），gold（金币整数 5–100，越难越多），' +
        'exp（经验整数 3–60），icon（单个 emoji），category（可选：健康/学习/生活/工作 等）。',
    },
    { role: 'user', content: userText },
  ];
}

export function parseQuestDraft(raw: unknown): GeneratedQuest {
  const o = asRecord(raw);
  const kind = o.kind;
  if (typeof kind !== 'string' || !(KINDS as readonly string[]).includes(kind)) {
    throw new Error(`invalid kind: ${String(kind)}`);
  }
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) throw new Error('empty name');
  const gold = clampInt(o.gold, 0, 9999);
  const exp = clampInt(o.exp, 0, 9999);
  const icon = typeof o.icon === 'string' && o.icon.trim() ? o.icon.trim() : '📝';
  const category = typeof o.category === 'string' && o.category.trim() ? o.category.trim() : undefined;
  return { kind: kind as GeneratedQuest['kind'], name, gold, exp, icon, category };
}
