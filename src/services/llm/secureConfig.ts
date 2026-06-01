// src/services/llm/secureConfig.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'rpglife-llm-key'; // 仅含 [A-Za-z0-9._-]，满足 SecureStore key 约束
let cached: string | null = null;

/** 启动时调用一次：把 key 读进内存缓存，供同步的 getCachedApiKey 使用。 */
export async function loadApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      cached = (globalThis as any).localStorage?.getItem(KEY) ?? null;
    } else {
      cached = await SecureStore.getItemAsync(KEY);
    }
  } catch {
    cached = null;
  }
  return cached;
}

export function getCachedApiKey(): string | null {
  return cached;
}

export async function setApiKey(value: string): Promise<void> {
  const v = value.trim();
  cached = v || null;
  try {
    if (Platform.OS === 'web') {
      const ls = (globalThis as any).localStorage;
      if (v) ls?.setItem(KEY, v);
      else ls?.removeItem(KEY);
    } else {
      if (v) await SecureStore.setItemAsync(KEY, v);
      else await SecureStore.deleteItemAsync(KEY);
    }
  } catch {
    // 存储不可用时静默：cached 仍生效于本次会话
  }
}

export function clearApiKey(): Promise<void> {
  return setApiKey('');
}
