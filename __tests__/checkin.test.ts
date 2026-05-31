import { makeState } from './factory';
import { Daily, Weekly } from '../src/domain/types';
import { checkInDaily, checkInWeekly } from '../src/domain/actions';

const day = (id: string, gold: number, exp: number): Daily =>
  ({ id, name: id, gold, exp, icon: '', doneDate: null, archived: false });
const now = new Date(2026, 5, 1); // 2026-06-01 (Mon, W23)

test('checkInDaily marks done, adds gold/exp, pushes receipt', () => {
  const s = makeState();
  s.dailies = [day('a', 30, 60), day('b', 10, 0)];
  checkInDaily(s, 'a', now);
  expect(s.dailies[0].doneDate).toBe('2026-06-01');
  expect(s.player.gold).toBe(30);
  expect(s.player.level).toBe(2); // 60 exp -> L2 (needs 50), exp 10
  expect(s.todayReceipts).toHaveLength(1);
  expect(s.todayReceipts[0]).toMatchObject({ rid: 'daily:a:2026-06-01', goldDelta: 30, expDelta: 60 });
});

test('checkInDaily is idempotent same day', () => {
  const s = makeState();
  s.dailies = [day('a', 30, 0), day('b', 10, 0)]; // 2 dailies: re-checking 'a' must not double-credit (and must not complete the set / trigger perfect bonus)
  checkInDaily(s, 'a', now);
  checkInDaily(s, 'a', now);
  expect(s.player.gold).toBe(30);
  expect(s.todayReceipts).toHaveLength(1);
});

test('perfect day bonus when last daily completed', () => {
  const s = makeState();
  s.dailies = [day('a', 10, 0), day('b', 10, 0)];
  checkInDaily(s, 'a', now);
  expect(s.dailyPerfect).toBeNull();
  checkInDaily(s, 'b', now);
  expect(s.dailyPerfect).toMatchObject({ date: '2026-06-01', gold: 50, exp: 20 });
  expect(s.player.gold).toBe(10 + 10 + 50);
  expect(s.pendingCelebrations).toContain('perfectDay');
});

test('checkInWeekly marks done and gives perfect week bonus', () => {
  const s = makeState();
  const wk = (id: string, g: number): Weekly => ({ id, name: id, gold: g, exp: 0, icon: '', doneWeek: null, archived: false });
  s.weeklies = [wk('a', 100)];
  checkInWeekly(s, 'a', now);
  expect(s.weeklies[0].doneWeek).toBe('2026-W23');
  expect(s.player.gold).toBe(100 + 200); // reward + perfect week
  expect(s.weeklyPerfect).toMatchObject({ week: '2026-W23', gold: 200 });
  expect(s.pendingCelebrations).toContain('perfectWeek');
});
