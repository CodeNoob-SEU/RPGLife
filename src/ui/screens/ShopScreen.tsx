import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, ConfirmDialog, SectionTitle } from '../components/Pixel';
import { haptics } from '../haptics';

export function ShopScreen() {
  const gold = useGameStore((s) => s.player.gold);
  const freezeCards = useGameStore((s) => s.inventory.freezeCards);
  const config = useGameStore((s) => s.config);
  const actions = useGameStore((s) => s.actions);

  const canBuy = gold >= config.freezeCardCost;
  const canCashOut = gold >= config.cashOutThreshold;
  const yuan = (gold / config.goldToYuanRate).toFixed(2);
  const [confirming, setConfirming] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <SectionTitle>商店</SectionTitle>

      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.ink, fontWeight: 'bold' }}>❄ 冻结卡</PixelText>
          <PixelText style={{ color: colors.ink }}>断签时自动消耗一张保护连击。当前持有：{freezeCards} 张</PixelText>
          <PixelText style={{ color: colors.gold }}>单价 🪙{config.freezeCardCost}（你有 🪙{gold}）</PixelText>
          <PixelButton label={canBuy ? '购买一张' : '金币不足'} color={canBuy ? colors.success : colors.bgPanel} disabled={!canBuy} onPress={() => { haptics.success(); actions.buyFreezeCard(); }} />
        </View>
      </PixelPanel>

      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.ink, fontWeight: 'bold' }}>💰 提现</PixelText>
          <PixelText style={{ color: colors.ink }}>{config.goldToYuanRate} 金 = ¥1，满 🪙{config.cashOutThreshold} 可提现。</PixelText>
          <PixelText style={{ color: colors.gold }}>当前 🪙{gold} ≈ ¥{yuan}</PixelText>
          <PixelButton label={canCashOut ? `提现全部（¥${yuan}）` : `未达提现门槛 🪙${config.cashOutThreshold}`} color={canCashOut ? colors.gold : colors.bgPanel} disabled={!canCashOut} onPress={() => setConfirming(true)} />
        </View>
      </PixelPanel>

      <ConfirmDialog
        visible={confirming}
        title="确认提现？"
        message={`将提现 🪙${gold} = ¥${yuan}。金币会从账户扣除，此操作不可撤销。`}
        confirmLabel="确认提现"
        onCancel={() => setConfirming(false)}
        onConfirm={() => { haptics.success(); actions.cashOut(gold); setConfirming(false); }}
      />
    </ScrollView>
  );
}
