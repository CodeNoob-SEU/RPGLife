import { useEffect, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { colors } from '../theme';

const PALETTE = [colors.gold, colors.exp, colors.success, colors.accent, colors.danger, colors.ink];

type PieceCfg = { id: number; startX: number; startY: number; tx: number; ty: number; fall: number; size: number; color: string; rot: number };

function Piece({ startX, startY, tx, ty, fall, size, color, rot }: PieceCfg) {
  const p = useSharedValue(0);
  const drop = useSharedValue(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    p.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) });
    drop.value = withDelay(250, withTiming(1, { duration: 800, easing: Easing.in(Easing.quad) }));
    opacity.value = withDelay(600, withTiming(0, { duration: 650 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx * p.value },
      { translateY: ty * p.value + fall * drop.value },
      { rotate: `${rot * p.value}deg` },
    ],
    opacity: opacity.value,
  }));
  return <Animated.View style={[{ position: 'absolute', left: startX, top: startY, width: size, height: size, backgroundColor: color }, style]} />;
}

/** 像素纸屑爆裂（自中上方向四周飞散后下落淡出）。纯 reanimated，无额外依赖。 */
export function Confetti({ count = 18 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo<PieceCfg[]>(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const dist = 110 + Math.random() * 170;
        return {
          id: i,
          startX: width / 2,
          startY: height / 2.8,
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist - 30,
          fall: 220 + Math.random() * 220,
          size: 6 + Math.floor(Math.random() * 7),
          color: PALETTE[i % PALETTE.length],
          rot: (Math.random() - 0.5) * 720,
        };
      }),
    [count, width, height]
  );
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
      {pieces.map((p) => (
        <Piece key={p.id} {...p} />
      ))}
    </View>
  );
}
