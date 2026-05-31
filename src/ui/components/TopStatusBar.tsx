import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { expNeeded } from '../../domain/economy';
import { colors, pixelBorder, space } from '../theme';
import { PixelProgressBar, PixelText } from './Pixel';

/** 角色立绘随 avatarTier 演变（等级越高越"华丽"），边框颜色亦分级。 */
const AVATARS = ['🧙', '🧝', '🦸', '🧞'];
const FRAMES = [colors.border, colors.exp, colors.accent, colors.gold];

export function TopStatusBar() {
  const player = useGameStore((s) => s.player);
  const config = useGameStore((s) => s.config);
  const reduceMotion = useGameStore((s) => s.config.reduceMotion);
  const gold = player.gold;
  const need = expNeeded(player.level, config);
  const tier = Math.max(0, Math.min(3, player.avatarTier));

  // 金币变动 → 缩放脉冲
  const goldScale = useSharedValue(1);
  const prevGold = useRef(gold);
  useEffect(() => {
    if (prevGold.current !== gold && !reduceMotion) {
      goldScale.value = withSequence(
        withTiming(1.35, { duration: 140, easing: Easing.out(Easing.back(3)) }),
        withTiming(1, { duration: 160 })
      );
    }
    prevGold.current = gold;
  }, [gold, reduceMotion]);
  const goldStyle = useAnimatedStyle(() => ({ transform: [{ scale: goldScale.value }] }));

  // 升级 → 头像弹跳高亮
  const lvScale = useSharedValue(1);
  const prevLevel = useRef(player.level);
  useEffect(() => {
    if (player.level > prevLevel.current && !reduceMotion) {
      lvScale.value = withSequence(
        withTiming(1.4, { duration: 180, easing: Easing.out(Easing.back(3)) }),
        withTiming(1, { duration: 220 })
      );
    }
    prevLevel.current = player.level;
  }, [player.level, reduceMotion]);
  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ scale: lvScale.value }] }));

  return (
    <View style={[{ backgroundColor: colors.bgPanel, paddingTop: space(8), paddingBottom: space(2), paddingHorizontal: space(3), flexDirection: 'row', alignItems: 'center', gap: space(3) }, { borderBottomWidth: 3, borderColor: colors.border }]}>
      <Animated.View style={[{ width: space(10), height: space(10), backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' }, pixelBorder, { borderColor: FRAMES[tier] }, avatarStyle]}>
        <PixelText style={{ fontSize: 20 }}>{AVATARS[tier]}</PixelText>
      </Animated.View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <PixelText style={{ color: colors.ink, fontWeight: 'bold' }}>{player.name}  Lv.{player.level}</PixelText>
          <PixelText style={{ color: colors.textDim, fontSize: 11 }}>{player.exp}/{need}</PixelText>
        </View>
        <PixelProgressBar value={player.exp} max={need} />
      </View>
      <Animated.View style={goldStyle}>
        <PixelText style={{ color: colors.gold, fontWeight: 'bold' }}>🪙 {gold}</PixelText>
      </Animated.View>
    </View>
  );
}
