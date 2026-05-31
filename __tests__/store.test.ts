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

test('archiveTrial soft-archives (keeps the trial, sets archived=true)', () => {
  const s = makeStore();
  const id = s.getState().trials[0].id; // seed 't-words'
  s.getState().actions.archiveTrial(id);
  const t = s.getState().trials.find((x) => x.id === id);
  expect(t).toBeDefined();          // 不物理删除
  expect(t!.archived).toBe(true);
});

test('archiveBoss soft-archives a boss', () => {
  const s = makeStore();
  const id = s.getState().bosses[0].id; // seed 'b-book'
  s.getState().actions.archiveBoss(id);
  expect(s.getState().bosses.find((x) => x.id === id)!.archived).toBe(true);
});

test('editTrial patches name/icon', () => {
  const s = makeStore();
  const id = s.getState().trials[0].id;
  s.getState().actions.editTrial(id, { name: '每天背 20 个单词', icon: '📚' });
  const t = s.getState().trials.find((x) => x.id === id)!;
  expect(t.name).toBe('每天背 20 个单词');
  expect(t.icon).toBe('📚');
});

test('editBoss patches fields and clamps hp to maxHp', () => {
  const s = makeStore();
  const id = s.getState().bosses[0].id;
  s.getState().actions.editBoss(id, { name: '读完两本书', maxHp: 50 });
  const b = s.getState().bosses.find((x) => x.id === id)!;
  expect(b.name).toBe('读完两本书');
  expect(b.maxHp).toBe(50);
  expect(b.hp).toBe(50); // 原 hp=200 被精确夹到 50
});

test('addBoss appends with given weights and full hp', () => {
  const s = makeStore();
  const before = s.getState().bosses.length;
  s.getState().actions.addBoss({ name: '健身 30 天', maxHp: 300, damagePerHit: 30, totalRewardGold: 900, totalRewardExp: 450, linkedTaskIds: ['d-exercise'], weights: [0.1, 0.4, 0.5] });
  expect(s.getState().bosses.length).toBe(before + 1);
  const b = s.getState().bosses[s.getState().bosses.length - 1];
  expect(b.id).toMatch(/^boss-/);
  expect(b.hp).toBe(300);
  expect(b.weights).toEqual([0.1, 0.4, 0.5]);
  expect(b.archived).toBe(false);
});

test('checkInTrial is a no-op on an archived (soft-archived) trial', () => {
  const s = makeStore();
  const id = s.getState().trials[0].id;
  s.getState().actions.archiveTrial(id);            // soft-archive
  const goldBefore = s.getState().player.gold;
  s.getState().actions.checkInTrial(id, now);       // must do nothing
  const t = s.getState().trials.find((x) => x.id === id)!;
  expect(t.completedDates).toHaveLength(0);
  expect(s.getState().player.gold).toBe(goldBefore);
});

test('importState deep-fills missing fields via migrate and scrubs transient signals', () => {
  const s = makeStore();
  // hand-editable JSON: keeps gold, omits bosses/config, carries stale pending* signals
  const partial: any = {
    version: 1,
    player: { name: 'X', level: 1, exp: 0, expTotal: 0, gold: 777, avatarTier: 0, lastActiveDate: '2026-06-01' },
    dailies: [],
    pendingNotice: 'longAbsence',
    pendingCelebrations: ['levelUp'],
  };
  s.getState().actions.importState(partial);
  const st = s.getState();
  expect(st.player.gold).toBe(777);               // persisted value kept
  expect(Array.isArray(st.bosses)).toBe(true);    // missing array backfilled by migrate
  expect(st.config.cashOutThreshold).toBe(1000);  // missing config backfilled by migrate
  expect(st.pendingNotice).toBeNull();            // transient scrubbed
  expect(st.pendingCelebrations).toEqual([]);     // transient scrubbed
});
