import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors, space } from '../theme';
import { PixelButton, PixelText, PixelTextInput, PixelModal } from './Pixel';

export type AntiDraft = { name: string; icon: string; penalty: string };

/** 禁忌增/改表单（名称 / 图标 / 每次扣罚金币）。 */
export function AntiFormModal({
  visible, editing, initial, onCancel, onSave,
}: {
  visible: boolean;
  editing: boolean;
  initial: AntiDraft;
  onCancel: () => void;
  onSave: (v: { name: string; icon: string; penalty: number }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState(initial.icon);
  const [penalty, setPenalty] = useState(initial.penalty);
  useEffect(() => {
    if (visible) { setName(initial.name); setIcon(initial.icon); setPenalty(initial.penalty); }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => onSave({
    name: name.trim() || '未命名禁忌',
    icon: icon.trim() || '📵',
    penalty: Math.max(0, Math.floor(Number(penalty) || 0)),
  });

  return (
    <PixelModal visible={visible} onRequestClose={onCancel}>
      <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>{editing ? '编辑' : '新增'}禁忌</PixelText>
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        <View style={{ width: space(18), gap: space(1) }}><PixelText style={{ color: colors.ink }}>图标</PixelText><PixelTextInput value={icon} onChangeText={setIcon} placeholder="📵" /></View>
        <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>名称</PixelText><PixelTextInput value={name} onChangeText={setName} placeholder="例：刷手机超 1 小时" /></View>
      </View>
      <View style={{ gap: space(1) }}>
        <PixelText style={{ color: colors.ink }}>每次扣罚金币</PixelText>
        <PixelTextInput value={penalty} onChangeText={setPenalty} numeric />
      </View>
      <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
        <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={onCancel} /></View>
        <View style={{ flex: 1 }}><PixelButton label="保存" color={colors.success} onPress={save} /></View>
      </View>
    </PixelModal>
  );
}
