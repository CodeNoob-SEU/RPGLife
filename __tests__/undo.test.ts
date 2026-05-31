import { makeState } from './factory';
import { Boss, Daily, Trial, Weekly } from '../src/domain/types';
import { checkInDaily, checkInWeekly, checkInTrial, undoCheckIn } from '../src/domain/actions';

const day = (id: string, g: number, e: number): Daily => ({ id, name: id, gold: g, exp: e, icon: '', doneDate: null, archived: false });
const now = new Date(2026, 5, 1);

test('undo daily fully reverses gold, exp, doneDate, receipt', () => {
  const s = makeState();
  s.dailies = [day('a', 30, 60), day('b', 10, 0)];
  checkInDaily(s, 'a', now); // L2, gold 30
  undoCheckIn(s, 'daily:a:2026-06-01', now);
  expect(s.dailies[0].doneDate).toBeNull();
  expect(s.player.gold).toBe(0);
  expect(s.player.level).toBe(1);
  expect(s.player.exp).toBe(0);
  expect(s.todayReceipts).toHaveLength(0);
});

test('undo that breaks a perfect day reverses the perfect bonus', () => {
  const s = makeState();
  s.dailies = [day('a', 10, 0), day('b', 10, 0)];
  checkInDaily(s, 'a', now);
  checkInDaily(s, 'b', now); // perfect: +50
  expect(s.player.gold).toBe(70);
  undoCheckIn(s, 'daily:b:2026-06-01', now);
  expect(s.player.gold).toBe(10); // 70 - 10(b) - 50(perfect)
  expect(s.dailyPerfect).toBeNull();
});

test('undo trial removes completedDate, un-claims milestone, recomputes streak', () => {
  const s = makeState();
  s.trials = [{ id: 't1', name: 't', icon: '', startDate: '2026-06-01', completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, archived: false, milestones: [{ day: 1, gold: 20, exp: 10 }] } as Trial];
  checkInTrial(s, 't1', now); // streak 1, claim D1, +20
  undoCheckIn(s, 'trial:t1:2026-06-01', now);
  expect(s.trials[0].completedDates).toEqual([]);
  expect(s.trials[0].claimedMilestones).toEqual([]);
  expect(s.trials[0].streak).toBe(0);
  expect(s.player.gold).toBe(0);
});

test('undo a graduation: reverts graduated flag and removes added daily', () => {
  const s = makeState();
  const completed: string[] = [];
  for (let d = 1; d <= 13; d++) completed.push(`2026-06-${String(d).padStart(2, '0')}`);
  s.trials = [{ id: 't1', name: 't', icon: '', startDate: '2026-06-01', completedDates: completed, protectedDates: [], streak: 13, claimedMilestones: [1, 3, 7], graduated: false, archived: false, milestones: [{ day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 }, { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 }] } as Trial];
  checkInTrial(s, 't1', new Date(2026, 5, 14));
  expect(s.trials[0].graduated).toBe(true);
  undoCheckIn(s, 'trial:t1:2026-06-14', new Date(2026, 5, 14));
  expect(s.trials[0].graduated).toBe(false);
  expect(s.dailies.find((d) => d.id === 'daily-from-t1')).toBeUndefined();
  expect(s.trials[0].claimedMilestones).toEqual([1, 3, 7]);
  expect(s.trials[0].streak).toBe(13);
});

test('undo a boss hit heals hp, un-clears stages, reverts defeat and reward', () => {
  const s = makeState();
  s.dailies = [day('a', 0, 0)];
  s.bosses = [{ id: 'b1', name: 'B', icon: '', maxHp: 100, hp: 40, damagePerHit: 40, totalRewardGold: 600, totalRewardExp: 300, weights: [0.2, 0.3, 0.5], linkedTaskIds: ['a'], clearedStages: [], defeated: false, archived: false } as Boss];
  checkInDaily(s, 'a', now); // hp 0, stages 1/2/3, defeated, +600 gold
  undoCheckIn(s, 'daily:a:2026-06-01', now);
  expect(s.bosses[0].hp).toBe(40);
  expect(s.bosses[0].clearedStages).toEqual([]);
  expect(s.bosses[0].defeated).toBe(false);
  expect(s.player.gold).toBe(0);
});

test('check-in -> undo -> check-in is self-consistent (no leak)', () => {
  const s = makeState();
  s.dailies = [day('a', 30, 10), day('b', 0, 0)]; // 2nd incomplete daily avoids the perfect-day bonus confound
  checkInDaily(s, 'a', now);
  undoCheckIn(s, 'daily:a:2026-06-01', now);
  checkInDaily(s, 'a', now);
  expect(s.player.gold).toBe(30);
  expect(s.player.expTotal).toBe(10);
  expect(s.todayReceipts).toHaveLength(1);
});

test('undo no-op for unknown rid', () => {
  const s = makeState();
  undoCheckIn(s, 'nope', now);
  expect(s.player.gold).toBe(0);
});

test('undo weekly that breaks perfect week reverses the perfect-week bonus', () => {
  const s = makeState();
  const wk = (id: string, g: number): Weekly => ({ id, name: id, gold: g, exp: 0, icon: '', doneWeek: null, archived: false });
  s.weeklies = [wk('a', 100), wk('b', 100)];
  checkInWeekly(s, 'a', now);
  checkInWeekly(s, 'b', now); // perfect week: +200
  expect(s.player.gold).toBe(400); // 100 + 100 + 200
  undoCheckIn(s, 'weekly:b:2026-06-01', now);
  expect(s.player.gold).toBe(100); // 400 - 100(b) - 200(perfect week)
  expect(s.weeklyPerfect).toBeNull();
});

test('undo reverses a multi-level exp gain exactly', () => {
  const s = makeState();
  s.dailies = [day('big', 0, 200), day('keep', 0, 0)]; // 200 exp -> L3 exp50; keep stays incomplete so no perfect bonus
  checkInDaily(s, 'big', now);
  expect(s.player.level).toBe(3);
  expect(s.player.exp).toBe(50);
  expect(s.player.expTotal).toBe(200);
  undoCheckIn(s, 'daily:big:2026-06-01', now);
  expect(s.player.level).toBe(1);
  expect(s.player.exp).toBe(0);
  expect(s.player.expTotal).toBe(0);
});

test('undo un-clears only this receipt\'s boss stages, preserving an earlier-cleared stage', () => {
  const s = makeState();
  s.dailies = [day('a', 0, 0), day('keep', 0, 0)];
  s.bosses = [{ id: 'b1', name: 'B', icon: '', maxHp: 100, hp: 60, damagePerHit: 30, totalRewardGold: 600, totalRewardExp: 300, weights: [0.2, 0.3, 0.5], linkedTaskIds: ['a'], clearedStages: [1], defeated: false, archived: false } as Boss];
  checkInDaily(s, 'a', now); // hp 30 <= 33.33 -> stage 2 cleared this hit
  expect(s.bosses[0].clearedStages).toEqual([1, 2]);
  undoCheckIn(s, 'daily:a:2026-06-01', now);
  expect(s.bosses[0].hp).toBe(60);
  expect(s.bosses[0].clearedStages).toEqual([1]); // pre-existing stage 1 preserved; only this hit's stage 2 removed
});
