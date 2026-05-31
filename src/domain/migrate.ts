import { AppState } from './types';
import { createInitialState } from './initialState';

/**
 * Phase 1 只有 version 1。把持久化数据并到一份新初始 state 上：缺失的顶层字段用默认值补齐，
 * 已有字段保留。这样旧/残缺的存档能安全加载，也为 Phase 2 新增字段（更高 version）铺路。
 */
export function migrate(persisted: unknown, _fromVersion: number): AppState {
  const fresh = createInitialState(new Date());
  if (!persisted || typeof persisted !== 'object') return fresh;
  const p = persisted as Partial<AppState>;
  return {
    ...fresh,
    ...p,
    player: { ...fresh.player, ...(p.player ?? {}) },
    inventory: { ...fresh.inventory, ...(p.inventory ?? {}) },
    restDays: { ...fresh.restDays, ...(p.restDays ?? {}) },
    config: { ...fresh.config, ...(p.config ?? {}) },
    dailies: p.dailies ?? fresh.dailies,
    weeklies: p.weeklies ?? fresh.weeklies,
    trials: p.trials ?? fresh.trials,
    bosses: p.bosses ?? fresh.bosses,
    ledger: p.ledger ?? fresh.ledger,
    history: p.history ?? fresh.history,
    todayReceipts: p.todayReceipts ?? [],
    dailyPerfect: p.dailyPerfect ?? null,
    weeklyPerfect: p.weeklyPerfect ?? null,
    pendingCelebrations: p.pendingCelebrations ?? [],
    pendingNotice: p.pendingNotice ?? null,
    version: 1,
  };
}
