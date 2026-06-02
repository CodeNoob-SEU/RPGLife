import { useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGameStore } from './src/store/useGameStore';
import { useAppFonts } from './src/ui/fonts';
import { RootNavigation } from './src/ui/navigation';
import { Onboarding } from './src/ui/components/Onboarding';
import { syncReminder } from './src/ui/notifications';
import { colors } from './src/ui/theme';
import { loadApiKey } from './src/services/llm/secureConfig';

export default function App() {
  const [hydrated, setHydrated] = useState(useGameStore.persist.hasHydrated());
  const [fontsLoaded, fontsError] = useAppFonts();
  const onboarded = useGameStore((s) => s.onboarded);
  const appStateRef = useRef(RNAppState.currentState);

  useEffect(() => {
    const unsub = useGameStore.persist.onFinishHydration(() => setHydrated(true));
    if (useGameStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated) {
      useGameStore.getState().actions.rollover();
      const c = useGameStore.getState().config;
      if (c.reminderEnabled) syncReminder(true, c.reminderHour); // 重新安排（跨更新/重装存活）；web no-op
      void loadApiKey(); // 预热 LLM key 缓存，供 getClient 同步读取
    }
  }, [hydrated]);

  // 从后台/非活跃恢复到前台时补跨天结算：冷启动 effect 不覆盖热恢复。
  // processRollover 幂等（同日 no-op），频繁触发安全；顺手按当前状态刷新提醒文案。
  useEffect(() => {
    if (!hydrated) return;
    const sub = RNAppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev !== 'active') {
        useGameStore.getState().actions.rollover();
        const c = useGameStore.getState().config;
        if (c.reminderEnabled) syncReminder(true, c.reminderHour);
      }
    });
    return () => sub.remove();
  }, [hydrated]);

  const fontsReady = fontsLoaded || !!fontsError; // 字体出错也放行（退回系统字体），不卡死
  if (!hydrated || !fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.gold }}>加载中…</Text>
      </View>
    );
  }
  if (!onboarded) {
    return (
      <SafeAreaProvider>
        <Onboarding onDone={() => useGameStore.getState().actions.setOnboarded(true)} />
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <RootNavigation />
    </SafeAreaProvider>
  );
}
