import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing } from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { colors, pixelBorder, space } from '../theme';
import { PixelText } from './Pixel';

/**
 * 打卡获得反馈：金币/经验分色像素药丸，上浮 + 缩放回弹（"数字弹跳"）。
 * 受 config.reduceMotion 控制：开启时降级为原地短暂淡入淡出，无位移/缩放。
 */
export function useGainFloat() {
  const [gain, setGain] = useState<{ gold: number; exp: number } | null>(null);
  const reduceMotion = useGameStore((s) => s.config.reduceMotion);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  const clear = () => setGain(null);
  const fire = (gold: number, exp: number) => {
    setGain({ gold, exp });
    if (reduceMotion) {
      y.value = 0;
      scale.value = 1;
      opacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withDelay(500, withTiming(0, { duration: 200 }, (f) => { if (f) runOnJS(clear)(); }))
      );
      return;
    }
    y.value = 0;
    opacity.value = 0;
    scale.value = 0.6;
    opacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }, (fin) => { if (fin) runOnJS(clear)(); })
    );
    y.value = withTiming(-space(12), { duration: 800, easing: Easing.out(Easing.quad) });
    scale.value = withSequence(
      withTiming(1.25, { duration: 180, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 160 })
    );
  };

  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }, { scale: scale.value }] }));
  const fmt = (n: number) => `${n > 0 ? '+' : ''}${n}`;

  const floatNode = gain ? (
    <View style={{ position: 'absolute', top: space(2), left: 0, right: 0, alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
      <Animated.View style={[{ flexDirection: 'row', gap: space(2), backgroundColor: colors.bgPanel, paddingVertical: space(1), paddingHorizontal: space(3) }, pixelBorder, aStyle]}>
        {gain.gold !== 0 ? <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 18 }}>🪙{fmt(gain.gold)}</PixelText> : null}
        {gain.exp !== 0 ? <PixelText style={{ color: colors.exp, fontWeight: 'bold', fontSize: 18 }}>✨{fmt(gain.exp)}</PixelText> : null}
      </Animated.View>
    </View>
  ) : null;

  return { floatNode, fire };
}
