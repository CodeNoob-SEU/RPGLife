import { Text, View } from 'react-native';
import { colors, space } from '../theme';

export function Placeholder({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center', padding: space(4) }}>
      <Text style={{ color: colors.ink, fontSize: 18 }}>{title}</Text>
      <Text style={{ color: colors.accent, marginTop: space(2) }}>（Plan 3 实现）</Text>
    </View>
  );
}
