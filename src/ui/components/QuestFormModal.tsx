import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors, space } from '../theme';
import { PixelButton, PixelText, PixelTextInput, PixelModal } from './Pixel';

export type QuestKind = 'daily' | 'weekly' | 'oneoff';
export type QuestDraft = { name: string; gold: string; exp: string; icon: string; category: string };
const LABEL: Record<QuestKind, string> = { daily: '每日委托', weekly: '每周委托', oneoff: '一次性委托' };

/** 委托增/改共用表单（每日/每周/一次性通用）。打开时按 initial 重置本地草稿。 */
export function QuestFormModal({
  visible, kind, editing, initial, onCancel, onSave,
}: {
  visible: boolean;
  kind: QuestKind;
  editing: boolean;
  initial: QuestDraft;
  onCancel: () => void;
  onSave: (v: { name: string; gold: number; exp: number; icon: string; category?: string }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [gold, setGold] = useState(initial.gold);
  const [exp, setExp] = useState(initial.exp);
  const [icon, setIcon] = useState(initial.icon);
  const [category, setCategory] = useState(initial.category);
  useEffect(() => {
    if (visible) { setName(initial.name); setGold(initial.gold); setExp(initial.exp); setIcon(initial.icon); setCategory(initial.category); }
    // 仅在打开时按 initial 重置；initial 在打开瞬间确定，无需作为依赖。
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => onSave({
    name: name.trim() || '未命名委托',
    gold: Math.max(0, Math.floor(Number(gold) || 0)),
    exp: Math.max(0, Math.floor(Number(exp) || 0)),
    icon: icon.trim() || '📝',
    category: category.trim() || undefined,
  });

  return (
    <PixelModal visible={visible} onRequestClose={onCancel}>
      <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>{editing ? '编辑' : '发布'}{LABEL[kind]}</PixelText>
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        <View style={{ width: space(18), gap: space(1) }}>
          <PixelText style={{ color: colors.ink }}>图标</PixelText>
          <PixelTextInput value={icon} onChangeText={setIcon} placeholder="📝" />
        </View>
        <View style={{ flex: 1, gap: space(1) }}>
          <PixelText style={{ color: colors.ink }}>名称</PixelText>
          <PixelTextInput value={name} onChangeText={setName} placeholder="例：喝水 8 杯" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>金币奖励</PixelText><PixelTextInput value={gold} onChangeText={setGold} numeric /></View>
        <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>经验奖励</PixelText><PixelTextInput value={exp} onChangeText={setExp} numeric /></View>
      </View>
      <View style={{ gap: space(1) }}>
        <PixelText style={{ color: colors.ink }}>分类（可选，如 健康 / 学习 / 生活）</PixelText>
        <PixelTextInput value={category} onChangeText={setCategory} placeholder="未分类" />
      </View>
      <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
        <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={onCancel} /></View>
        <View style={{ flex: 1 }}><PixelButton label="保存" color={colors.success} onPress={save} /></View>
      </View>
    </PixelModal>
  );
}
