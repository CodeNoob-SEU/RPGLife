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
