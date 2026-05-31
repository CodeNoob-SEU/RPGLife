import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { dateStr } from '../../domain/dateUtils';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, SectionTitle, EmptyState, ConfirmDialog } from '../components/Pixel';
import { QuestFormModal, QuestKind, QuestDraft } from '../components/QuestFormModal';
import { useGainFloat } from '../components/GainFloat';
import { haptics } from '../haptics';

type Item = { id: string; name: string; gold: number; exp: number; icon: string };

export function QuestsScreen() {
  // Select stable refs, filter in render body (filtering inside the selector → React #185).
  const dailies = useGameStore((s) => s.dailies).filter((d) => !d.archived);
  const weeklies = useGameStore((s) => s.weeklies).filter((w) => !w.archived);
  const oneoffs = useGameStore((s) => s.oneoffs).filter((o) => !o.archived);
  const todayReceipts = useGameStore((s) => s.todayReceipts);
  const dailyChest = useGameStore((s) => s.dailyChest);
  const actions = useGameStore((s) => s.actions);
  const { floatNode, fire } = useGainFloat();

  const today = dateStr(new Date());
  const chestReady = dailyChest?.date !== today;
  const doneCount = dailies.filter((d) => d.doneDate === today).length;
  const activeOneoffs = oneoffs.filter((o) => o.doneDate === null);
  const doneOneoffs = oneoffs.filter((o) => o.doneDate !== null);

  const [manage, setManage] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [form, setForm] = useState<{ kind: QuestKind; editId: string | null; initial: QuestDraft } | null>(null);
  const [del, setDel] = useState<{ kind: QuestKind; id: string; name: string } | null>(null);

  const ridFor = (kind: string, id: string) => todayReceipts.find((r) => r.kind === kind && r.taskId === id)?.rid;
  const onUndo = (rid: string) => { haptics.medium(); actions.undo(rid); };
  const openChest = () => {
    haptics.success();
    const before = useGameStore.getState().player.gold;
    actions.openDailyChest();
    const dg = useGameStore.getState().player.gold - before;
    if (dg > 0) fire(dg, 0);
  };

  const checkIn = (kind: QuestKind, id: string) => {
    haptics.light();
    const before = useGameStore.getState().player;
    if (kind === 'daily') actions.checkInDaily(id);
    else if (kind === 'weekly') actions.checkInWeekly(id);
    else actions.checkInOneoff(id);
    const after = useGameStore.getState().player;
    const dg = after.gold - before.gold;
    const de = after.expTotal - before.expTotal;
    if (dg !== 0 || de !== 0) fire(dg, de);
  };

  const DEFAULTS: Record<QuestKind, QuestDraft> = {
    daily: { name: '', gold: '15', exp: '8', icon: '📝' },
    weekly: { name: '', gold: '60', exp: '30', icon: '🗓️' },
    oneoff: { name: '', gold: '40', exp: '20', icon: '📦' },
  };
  const openAdd = (kind: QuestKind) => setForm({ kind, editId: null, initial: DEFAULTS[kind] });
  const openEdit = (kind: QuestKind, it: Item) => setForm({ kind, editId: it.id, initial: { name: it.name, gold: String(it.gold), exp: String(it.exp), icon: it.icon } });

  const saveForm = (vals: { name: string; gold: number; exp: number; icon: string }) => {
    if (!form) return;
    const { kind, editId } = form;
    if (editId) {
      if (kind === 'daily') actions.editDaily(editId, vals);
      else if (kind === 'weekly') actions.editWeekly(editId, vals);
      else actions.editOneoff(editId, vals);
    } else if (kind === 'daily') actions.addDaily(vals.name, vals.gold, vals.exp, vals.icon);
    else if (kind === 'weekly') actions.addWeekly(vals.name, vals.gold, vals.exp, vals.icon);
    else actions.addOneoff(vals.name, vals.gold, vals.exp, vals.icon);
    setForm(null);
  };
  const doDelete = () => {
    if (!del) return;
    if (del.kind === 'daily') actions.archiveDaily(del.id);
    else if (del.kind === 'weekly') actions.archiveWeekly(del.id);
    else actions.archiveOneoff(del.id);
    setDel(null);
  };

  const renderHeader = (title: string, kind: QuestKind) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space(2) }}>
      <SectionTitle>{title}</SectionTitle>
      <PixelButton label="＋ 发布" color={colors.bgPanel} onPress={() => openAdd(kind)} />
    </View>
  );
  const renderManage = (kind: QuestKind, it: Item) => (
    <View style={{ flexDirection: 'row', gap: space(2) }}>
      <PixelButton label="编辑" color={colors.bgPanel} onPress={() => openEdit(kind, it)} />
      <PixelButton label="删除" color={colors.danger} onPress={() => setDel({ kind, id: it.id, name: it.name })} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {floatNode}
      <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <PixelButton label={manage ? '✓ 完成管理' : '✎ 管理'} color={manage ? colors.success : colors.bgPanel} onPress={() => setManage((m) => !m)} />
        </View>

        <PixelPanel style={chestReady ? { borderColor: colors.gold } : { opacity: 0.7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
            <PixelText style={{ fontSize: 24 }}>{chestReady ? '🎁' : '📦'}</PixelText>
            <PixelText style={{ color: colors.ink, flex: 1 }}>{chestReady ? '每日宝箱已就绪！' : '今日宝箱已开启 · 明日再来'}</PixelText>
            {chestReady ? <PixelButton label="开启" color={colors.gold} onPress={openChest} /> : null}
          </View>
        </PixelPanel>

        {renderHeader('每日委托', 'daily')}
        {dailies.length === 0 ? (
          <EmptyState icon="📜" title="还没有每日委托" hint="点「＋ 发布」添加你想每天坚持的小事，打卡赚金币与经验。" />
        ) : (
          <PixelText style={{ color: colors.ink }}>
            {doneCount}/{dailies.length} 完成{doneCount < dailies.length ? `（再完成 ${dailies.length - doneCount} 个解锁全清奖励）` : '　★ 全清达成'}
          </PixelText>
        )}
        {dailies.map((d) => {
          const done = d.doneDate === today;
          const rid = ridFor('daily', d.id);
          return (
            <PixelPanel key={d.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 18 }}>{d.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1 }}>{d.name}　🪙{d.gold} ✨{d.exp}</PixelText>
                {manage ? renderManage('daily', d) : done && rid
                  ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => onUndo(rid)} />
                  : <PixelButton label={done ? '已完成' : '打卡'} color={colors.success} disabled={done && !rid} onPress={() => checkIn('daily', d.id)} />}
              </View>
            </PixelPanel>
          );
        })}

        {renderHeader('每周委托', 'weekly')}
        {weeklies.length === 0 ? <EmptyState icon="🗓️" title="还没有每周委托" hint="点「＋ 发布」添加每周目标，比如复盘、大扫除。" /> : null}
        {weeklies.map((w) => {
          const rid = ridFor('weekly', w.id);
          const done = !!w.doneWeek;
          return (
            <PixelPanel key={w.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 18 }}>{w.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1 }}>{w.name}　🪙{w.gold} ✨{w.exp}</PixelText>
                {manage ? renderManage('weekly', w) : done && rid
                  ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => onUndo(rid)} />
                  : <PixelButton label={done ? '已完成' : '打卡'} color={colors.success} disabled={done && !rid} onPress={() => checkIn('weekly', w.id)} />}
              </View>
            </PixelPanel>
          );
        })}

        {renderHeader('一次性委托', 'oneoff')}
        {activeOneoffs.length === 0 && doneOneoffs.length === 0 ? (
          <EmptyState icon="📦" title="还没有一次性委托" hint="一次性的小目标放这里：完成即得奖励，无截止、不惩罚。" />
        ) : null}
        {activeOneoffs.map((o) => {
          const rid = ridFor('oneoff', o.id);
          return (
            <PixelPanel key={o.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 18 }}>{o.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1 }}>{o.name}　🪙{o.gold} ✨{o.exp}</PixelText>
                {manage ? renderManage('oneoff', o) : rid
                  ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => onUndo(rid)} />
                  : <PixelButton label="完成" color={colors.success} onPress={() => checkIn('oneoff', o.id)} />}
              </View>
            </PixelPanel>
          );
        })}
        {doneOneoffs.length > 0 ? (
          <PixelButton label={`${showDone ? '▼' : '▶'} 已完成（${doneOneoffs.length}）`} color={colors.bgPanel} onPress={() => setShowDone((v) => !v)} />
        ) : null}
        {showDone
          ? doneOneoffs.map((o) => (
              <PixelPanel key={o.id} style={{ opacity: 0.7 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                  <PixelText style={{ fontSize: 18 }}>{o.icon}</PixelText>
                  <PixelText style={{ color: colors.ink, flex: 1 }}>{o.name}</PixelText>
                  <PixelText style={{ color: colors.success }}>✅ {o.doneDate}</PixelText>
                </View>
              </PixelPanel>
            ))
          : null}
      </ScrollView>

      <QuestFormModal
        visible={!!form}
        kind={form?.kind ?? 'daily'}
        editing={!!form?.editId}
        initial={form?.initial ?? { name: '', gold: '', exp: '', icon: '' }}
        onCancel={() => setForm(null)}
        onSave={saveForm}
      />
      <ConfirmDialog
        visible={!!del}
        title="删除这个委托？"
        message={del ? `「${del.name}」将被归档（不再显示，历史与统计保留）。` : ''}
        confirmLabel="删除"
        danger
        onCancel={() => setDel(null)}
        onConfirm={doDelete}
      />
    </View>
  );
}
