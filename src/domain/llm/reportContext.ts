import { AppState, DateStr } from '../types';
import { currentDayStreak, lastNDays, completionRate } from '../stats';
import { LLMMessage } from '../../services/llm/types';

export interface ReportFacts {
  date: DateStr;
  status: 'perfect' | 'partial' | 'missed' | 'rest';
  dailiesDone: number;
  dailiesTotal: number;
  goldNet: number;
  streak: number;
  level: number;
  gold: number;
}

/** 把某日战绩压成紧凑事实摘要（避免把整个 AppState 倒给模型）。 */
export function buildReportContext(state: AppState, date: DateStr): ReportFacts {
  const h = state.history[date];
  return {
    date,
    status: h?.status ?? 'missed',
    dailiesDone: h?.dailiesDone ?? 0,
    dailiesTotal: h?.dailiesTotal ?? 0,
    goldNet: h?.goldNet ?? 0,
    streak: currentDayStreak(state.history, date),
    level: state.player.level,
    gold: state.player.gold,
  };
}

export function buildReportPrompt(facts: ReportFacts): LLMMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是像素 RPG 里的旁白伙伴。根据玩家昨天的战绩写一段 2–3 句的中文「昨日战报」，' +
        '像素冒险口吻、温暖鼓励、不说教，可含 1–2 个 emoji。只返回这段话本身，不要标题、不要 JSON。',
    },
    {
      role: 'user',
      content:
        `日期 ${facts.date}：状态=${facts.status}，完成每日 ${facts.dailiesDone}/${facts.dailiesTotal}，` +
        `净金币 ${facts.goldNet}，连续活跃 ${facts.streak} 天，当前等级 ${facts.level}，金币 ${facts.gold}。`,
    },
  ];
}

export interface WeekReviewFacts {
  from: DateStr; to: DateStr;
  perfectDays: number; partialDays: number; missedDays: number; restDays: number;
  completionRate: number;  // 0..1
  goldNet: number;
  streak: number;
  level: number; gold: number;
}

/** 聚合最近 7 天战绩为周复盘事实摘要。 */
export function buildWeekReviewContext(state: AppState, asOf: DateStr): WeekReviewFacts {
  const days = lastNDays(asOf, 7);
  let perfectDays = 0, partialDays = 0, missedDays = 0, restDays = 0, goldNet = 0;
  for (const d of days) {
    const h = state.history[d];
    if (!h) continue;
    if (h.status === 'perfect') perfectDays++;
    else if (h.status === 'partial') partialDays++;
    else if (h.status === 'missed') missedDays++;
    else if (h.status === 'rest') restDays++;
    goldNet += h.goldNet;
  }
  return {
    from: days[0], to: days[days.length - 1],
    perfectDays, partialDays, missedDays, restDays,
    completionRate: completionRate(state.history, asOf, 7),
    goldNet,
    streak: currentDayStreak(state.history, asOf),
    level: state.player.level, gold: state.player.gold,
  };
}

export function buildWeekReviewPrompt(facts: WeekReviewFacts): LLMMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是像素 RPG 的旁白伙伴。根据玩家最近一周战绩写一段 2–4 句中文「周复盘」，' +
        '像素冒险口吻、温暖、点出本周亮点与一个小建议，不说教，可含 emoji。只返回这段话本身，不要标题/JSON。',
    },
    {
      role: 'user',
      content:
        `${facts.from} 至 ${facts.to}：全清 ${facts.perfectDays} 天 / 部分 ${facts.partialDays} 天 / ` +
        `颗粒无收 ${facts.missedDays} 天 / 休整 ${facts.restDays} 天；完成率 ${Math.round(facts.completionRate * 100)}%，` +
        `本周净金币 ${facts.goldNet}，当前连续活跃 ${facts.streak} 天，等级 ${facts.level}。`,
    },
  ];
}
