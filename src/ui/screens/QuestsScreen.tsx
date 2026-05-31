import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { dateStr } from '../../domain/dateUtils';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, SectionTitle } from '../components/Pixel';
import { useGainFloat } from '../components/GainFloat';
import { haptics } from '../haptics';

export function QuestsScreen() {
  // Select stable refs, filter in render body (filtering inside the selector → React #185).
  const dailies = useGameStore((s) => s.dailies).filter((d) => !d.archived);
  const weeklies = useGameStore((s) => s.weeklies).filter((w) => !w.archived);
  const todayReceipts = useGameStore((s) => s.todayReceipts);
  const actions = useGameStore((s) => s.actions);
  const { floatNode, fire } = useGainFloat();

  const today = dateStr(new Date());
  const doneCount = dailies.filter((d) => d.doneDate === today).length;
  const ridFor = (kind: string, id: string) => todayReceipts.find((r) => r.kind === kind && r.taskId === id)?.rid;

  const checkInWithFloat = (kind: 'daily' | 'weekly', id: string) => {
    haptics.light();
    const before = useGameStore.getState().player;
    if (kind === 'daily') actions.checkInDaily(id); else actions.checkInWeekly(id);
    const after = useGameStore.getState().player;
    const dg = after.gold - before.gold;
    const de = after.expTotal - before.expTotal;
    if (dg !== 0 || de !== 0) fire(dg, de);
  };
  const onUndo = (rid: string) => { haptics.medium(); actions.undo(rid); };

  return (
    <View style={{ flex: 1 }}>
      {floatNode}
      <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
        <SectionTitle>每日委托</SectionTitle>
        <PixelText style={{ color: colors.ink }}>
          {doneCount}/{dailies.length} 完成{doneCount < dailies.length ? `（再完成 ${dailies.length - doneCount} 个解锁全清奖励）` : '　★ 全清达成'}
        </PixelText>
        {dailies.map((d) => {
          const done = d.doneDate === today;
          const rid = ridFor('daily', d.id);
          return (
            <PixelPanel key={d.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 18 }}>{d.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1 }}>{d.name}　🪙{d.gold} ✨{d.exp}</PixelText>
                {done && rid
                  ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => onUndo(rid)} />
                  : <PixelButton label={done ? '已完成' : '打卡'} color={colors.success} disabled={done && !rid} onPress={() => checkInWithFloat('daily', d.id)} />}
              </View>
            </PixelPanel>
          );
        })}

        <SectionTitle style={{ marginTop: space(2) }}>每周委托</SectionTitle>
        {weeklies.map((w) => {
          const rid = ridFor('weekly', w.id);
          const done = !!w.doneWeek;
          return (
            <PixelPanel key={w.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 18 }}>{w.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1 }}>{w.name}　🪙{w.gold} ✨{w.exp}</PixelText>
                {done && rid
                  ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => onUndo(rid)} />
                  : <PixelButton label={done ? '已完成' : '打卡'} color={colors.success} disabled={done && !rid} onPress={() => checkInWithFloat('weekly', w.id)} />}
              </View>
            </PixelPanel>
          );
        })}
      </ScrollView>
    </View>
  );
}
