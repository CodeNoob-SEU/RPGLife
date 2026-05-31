import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** 鼓励式（非羞辱）提醒文案，随机一条。 */
const MESSAGES = [
  '英雄，今日的委托在等你！🗡️',
  '你的连胜还在燃烧 🔥 别让它熄灭',
  '花几分钟打个卡，离提现又近一步 💰',
  '冒险者，今天也要变强一点点 ✨',
  '试炼不等人，今天的一格进度就交给你 🎯',
];

const REMINDER_ID = 'rpglife-daily-reminder';

/** 请求通知权限（仅原生；web 或失败返回 false，绝不抛错）。 */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}

/** 安排每日重复本地提醒（hour:00，文案随机）；先清旧的。仅原生。 */
export async function scheduleDailyReminder(hour: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelDailyReminder();
    const body = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: 'RPGLife', body },
      trigger: { type: 'daily', hour: Math.max(0, Math.min(23, Math.floor(hour))), minute: 0 },
    } as any); // trigger 形状随 SDK 版本变动，web 不执行；以 any 规避版本差异类型摩擦
  } catch {
    // 权限被拒/不支持时静默
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // ignore
  }
}

/** 按偏好同步：开启则（请求权限后）安排，关闭则取消。返回是否成功开启。 */
export async function syncReminder(enabled: boolean, hour: number): Promise<boolean> {
  if (!enabled) {
    await cancelDailyReminder();
    return false;
  }
  const ok = await ensurePermission();
  if (ok) await scheduleDailyReminder(hour);
  return ok;
}
