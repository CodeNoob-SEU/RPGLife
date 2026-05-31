import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { dateStr } from '../../domain/dateUtils';
import { Trial } from '../../domain/types';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, PixelProgressBar, PixelTextInput, PixelModal, ConfirmDialog, SectionTitle } from '../components/Pixel';
import { useGainFloat } from '../components/GainFloat';
import { haptics } from '../haptics';

export function TrialsScreen() {
  const trials = useGameStore((s) => s.trials);
  const todayReceipts = useGameStore((s) => s.todayReceipts);
  const actions = useGameStore((s) => s.actions);
  const { floatNode, fire } = useGainFloat();

  const today = dateStr(new Date());
  const active = trials.filter((t) => !t.archived && !t.graduated);
  const graduated = trials.filter((t) => !t.archived && t.graduated);
  const ridFor = (id: string) => todayReceipts.find((r) => r.kind === 'trial' && r.taskId === id)?.rid;

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Trial | null>(null);
  const [editName, setEditName] = useState('');
  const [abandon, setAbandon] = useState<Trial | null>(null);

  const nextMilestone = (t: Trial) => [...t.milestones].sort((a, b) => a.day - b.day).find((m) => m.day > t.streak);

  const checkInTrialWithFloat = (id: string) => {
    haptics.light();
    const before = useGameStore.getState().player;
    actions.checkInTrial(id);
    const after = useGameStore.getState().player;
    const dg = after.gold - before.gold;
    const de = after.expTotal - before.expTotal;
    if (dg !== 0 || de !== 0) fire(`🪙+${dg} ✨+${de}`);
  };

  return (
    <View style={{ flex: 1 }}>
      {floatNode}
      <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionTitle>进行中的试炼</SectionTitle>
          <PixelButton label="＋ 开启新试炼" onPress={() => { setNewName(''); setAdding(true); }} />
        </View>

        {active.length === 0 ? <PixelText style={{ color: colors.ink }}>暂无进行中的试炼。</PixelText> : null}

        {active.map((t) => {
          const done = t.completedDates.includes(today);
          const rid = ridFor(t.id);
          const nm = nextMilestone(t);
          return (
            <PixelPanel key={t.id}>
              <View style={{ gap: space(2) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                  <PixelText style={{ fontSize: 20 }}>{t.icon}</PixelText>
                  <PixelText style={{ color: colors.ink, flex: 1, fontWeight: 'bold' }}>{t.name}</PixelText>
                  <PixelText style={{ color: colors.gold }}>🔥{t.streak} 天</PixelText>
                </View>
                {nm ? (
                  <>
                    <PixelProgressBar value={t.streak} max={nm.day} color={colors.gold} />
                    <PixelText style={{ color: colors.ink }}>距 D{nm.day} 还差 {nm.day - t.streak} 天　奖励 🪙{nm.gold} ✨{nm.exp}</PixelText>
                  </>
                ) : (
                  <PixelText style={{ color: colors.success }}>已达最高里程碑，连满 14 天将毕业转为每日任务。</PixelText>
                )}
                <View style={{ flexDirection: 'row', gap: space(2), flexWrap: 'wrap' }}>
                  {done && rid
                    ? <PixelButton label="撤销今日打卡" color={colors.bgPanel} onPress={() => { haptics.medium(); actions.undo(rid); }} />
                    : <PixelButton label={done ? '今日已打卡' : '今日打卡'} color={colors.success} disabled={done && !rid} onPress={() => checkInTrialWithFloat(t.id)} />}
                  <PixelButton label="编辑" color={colors.bgPanel} onPress={() => { setEditing(t); setEditName(t.name); }} />
                  <PixelButton label="放弃" color={colors.danger} onPress={() => setAbandon(t)} />
                </View>
              </View>
            </PixelPanel>
          );
        })}

        {graduated.length > 0 ? <SectionTitle style={{ marginTop: space(2) }}>已毕业</SectionTitle> : null}
        {graduated.map((t) => (
          <PixelPanel key={t.id} style={{ opacity: 0.8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <PixelText style={{ fontSize: 18 }}>{t.icon}</PixelText>
              <PixelText style={{ color: colors.ink, flex: 1 }}>{t.name}</PixelText>
              <PixelText style={{ color: colors.success }}>✅ 已毕业（已转每日任务）</PixelText>
            </View>
          </PixelPanel>
        ))}

        <PixelModal visible={adding} onRequestClose={() => setAdding(false)}>
          <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>开启新试炼</PixelText>
          <PixelText style={{ color: colors.ink }}>名称（默认里程碑 D1/3/7/14，连满 14 天毕业）</PixelText>
          <PixelTextInput value={newName} onChangeText={setNewName} placeholder="例：每天冥想 10 分钟" />
          <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
            <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={() => setAdding(false)} /></View>
            <View style={{ flex: 1 }}><PixelButton label="开启" color={colors.success} disabled={!newName.trim()} onPress={() => { actions.addTrial(newName.trim()); setAdding(false); }} /></View>
          </View>
        </PixelModal>

        <PixelModal visible={!!editing} onRequestClose={() => setEditing(null)}>
          <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>编辑试炼</PixelText>
          <PixelTextInput value={editName} onChangeText={setEditName} placeholder="名称" />
          <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
            <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={() => setEditing(null)} /></View>
            <View style={{ flex: 1 }}><PixelButton label="保存" color={colors.success} disabled={!editName.trim()} onPress={() => { if (editing) actions.editTrial(editing.id, { name: editName.trim() }); setEditing(null); }} /></View>
          </View>
        </PixelModal>

        <ConfirmDialog
          visible={!!abandon}
          title="放弃这个试炼？"
          message={abandon ? `「${abandon.name}」将被归档（不再计入结算，历史保留）。` : ''}
          confirmLabel="放弃"
          danger
          onCancel={() => setAbandon(null)}
          onConfirm={() => { if (abandon) actions.archiveTrial(abandon.id); setAbandon(null); }}
        />
      </ScrollView>
    </View>
  );
}
