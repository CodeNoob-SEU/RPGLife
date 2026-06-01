import { AppState, Config } from '../src/domain/types';
import { CURRENT_VERSION } from '../src/domain/version';

export const testConfig: Config = {
  goldToYuanRate: 100,
  perfectDailyBonus: 50, perfectDailyBonusExp: 20,
  perfectWeeklyBonus: 200, perfectWeeklyBonusExp: 100,
  missedDailyPenaltyRate: 0.5, dailyPenaltyCap: 100, weeklyPenaltyRate: 0.5,
  freezeCardCost: 100, cashOutThreshold: 1000, restDaysPerWeek: 1,
  longAbsenceThreshold: 7, levelExpBase: 50, levelExpStep: 50,
  reduceMotion: false, soundEnabled: true, hapticsEnabled: true,
  dailyChestMin: 10, dailyChestMax: 60,
  reminderEnabled: false, reminderHour: 20,
  llmEnabled: false, llmBaseURL: '', llmModel: '',
};

/** 构造一个干净的空 state（无任务），供单测自由填充。 */
export function makeState(over: Partial<AppState> = {}): AppState {
  return {
    version: CURRENT_VERSION,
    player: { name: '冒险者', level: 1, exp: 0, expTotal: 0, gold: 0, avatarTier: 0, lastActiveDate: null },
    dailies: [], weeklies: [], trials: [], bosses: [], oneoffs: [], antis: [],
    inventory: { freezeCards: 0 },
    achievements: { unlockedAt: {} },
    dailyChest: null,
    restDays: { weekKey: '', remaining: 0 },
    config: { ...testConfig },
    ledger: [], history: {},
    todayReceipts: [], dailyPerfect: null, weeklyPerfect: null,
    pendingCelebrations: [], pendingAchievements: [], pendingNotice: null,
    onboarded: true, reportSeenDate: null,
    ui: { questsCollapsed: { weekly: true, oneoff: true, anti: true } },
    ...over,
  };
}
