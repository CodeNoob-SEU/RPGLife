import { View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { dateStr, parseDate } from '../../domain/dateUtils';
import { currentDayStreak } from '../../domain/stats';
import { HistoryEntry } from '../../domain/types';
import { colors, pixelBorder, pixelShadow, space } from '../theme';
import { PixelText, PixelButton } from './Pixel';

const STATUS_TEXT: Record<HistoryEntry['status'], { t: string; c: string; icon: string }> = {
  perfect: { t: '全清达成！', c: colors.success, icon: '🌟' },
  partial: { t: '部分完成', c: colors.exp, icon: '🌤️' },
  missed: { t: '颗粒无收', c: colors.danger, icon: '🌧️' },
  rest: { t: '休整日', c: colors.textDim, icon: '😴' },
};

/** 晨间「昨日战报」：跨天后首屏弹一次，汇总昨日 status/收益/连续。每日仅一次（reportSeenDate）。 */
export function MorningReport() {
  const history = useGameStore((s) => s.history);
  const reportSeenDate = useGameStore((s) => s.reportSeenDate);
  const actions = useGameStore((s) => s.actions);

  const today = dateStr(new Date());
  const yd = parseDate(today);
  yd.setDate(yd.getDate() - 1);
  const yStr = dateStr(yd);
  const h = history[yStr];
  if (!h || reportSeenDate === today) return null;

  const st = STATUS_TEXT[h.status];
  const streak = currentDayStreak(history, today);
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: space(4) }}>
      <View style={[{ backgroundColor: colors.bgPanel, padding: space(4), gap: space(2), maxWidth: 420, width: '100%' }, pixelBorder, pixelShadow]}>
        <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>🌅 昨日战报</PixelText>
        <PixelText style={{ color: st.c, fontWeight: 'bold', fontSize: 15, textAlign: 'center' }}>{st.icon} {st.t}</PixelText>
        <View style={[{ backgroundColor: colors.bgDeep, padding: space(3), gap: space(1) }, pixelBorder]}>
          <PixelText style={{ color: colors.ink, fontSize: 13 }}>完成委托：{h.dailiesDone}/{h.dailiesTotal}</PixelText>
          <PixelText style={{ color: colors.ink, fontSize: 13 }}>昨日净收益：🪙{h.goldNet}</PixelText>
          <PixelText style={{ color: colors.accent, fontSize: 13 }}>当前连续活跃：🔥{streak} 天</PixelText>
        </View>
        <PixelText style={{ color: colors.textDim, fontSize: 11, textAlign: 'center' }}>新的一天，继续冒险吧！</PixelText>
        <PixelButton label="开始今天 ⚔" color={colors.success} onPress={() => actions.markReportSeen()} />
      </View>
    </View>
  );
}
