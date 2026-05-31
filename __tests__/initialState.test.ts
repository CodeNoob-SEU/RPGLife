import { createInitialState } from '../src/domain/initialState';

test('createInitialState seeds placeholder content and valid config', () => {
  const s = createInitialState(new Date(2026, 5, 1));
  expect(s.version).toBe(1);
  expect(s.dailies.length).toBe(4);
  expect(s.weeklies.length).toBe(3);
  expect(s.trials.length).toBe(1);
  expect(s.bosses.length).toBe(1);
  // 示例 Boss 关联"阅读"每日任务
  const reading = s.dailies.find((d) => d.name.includes('阅读'))!;
  expect(s.bosses[0].linkedTaskIds).toContain(reading.id);
  expect(s.inventory.freezeCards).toBe(1);
  expect(s.restDays.weekKey).toBe('2026-W23');
  expect(s.player.lastActiveDate).toBeNull(); // 首次 rollover 时设置
  expect(s.config.cashOutThreshold).toBe(1000);
});
