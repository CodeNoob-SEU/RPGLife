import { Text, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { expNeeded } from '../../domain/economy';
import { colors, pixelBorder, space } from '../theme';
import { PixelProgressBar } from './Pixel';

export function TopStatusBar() {
  const player = useGameStore((s) => s.player);
  const gold = useGameStore((s) => s.player.gold);
  const config = useGameStore((s) => s.config);
  const need = expNeeded(player.level, config);
  return (
    <View style={[{ backgroundColor: colors.bgPanel, paddingTop: space(8), paddingBottom: space(2), paddingHorizontal: space(3), flexDirection: 'row', alignItems: 'center', gap: space(3) }, { borderBottomWidth: 3, borderColor: colors.border }]}>
      <View style={[{ width: space(10), height: space(10), backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' }, pixelBorder]}>
        <Text style={{ fontSize: 20 }}>🧙</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontWeight: 'bold' }}>{player.name}  Lv.{player.level}</Text>
        <PixelProgressBar value={player.exp} max={need} />
      </View>
      <Text style={{ color: colors.gold, fontWeight: 'bold' }}>🪙 {gold}</Text>
    </View>
  );
}
