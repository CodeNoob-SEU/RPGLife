import { useEffect } from 'react';
import { Modal, Pressable, Text, TextInput, TextProps, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { colors, pixelBorder, pixelShadow, space, font } from '../theme';
import { useGameStore } from '../../store/useGameStore';

export function PixelPanel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: colors.bgPanel, padding: space(3) }, pixelBorder, pixelShadow, style]}>
      {children}
    </View>
  );
}

export function PixelButton({ label, onPress, color = colors.accent, disabled }: { label: string; onPress: () => void; color?: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[{ backgroundColor: disabled ? colors.bgPanel : color, paddingVertical: space(2), paddingHorizontal: space(3), opacity: disabled ? 0.5 : 1 }, pixelBorder]}
    >
      <Text style={{ color: colors.ink, fontWeight: 'bold', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * 像素进度条。宽度变化用 reanimated 动画填充：上升时轻微 overshoot 回弹，下降时平滑收缩。
 * 受 config.reduceMotion 控制（开启则瞬时无动画）。height 可定制（HP 条更高）。
 */
export function PixelProgressBar({ value, max, color = colors.exp, height = space(4) }: { value: number; max: number; color?: string; height?: number }) {
  const reduceMotion = useGameStore((s) => s.config.reduceMotion);
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const w = useSharedValue(pct);
  const prev = useSharedValue(pct);
  useEffect(() => {
    if (reduceMotion) { w.value = pct; prev.value = pct; return; }
    if (pct > prev.value) {
      const over = Math.min(100, pct + 3);
      w.value = withSequence(
        withTiming(over, { duration: 240, easing: Easing.out(Easing.quad) }),
        withTiming(pct, { duration: 180, easing: Easing.inOut(Easing.quad) })
      );
    } else {
      w.value = withTiming(pct, { duration: 260, easing: Easing.out(Easing.quad) });
    }
    prev.value = pct;
  }, [pct, reduceMotion]);
  const aStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={[{ height, backgroundColor: colors.bgDeep, overflow: 'hidden' }, pixelBorder]}>
      <Animated.View style={[{ height: '100%', backgroundColor: color }, aStyle]} />
    </View>
  );
}

/** 像素文本：默认 body 字体（Zpix，覆盖中英数）；display 用 Press Start 2P（仅英数）。 */
export function PixelText({ style, display, ...rest }: TextProps & { display?: boolean }) {
  return <Text {...rest} style={[{ color: colors.ink, fontFamily: display ? font.display : font.body }, style]} />;
}

/** 像素标题（金色加粗）。 */
export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 14 }}>{children}</PixelText>
    </View>
  );
}

/** 空状态：像素图标 + 鼓励标题 + 提示 + 可选 CTA。把"暂无数据"变成可教学的引导。 */
export function EmptyState({ icon, title, hint, cta }: { icon: string; title: string; hint?: string; cta?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space(8), gap: space(2) }}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <PixelText style={{ color: colors.ink, fontWeight: 'bold', fontSize: 15, textAlign: 'center' }}>{title}</PixelText>
      {hint ? <PixelText style={{ color: colors.textDim, textAlign: 'center', fontSize: 12, maxWidth: 320 }}>{hint}</PixelText> : null}
      {cta ? <View style={{ marginTop: space(2) }}>{cta}</View> : null}
    </View>
  );
}

/** 像素开关（布尔）：点击切换，旋钮左右滑，开=success 底。 */
export function PixelToggle({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => onValueChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
      <PixelText style={{ color: colors.ink, flex: 1, fontSize: 13 }}>{label}</PixelText>
      <View style={[{ width: space(14), height: space(7), backgroundColor: value ? colors.success : colors.bgDeep, justifyContent: 'center', paddingHorizontal: 3 }, pixelBorder]}>
        <View style={{ width: space(5), height: space(5), backgroundColor: value ? colors.ink : colors.textDim, alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </Pressable>
  );
}

/** 像素输入框（深底 + 硬边）。numeric 时 keyboardType=numeric。 */
export function PixelTextInput({
  value, onChangeText, placeholder, numeric, multiline, style,
}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
  numeric?: boolean; multiline?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textDim}
      keyboardType={numeric ? 'numeric' : 'default'}
      multiline={multiline}
      style={[
        { backgroundColor: colors.bgDeep, color: colors.ink, paddingHorizontal: space(2), paddingVertical: space(2), fontFamily: font.body, minHeight: multiline ? space(20) : undefined, textAlignVertical: multiline ? 'top' : 'center' },
        pixelBorder,
        style,
      ]}
    />
  );
}

/** 像素模态：居中 PixelPanel，半透明遮罩。 */
export function PixelModal({ visible, onRequestClose, children }: { visible: boolean; onRequestClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: space(4) }}>
        <View style={[{ backgroundColor: colors.bgPanel, padding: space(3), width: '100%', maxWidth: 420, gap: space(2) }, pixelBorder, pixelShadow]}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** 二次确认对话框（仪式化操作用）。 */
export function ConfirmDialog({
  visible, title, message, confirmLabel = '确认', onConfirm, onCancel, danger,
}: {
  visible: boolean; title: string; message?: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <PixelModal visible={visible} onRequestClose={onCancel}>
      <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>{title}</PixelText>
      {message ? <PixelText style={{ color: colors.ink }}>{message}</PixelText> : null}
      <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
        <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={onCancel} /></View>
        <View style={{ flex: 1 }}><PixelButton label={confirmLabel} color={danger ? colors.danger : colors.success} onPress={onConfirm} /></View>
      </View>
    </PixelModal>
  );
}
