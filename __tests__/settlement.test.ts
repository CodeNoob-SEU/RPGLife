import { makeState } from './factory';
import { Daily, Weekly } from '../src/domain/types';
import { ensureRestDayQuota, settleDailies, settleWeeklies, recordHistory } from '../src/domain/settlement';

const D = (g: number, doneDate: string | null): Daily =>
  ({ id: 'd' + g + (doneDate ?? ''), name: 'd', gold: g, exp: 0, icon: '', doneDate, archived: false });
const now = new Date(2026, 5, 2);

test('ensureRestDayQuota refills only when week changes (idempotent)', () => {
  const s = makeState();
  ensureRestDayQuota(s, '2026-W23');
  expect(s.restDays).toEqual({ weekKey: '2026-W23', remaining: 1 });
  s.restDays.remaining = 0;
  ensureRestDayQuota(s, '2026-W23'); // same week -> no refill
  expect(s.restDays.remaining).toBe(0);
  ensureRestDayQuota(s, '2026-W24'); // new week -> refill
  expect(s.restDays.remaining).toBe(1);
});

test('settleDailies penalizes incomplete at 50%, floors, sums', () => {
  const s = makeState();
  s.player.gold = 100;
  s.dailies = [D(10, '2026-06-01'), D(20, null), D(30, null)]; // 2 incomplete on 06-01
  settleDailies(s, '2026-06-01', now);
  // floor(20*0.5)+floor(30*0.5) = 10+15 = 25
  expect(s.player.gold).toBe(75);
  expect(s.ledger[0]).toMatchObject({ date: '2026-06-01', type: 'penalty', amount: -25 });
});

test('settleDailies caps at dailyPenaltyCap', () => {
  const s = makeState();
  s.player.gold = 500;
  s.dailies = [D(300, null), D(300, null)]; // floor sum = 300, cap 100
  settleDailies(s, '2026-06-01', now);
  expect(s.player.gold).toBe(400);
});

test('settleDailies never below zero', () => {
  const s = makeState();
  s.player.gold = 5;
  s.dailies = [D(100, null)]; // penalty 50 capped... 50 > gold 5
  settleDailies(s, '2026-06-01', now);
  expect(s.player.gold).toBe(0);
});

test('settleDailies all-done -> no penalty, no ledger', () => {
  const s = makeState();
  s.player.gold = 100;
  s.dailies = [D(10, '2026-06-01')];
  settleDailies(s, '2026-06-01', now);
  expect(s.player.gold).toBe(100);
  expect(s.ledger).toHaveLength(0);
});

test('settleWeeklies penalizes incomplete weeklies for the week of D', () => {
  const s = makeState();
  s.player.gold = 200;
  const W = (g: number, done: string | null): Weekly =>
    ({ id: 'w' + g, name: 'w', gold: g, exp: 0, icon: '', doneWeek: done, archived: false });
  s.weeklies = [W(100, '2026-W23'), W(80, null)]; // 06-07 is Sunday of W23
  settleWeeklies(s, '2026-06-07', now); // floor(80*0.5)=40
  expect(s.player.gold).toBe(160);
  expect(s.ledger[0]).toMatchObject({ date: '2026-06-07', type: 'penalty', amount: -40 });
});

test('recordHistory computes status and goldNet from ledger of that date', () => {
  const s = makeState();
  s.dailies = [D(10, '2026-06-01'), D(20, null)];
  s.ledger = [
    { ts: 0, date: '2026-06-01', type: 'earn', amount: 10, note: '' },
    { ts: 0, date: '2026-06-01', type: 'penalty', amount: -10, note: '' },
  ];
  recordHistory(s, '2026-06-01', false);
  expect(s.history['2026-06-01']).toEqual({ status: 'partial', dailiesDone: 1, dailiesTotal: 2, goldNet: 0 });
});

test('recordHistory: perfect, missed, forceRest, and no-dailies', () => {
  const s = makeState();
  s.dailies = [D(10, '2026-06-01')];
  recordHistory(s, '2026-06-01', false);
  expect(s.history['2026-06-01'].status).toBe('perfect');

  const s2 = makeState();
  s2.dailies = [D(10, null)];
  recordHistory(s2, '2026-06-01', false);
  expect(s2.history['2026-06-01'].status).toBe('missed');

  const s3 = makeState();
  s3.dailies = [D(10, null)];
  recordHistory(s3, '2026-06-01', true);
  expect(s3.history['2026-06-01'].status).toBe('rest');

  const s4 = makeState(); // no dailies
  recordHistory(s4, '2026-06-01', false);
  expect(s4.history['2026-06-01'].status).toBe('rest');
});
