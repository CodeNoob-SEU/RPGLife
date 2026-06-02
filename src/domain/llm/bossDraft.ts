import { LLMMessage } from '../../services/llm/types';
import { asRecord, clampInt } from './validate';

export interface GeneratedBoss {
  name: string;
  maxHp: number;
  damagePerHit: number;
  totalRewardGold: number;
  totalRewardExp: number;
  weights: [number, number, number];
}

export function buildBossPrompt(goalText: string): LLMMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是像素 RPG App 的 Boss 设计助手。把用户的一个较大目标转成一只「Boss」。' +
        '只返回一个 JSON 对象，不要解释、不要代码块。字段：' +
        'name（中文 Boss 名，不超过 12 字），maxHp（最大血量整数 50–2000，目标越大越高），' +
        'damagePerHit（单次打卡伤害整数，约为 maxHp 的 1/15～1/8），' +
        'totalRewardGold（总金币整数 100–2000），totalRewardExp（总经验整数 50–1000），' +
        'weights（三阶段奖励比重，三个 0–1 的数，和约为 1，例如 [0.2,0.3,0.5]）。',
    },
    { role: 'user', content: goalText },
  ];
}

export function parseBossDraft(raw: unknown): GeneratedBoss {
  const o = asRecord(raw);
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) throw new Error('empty name');
  const maxHp = clampInt(o.maxHp, 1, 100000);
  const damagePerHit = clampInt(o.damagePerHit, 1, maxHp);
  const totalRewardGold = clampInt(o.totalRewardGold, 0, 100000);
  const totalRewardExp = clampInt(o.totalRewardExp, 0, 100000);

  const arr = Array.isArray(o.weights) ? o.weights.map((x) => Number(x)) : [];
  if (arr.length !== 3 || arr.some((n) => !Number.isFinite(n) || n < 0)) throw new Error('invalid weights');
  const sum = arr[0] + arr[1] + arr[2];
  if (sum <= 0) throw new Error('weights sum must be > 0');
  const weights: [number, number, number] = [arr[0] / sum, arr[1] / sum, arr[2] / sum];

  return { name, maxHp, damagePerHit, totalRewardGold, totalRewardExp, weights };
}
