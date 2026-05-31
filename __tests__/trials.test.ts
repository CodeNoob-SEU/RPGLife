import { makeState } from './factory';
import { Trial } from '../src/domain/types';
import { computeStreak, settleTrials } from '../src/domain/trials';

const trial = (over: Partial<Trial> = {}): Trial => ({
  id: 't1', name: '背单词', icon: '', startDate: '2026-06-01',
  completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [],
  graduated: false, archived: false,
  milestones: [{ day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 }, { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 }],
  ...over,
});

test('computeStreak counts consecutive run ending at latest set-day <= asOf', () => {
  const t = trial({ completedDates: ['2026-06-01', '2026-06-02', '2026-06-03'] });
  expect(computeStreak(t, '2026-06-03')).toBe(3);
  expect(computeStreak(t, '2026-06-05')).toBe(3); // latest <= asOf is 06-03
});

test('computeStreak: protected days count, gaps stop the run', () => {
  const t = trial({ completedDates: ['2026-06-01', '2026-06-03'], protectedDates: ['2026-06-02'] });
  expect(computeStreak(t, '2026-06-03')).toBe(3);
  const t2 = trial({ completedDates: ['2026-06-01', '2026-06-04'] }); // gap at 06-02/03
  expect(computeStreak(t2, '2026-06-04')).toBe(1);
  expect(computeStreak(trial(), '2026-06-03')).toBe(0); // empty
});

test('settleTrials: rest-day protects before freeze card', () => {
  const s = makeState();
  s.restDays = { weekKey: '2026-W23', remaining: 1 };
  s.inventory.freezeCards = 1;
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 1 })];
  settleTrials(s, '2026-06-02'); // missed 06-02 (a W23 day)
  expect(s.restDays.remaining).toBe(0);
  expect(s.inventory.freezeCards).toBe(1); // not touched
  expect(s.trials[0].protectedDates).toContain('2026-06-02');
});

test('settleTrials: freeze card used after rest quota exhausted', () => {
  const s = makeState();
  s.restDays = { weekKey: '2026-W23', remaining: 0 };
  s.inventory.freezeCards = 1;
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 1 })];
  settleTrials(s, '2026-06-02');
  expect(s.inventory.freezeCards).toBe(0);
  expect(s.trials[0].protectedDates).toContain('2026-06-02');
});

test('settleTrials: no protection -> streak 0 and claimedMilestones cleared', () => {
  const s = makeState();
  s.restDays = { weekKey: '2026-W23', remaining: 0 };
  s.inventory.freezeCards = 0;
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 3, claimedMilestones: [1, 3] })];
  settleTrials(s, '2026-06-02');
  expect(s.trials[0].streak).toBe(0);
  expect(s.trials[0].claimedMilestones).toEqual([]);
});

test('settleTrials: skips done-that-day, before-start, and graduated', () => {
  const s = makeState();
  s.restDays = { weekKey: '2026-W23', remaining: 0 };
  s.trials = [
    trial({ id: 'done', completedDates: ['2026-06-02'], streak: 1 }),
    trial({ id: 'future', startDate: '2026-06-10', streak: 0 }),
    trial({ id: 'grad', graduated: true, streak: 5 }),
  ];
  settleTrials(s, '2026-06-02');
  expect(s.trials[0].streak).toBe(1);
  expect(s.trials[1].streak).toBe(0);
  expect(s.trials[2].streak).toBe(5);
});
