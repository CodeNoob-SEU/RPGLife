import { AppState, Config } from '../domain/types';
import { dateStr } from '../domain/dateUtils';
import { processRollover } from '../domain/settlement';
import {
  checkInDaily as domainCheckInDaily,
  checkInWeekly as domainCheckInWeekly,
  checkInTrial as domainCheckInTrial,
  checkInOneoff as domainCheckInOneoff,
  undoCheckIn,
  buyFreezeCard as domainBuyFreezeCard,
  cashOut as domainCashOut,
} from '../domain/actions';
import { createInitialState } from '../domain/initialState';
import { migrate } from '../domain/migrate';
import { genId } from './idGen';

const MILESTONES = [
  { day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 },
  { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 },
];

export interface GameActions {
  rollover: (now?: Date) => void;
  checkInDaily: (id: string, now?: Date) => void;
  checkInWeekly: (id: string, now?: Date) => void;
  checkInTrial: (id: string, now?: Date) => void;
  checkInOneoff: (id: string, now?: Date) => void;
  undo: (rid: string, now?: Date) => void;
  buyFreezeCard: (now?: Date) => void;
  cashOut: (amount: number, now?: Date) => void;
  addDaily: (name: string, gold: number, exp: number, icon?: string) => void;
  editDaily: (id: string, patch: Partial<{ name: string; gold: number; exp: number; icon: string }>) => void;
  archiveDaily: (id: string) => void;
  addWeekly: (name: string, gold: number, exp: number, icon?: string) => void;
  editWeekly: (id: string, patch: Partial<{ name: string; gold: number; exp: number; icon: string }>) => void;
  archiveWeekly: (id: string) => void;
  addTrial: (name: string, icon?: string, now?: Date) => void;
  editTrial: (id: string, patch: Partial<{ name: string; icon: string }>) => void;
  archiveTrial: (id: string) => void;
  addOneoff: (name: string, gold: number, exp: number, icon?: string) => void;
  editOneoff: (id: string, patch: Partial<{ name: string; gold: number; exp: number; icon: string }>) => void;
  archiveOneoff: (id: string) => void;
  addBoss: (b: { name: string; icon?: string; maxHp: number; damagePerHit: number; totalRewardGold: number; totalRewardExp: number; linkedTaskIds: string[]; weights?: [number, number, number] }) => void;
  editBoss: (id: string, patch: Partial<{ name: string; icon: string; maxHp: number; damagePerHit: number; totalRewardGold: number; totalRewardExp: number; weights: [number, number, number]; linkedTaskIds: string[] }>) => void;
  archiveBoss: (id: string) => void;
  setConfig: (patch: Partial<Config>) => void;
  consumeCelebration: () => void;
  consumeNotice: () => void;
  importState: (data: AppState) => void;
  reset: (now?: Date) => void;
}

export type GameStore = AppState & { actions: GameActions };

type SetFn = (recipe: (s: GameStore) => void) => void;
type GetFn = () => GameStore;

export const createGameActions = (set: SetFn, _get: GetFn): GameActions => ({
  rollover: (now = new Date()) => set((s) => { processRollover(s, now); }),
  checkInDaily: (id, now = new Date()) => set((s) => { domainCheckInDaily(s, id, now); }),
  checkInWeekly: (id, now = new Date()) => set((s) => { domainCheckInWeekly(s, id, now); }),
  checkInTrial: (id, now = new Date()) => set((s) => { domainCheckInTrial(s, id, now); }),
  checkInOneoff: (id, now = new Date()) => set((s) => { domainCheckInOneoff(s, id, now); }),
  undo: (rid, now = new Date()) => set((s) => { undoCheckIn(s, rid, now); }),
  buyFreezeCard: (now = new Date()) => set((s) => { domainBuyFreezeCard(s, now); }),
  cashOut: (amount, now = new Date()) => set((s) => { domainCashOut(s, amount, now); }),

  addDaily: (name, gold, exp, icon = '📝') => set((s) => {
    s.dailies.push({ id: genId('daily'), name, gold, exp, icon, doneDate: null, archived: false });
  }),
  editDaily: (id, patch) => set((s) => { const d = s.dailies.find((x) => x.id === id); if (d) Object.assign(d, patch); }),
  archiveDaily: (id) => set((s) => { const d = s.dailies.find((x) => x.id === id); if (d) d.archived = true; }),

  addWeekly: (name, gold, exp, icon = '📝') => set((s) => {
    s.weeklies.push({ id: genId('weekly'), name, gold, exp, icon, doneWeek: null, archived: false });
  }),
  editWeekly: (id, patch) => set((s) => { const w = s.weeklies.find((x) => x.id === id); if (w) Object.assign(w, patch); }),
  archiveWeekly: (id) => set((s) => { const w = s.weeklies.find((x) => x.id === id); if (w) w.archived = true; }),

  addTrial: (name, icon = '🎯', now = new Date()) => set((s) => {
    s.trials.push({ id: genId('trial'), name, icon, startDate: dateStr(now), completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, archived: false, milestones: MILESTONES.map((m) => ({ ...m })) });
  }),
  editTrial: (id, patch) => set((s) => { const t = s.trials.find((x) => x.id === id); if (t) Object.assign(t, patch); }),
  archiveTrial: (id) => set((s) => { const t = s.trials.find((x) => x.id === id); if (t) t.archived = true; }),

  addOneoff: (name, gold, exp, icon = '📦') => set((s) => {
    s.oneoffs.push({ id: genId('oneoff'), name, gold, exp, icon, doneDate: null, archived: false });
  }),
  editOneoff: (id, patch) => set((s) => { const o = s.oneoffs.find((x) => x.id === id); if (o) Object.assign(o, patch); }),
  archiveOneoff: (id) => set((s) => { const o = s.oneoffs.find((x) => x.id === id); if (o) o.archived = true; }),

  addBoss: (b) => set((s) => {
    s.bosses.push({ id: genId('boss'), name: b.name, icon: b.icon ?? '👹', maxHp: b.maxHp, hp: b.maxHp, damagePerHit: b.damagePerHit, totalRewardGold: b.totalRewardGold, totalRewardExp: b.totalRewardExp, weights: b.weights ?? [0.2, 0.3, 0.5], linkedTaskIds: b.linkedTaskIds, clearedStages: [], defeated: false, archived: false });
  }),
  editBoss: (id, patch) => set((s) => {
    const b = s.bosses.find((x) => x.id === id);
    if (!b) return;
    Object.assign(b, patch);
    if (patch.maxHp !== undefined) b.hp = Math.min(b.hp, b.maxHp);
    // 注：改 maxHp 不回溯调整 clearedStages（旧刻度下已结算的阶段保留）。
    // 经济安全（applyBossDamageForTask 的 !clearedStages.includes(i) 防重复发奖），
    // 但进行中的 Boss 进度条可能与新刻度阈值略不一致。MVP 可接受。
  }),
  archiveBoss: (id) => set((s) => { const b = s.bosses.find((x) => x.id === id); if (b) b.archived = true; }),

  setConfig: (patch) => set((s) => { Object.assign(s.config, patch); }),
  consumeCelebration: () => set((s) => { s.pendingCelebrations.shift(); }),
  consumeNotice: () => set((s) => { s.pendingNotice = null; }),
  importState: (data) => set((s) => {
    // Deep-fill any missing/partial fields via migrate (hand-edited JSON may omit arrays/config),
    // and scrub transient UI signals so an import can't replay a stale notice/celebration.
    const full = migrate(data, 0);
    full.pendingCelebrations = [];
    full.pendingNotice = null;
    Object.assign(s, full);
  }),
  reset: (now = new Date()) => set((s) => { Object.assign(s, createInitialState(now)); }),
});
