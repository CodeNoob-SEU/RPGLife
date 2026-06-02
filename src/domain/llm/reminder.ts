// 仅埋点：提供提醒文案 prompt。未来若实装，在 src/ui/notifications.ts 的 syncReminder/rollover
// 处用本函数预生成 N 条文案缓存，scheduleDailyReminder 从缓存取；缓存空则回退现有 MESSAGES。
import { AppState, DateStr } from '../types';
import { currentDayStreak } from '../stats';
import { LLMMessage } from '../../services/llm/types';

export function buildReminderPrompt(state: AppState, today: DateStr): LLMMessage[] {
  const pending = state.dailies.filter((d) => !d.archived && d.doneDate !== today).length;
  const streak = currentDayStreak(state.history, today);
  return [
    {
      role: 'system',
      content:
        '你是像素 RPG 里鼓励玩家的伙伴。用一句不超过 30 字的中文提醒玩家回来打卡，' +
        '鼓励不催促、不说教，可含 1 个 emoji。只返回这句话本身。',
    },
    { role: 'user', content: `今天还有 ${pending} 个每日委托未完成，当前连续活跃 ${streak} 天。` },
  ];
}
