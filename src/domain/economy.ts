import { AppState, Config, CelebrationKind, LedgerType } from './types';
import { dateStr } from './dateUtils';

export function expNeeded(level: number, config: Config): number {
  // 下限 1：防止用户把 levelExpBase/Step 配成 0 → expNeeded=0 → applyExpDelta 升级循环死锁。
  return Math.max(1, config.levelExpBase + (level - 1) * config.levelExpStep);
}

export function computeAvatarTier(level: number): number {
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  if (level >= 5) return 1;
  return 0;
}

export function pushCelebration(state: AppState, c: CelebrationKind): void {
  state.pendingCelebrations.push(c);
}

/** 经验增减；delta 可为负（撤销用）。正向连环升级，负向连环降级，floor 于 L1/0。 */
export function applyExpDelta(state: AppState, delta: number): void {
  if (!Number.isFinite(delta)) return; // 防御：非有限值不得污染等级/经验
  const p = state.player;
  p.expTotal = Math.max(0, p.expTotal + delta);
  let exp = p.exp + delta;
  let level = p.level;
  if (delta >= 0) {
    while (exp >= expNeeded(level, state.config)) {
      exp -= expNeeded(level, state.config);
      level += 1;
      pushCelebration(state, 'levelUp');
    }
  } else {
    while (exp < 0 && level > 1) {
      level -= 1;
      exp += expNeeded(level, state.config); // 回补"从 level 到 level+1"所需经验
    }
    if (exp < 0) exp = 0;
  }
  p.level = level;
  p.exp = exp;
  p.avatarTier = computeAvatarTier(level);
}

/** 金币增减（永不为负）+ 记 ledger。 */
export function addGold(state: AppState, n: number, type: LedgerType, note: string, now: Date): void {
  const delta = Number.isFinite(n) ? n : 0; // 防御：非有限值不得污染金币（NaN 会持久化并破坏一切）
  state.player.gold = Math.max(0, state.player.gold + delta);
  state.ledger.push({ ts: now.getTime(), date: dateStr(now), type, amount: delta, note });
}
