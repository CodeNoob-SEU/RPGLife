import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing } from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { CelebrationKind } from '../../domain/types';
import { colors, pixelBorder, pixelShadow, space } from '../theme';
import { PixelText, PixelButton } from './Pixel';
import { haptics } from '../haptics';
import { Confetti } from './Confetti';
import { ACHIEVEMENTS } from '../../domain/achievements';

const TEXT: Record<CelebrationKind, { title: string; color: string }> = {
  levelUp: { title: 'LEVEL UP!', color: colors.gold },
  perfectDay: { title: '每日全清！🎁', color: colors.success },
  perfectWeek: { title: '每周全清！🏆', color: colors.success },
  graduation: { title: '试炼毕业！🎓', color: colors.exp },
  bossDefeated: { title: 'BOSS 击杀！☠', color: colors.danger },
  achievement: { title: '成就解锁！🏅', color: colors.gold },
};

const BIG: CelebrationKind[] = ['levelUp', 'bossDefeated', 'perfectWeek'];

export function CelebrationOverlay() {
  const pending = useGameStore((s) => s.pendingCelebrations);
  const notice = useGameStore((s) => s.pendingNotice);
  const reduceMotion = useGameStore((s) => s.config.reduceMotion);
  const pendingAch = useGameStore((s) => s.pendingAchievements);
  const actions = useGameStore((s) => s.actions);
  const head = pending[0];
  const big = head ? BIG.includes(head) : false;
  const ach = head === 'achievement' && pendingAch[0] ? ACHIEVEMENTS.find((a) => a.id === pendingAch[0]) : undefined;

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const shakeX = useSharedValue(0);
  const animatingRef = useRef(false);

  useEffect(() => {
    // Serialize with animatingRef so a re-render mid-animation (e.g. a new celebration
    // pushed while one is playing) cannot restart/skip the in-flight one. finish() drops
    // the flag and consumes; the queue-length change then re-fires the effect for the next.
    if (!head || animatingRef.current) return;
    animatingRef.current = true;
    haptics.success();
    const finish = () => { animatingRef.current = false; actions.consumeCelebration(); };
    opacity.value = 0;
    if (reduceMotion) {
      scale.value = 1;
      shakeX.value = 0;
      opacity.value = withSequence(withTiming(1, { duration: 150 }), withDelay(800, withTiming(0, { duration: 200 }, (fin) => { if (fin) runOnJS(finish)(); })));
      return;
    }
    scale.value = 0.6;
    opacity.value = withSequence(withTiming(1, { duration: 200 }), withDelay(700, withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }, (fin) => { if (fin) runOnJS(finish)(); })));
    scale.value = withSequence(withTiming(big ? 1.25 : 1.1, { duration: 200 }), withTiming(1, { duration: 150 }));
    if (big) {
      shakeX.value = withSequence(
        withTiming(-6, { duration: 50 }), withTiming(6, { duration: 60 }),
        withTiming(-4, { duration: 50 }), withTiming(4, { duration: 50 }), withTiming(0, { duration: 50 })
      );
    }
  }, [head, pending.length, reduceMotion]);

  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }, { translateX: shakeX.value }] }));

  return (
    <>
      {head ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {!reduceMotion ? <Confetti key={`${head}:${pending.length}`} count={big ? 26 : 16} /> : null}
          <Animated.View style={[{ backgroundColor: colors.bgPanel, paddingVertical: space(4), paddingHorizontal: space(6) }, pixelBorder, pixelShadow, aStyle]}>
            <PixelText style={{ color: TEXT[head].color, fontSize: 20, textAlign: 'center' }}>{ach ? `🏅 ${ach.icon} ${ach.title}` : TEXT[head].title}</PixelText>
          </Animated.View>
        </View>
      ) : null}

      {notice === 'longAbsence' ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: space(4) }}>
          <View style={[{ backgroundColor: colors.bgPanel, padding: space(3), gap: space(2), maxWidth: 420 }, pixelBorder, pixelShadow]}>
            <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>欢迎回来，冒险者</PixelText>
            <PixelText style={{ color: colors.ink }}>检测到你已离开较长时间。暂停期间已免除全部金币惩罚，但试炼连击按保护规则处理（请假/冻结卡用尽则归零）。</PixelText>
            <PixelButton label="知道了" color={colors.success} onPress={() => actions.consumeNotice()} />
          </View>
        </View>
      ) : null}
    </>
  );
}
