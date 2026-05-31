import { makeState } from './factory';
import { evaluateAchievements, ACHIEVEMENTS } from '../src/domain/achievements';

const NOW = new Date(2026, 5, 1);

test('解锁满足条件的成就：记录解锁日期 + 推送庆祝', () => {
  const base = makeState();
  const s = makeState({ player: { ...base.player, level: 5 } });
  const newly = evaluateAchievements(s, NOW);
  expect(newly).toContain('level-5');
  expect(s.achievements.unlockedAt['level-5']).toBe('2026-06-01');
  expect(s.pendingCelebrations.filter((c) => c === 'achievement').length).toBe(newly.length);
});

test('不重复解锁已解锁成就（幂等）', () => {
  const base = makeState();
  const s = makeState({ player: { ...base.player, level: 10 } });
  evaluateAchievements(s, NOW);
  const before = { ...s.achievements.unlockedAt };
  s.pendingCelebrations = [];
  const again = evaluateAchievements(s, NOW);
  expect(again).toEqual([]);
  expect(s.pendingCelebrations).toEqual([]);
  expect(s.achievements.unlockedAt).toEqual(before);
});

test('屠龙者：击败 Boss 解锁', () => {
  const s = makeState({ bosses: [{ id: 'b', name: 'B', icon: '', maxHp: 10, hp: 0, damagePerHit: 1, totalRewardGold: 0, totalRewardExp: 0, weights: [0.2, 0.3, 0.5], linkedTaskIds: [], clearedStages: [1, 2, 3], defeated: true, archived: false }] });
  expect(evaluateAchievements(s, NOW)).toContain('boss-slayer');
});

test('七日之约：试炼最佳连击 ≥ 7 解锁', () => {
  const completedDates = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07'];
  const s = makeState({ trials: [{ id: 't', name: '', icon: '', startDate: '2026-05-01', completedDates, protectedDates: [], streak: 7, claimedMilestones: [], graduated: false, archived: false, milestones: [] }] });
  expect(evaluateAchievements(s, NOW)).toContain('streak-7');
});

test('杂务大师：完成 10 个一次性委托解锁', () => {
  const oneoffs = Array.from({ length: 10 }).map((_, i) => ({ id: 'o' + i, name: '', gold: 0, exp: 0, icon: '', doneDate: '2026-05-01', archived: false }));
  const s = makeState({ oneoffs });
  expect(evaluateAchievements(s, NOW)).toContain('collector');
});

test('默认空 state 不误解锁（仅在满足条件时）', () => {
  const s = makeState();
  expect(evaluateAchievements(s, NOW)).toEqual([]);
});

test('全部成就 id 唯一', () => {
  const ids = ACHIEVEMENTS.map((a) => a.id);
  expect(new Set(ids).size).toBe(ids.length);
});
