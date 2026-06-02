import { buildBossPrompt, parseBossDraft } from '../src/domain/llm/bossDraft';

test('buildBossPrompt yields system+user messages carrying the goal', () => {
  const msgs = buildBossPrompt('30 天读完 3 本书');
  expect(msgs).toHaveLength(2);
  expect(msgs[1].content).toContain('30 天读完 3 本书');
});

test('parseBossDraft validates and normalizes weights to sum 1', () => {
  const b = parseBossDraft({ name: '读书 Boss', maxHp: 300, damagePerHit: 20, totalRewardGold: 600, totalRewardExp: 300, weights: [1, 1, 2] });
  expect(b.name).toBe('读书 Boss');
  expect(b.maxHp).toBe(300);
  const sum = b.weights[0] + b.weights[1] + b.weights[2];
  expect(sum).toBeCloseTo(1, 5);
  expect(b.weights[2]).toBeCloseTo(0.5, 5);
});

test('parseBossDraft clamps damagePerHit to <= maxHp and rewards >= 0', () => {
  const b = parseBossDraft({ name: 'x', maxHp: 50, damagePerHit: 999, totalRewardGold: -10, totalRewardExp: 5, weights: [0.2, 0.3, 0.5] });
  expect(b.damagePerHit).toBe(50);
  expect(b.totalRewardGold).toBe(0);
});

test('parseBossDraft rejects empty name, bad weights', () => {
  expect(() => parseBossDraft({ name: '', maxHp: 1, damagePerHit: 1, totalRewardGold: 0, totalRewardExp: 0, weights: [0.2, 0.3, 0.5] })).toThrow();
  expect(() => parseBossDraft({ name: 'x', maxHp: 1, damagePerHit: 1, totalRewardGold: 0, totalRewardExp: 0, weights: [1, 1] })).toThrow();
  expect(() => parseBossDraft({ name: 'x', maxHp: 1, damagePerHit: 1, totalRewardGold: 0, totalRewardExp: 0, weights: [0, 0, 0] })).toThrow();
});
