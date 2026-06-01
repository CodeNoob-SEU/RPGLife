import { AppState } from './types';
import { createInitialState } from './initialState';
import { CURRENT_VERSION } from './version';

/**
 * 把持久化数据并到一份新初始 state 上：缺失的顶层字段用默认值补齐，已有字段保留，
 * 对象字段（player/config/...）做浅合并补默认。忽略 fromVersion——对任意旧版本幂等安全，
 * 故每次 bump CURRENT_VERSION 后旧存档都会被深填补齐新字段。
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
    achievements: { unlockedAt: p.achievements?.unlockedAt ?? {} },
    dailyChest: p.dailyChest ?? null,
    restDays: { ...fresh.restDays, ...(p.restDays ?? {}) },
    config: { ...fresh.config, ...(p.config ?? {}) },
    dailies: p.dailies ?? fresh.dailies,
    weeklies: p.weeklies ?? fresh.weeklies,
    trials: p.trials ?? fresh.trials,
    bosses: p.bosses ?? fresh.bosses,
    oneoffs: p.oneoffs ?? fresh.oneoffs,
    antis: p.antis ?? fresh.antis,
    ledger: p.ledger ?? fresh.ledger,
    history: p.history ?? fresh.history,
    todayReceipts: p.todayReceipts ?? [],
    dailyPerfect: p.dailyPerfect ?? null,
    weeklyPerfect: p.weeklyPerfect ?? null,
    pendingCelebrations: p.pendingCelebrations ?? [],
    pendingAchievements: p.pendingAchievements ?? [],
    pendingNotice: p.pendingNotice ?? null,
    onboarded: p.onboarded ?? false,
    reportSeenDate: p.reportSeenDate ?? null,
    // 深合并折叠偏好：旧存档无 ui 时取默认；已存的逐键覆盖、缺失键仍保留默认。
    ui: { questsCollapsed: { ...fresh.ui.questsCollapsed, ...(p.ui?.questsCollapsed ?? {}) } },
    version: CURRENT_VERSION,
  };
}
