import { makeState } from './factory';
import { Trial, Boss, Daily } from '../src/domain/types';
import { settleTrials } from '../src/domain/trials';
import { checkInDaily } from '../src/domain/actions';

const trial = (over: Partial<Trial> = {}): Trial => ({
  id: 't1', name: '背单词', icon: '', startDate: '2026-06-01',
  completedDates: [], protectedDates: [], streak: 5, claimedMilestones: [1, 3],
  graduated: false, archived: false,
  milestones: [{ day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 }],
  ...over,
});
const boss = (over: Partial<Boss> = {}): Boss => ({
  id: 'b1', name: 'B', icon: '', maxHp: 100, hp: 100, damagePerHit: 20,
  totalRewardGold: 600, totalRewardExp: 300, weights: [0.2, 0.3, 0.5],
  linkedTaskIds: ['d1'], clearedStages: [], defeated: false, archived: false,
  ...over,
});
const day = (id: string): Daily => ({ id, name: id, gold: 10, exp: 5, icon: '', doneDate: null, archived: false });

test('settleTrials skips an archived trial (streak/milestones untouched on a missed day)', () => {
  const s = makeState({ trials: [trial({ archived: true })] });
  s.restDays = { weekKey: '', remaining: 0 };
  s.inventory.freezeCards = 0;
  settleTrials(s, '2026-06-02'); // 未打卡、无保护：若不跳过会断签清里程碑
  expect(s.trials[0].streak).toBe(5);
  expect(s.trials[0].claimedMilestones).toEqual([1, 3]);
});

test('settleTrials still breaks a non-archived trial (control)', () => {
  const s = makeState({ trials: [trial({ archived: false })] });
  s.restDays = { weekKey: '', remaining: 0 };
  s.inventory.freezeCards = 0;
  settleTrials(s, '2026-06-02');
  expect(s.trials[0].streak).toBe(0);
  expect(s.trials[0].claimedMilestones).toEqual([]);
});

test('applyBossDamageForTask (via checkInDaily) does NOT damage an archived boss', () => {
  const s = makeState({ dailies: [day('d1')], bosses: [boss({ archived: true, linkedTaskIds: ['d1'] })] });
  checkInDaily(s, 'd1', new Date(2026, 5, 1));
  expect(s.bosses[0].hp).toBe(100); // 归档 boss 不掉血
});

test('checkInDaily still damages a non-archived linked boss (control)', () => {
  const s = makeState({ dailies: [day('d1')], bosses: [boss({ archived: false, linkedTaskIds: ['d1'] })] });
  checkInDaily(s, 'd1', new Date(2026, 5, 1));
  expect(s.bosses[0].hp).toBe(80);
});
