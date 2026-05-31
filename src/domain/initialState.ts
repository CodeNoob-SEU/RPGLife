import { AppState, Config, Milestone } from './types';
import { dateStr, weekKey } from './dateUtils';
import { CURRENT_VERSION } from './version';

export const defaultConfig: Config = {
  goldToYuanRate: 100,
  perfectDailyBonus: 50, perfectDailyBonusExp: 20,
  perfectWeeklyBonus: 200, perfectWeeklyBonusExp: 100,
  missedDailyPenaltyRate: 0.5, dailyPenaltyCap: 100, weeklyPenaltyRate: 0.5,
  freezeCardCost: 100, cashOutThreshold: 1000, restDaysPerWeek: 1,
  longAbsenceThreshold: 7, levelExpBase: 50, levelExpStep: 50,
  reduceMotion: false, soundEnabled: true, hapticsEnabled: true,
};

const defaultMilestones: Milestone[] = [
  { day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 },
  { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 },
];

export function createInitialState(now: Date): AppState {
  const readingId = 'd-read';
  return {
    version: CURRENT_VERSION,
    player: { name: '冒险者', level: 1, exp: 0, expTotal: 0, gold: 0, avatarTier: 0, lastActiveDate: null },
    dailies: [
      { id: 'd-water', name: '喝水 8 杯', gold: 10, exp: 5, icon: '💧', doneDate: null, archived: false },
      { id: 'd-exercise', name: '运动 30 分钟', gold: 20, exp: 10, icon: '🏃', doneDate: null, archived: false },
      { id: readingId, name: '阅读 20 分钟', gold: 15, exp: 8, icon: '📖', doneDate: null, archived: false },
      { id: 'd-sleep', name: '23:00 前睡', gold: 15, exp: 8, icon: '🌙', doneDate: null, archived: false },
    ],
    weeklies: [
      { id: 'w-clean', name: '大扫除', gold: 80, exp: 40, icon: '🧹', doneWeek: null, archived: false },
      { id: 'w-review', name: '复盘本周', gold: 100, exp: 50, icon: '📝', doneWeek: null, archived: false },
      { id: 'w-call', name: '给家人打电话', gold: 60, exp: 30, icon: '📞', doneWeek: null, archived: false },
    ],
    trials: [
      { id: 't-words', name: '每天背 10 个单词', icon: '🔤', startDate: dateStr(now), completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, archived: false, milestones: [...defaultMilestones] },
    ],
    bosses: [
      { id: 'b-book', name: '读完一本书', icon: '👹', maxHp: 200, hp: 200, damagePerHit: 20, totalRewardGold: 600, totalRewardExp: 300, weights: [0.2, 0.3, 0.5], linkedTaskIds: [readingId], clearedStages: [], defeated: false, archived: false },
    ],
    inventory: { freezeCards: 1 },
    restDays: { weekKey: weekKey(now), remaining: defaultConfig.restDaysPerWeek },
    config: { ...defaultConfig },
    ledger: [], history: {},
    todayReceipts: [], dailyPerfect: null, weeklyPerfect: null,
    pendingCelebrations: [], pendingNotice: null,
  };
}
