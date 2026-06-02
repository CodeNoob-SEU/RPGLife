import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { Config } from '../../domain/types';
import { CURRENT_VERSION } from '../../domain/version';
import { ledgerToCSV } from '../../domain/stats';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, PixelTextInput, ConfirmDialog, SectionTitle, PixelToggle } from '../components/Pixel';
import { LLMSettingsSection } from '../components/LLMSettingsSection';
import { syncReminder } from '../notifications';
import * as Clipboard from 'expo-clipboard';

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
  const ledger = useGameStore((s) => s.ledger);
  const actions = useGameStore((s) => s.actions);

  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(config[f.key])])));
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [copyMsg, setCopyMsg] = useState('');
  const [resetting, setResetting] = useState(false);
  const [reminderHour, setReminderHour] = useState(String(config.reminderHour));

  // 关键字段下限：兑换率/升级基数 ≥1（防除零/Infinity），其余经济数值 ≥0。
  const MIN_ONE = new Set(['goldToYuanRate', 'levelExpBase']);
  const saveConfig = () => {
    const patch: Partial<Config> = {};
    for (const f of FIELDS) {
      const n = Number(draft[f.key]);
      if (!Number.isFinite(n)) continue;
      (patch as any)[f.key] = Math.max(MIN_ONE.has(f.key as string) ? 1 : 0, n);
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

  // 一键复制/粘贴（expo-clipboard，web+真机通用，异步）。
  const copyExport = async () => {
    try { await Clipboard.setStringAsync(exportText); setCopyMsg('✅ 已复制到剪贴板'); }
    catch { setCopyMsg('❌ 复制失败（剪贴板不可用）'); }
  };
  const pasteImport = async () => {
    try {
      const t = await Clipboard.getStringAsync();
      if (t) { setImportText(t); setImportMsg(''); } else setImportMsg('❌ 剪贴板为空');
    } catch { setImportMsg('❌ 读取剪贴板失败'); }
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

      <SectionTitle>偏好设置</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(3) }}>
          <PixelToggle label="减弱动效（关闭抖动 / 纸屑 / 浮动；照顾低端机与无障碍）" value={config.reduceMotion} onValueChange={(v) => actions.setConfig({ reduceMotion: v })} />
          <PixelToggle label="音效" value={config.soundEnabled} onValueChange={(v) => actions.setConfig({ soundEnabled: v })} />
          <PixelToggle label="触感反馈（震动）" value={config.hapticsEnabled} onValueChange={(v) => actions.setConfig({ hapticsEnabled: v })} />
        </View>
      </PixelPanel>

      <SectionTitle>每日提醒</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelToggle label="开启每日提醒（像素角色口吻，鼓励不催促）" value={config.reminderEnabled} onValueChange={(v) => { actions.setConfig({ reminderEnabled: v }); syncReminder(v, config.reminderHour); }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
            <PixelText style={{ color: colors.ink, flex: 1, fontSize: 12 }}>提醒时间（小时 0–23）</PixelText>
            <View style={{ width: space(20) }}><PixelTextInput value={reminderHour} onChangeText={setReminderHour} numeric /></View>
          </View>
          <PixelButton label="保存提醒时间" color={colors.bgPanel} onPress={() => { const h = Math.max(0, Math.min(23, Math.floor(Number(reminderHour) || 20))); setReminderHour(String(h)); actions.setConfig({ reminderHour: h }); if (config.reminderEnabled) syncReminder(true, h); }} />
          <PixelText style={{ color: colors.textDim, fontSize: 11 }}>每天 {config.reminderHour}:00 提醒你回来冒险。需系统通知权限；网页端不生效，真机有效。</PixelText>
        </View>
      </PixelPanel>

      <LLMSettingsSection />

      <SectionTitle>导出 / 导入存档</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            <View style={{ flex: 1 }}><PixelButton label="导出 JSON（完整存档）" color={colors.bgPanel} onPress={doExport} /></View>
            <View style={{ flex: 1 }}><PixelButton label="导出 CSV（流水账）" color={colors.bgPanel} onPress={() => setExportText(ledgerToCSV(ledger))} /></View>
          </View>
          {exportText ? (
            <>
              <PixelTextInput value={exportText} onChangeText={() => {}} multiline />
              <PixelButton label="📋 复制到剪贴板" color={colors.bgPanel} onPress={copyExport} />
              {copyMsg ? <PixelText style={{ color: colors.textDim, fontSize: 12 }}>{copyMsg}</PixelText> : null}
            </>
          ) : null}
          <PixelText style={{ color: colors.ink }}>粘贴 JSON 导入（覆盖当前存档）：</PixelText>
          <PixelButton label="📋 从剪贴板粘贴" color={colors.bgPanel} onPress={pasteImport} />
          <PixelTextInput value={importText} onChangeText={setImportText} placeholder='{"version":11,...}' multiline />
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
