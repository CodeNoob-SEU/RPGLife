import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGameStore } from './src/store/useGameStore';
import { useAppFonts } from './src/ui/fonts';
import { RootNavigation } from './src/ui/navigation';
import { Onboarding } from './src/ui/components/Onboarding';
import { colors } from './src/ui/theme';

export default function App() {
  const [hydrated, setHydrated] = useState(useGameStore.persist.hasHydrated());
  const [fontsLoaded, fontsError] = useAppFonts();
  const onboarded = useGameStore((s) => s.onboarded);

  useEffect(() => {
    const unsub = useGameStore.persist.onFinishHydration(() => setHydrated(true));
    if (useGameStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated) useGameStore.getState().actions.rollover();
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
