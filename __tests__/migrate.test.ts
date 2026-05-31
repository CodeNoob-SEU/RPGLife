import { migrate } from '../src/domain/migrate';

test('migrate fills missing fields from a fresh state and forces version 1', () => {
  const result = migrate({ player: { gold: 999 }, version: 1 } as any, 1);
  expect(result.version).toBe(1);
  expect(result.player.gold).toBe(999);          // persisted value kept
  expect(result.player.level).toBe(1);           // missing field defaulted
  expect(result.pendingCelebrations).toEqual([]); // missing transient defaulted
  expect(Array.isArray(result.dailies)).toBe(true);
  expect(result.config.cashOutThreshold).toBe(1000); // config merged from defaults
});

test('migrate returns a full fresh state for garbage input', () => {
  const result = migrate(null, 0);
  expect(result.version).toBe(1);
  expect(result.dailies.length).toBeGreaterThan(0);
});
