import { AppState } from './types';
import { dateStr } from './dateUtils';
import { bestTrialStreak, lifetimeTotals } from './stats';

/** 成就：纯谓词判定（基于 AppState 的只读快照）。 */
export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  check: (s: AppState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-quest', title: '初出茅庐', desc: '完成第一个委托', icon: '🌱', check: (s) => lifetimeTotals(s.ledger).tasksCompleted >= 1 },
  { id: 'perfect-day', title: '完美一日', desc: '达成一次每日全清', icon: '🎁', check: (s) => s.dailyPerfect !== null || Object.values(s.history).some((h) => h.status === 'perfect') },
  { id: 'level-5', title: '崭露头角', desc: '达到 5 级', icon: '⭐', check: (s) => s.player.level >= 5 },
  { id: 'level-10', title: '声名鹊起', desc: '达到 10 级', icon: '🌟', check: (s) => s.player.level >= 10 },
  { id: 'gold-1000', title: '小有积蓄', desc: '累计赚取 1000 金币', icon: '💰', check: (s) => lifetimeTotals(s.ledger).earned >= 1000 },
  { id: 'cashout', title: '兑现承诺', desc: '完成首次提现', icon: '🏦', check: (s) => s.ledger.some((l) => l.type === 'cashout') },
  { id: 'boss-slayer', title: '屠龙者', desc: '击败第一个 Boss', icon: '🗡️', check: (s) => s.bosses.some((b) => b.defeated) },
  { id: 'boss-master', title: '传奇讨伐者', desc: '击败 3 个 Boss', icon: '👑', check: (s) => s.bosses.filter((b) => b.defeated).length >= 3 },
  { id: 'graduate', title: '习惯养成', desc: '让一个试炼毕业', icon: '🎓', check: (s) => s.trials.some((t) => t.graduated) },
  { id: 'streak-7', title: '七日之约', desc: '试炼连续打卡达 7 天', icon: '🔥', check: (s) => s.trials.some((t) => bestTrialStreak(t) >= 7) },
  { id: 'streak-30', title: '坚持不懈', desc: '试炼连续打卡达 30 天', icon: '💎', check: (s) => s.trials.some((t) => bestTrialStreak(t) >= 30) },
  { id: 'collector', title: '杂务大师', desc: '完成 10 个一次性委托', icon: '📦', check: (s) => s.oneoffs.filter((o) => o.doneDate !== null).length >= 10 },
];

/**
 * 扫描成就目录，解锁新达成项：记录解锁日期 + 推送 'achievement' 庆祝。只增不减（幂等）。
 * 返回本次新解锁的成就 id 列表。
 */
export function evaluateAchievements(s: AppState, now: Date): string[] {
  const newly: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements.unlockedAt[a.id] && a.check(s)) {
      s.achievements.unlockedAt[a.id] = dateStr(now);
      s.pendingCelebrations.push('achievement');
      s.pendingAchievements.push(a.id); // 与 'achievement' 庆祝一一对应，供 overlay 显示具体成就名
      newly.push(a.id);
    }
  }
  return newly;
}
