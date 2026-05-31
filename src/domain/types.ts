export type DateStr = string;  // 'YYYY-MM-DD'（本地时区）
export type WeekKey = string;  // 'YYYY-Www' ISO 周

export type CelebrationKind = 'levelUp' | 'perfectDay' | 'perfectWeek' | 'graduation' | 'bossDefeated';
export type LedgerType = 'earn' | 'penalty' | 'purchase' | 'cashout' | 'bonus' | 'undo';

export interface Daily { id: string; name: string; gold: number; exp: number; icon: string; doneDate: DateStr | null; archived: boolean; }
export interface Weekly { id: string; name: string; gold: number; exp: number; icon: string; doneWeek: WeekKey | null; archived: boolean; }
export interface Milestone { day: number; gold: number; exp: number; }
export interface Trial {
  id: string; name: string; icon: string; startDate: DateStr;
  completedDates: DateStr[]; protectedDates: DateStr[];
  streak: number; claimedMilestones: number[]; graduated: boolean; milestones: Milestone[];
}
export interface Boss {
  id: string; name: string; icon: string;
  maxHp: number; hp: number; damagePerHit: number;
  totalRewardGold: number; totalRewardExp: number;
  weights: [number, number, number];
  linkedTaskIds: string[]; clearedStages: number[]; defeated: boolean;
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
}
export interface BossHit { bossId: string; damage: number; clearedStages: number[]; defeated: boolean; }
export interface Receipt {
  rid: string; kind: 'daily' | 'weekly' | 'trial'; taskId: string; date: DateStr;
  goldDelta: number; expDelta: number;
  claimedMilestones?: number[]; graduation?: { addedDailyId: string }; bossHits?: BossHit[];
}
export interface Player { name: string; level: number; exp: number; expTotal: number; gold: number; avatarTier: number; lastActiveDate: DateStr | null; }
export interface AppState {
  version: number;
  player: Player;
  dailies: Daily[]; weeklies: Weekly[]; trials: Trial[]; bosses: Boss[];
  inventory: { freezeCards: number };
  restDays: { weekKey: WeekKey; remaining: number };
  config: Config;
  ledger: LedgerEntry[];
  history: Record<DateStr, HistoryEntry>;
  todayReceipts: Receipt[];
  dailyPerfect: { date: DateStr; gold: number; exp: number } | null;
  weeklyPerfect: { week: WeekKey; gold: number; exp: number } | null;
  pendingCelebrations: CelebrationKind[];
  pendingNotice: 'longAbsence' | null;
}
