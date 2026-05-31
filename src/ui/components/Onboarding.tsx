import { useState } from 'react';
import { View } from 'react-native';
import { colors, pixelBorder, pixelShadow, space } from '../theme';
import { PixelText, PixelButton } from './Pixel';

const SLIDES = [
  { icon: '🗡️', title: '欢迎来到 RPGLife', body: '把人生过成一场像素 RPG。完成现实中的小目标，赚取金币与经验，一步步升级你的冒险者。' },
  { icon: '📜', title: '委托与试炼', body: '每日 / 每周「委托」打卡即得奖励；多日「试炼」连续打卡解锁里程碑，连满 14 天即可毕业成为习惯。' },
  { icon: '👹', title: '讨伐 Boss', body: '把一个大目标做成 Boss，用关联任务的每次打卡削减它的 HP，分三阶段领取丰厚奖励。' },
  { icon: '💰', title: '金币可提现', body: '攒够金币可兑换为真实奖励，给坚持一个看得见的回报。准备好开始你的冒险了吗？' },
];

/** 首启引导：3–4 屏像素向导，结束置 onboarded。可随时跳过。 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center', padding: space(5) }}>
      <View style={[{ backgroundColor: colors.bgPanel, padding: space(5), gap: space(3), alignItems: 'center', maxWidth: 460, width: '100%' }, pixelBorder, pixelShadow]}>
        <PixelText style={{ fontSize: 56 }}>{s.icon}</PixelText>
        <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>{s.title}</PixelText>
        <PixelText style={{ color: colors.ink, fontSize: 13, textAlign: 'center', lineHeight: 22 }}>{s.body}</PixelText>
        <View style={{ flexDirection: 'row', gap: space(1), marginTop: space(1) }}>
          {SLIDES.map((_, idx) => (
            <View key={idx} style={{ width: space(2), height: space(2), backgroundColor: idx === i ? colors.gold : colors.bgDeep, borderWidth: 2, borderColor: colors.border }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2), width: '100%' }}>
          {!last ? <View style={{ flex: 1 }}><PixelButton label="跳过" color={colors.bgDeep} onPress={onDone} /></View> : null}
          <View style={{ flex: 2 }}><PixelButton label={last ? '开始冒险 ⚔' : '下一步 →'} color={colors.success} onPress={() => (last ? onDone() : setI(i + 1))} /></View>
        </View>
      </View>
    </View>
  );
}
