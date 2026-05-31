import { makeState } from './factory';
import { Boss, Daily } from '../src/domain/types';
import { checkInDaily } from '../src/domain/actions';

const boss = (over: Partial<Boss> = {}): Boss => ({
  id: 'b1', name: '读完一本书', icon: '👹',
  maxHp: 100, hp: 100, damagePerHit: 20,
  totalRewardGold: 600, totalRewardExp: 300,
  weights: [0.2, 0.3, 0.5], linkedTaskIds: ['a'], clearedStages: [], defeated: false, archived: false,
  ...over,
});
const day = (id: string): Daily => ({ id, name: id, gold: 0, exp: 0, icon: '', doneDate: null, archived: false });
const now = new Date(2026, 5, 1);

test('linked task completion damages boss', () => {
  const s = makeState();
  s.dailies = [day('a')];
  s.bosses = [boss()];
  checkInDaily(s, 'a', now);
  expect(s.bosses[0].hp).toBe(80);
  expect(s.bosses[0].clearedStages).toEqual([]); // 80 > 66.67
});

test('crossing stage 1 threshold grants stage-1 reward', () => {
  const s = makeState();
  s.dailies = [day('a'), day('keep')]; // 2nd incomplete, non-linked daily prevents the perfect-day bonus from skewing gold
  s.bosses = [boss({ hp: 80 })];
  checkInDaily(s, 'a', now); // hp 60 <= 66.67 -> stage 1
  expect(s.bosses[0].clearedStages).toEqual([1]);
  expect(s.player.gold).toBe(Math.floor(600 * 0.2)); // 120
});

test('one hit can cross multiple stages', () => {
  const s = makeState();
  s.dailies = [day('a'), day('keep')]; // 2nd incomplete, non-linked daily prevents the perfect-day bonus from skewing gold
  s.bosses = [boss({ hp: 40, damagePerHit: 40 })]; // -> hp 0: stages 1,2,3 + defeat
  checkInDaily(s, 'a', now);
  expect(s.bosses[0].clearedStages).toEqual([1, 2, 3]);
  expect(s.bosses[0].defeated).toBe(true);
  expect(s.player.gold).toBe(120 + 180 + 300); // 0.2/0.3/0.5 of 600
  expect(s.pendingCelebrations).toContain('bossDefeated');
  expect(s.todayReceipts[0].bossHits![0]).toMatchObject({ damage: 40, clearedStages: [1, 2, 3], defeated: true });
});

test('non-linked task does not damage; defeated boss ignored', () => {
  const s = makeState();
  s.dailies = [day('z')];
  s.bosses = [boss({ linkedTaskIds: ['a'] })];
  checkInDaily(s, 'z', now);
  expect(s.bosses[0].hp).toBe(100);

  const s2 = makeState();
  s2.dailies = [day('a')];
  s2.bosses = [boss({ hp: 20, defeated: true })];
  checkInDaily(s2, 'a', now);
  expect(s2.bosses[0].hp).toBe(20); // untouched
});
