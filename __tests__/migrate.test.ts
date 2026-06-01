import { migrate } from '../src/domain/migrate';
import { CURRENT_VERSION } from '../src/domain/version';

test('migrate fills missing fields from a fresh state and stamps current version', () => {
  const result = migrate({ player: { gold: 999 }, version: 1 } as any, 1);
  expect(result.version).toBe(CURRENT_VERSION);
  expect(result.player.gold).toBe(999);          // persisted value kept
  expect(result.player.level).toBe(1);           // missing field defaulted
  expect(result.pendingCelebrations).toEqual([]); // missing transient defaulted
  expect(Array.isArray(result.dailies)).toBe(true);
  expect(result.config.cashOutThreshold).toBe(1000); // config merged from defaults
});

test('migrate returns a full fresh state for garbage input', () => {
  const result = migrate(null, 0);
  expect(result.version).toBe(CURRENT_VERSION);
  expect(result.dailies.length).toBeGreaterThan(0);
});

test('migrate defaults ui.questsCollapsed and preserves saved collapse prefs (v11)', () => {
  // 旧存档无 ui → 取默认（每日展开、每周/一次性/禁忌收起）
  const upgraded = migrate({ version: 10 } as any, 10);
  expect(upgraded.ui.questsCollapsed).toEqual({ weekly: true, oneoff: true, anti: true });
  // 已存偏好：逐键覆盖；缺失键仍保留默认（深合并）
  const saved = migrate({ version: 11, ui: { questsCollapsed: { weekly: false } } } as any, 11);
  expect(saved.ui.questsCollapsed.weekly).toBe(false); // 用户展开的保留
  expect(saved.ui.questsCollapsed.oneoff).toBe(true);  // 缺失键取默认
});

test('migrate tolerates persisted trials/bosses lacking the new archived field', () => {
  const persisted: any = {
    version: 1,
    trials: [{ id: 't', name: 't', icon: '', startDate: '2026-06-01', completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, milestones: [] }],
    bosses: [{ id: 'b', name: 'b', icon: '', maxHp: 100, hp: 100, damagePerHit: 10, totalRewardGold: 0, totalRewardExp: 0, weights: [0.2, 0.3, 0.5], linkedTaskIds: [], clearedStages: [], defeated: false }],
  };
  const result = migrate(persisted, 1);
  expect(result.trials).toHaveLength(1);
  expect(result.bosses).toHaveLength(1);
  expect(result.trials[0].archived ?? false).toBe(false);
  expect(result.bosses[0].archived ?? false).toBe(false);
});
