import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/useGameStore';

/**
 * 统一分级触感反馈：
 *  - light：普通打卡 / 轻交互
 *  - medium：撤销 / 较重交互
 *  - heavy：Boss 受击 / 强冲击
 *  - success：升级 / Boss 击杀 / 全清 / 购买成功
 *  - warning：临界提示
 *  - error：失败 / 不可执行
 *
 * 受 `config.hapticsEnabled` 控制；web 与不支持平台安全 no-op（promise 静默 catch）。
 * 通过 getState() 读取偏好——纯副作用，无需 React 订阅，不触发 zustand 选择器陷阱。
 */
function on(): boolean {
  return Platform.OS !== 'web' && useGameStore.getState().config.hapticsEnabled;
}
const swallow = () => {};

export const haptics = {
  light: () => { if (on()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(swallow); },
  medium: () => { if (on()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(swallow); },
  heavy: () => { if (on()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(swallow); },
  success: () => { if (on()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow); },
  warning: () => { if (on()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(swallow); },
  error: () => { if (on()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(swallow); },
};
