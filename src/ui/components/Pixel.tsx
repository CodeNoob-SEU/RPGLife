import { Pressable, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors, pixelBorder, pixelShadow, space } from '../theme';

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
