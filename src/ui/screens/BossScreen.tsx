import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { Boss } from '../../domain/types';
import { colors, space } from '../theme';
import { PixelButton, PixelText, PixelTextInput, PixelModal, ConfirmDialog, SectionTitle } from '../components/Pixel';
import { BossCard } from '../components/BossCard';

type Draft = {
  name: string; maxHp: string; damagePerHit: string;
  totalRewardGold: string; totalRewardExp: string;
  w0: string; w1: string; w2: string; linkedTaskIds: string[];
};
const emptyDraft: Draft = { name: '', maxHp: '200', damagePerHit: '20', totalRewardGold: '600', totalRewardExp: '300', w0: '0.2', w1: '0.3', w2: '0.5', linkedTaskIds: [] };

export function BossScreen() {
  const bosses = useGameStore((s) => s.bosses);
  const dailies = useGameStore((s) => s.dailies);
  const weeklies = useGameStore((s) => s.weeklies);
  const trials = useGameStore((s) => s.trials);
  const actions = useGameStore((s) => s.actions);

  const active = bosses.filter((b) => !b.archived);
  const linkOptions = useMemo(
    () => [
      ...dailies.filter((d) => !d.archived).map((d) => ({ id: d.id, label: `📜 ${d.name}` })),
      ...weeklies.filter((w) => !w.archived).map((w) => ({ id: w.id, label: `🗓 ${w.name}` })),
      ...trials.filter((t) => !t.archived).map((t) => ({ id: t.id, label: `🎯 ${t.name}` })),
    ],
    [dailies, weeklies, trials]
  );
  const nameOf = (id: string) => linkOptions.find((o) => o.id === id)?.label ?? id;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<Boss | null>(null);

  const openNew = () => { setEditingId(null); setDraft({ ...emptyDraft }); };
  const openEdit = (b: Boss) => {
    setEditingId(b.id);
    setDraft({ name: b.name, maxHp: String(b.maxHp), damagePerHit: String(b.damagePerHit), totalRewardGold: String(b.totalRewardGold), totalRewardExp: String(b.totalRewardExp), w0: String(b.weights[0]), w1: String(b.weights[1]), w2: String(b.weights[2]), linkedTaskIds: [...b.linkedTaskIds] });
  };
  const toggleLink = (id: string) => setDraft((d) => d ? { ...d, linkedTaskIds: d.linkedTaskIds.includes(id) ? d.linkedTaskIds.filter((x) => x !== id) : [...d.linkedTaskIds, id] } : d);

  const saveDraft = () => {
    if (!draft) return;
    const payload = {
      name: draft.name.trim() || '未命名 Boss',
      maxHp: Math.max(1, Number(draft.maxHp) || 1),
      damagePerHit: Math.max(1, Number(draft.damagePerHit) || 1),
      totalRewardGold: Math.max(0, Number(draft.totalRewardGold) || 0),
      totalRewardExp: Math.max(0, Number(draft.totalRewardExp) || 0),
      weights: [Number(draft.w0) || 0, Number(draft.w1) || 0, Number(draft.w2) || 0] as [number, number, number],
      linkedTaskIds: draft.linkedTaskIds,
    };
    if (editingId) actions.editBoss(editingId, payload);
    else actions.addBoss(payload);
    setDraft(null);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionTitle>讨伐 Boss</SectionTitle>
        <PixelButton label="＋ 新建 Boss" onPress={openNew} />
      </View>

      {active.length === 0 ? <PixelText style={{ color: colors.ink }}>暂无 Boss。</PixelText> : null}

      {active.map((b) => (
        <BossCard key={b.id} boss={b} nameOf={nameOf} onEdit={() => openEdit(b)} onArchive={() => setArchiving(b)} />
      ))}

      <PixelModal visible={!!draft} onRequestClose={() => setDraft(null)}>
        {draft ? (
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: space(2) }}>
            <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>{editingId ? '编辑 Boss' : '新建 Boss'}</PixelText>
            <PixelText style={{ color: colors.ink }}>名称</PixelText>
            <PixelTextInput value={draft.name} onChangeText={(t) => setDraft({ ...draft, name: t })} placeholder="例：读完一本书" />
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>最大 HP</PixelText><PixelTextInput value={draft.maxHp} onChangeText={(t) => setDraft({ ...draft, maxHp: t })} numeric /></View>
              <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>单次伤害</PixelText><PixelTextInput value={draft.damagePerHit} onChangeText={(t) => setDraft({ ...draft, damagePerHit: t })} numeric /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>总奖励金币</PixelText><PixelTextInput value={draft.totalRewardGold} onChangeText={(t) => setDraft({ ...draft, totalRewardGold: t })} numeric /></View>
              <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>总奖励经验</PixelText><PixelTextInput value={draft.totalRewardExp} onChangeText={(t) => setDraft({ ...draft, totalRewardExp: t })} numeric /></View>
            </View>
            <PixelText style={{ color: colors.ink }}>三阶段比重（和≈1，默认 0.2/0.3/0.5）</PixelText>
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}><PixelTextInput value={draft.w0} onChangeText={(t) => setDraft({ ...draft, w0: t })} numeric /></View>
              <View style={{ flex: 1 }}><PixelTextInput value={draft.w1} onChangeText={(t) => setDraft({ ...draft, w1: t })} numeric /></View>
              <View style={{ flex: 1 }}><PixelTextInput value={draft.w2} onChangeText={(t) => setDraft({ ...draft, w2: t })} numeric /></View>
            </View>
            <PixelText style={{ color: colors.ink }}>关联任务（完成即扣血，可多选）</PixelText>
            {linkOptions.length === 0 ? <PixelText style={{ color: colors.accent }}>（暂无可关联任务）</PixelText> : null}
            {linkOptions.map((o) => {
              const on = draft.linkedTaskIds.includes(o.id);
              return <PixelButton key={o.id} label={`${on ? '☑' : '☐'} ${o.label}`} color={on ? colors.success : colors.bgDeep} onPress={() => toggleLink(o.id)} />;
            })}
            <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
              <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={() => setDraft(null)} /></View>
              <View style={{ flex: 1 }}><PixelButton label="保存" color={colors.success} onPress={saveDraft} /></View>
            </View>
          </ScrollView>
        ) : null}
      </PixelModal>

      <ConfirmDialog
        visible={!!archiving}
        title="归档这个 Boss？"
        message={archiving ? `「${archiving.name}」将不再被关联任务扣血（历史保留）。` : ''}
        confirmLabel="归档"
        danger
        onCancel={() => setArchiving(null)}
        onConfirm={() => { if (archiving) actions.archiveBoss(archiving.id); setArchiving(null); }}
      />
    </ScrollView>
  );
}
