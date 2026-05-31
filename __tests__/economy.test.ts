import { makeState } from './factory';
import { expNeeded, applyExpDelta, addGold, pushCelebration, computeAvatarTier } from '../src/domain/economy';

test('expNeeded follows 50 + (level-1)*50', () => {
  const c = makeState().config;
  expect(expNeeded(1, c)).toBe(50);
  expect(expNeeded(2, c)).toBe(100);
  expect(expNeeded(3, c)).toBe(150);
});

test('applyExpDelta positive: single and chained level ups', () => {
  const s = makeState();
  applyExpDelta(s, 30);
  expect(s.player.level).toBe(1);
  expect(s.player.exp).toBe(30);
  applyExpDelta(s, 20); // total 50 -> level 2, exp 0
  expect(s.player.level).toBe(2);
  expect(s.player.exp).toBe(0);
  expect(s.player.expTotal).toBe(50);
  expect(s.pendingCelebrations).toContain('levelUp');
});

test('applyExpDelta positive: one delta crossing multiple levels', () => {
  const s = makeState();
  applyExpDelta(s, 200); // 50(->L2) + 100(->L3) = 150, remainder 50 sits in L3 (needs 150)
  expect(s.player.level).toBe(3);
  expect(s.player.exp).toBe(50);
  expect(s.player.expTotal).toBe(200);
});

test('applyExpDelta negative: chained level down, floors at L1/0', () => {
  const s = makeState();
  applyExpDelta(s, 200); // L3, exp 50, total 200
  applyExpDelta(s, -200); // full reverse
  expect(s.player.level).toBe(1);
  expect(s.player.exp).toBe(0);
  expect(s.player.expTotal).toBe(0);
});

test('addGold never goes negative and logs ledger', () => {
  const s = makeState();
  const now = new Date(2026, 4, 31);
  addGold(s, 30, 'earn', 'test', now);
  expect(s.player.gold).toBe(30);
  addGold(s, -100, 'penalty', 'big', now);
  expect(s.player.gold).toBe(0);
  expect(s.ledger).toHaveLength(2);
  expect(s.ledger[0]).toMatchObject({ date: '2026-05-31', type: 'earn', amount: 30 });
});

test('computeAvatarTier thresholds', () => {
  expect(computeAvatarTier(1)).toBe(0);
  expect(computeAvatarTier(5)).toBe(1);
  expect(computeAvatarTier(10)).toBe(2);
  expect(computeAvatarTier(20)).toBe(3);
});

test('pushCelebration appends', () => {
  const s = makeState();
  pushCelebration(s, 'levelUp');
  pushCelebration(s, 'perfectDay');
  expect(s.pendingCelebrations).toEqual(['levelUp', 'perfectDay']);
});
