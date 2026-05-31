import { makeState } from './factory';
import { Trial } from '../src/domain/types';
import { checkInTrial } from '../src/domain/actions';

const trial = (over: Partial<Trial> = {}): Trial => ({
  id: 't1', name: '背单词', icon: '📖', startDate: '2026-06-01',
  completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false,
  milestones: [{ day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 }, { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 }],
  ...over,
});

test('first check-in advances streak to 1 and claims D1', () => {
  const s = makeState();
  s.trials = [trial()];
  checkInTrial(s, 't1', new Date(2026, 5, 1));
  expect(s.trials[0].streak).toBe(1);
  expect(s.trials[0].claimedMilestones).toEqual([1]);
  expect(s.player.gold).toBe(20);
  expect(s.todayReceipts[0].claimedMilestones).toEqual([1]);
});

test('milestone not re-claimed if already claimed', () => {
  const s = makeState();
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 1, claimedMilestones: [1] })];
  checkInTrial(s, 't1', new Date(2026, 5, 2)); // streak 2, no new milestone (D3 not reached)
  expect(s.player.gold).toBe(0);
  expect(s.trials[0].claimedMilestones).toEqual([1]);
});

test('reaching day 14 graduates: adds daily, sets graduated, D14 reward once', () => {
  const s = makeState();
  // 13 consecutive done days 06-01..06-13, claimed 1/3/7
  const completed: string[] = [];
  for (let d = 1; d <= 13; d++) completed.push(`2026-06-${String(d).padStart(2, '0')}`);
  s.trials = [trial({ completedDates: completed, streak: 13, claimedMilestones: [1, 3, 7] })];
  checkInTrial(s, 't1', new Date(2026, 5, 14)); // streak 14
  expect(s.trials[0].streak).toBe(14);
  expect(s.trials[0].graduated).toBe(true);
  expect(s.player.gold).toBe(500); // D14
  expect(s.dailies.find((d) => d.id === 'daily-from-t1')).toBeTruthy();
  expect(s.todayReceipts[0].graduation).toEqual({ addedDailyId: 'daily-from-t1' });
  expect(s.pendingCelebrations).toContain('graduation');
});

test('check-in idempotent same day; skips graduated', () => {
  const s = makeState();
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 1 })];
  checkInTrial(s, 't1', new Date(2026, 5, 1)); // already done today
  expect(s.todayReceipts).toHaveLength(0);
  s.trials[0].graduated = true;
  checkInTrial(s, 't1', new Date(2026, 5, 2));
  expect(s.todayReceipts).toHaveLength(0);
});
