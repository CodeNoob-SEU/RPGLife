import { makeState } from './factory';
import { Daily } from '../src/domain/types';
import { processRollover } from '../src/domain/settlement';

const D = (id: string, g: number, doneDate: string | null): Daily =>
  ({ id, name: id, gold: g, exp: 0, icon: '', doneDate, archived: false });

test('first run only sets lastActiveDate and rest quota', () => {
  const s = makeState();
  processRollover(s, new Date(2026, 5, 1));
  expect(s.player.lastActiveDate).toBe('2026-06-01');
  expect(s.restDays.weekKey).toBe('2026-W23');
  expect(s.ledger).toHaveLength(0);
});

test('same day is a no-op', () => {
  const s = makeState();
  s.player.lastActiveDate = '2026-06-01';
  s.dailies = [D('a', 20, null)];
  processRollover(s, new Date(2026, 5, 1));
  expect(s.ledger).toHaveLength(0);
});

test('one day gap settles that single day', () => {
  const s = makeState();
  s.player.gold = 100;
  s.player.lastActiveDate = '2026-06-01';
  s.dailies = [D('a', 20, null)]; // missed on 06-01
  processRollover(s, new Date(2026, 5, 2));
  expect(s.player.gold).toBe(90); // floor(20*0.5)=10
  expect(s.player.lastActiveDate).toBe('2026-06-02');
  expect(s.history['2026-06-01'].status).toBe('missed');
  expect(s.todayReceipts).toEqual([]);
});

test('multi-day gap settles each elapsed day in order', () => {
  const s = makeState();
  s.player.gold = 100;
  s.player.lastActiveDate = '2026-06-01';
  s.dailies = [D('a', 20, null)];
  processRollover(s, new Date(2026, 5, 4)); // settles 06-01,06-02,06-03 => 3*10
  expect(s.player.gold).toBe(70);
  expect(Object.keys(s.history)).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
});

test('crossing week settles weeklies on Sunday and refills rest quota', () => {
  const s = makeState();
  s.player.gold = 200;
  s.player.lastActiveDate = '2026-06-07'; // Sunday of W23
  s.weeklies = [{ id: 'w', name: 'w', gold: 100, exp: 0, icon: '', doneWeek: null, archived: false }];
  processRollover(s, new Date(2026, 5, 8)); // settle 06-07 (week end) -> weekly penalty 50
  expect(s.player.gold).toBe(150);
  expect(s.restDays.weekKey).toBe('2026-W24');
});

test('long absence (>7 days) waives gold penalties, marks rest, sets notice', () => {
  const s = makeState();
  s.player.gold = 100;
  s.player.lastActiveDate = '2026-06-01';
  s.dailies = [D('a', 20, null)];
  processRollover(s, new Date(2026, 5, 12)); // gap 11 > 7
  expect(s.player.gold).toBe(100); // no penalty
  expect(s.pendingNotice).toBe('longAbsence');
  expect(s.history['2026-06-01'].status).toBe('rest');
});

test('rollover clears yesterday todayReceipts', () => {
  const s = makeState();
  s.player.lastActiveDate = '2026-06-01';
  s.todayReceipts = [{ rid: 'x', kind: 'daily', taskId: 'a', date: '2026-06-01', goldDelta: 10, expDelta: 5 }];
  processRollover(s, new Date(2026, 5, 2));
  expect(s.todayReceipts).toEqual([]);
});
