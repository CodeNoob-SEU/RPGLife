import { dateStr, parseDate, weekKey, weekKeyStr, daysFrom, daysBetween, isWeekEnd } from '../src/domain/dateUtils';

test('dateStr formats local Y-M-D with padding', () => {
  expect(dateStr(new Date(2026, 0, 5))).toBe('2026-01-05'); // Jan=0
  expect(dateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
});

test('parseDate round-trips dateStr', () => {
  expect(dateStr(parseDate('2026-05-31'))).toBe('2026-05-31');
});

test('daysFrom is [last, today): includes last, excludes today', () => {
  expect(daysFrom('2026-06-01', '2026-06-03')).toEqual(['2026-06-01', '2026-06-02']);
  expect(daysFrom('2026-06-01', '2026-06-01')).toEqual([]);
});

test('daysFrom crosses month and year boundaries', () => {
  expect(daysFrom('2026-01-30', '2026-02-02')).toEqual(['2026-01-30', '2026-01-31', '2026-02-01']);
  expect(daysFrom('2026-12-31', '2027-01-02')).toEqual(['2026-12-31', '2027-01-01']);
});

test('daysBetween counts days', () => {
  expect(daysBetween('2026-06-01', '2026-06-09')).toBe(8);
  expect(daysBetween('2026-06-01', '2026-06-01')).toBe(0);
});

test('weekKey gives ISO week (Mon start)', () => {
  // 2026-01-01 is a Thursday -> ISO week 1 of 2026
  expect(weekKey(new Date(2026, 0, 1))).toBe('2026-W01');
  // 2026-06-01 is a Monday -> W23
  expect(weekKeyStr('2026-06-01')).toBe('2026-W23');
});

test('isWeekEnd is true only on Sunday', () => {
  expect(isWeekEnd('2026-06-07')).toBe(true);  // Sunday
  expect(isWeekEnd('2026-06-08')).toBe(false); // Monday
});
