import { Trial, HistoryEntry, LedgerEntry, DateStr } from './types';
import { dateStr, parseDate } from './dateUtils';

type History = Record<DateStr, HistoryEntry>;

/** 试炼历史最佳连续天数（completed ∪ protected 中最长的连续日段）。 */
export function bestTrialStreak(t: Trial): number {
  const days = [...new Set([...t.completedDates, ...t.protectedDates])].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const ds of days) {
    if (prev) {
      const p = parseDate(prev);
      p.setDate(p.getDate() + 1);
      run = dateStr(p) === ds ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = ds;
  }
  return best;
}

/** 倒数 n 天（含 asOf），返回旧→新的日期串数组。 */
export function lastNDays(asOf: DateStr, n: number): DateStr[] {
  const out: DateStr[] = [];
  const base = parseDate(asOf);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(dateStr(d));
  }
  return out;
}

const STATUS_LEVEL: Record<HistoryEntry['status'], number> = { missed: 1, rest: 2, partial: 3, perfect: 4 };

/** 热力图：窗口内每天一格，level 0=无记录/1=漏/2=休/3=部分/4=全清。 */
export function heatmapCells(history: History, asOf: DateStr, days: number): Array<{ date: DateStr; level: number }> {
  return lastNDays(asOf, days).map((date) => {
    const h = history[date];
    return { date, level: h ? STATUS_LEVEL[h.status] : 0 };
  });
}

/** 窗口内每日完成率 = Σ dailiesDone / Σ dailiesTotal（无任务则 0）。 */
export function completionRate(history: History, asOf: DateStr, days: number): number {
  let done = 0;
  let total = 0;
  for (const d of lastNDays(asOf, days)) {
    const h = history[d];
    if (h) {
      done += h.dailiesDone;
      total += h.dailiesTotal;
    }
  }
  return total > 0 ? done / total : 0;
}

/** 窗口内每日净金币（旧→新），用于趋势图。 */
export function goldTrend(history: History, asOf: DateStr, days: number): Array<{ date: DateStr; goldNet: number }> {
  return lastNDays(asOf, days).map((date) => ({ date, goldNet: history[date]?.goldNet ?? 0 }));
}

/** 当前连续活跃天数：从 asOf 向前数连续「非 missed」的有记录日；今日未记录则从昨日起算。 */
export function currentDayStreak(history: History, asOf: DateStr): number {
  let count = 0;
  const cur = parseDate(asOf);
  if (!history[dateStr(cur)]) cur.setDate(cur.getDate() - 1);
  while (true) {
    const h = history[dateStr(cur)];
    if (!h || h.status === 'missed') break;
    count += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return count;
}

/** 把流水账导出为 CSV（含表头，字段含逗号/引号/换行时按 RFC4180 转义）。 */
export function ledgerToCSV(ledger: LedgerEntry[]): string {
  const esc = (v: string | number): string => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = 'date,type,amount,expAmount,note';
  const rows = ledger.map((l) => [l.date, l.type, l.amount, l.expAmount ?? '', l.note].map(esc).join(','));
  return [header, ...rows].join('\n');
}

/** 累计统计（按 ledger 类型汇总）。 */
export function lifetimeTotals(ledger: LedgerEntry[]): {
  earned: number; penalties: number; spent: number; cashedOut: number; tasksCompleted: number;
} {
  let earned = 0;
  let penalties = 0;
  let spent = 0;
  let cashedOut = 0;
  let tasksCompleted = 0;
  for (const l of ledger) {
    if (l.type === 'earn' || l.type === 'bonus') earned += Math.max(0, l.amount);
    if (l.type === 'penalty') penalties += Math.abs(l.amount);
    if (l.type === 'purchase') spent += Math.abs(l.amount);
    if (l.type === 'cashout') cashedOut += Math.abs(l.amount);
    if (l.type === 'earn') tasksCompleted += 1;
  }
  return { earned, penalties, spent, cashedOut, tasksCompleted };
}
