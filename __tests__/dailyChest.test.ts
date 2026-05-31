import { makeState } from './factory';
import { openDailyChest } from '../src/domain/actions';
import { addGold, applyExpDelta } from '../src/domain/economy';

const NOW = new Date(2026, 5, 1);

test('开启每日宝箱：发放 [min,max] 区间金币、记录日期、返回奖励', () => {
  const s = makeState();
  s.config.dailyChestMin = 10;
  s.config.dailyChestMax = 60;
  const reward = openDailyChest(s, NOW, 0.5);
  expect(reward).toBe(10 + Math.floor(0.5 * 51)); // 10 + 25 = 35
  expect(s.player.gold).toBe(reward);
  expect(s.dailyChest).toEqual({ date: '2026-06-01' });
  expect(s.ledger.some((l) => l.note === '每日宝箱')).toBe(true);
});

test('rand 边界：0→min，≈1→max', () => {
  const a = makeState(); a.config.dailyChestMin = 10; a.config.dailyChestMax = 60;
  expect(openDailyChest(a, NOW, 0)).toBe(10);
  const b = makeState(); b.config.dailyChestMin = 10; b.config.dailyChestMax = 60;
  expect(openDailyChest(b, NOW, 0.999)).toBe(60);
});

test('同日重复开启无效（返回 0、金币不变）', () => {
  const s = makeState();
  openDailyChest(s, NOW, 0.5);
  const goldAfterFirst = s.player.gold;
  const second = openDailyChest(s, NOW, 0.9);
  expect(second).toBe(0);
  expect(s.player.gold).toBe(goldAfterFirst);
});

test('次日可再次开启', () => {
  const s = makeState();
  openDailyChest(s, NOW, 0.5);
  const reward2 = openDailyChest(s, new Date(2026, 5, 2), 0.5);
  expect(reward2).toBeGreaterThan(0);
  expect(s.dailyChest).toEqual({ date: '2026-06-02' });
});

test('config 缺失宝箱区间时用默认值兜底（绝不产生 NaN）', () => {
  const s = makeState();
  (s.config as any).dailyChestMin = undefined;
  (s.config as any).dailyChestMax = undefined;
  const reward = openDailyChest(s, NOW, 0);
  expect(reward).toBe(10);
  expect(Number.isFinite(s.player.gold)).toBe(true);
  expect(s.player.gold).toBe(10);
});

test('addGold / applyExpDelta 拒绝非有限值（防 NaN 污染金币与经验）', () => {
  const s = makeState();
  s.player.gold = 100;
  addGold(s, NaN, 'earn', 'x', NOW);
  expect(s.player.gold).toBe(100);
  applyExpDelta(s, Infinity);
  expect(s.player.exp).toBe(0);
  expect(Number.isFinite(s.player.level)).toBe(true);
});
