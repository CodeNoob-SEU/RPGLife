import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { Config } from '../../domain/types';
import { CURRENT_VERSION } from '../../domain/version';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, PixelTextInput, ConfirmDialog, SectionTitle } from '../components/Pixel';

const FIELDS: Array<{ key: keyof Config; label: string }> = [
  { key: 'goldToYuanRate', label: '金币兑换率（X 金 = ¥1）' },
  { key: 'perfectDailyBonus', label: '每日全清奖励金币' },
  { key: 'perfectDailyBonusExp', label: '每日全清奖励经验' },
  { key: 'perfectWeeklyBonus', label: '每周全清奖励金币' },
  { key: 'perfectWeeklyBonusExp', label: '每周全清奖励经验' },
  { key: 'missedDailyPenaltyRate', label: '漏做每日扣罚比例' },
  { key: 'dailyPenaltyCap', label: '每日扣罚上限' },
  { key: 'weeklyPenaltyRate', label: '漏做每周扣罚比例' },
  { key: 'freezeCardCost', label: '冻结卡单价' },
  { key: 'cashOutThreshold', label: '提现门槛' },
  { key: 'restDaysPerWeek', label: '每周请假名额' },
  { key: 'longAbsenceThreshold', label: '长时间未用阈值（天）' },
  { key: 'levelExpBase', label: '升级经验基数' },
  { key: 'levelExpStep', label: '每级经验增量' },
];

export function SettingsScreen() {
  const config = useGameStore((s) => s.config);
  const actions = useGameStore((s) => s.actions);

  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(config[f.key])])));
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [resetting, setResetting] = useState(false);

  const saveConfig = () => {
    const patch: Partial<Config> = {};
    for (const f of FIELDS) {
      const n = Number(draft[f.key]);
      if (!Number.isNaN(n)) (patch as any)[f.key] = n;
    }
    actions.setConfig(patch);
  };

  const doExport = () => {
    const { actions: _omit, ...data } = useGameStore.getState();
    setExportText(JSON.stringify(data, null, 2));
  };

  const doImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (typeof parsed !== 'object' || parsed === null || typeof parsed.version !== 'number' || parsed.version > CURRENT_VERSION || !parsed.player || !Array.isArray(parsed.dailies)) {
        setImportMsg(`❌ 格式无效或版本过新（需含 player/dailies，version ≤ ${CURRENT_VERSION}）。`);
        return;
      }
      actions.importState(parsed);
      setImportMsg('✅ 已导入。');
    } catch {
      setImportMsg('❌ JSON 解析失败。');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <SectionTitle>经济数值配置</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          {FIELDS.map((f) => (
            <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <PixelText style={{ color: colors.ink, flex: 1, fontSize: 12 }}>{f.label}</PixelText>
              <View style={{ width: space(22) }}>
                <PixelTextInput value={draft[f.key]} onChangeText={(t) => setDraft((d) => ({ ...d, [f.key]: t }))} numeric />
              </View>
            </View>
          ))}
          <PixelButton label="保存配置" color={colors.success} onPress={saveConfig} />
        </View>
      </PixelPanel>

      <SectionTitle>导出 / 导入存档</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelButton label="生成导出 JSON" color={colors.bgPanel} onPress={doExport} />
          {exportText ? <PixelTextInput value={exportText} onChangeText={() => {}} multiline /> : null}
          <PixelText style={{ color: colors.ink }}>粘贴 JSON 导入（覆盖当前存档）：</PixelText>
          <PixelTextInput value={importText} onChangeText={setImportText} placeholder='{"version":2,...}' multiline />
          <PixelButton label="导入" color={colors.accent} disabled={!importText.trim()} onPress={doImport} />
          {importMsg ? <PixelText style={{ color: colors.ink }}>{importMsg}</PixelText> : null}
        </View>
      </PixelPanel>

      <SectionTitle>危险区</SectionTitle>
      <PixelButton label="清空并重置为初始状态" color={colors.danger} onPress={() => setResetting(true)} />

      <ConfirmDialog
        visible={resetting}
        title="确认重置？"
        message="将清空全部进度（金币/经验/任务/试炼/Boss/历史）并恢复初始示例数据，不可撤销。"
        confirmLabel="清空重置"
        danger
        onCancel={() => setResetting(false)}
        onConfirm={() => { actions.reset(); setResetting(false); }}
      />
    </ScrollView>
  );
}
