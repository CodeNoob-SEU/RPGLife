import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { Boss } from '../../domain/types';
import { useGameStore } from '../../store/useGameStore';
import { colors, pixelBorder, space } from '../theme';
import { PixelPanel, PixelButton, PixelText } from './Pixel';

/**
 * Boss 卡：动画 HP 条（平滑收缩）+ 三阶段分段与奖励 + 受击反馈（HP 下降时闪白/抖动/伤害浮字）。
 * 受击 juice 受 config.reduceMotion 约束。onAttack 提供时显示"攻击"按钮（OP-10 手动攻击）。
 */
export function BossCard({
  boss, nameOf, onEdit, onArchive, onAttack,
}: {
  boss: Boss;
  nameOf: (id: string) => string;
  onEdit: () => void;
  onArchive: () => void;
  onAttack?: () => void;
}) {
  const reduceMotion = useGameStore((s) => s.config.reduceMotion);
  const pct = boss.maxHp > 0 ? Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100)) : 0;

  const hpW = useSharedValue(pct);
  const prevHp = useRef(boss.hp);
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  const dmgY = useSharedValue(0);
  const dmgO = useSharedValue(0);
  const [dmg, setDmg] = useState<number | null>(null);

  useEffect(() => {
    const dropped = boss.hp < prevHp.current;
    const delta = prevHp.current - boss.hp;
    prevHp.current = boss.hp;
    if (reduceMotion) { hpW.value = pct; return; }
    hpW.value = withTiming(pct, { duration: 350, easing: Easing.out(Easing.quad) });
    if (dropped) {
      shake.value = withSequence(
        withTiming(-4, { duration: 40 }), withTiming(4, { duration: 60 }),
        withTiming(-3, { duration: 50 }), withTiming(0, { duration: 50 })
      );
      flash.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 220 }));
      setDmg(delta);
      dmgY.value = 0; dmgO.value = 0;
      dmgO.value = withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 520 }, (f) => { if (f) runOnJS(setDmg)(null); }));
      dmgY.value = withTiming(-space(8), { duration: 640, easing: Easing.out(Easing.quad) });
    }
  }, [boss.hp, pct, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const hpStyle = useAnimatedStyle(() => ({ width: `${hpW.value}%` }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.6 }));
  const dmgStyle = useAnimatedStyle(() => ({ opacity: dmgO.value, transform: [{ translateY: dmgY.value }] }));

  return (
    <Animated.View style={cardStyle}>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
            <PixelText style={{ fontSize: 22 }}>{boss.icon}</PixelText>
            <PixelText style={{ color: colors.ink, flex: 1, fontWeight: 'bold' }}>{boss.name}</PixelText>
            <PixelText style={{ color: boss.defeated ? colors.success : colors.danger }}>{boss.defeated ? '☠ 已击杀' : `${boss.hp}/${boss.maxHp} HP`}</PixelText>
          </View>

          <View>
            <View style={[{ height: space(5), backgroundColor: colors.bgDeep, justifyContent: 'center', overflow: 'hidden' }, pixelBorder]}>
              <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.danger }, hpStyle]} />
              <View style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 2, backgroundColor: colors.border }} />
              <View style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 2, backgroundColor: colors.border }} />
              <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.ink, pointerEvents: 'none' }, flashStyle]} />
            </View>
            {dmg != null ? (
              <Animated.View style={[{ position: 'absolute', right: space(2), top: 0, pointerEvents: 'none' }, dmgStyle]}>
                <PixelText style={{ color: colors.danger, fontWeight: 'bold', fontSize: 18 }}>-{dmg}</PixelText>
              </Animated.View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: space(2) }}>
            {[1, 2, 3].map((i) => {
              const cleared = boss.clearedStages.includes(i);
              return (
                <View key={i} style={[{ flex: 1, padding: space(1), backgroundColor: cleared ? colors.success : colors.bgDeep }, pixelBorder]}>
                  <PixelText style={{ color: colors.ink, fontSize: 11 }}>阶段{i}{cleared ? ' ✅' : ''}</PixelText>
                  <PixelText style={{ color: colors.gold, fontSize: 11 }}>🪙{Math.floor(boss.totalRewardGold * boss.weights[i - 1])} ✨{Math.floor(boss.totalRewardExp * boss.weights[i - 1])}</PixelText>
                </View>
              );
            })}
          </View>

          <PixelText style={{ color: colors.ink, fontSize: 12 }}>关联任务：{boss.linkedTaskIds.length ? boss.linkedTaskIds.map(nameOf).join('，') : '（无）'}　每次伤害 {boss.damagePerHit}</PixelText>
          <View style={{ flexDirection: 'row', gap: space(2), flexWrap: 'wrap' }}>
            {onAttack && !boss.defeated ? <PixelButton label="⚔ 攻击" color={colors.accent} onPress={onAttack} /> : null}
            <PixelButton label="编辑" color={colors.bgPanel} onPress={onEdit} />
            <PixelButton label="归档" color={colors.danger} onPress={onArchive} />
          </View>
        </View>
      </PixelPanel>
    </Animated.View>
  );
}
