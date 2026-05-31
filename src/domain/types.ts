export type DateStr = string;  // 'YYYY-MM-DD'（本地时区）
export type WeekKey = string;  // 'YYYY-Www' ISO 周

export type CelebrationKind = 'levelUp' | 'perfectDay' | 'perfectWeek' | 'graduation' | 'bossDefeated' | 'achievement';
export type LedgerType = 'earn' | 'penalty' | 'purchase' | 'cashout' | 'bonus' | 'undo';

export interface Daily { id: string; name: string; gold: number; exp: number; icon: string; doneDate: DateStr | null; archived: boolean; }
export interface Weekly { id: string; name: string; gold: number; exp: number; icon: string; doneWeek: WeekKey | null; archived: boolean; }
/** 一次性委托：纯奖励待办，无截止无惩罚，不随 rollover 重置；doneDate!==null 即永久完成。 */
export interface OneOff { id: string; name: string; gold: number; exp: number; icon: string; doneDate: DateStr | null; archived: boolean; }
export interface Milestone { day: number; gold: number; exp: number; }
export interface Trial {
  id: string; name: string; icon: string; startDate: DateStr;
  completedDates: DateStr[]; protectedDates: DateStr[];
  streak: number; claimedMilestones: number[]; graduated: boolean; milestones: Milestone[];
  archived: boolean;
}
export interface Boss {
  id: string; name: string; icon: string;
  maxHp: number; hp: number; damagePerHit: number;
  totalRewardGold: number; totalRewardExp: number;
  weights: [number, number, number];
  linkedTaskIds: string[]; clearedStages: number[]; defeated: boolean;
  archived: boolean;
}
export interface LedgerEntry { ts: number; date: DateStr; type: LedgerType; amount: number; expAmount?: number; note: string; }
export interface HistoryEntry { status: 'perfect' | 'partial' | 'missed' | 'rest'; dailiesDone: number; dailiesTotal: number; goldNet: number; }
export interface Config {
  goldToYuanRate: number;
  perfectDailyBonus: number; perfectDailyBonusExp: number;
  perfectWeeklyBonus: number; perfectWeeklyBonusExp: number;
  missedDailyPenaltyRate: number; dailyPenaltyCap: number; weeklyPenaltyRate: number;
  freezeCardCost: number; cashOutThreshold: number; restDaysPerWeek: number;
  longAbsenceThreshold: number; levelExpBase: number; levelExpStep: number;
  // UI / 偏好（v2+）：动效削弱（无障碍）、音效、触感开关。
  reduceMotion: boolean; soundEnabled: boolean; hapticsEnabled: boolean;
  // 每日宝箱奖励区间（v5+）。
  dailyChestMin: number; dailyChestMax: number;
  // 本地每日提醒（v8+）：开关 + 提醒小时(0-23)。
  reminderEnabled: boolean; reminderHour: number;
}
export interface BossHit { bossId: string; damage: number; clearedStages: number[]; defeated: boolean; }
export interface Receipt {
  rid: string; kind: 'daily' | 'weekly' | 'trial' | 'oneoff' | 'boss'; taskId: string; date: DateStr;
  goldDelta: number; expDelta: number;
  claimedMilestones?: number[]; graduation?: { addedDailyId: string }; bossHits?: BossHit[];
}
export interface Player { name: string; level: number; exp: number; expTotal: number; gold: number; avatarTier: number; lastActiveDate: DateStr | null; }
export interface AppState {
  version: number;
  player: Player;
  dailies: Daily[]; weeklies: Weekly[]; trials: Trial[]; bosses: Boss[]; oneoffs: OneOff[];
  inventory: { freezeCards: number };
  achievements: { unlockedAt: Record<string, DateStr> }; // 成就 id → 解锁日期
  dailyChest: { date: DateStr } | null; // 最近一次开启每日宝箱的日期（防重复）
  restDays: { weekKey: WeekKey; remaining: number };
  config: Config;
  ledger: LedgerEntry[];
  history: Record<DateStr, HistoryEntry>;
  todayReceipts: Receipt[];
  dailyPerfect: { date: DateStr; gold: number; exp: number } | null;
  weeklyPerfect: { week: WeekKey; gold: number; exp: number } | null;
  pendingCelebrations: CelebrationKind[];
  pendingNotice: 'longAbsence' | null;
  onboarded: boolean; // 是否完成首启引导（v6+）
  reportSeenDate: DateStr | null; // 昨日战报最近查看日期（每日仅弹一次，v7+）
}
