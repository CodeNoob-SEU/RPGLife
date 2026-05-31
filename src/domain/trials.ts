import { AppState, DateStr, Trial } from './types';
import { dateStr, parseDate, weekKeyStr } from './dateUtils';

/** 以 (completedDates ∪ protectedDates) 中 ≤asOf 的最近一天为终点，向前数连续天数。 */
export function computeStreak(t: Trial, asOf: DateStr): number {
  const set = new Set<DateStr>([...t.completedDates, ...t.protectedDates]);
  let latest: DateStr | null = null;
  for (const day of set) {
    if (day <= asOf && (latest === null || day > latest)) latest = day;
  }
  if (latest === null) return 0;
  let count = 0;
  const cur = parseDate(latest);
  while (set.has(dateStr(cur))) {
    count += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return count;
}

/** 结算过去某日 D 未打卡的非毕业试炼：请假名额优先于冻结卡，用尽则断签+清里程碑。 */
export function settleTrials(state: AppState, D: DateStr): void {
  for (const t of state.trials) {
    if (t.graduated) continue;
    if (D < t.startDate) continue;
    if (t.completedDates.includes(D)) continue;
    const wk = weekKeyStr(D);
    if (state.restDays.remaining > 0 && state.restDays.weekKey === wk) {
      state.restDays.remaining -= 1;
      t.protectedDates.push(D);
    } else if (state.inventory.freezeCards > 0) {
      state.inventory.freezeCards -= 1;
      t.protectedDates.push(D);
    } else {
      t.streak = 0;
      t.claimedMilestones = [];
    }
  }
}
