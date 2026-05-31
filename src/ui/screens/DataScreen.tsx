import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { dateStr } from '../../domain/dateUtils';
import { bestTrialStreak, currentDayStreak, completionRate, heatmapCells, goldTrend, lifetimeTotals } from '../../domain/stats';
import { ACHIEVEMENTS } from '../../domain/achievements';
import { colors, pixelBorder, space } from '../theme';
import { PixelPanel, PixelText, PixelProgressBar, SectionTitle, EmptyState } from '../components/Pixel';

const LEVEL_COLOR = ['#23263f', colors.danger, colors.panelHi, colors.accent, colors.success];
const HEATMAP_DAYS = 98; // 14 周

function Stat({ label, value, color = colors.ink }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, minWidth: space(28), gap: space(1) }}>
      <PixelText style={{ color: colors.textDim, fontSize: 11 }}>{label}</PixelText>
      <PixelText style={{ color, fontWeight: 'bold', fontSize: 16 }}>{value}</PixelText>
    </View>
  );
}

export function DataScreen() {
  const history = useGameStore((s) => s.history);
  const ledger = useGameStore((s) => s.ledger);
  const trials = useGameStore((s) => s.trials);
  const config = useGameStore((s) => s.config);
  const achievements = useGameStore((s) => s.achievements);

  const unlockedAt = achievements.unlockedAt;
  const unlockedCount = Object.keys(unlockedAt).length;
  const today = dateStr(new Date());
  const totals = lifetimeTotals(ledger);
  const cells = heatmapCells(history, today, HEATMAP_DAYS);
  const weeks: Array<typeof cells> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const trend = goldTrend(history, today, 14);
  const trendMax = Math.max(1, ...trend.map((t) => Math.abs(t.goldNet)));
  const rate7 = completionRate(history, today, 7);
  const rate30 = completionRate(history, today, 30);
  const dayStreak = currentDayStreak(history, today);
  const activeTrials = trials.filter((t) => !t.archived);
  const hasData = ledger.length > 0 || Object.keys(history).length > 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <SectionTitle>数据总览</SectionTitle>

      {!hasData ? (
        <EmptyState icon="📊" title="还没有数据" hint="开始打卡后，这里会汇总你的连续记录、完成率、金币趋势与年度热力图。" />
      ) : null}

      {/* 累计 */}
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.gold, fontWeight: 'bold' }}>累计成就</PixelText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
            <Stat label="累计赚取" value={`🪙${totals.earned}`} color={colors.gold} />
            <Stat label="已提现" value={`¥${(totals.cashedOut / config.goldToYuanRate).toFixed(2)}`} color={colors.success} />
            <Stat label="完成任务" value={`${totals.tasksCompleted} 次`} />
            <Stat label="漏做扣罚" value={`🪙${totals.penalties}`} color={colors.danger} />
          </View>
        </View>
      </PixelPanel>

      {/* 连续记录 */}
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.gold, fontWeight: 'bold' }}>连续记录</PixelText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
            <Stat label="当前连续活跃" value={`🔥${dayStreak} 天`} color={colors.accent} />
            <Stat label="近 7 日完成率" value={`${Math.round(rate7 * 100)}%`} color={colors.exp} />
            <Stat label="近 30 日完成率" value={`${Math.round(rate30 * 100)}%`} color={colors.exp} />
          </View>
          {activeTrials.length > 0 ? (
            <View style={{ gap: space(1), marginTop: space(1) }}>
              {activeTrials.map((t) => (
                <PixelText key={t.id} style={{ color: colors.ink, fontSize: 12 }}>
                  {t.icon} {t.name}：当前 🔥{t.streak} · 最佳 🏅{bestTrialStreak(t)} 天
                </PixelText>
              ))}
            </View>
          ) : null}
        </View>
      </PixelPanel>

      {/* 成就墙 */}
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.gold, fontWeight: 'bold' }}>成就墙（{unlockedCount}/{ACHIEVEMENTS.length}）</PixelText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            {ACHIEVEMENTS.map((a) => {
              const at = unlockedAt[a.id];
              const on = !!at;
              return (
                <View key={a.id} style={[{ width: '47%', padding: space(2), gap: space(1), backgroundColor: on ? colors.bgDeep : '#202234', opacity: on ? 1 : 0.55, borderColor: on ? colors.gold : colors.border }, pixelBorder]}>
                  <PixelText style={{ fontSize: 20 }}>{on ? a.icon : '🔒'}</PixelText>
                  <PixelText style={{ color: on ? colors.ink : colors.textDim, fontWeight: 'bold', fontSize: 12 }}>{a.title}</PixelText>
                  <PixelText style={{ color: colors.textDim, fontSize: 10 }}>{a.desc}</PixelText>
                  {on ? <PixelText style={{ color: colors.success, fontSize: 10 }}>✅ {at}</PixelText> : null}
                </View>
              );
            })}
          </View>
        </View>
      </PixelPanel>

      {/* 热力图 */}
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.gold, fontWeight: 'bold' }}>打卡热力图（近 14 周）</PixelText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {weeks.map((wk, ci) => (
                <View key={ci} style={{ gap: 2 }}>
                  {wk.map((c) => (
                    <View key={c.date} style={{ width: 12, height: 12, backgroundColor: LEVEL_COLOR[c.level] }} />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1) }}>
            <PixelText style={{ color: colors.textDim, fontSize: 11 }}>少</PixelText>
            {LEVEL_COLOR.map((c, i) => (
              <View key={i} style={{ width: 12, height: 12, backgroundColor: c }} />
            ))}
            <PixelText style={{ color: colors.textDim, fontSize: 11 }}>多</PixelText>
          </View>
        </View>
      </PixelPanel>

      {/* 金币趋势 */}
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.gold, fontWeight: 'bold' }}>金币趋势（近 14 日）</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: space(16) }}>
            {trend.map((t) => {
              const h = Math.round((Math.abs(t.goldNet) / trendMax) * space(15)) + 2;
              return <View key={t.date} style={{ flex: 1, height: h, backgroundColor: t.goldNet >= 0 ? colors.gold : colors.danger }} />;
            })}
          </View>
          <PixelText style={{ color: colors.textDim, fontSize: 11 }}>金色=净赚 · 红色=净亏（漏做扣罚）</PixelText>
        </View>
      </PixelPanel>

      {/* 经济换算说明 */}
      <PixelProgressBar value={Math.min(totals.earned, 1000)} max={1000} color={colors.gold} />
      <PixelText style={{ color: colors.textDim, fontSize: 11, textAlign: 'center' }}>{config.goldToYuanRate} 金 = ¥1</PixelText>
    </ScrollView>
  );
}
