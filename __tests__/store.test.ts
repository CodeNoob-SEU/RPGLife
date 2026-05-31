import { createStore } from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';
import { createInitialState } from '../src/domain/initialState';
import { createGameActions, GameStore } from '../src/store/gameActions';

function makeStore() {
  return createStore<GameStore>()(
    immer((set, get) => ({
      ...createInitialState(new Date(2026, 5, 1)),
      actions: createGameActions(set as any, get as any), // cast bridges zustand immer-middleware set typing
    }))
  );
}
const now = new Date(2026, 5, 1);

test('checkInDaily action updates gold and exp', () => {
  const s = makeStore();
  s.getState().actions.checkInDaily('d-water', now); // seed daily: 10g/5xp
  expect(s.getState().player.gold).toBe(10);
  expect(s.getState().player.expTotal).toBe(5);
});

test('undo action reverses a check-in', () => {
  const s = makeStore();
  s.getState().actions.checkInDaily('d-water', now);
  const rid = s.getState().todayReceipts[0].rid;
  s.getState().actions.undo(rid, now);
  expect(s.getState().player.gold).toBe(0);
  expect(s.getState().todayReceipts).toHaveLength(0);
});

test('addDaily appends a daily with a generated id; archiveDaily archives it', () => {
  const s = makeStore();
  const before = s.getState().dailies.length;
  s.getState().actions.addDaily('冥想 10 分钟', 12, 6, '🧘');
  expect(s.getState().dailies.length).toBe(before + 1);
  const added = s.getState().dailies[s.getState().dailies.length - 1];
  expect(added.name).toBe('冥想 10 分钟');
  expect(added.id).toMatch(/^daily-/);
  s.getState().actions.archiveDaily(added.id);
  expect(s.getState().dailies.find((d) => d.id === added.id)!.archived).toBe(true);
});

test('setConfig patches config; consumeCelebration shifts the queue', () => {
  const s = makeStore();
  s.getState().actions.setConfig({ goldToYuanRate: 50 });
  expect(s.getState().config.goldToYuanRate).toBe(50);
  ['d-water', 'd-exercise', 'd-read', 'd-sleep'].forEach((id) => s.getState().actions.checkInDaily(id, now));
  expect(s.getState().pendingCelebrations.length).toBeGreaterThan(0);
  const n = s.getState().pendingCelebrations.length;
  s.getState().actions.consumeCelebration();
  expect(s.getState().pendingCelebrations.length).toBe(n - 1);
});

test('reset restores a fresh initial state', () => {
  const s = makeStore();
  s.getState().actions.checkInDaily('d-water', now);
  s.getState().actions.reset(now);
  expect(s.getState().player.gold).toBe(0);
  expect(s.getState().todayReceipts).toHaveLength(0);
});
