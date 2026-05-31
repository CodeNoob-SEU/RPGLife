import { Trial, HistoryEntry, LedgerEntry } from '../src/domain/types';
import { bestTrialStreak, currentDayStreak, completionRate, heatmapCells, goldTrend, lifetimeTotals } from '../src/domain/stats';

const H = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({ status: 'perfect', dailiesDone: 0, dailiesTotal: 0, goldNet: 0, ...over });
const trial = (over: Partial<Trial> = {}): Trial => ({
  id: 't', name: '', icon: '', startDate: '2026-05-01', completedDates: [], protectedDates: [],
  streak: 0, claimedMilestones: [], graduated: false, archived: false, milestones: [], ...over,
});

test('bestTrialStreak 取最长连续段', () => {
  const t = trial({ completedDates: ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-05', '2026-05-06'] });
  expect(bestTrialStreak(t)).toBe(3);
});

test('bestTrialStreak 合并保护日', () => {
  const t = trial({ completedDates: ['2026-05-01', '2026-05-03'], protectedDates: ['2026-05-02'] });
  expect(bestTrialStreak(t)).toBe(3);
});

test('bestTrialStreak 空集合为 0', () => {
  expect(bestTrialStreak(trial())).toBe(0);
});

test('completionRate = 窗口内 done/total', () => {
  const history = { '2026-06-01': H({ dailiesDone: 2, dailiesTotal: 4 }), '2026-06-02': H({ dailiesDone: 4, dailiesTotal: 4 }) };
  expect(completionRate(history, '2026-06-02', 7)).toBeCloseTo(6 / 8);
});

test('completionRate 无数据为 0', () => {
  expect(completionRate({}, '2026-06-02', 7)).toBe(0);
});

test('heatmapCells 末位为 asOf，按 status 映射 level', () => {
  const history = { '2026-06-02': H({ status: 'perfect' }), '2026-06-01': H({ status: 'missed' }) };
  const cells = heatmapCells(history, '2026-06-02', 3); // 05-31, 06-01, 06-02
  expect(cells).toHaveLength(3);
  expect(cells[2]).toMatchObject({ date: '2026-06-02', level: 4 });
  expect(cells[1]).toMatchObject({ date: '2026-06-01', level: 1 });
  expect(cells[0]).toMatchObject({ date: '2026-05-31', level: 0 });
});

test('goldTrend 取窗口内每日 goldNet（旧→新）', () => {
  const history = { '2026-06-02': H({ goldNet: 50 }), '2026-06-01': H({ goldNet: -10 }) };
  expect(goldTrend(history, '2026-06-02', 2)).toEqual([
    { date: '2026-06-01', goldNet: -10 },
    { date: '2026-06-02', goldNet: 50 },
  ]);
});

test('lifetimeTotals 按 ledger 类型汇总', () => {
  const ledger: LedgerEntry[] = [
    { ts: 0, date: '2026-06-01', type: 'earn', amount: 10, note: '' },
    { ts: 0, date: '2026-06-01', type: 'earn', amount: 20, note: '' },
    { ts: 0, date: '2026-06-01', type: 'bonus', amount: 50, note: '' },
    { ts: 0, date: '2026-06-01', type: 'penalty', amount: -20, note: '' },
    { ts: 0, date: '2026-06-01', type: 'purchase', amount: -100, note: '' },
    { ts: 0, date: '2026-06-01', type: 'cashout', amount: -1000, note: '' },
  ];
  const t = lifetimeTotals(ledger);
  expect(t.earned).toBe(80); // earn+bonus 正向
  expect(t.penalties).toBe(20);
  expect(t.spent).toBe(100);
  expect(t.cashedOut).toBe(1000);
  expect(t.tasksCompleted).toBe(2); // earn 条目数
});

test('currentDayStreak 连续非 missed 天数（含今日未记录则从昨日起）', () => {
  const history = { '2026-05-30': H({ status: 'perfect' }), '2026-05-31': H({ status: 'partial' }), '2026-06-01': H({ status: 'perfect' }) };
  expect(currentDayStreak(history, '2026-06-01')).toBe(3);
  const history2 = { '2026-05-30': H({ status: 'missed' }), '2026-05-31': H({ status: 'perfect' }), '2026-06-01': H({ status: 'perfect' }) };
  expect(currentDayStreak(history2, '2026-06-01')).toBe(2);
  // 今日(06-02)未记录 → 从昨日(06-01)起算
  expect(currentDayStreak(history, '2026-06-02')).toBe(3);
});
