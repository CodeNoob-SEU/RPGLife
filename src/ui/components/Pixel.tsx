import { Modal, Pressable, Text, TextInput, TextProps, View, ViewStyle, StyleProp } from 'react-native';
import { colors, pixelBorder, pixelShadow, space, font } from '../theme';

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

export function PixelProgressBar({ value, max, color = colors.exp }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <View style={[{ height: space(4), backgroundColor: colors.bgDeep }, pixelBorder]}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
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
