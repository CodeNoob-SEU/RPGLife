import { AppState, DateStr } from '../types';
import { currentDayStreak } from '../stats';
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
