import { DateStr, WeekKey } from './types';

export function dateStr(d: Date): DateStr {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight
}

/** ISO 8601 周（周一起始）。取本地 Y/M/D 当作 UTC 午夜计算，避免时区漂移。 */
export function weekKey(d: Date): WeekKey {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // 移到本周四
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function weekKeyStr(s: DateStr): WeekKey {
  return weekKey(parseDate(s));
}

export function daysFrom(last: DateStr, today: DateStr): DateStr[] {
  const res: DateStr[] = [];
  const cur = parseDate(last);
  const end = parseDate(today);
  while (cur < end) {
    res.push(dateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return res;
}

export function daysBetween(last: DateStr, today: DateStr): number {
  return daysFrom(last, today).length;
}

export function isWeekEnd(s: DateStr): boolean {
  return parseDate(s).getDay() === 0; // Sunday
}
