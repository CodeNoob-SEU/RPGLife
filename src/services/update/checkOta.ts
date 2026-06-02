import * as Updates from 'expo-updates';
import { OtaResult } from './types';

/** 只「检查」是否有 OTA 更新；不下载（下载/重启留到用户确认后）。 */
export async function checkOta(): Promise<OtaResult> {
  // dev / web / Expo Go 下 isEnabled=false，且 checkForUpdateAsync 会 reject —— 直接短路。
  if (!Updates.isEnabled) return { enabled: false, available: false };
  try {
    const res = await Updates.checkForUpdateAsync();
    return { enabled: true, available: res.isAvailable };
  } catch (e) {
    return { enabled: true, available: false, error: String(e) };
  }
}

/** 用户确认后：下载最新 OTA 并重启应用以生效。reloadAsync 成功会重启进程（其后代码不再执行）。 */
export async function applyOta(): Promise<void> {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}
