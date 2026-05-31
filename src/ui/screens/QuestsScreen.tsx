import { ScrollView, Text, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton } from '../components/Pixel';

export function QuestsScreen() {
  // Select the stable array refs, then filter in render. Filtering INSIDE the selector
  // returns a new array every render → zustand (Object.is) loops forever (React #185).
  const dailies = useGameStore((s) => s.dailies).filter((d) => !d.archived);
  const weeklies = useGameStore((s) => s.weeklies).filter((w) => !w.archived);
  const todayReceipts = useGameStore((s) => s.todayReceipts);
  const actions = useGameStore((s) => s.actions);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const doneCount = dailies.filter((d) => d.doneDate === todayStr).length;
  const ridFor = (kind: string, id: string) => todayReceipts.find((r) => r.kind === kind && r.taskId === id)?.rid;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <Text style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>每日委托</Text>
      <Text style={{ color: colors.ink }}>
        {doneCount}/{dailies.length} 完成{doneCount < dailies.length ? `（再完成 ${dailies.length - doneCount} 个解锁全清奖励）` : '　★ 全清达成'}
      </Text>
      {dailies.map((d) => {
        const done = d.doneDate === todayStr;
        const rid = ridFor('daily', d.id);
        return (
          <PixelPanel key={d.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <Text style={{ fontSize: 18 }}>{d.icon}</Text>
              <Text style={{ color: colors.ink, flex: 1 }}>{d.name}　🪙{d.gold} ✨{d.exp}</Text>
              {done && rid
                ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => actions.undo(rid)} />
                : <PixelButton label={done ? '已完成' : '打卡'} color={colors.success} disabled={done && !rid} onPress={() => actions.checkInDaily(d.id)} />}
            </View>
          </PixelPanel>
        );
      })}

      <Text style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16, marginTop: space(2) }}>每周委托</Text>
      {weeklies.map((w) => {
        const rid = ridFor('weekly', w.id);
        const done = !!w.doneWeek;
        return (
          <PixelPanel key={w.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <Text style={{ fontSize: 18 }}>{w.icon}</Text>
              <Text style={{ color: colors.ink, flex: 1 }}>{w.name}　🪙{w.gold} ✨{w.exp}</Text>
              {done && rid
                ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => actions.undo(rid)} />
                : <PixelButton label={done ? '已完成' : '打卡'} color={colors.success} disabled={done && !rid} onPress={() => actions.checkInWeekly(w.id)} />}
            </View>
          </PixelPanel>
        );
      })}
    </ScrollView>
  );
}
