import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, PixelTextInput, PixelToggle, SectionTitle } from './Pixel';
import { loadApiKey, setApiKey } from '../../services/llm/secureConfig';
import { getClient } from '../../services/llm/getClient';

export function LLMSettingsSection() {
  const config = useGameStore((s) => s.config);
  const actions = useGameStore((s) => s.actions);
  const [baseURL, setBaseURL] = useState(config.llmBaseURL);
  const [model, setModel] = useState(config.llmModel);
  const [key, setKey] = useState('');
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { loadApiKey().then((k) => { setKey(k ?? ''); setKeyLoaded(true); }); }, []);

  const persist = async () => {
    actions.setConfig({ llmBaseURL: baseURL.trim(), llmModel: model.trim() });
    await setApiKey(key);
  };
  const saveAll = async () => { await persist(); setMsg('✅ 已保存'); };
  const testConn = async () => {
    setMsg('测试中…');
    await persist();
    const r = await getClient().ping();
    setMsg(r.ok ? '✅ 连接成功' : `❌ ${r.detail ?? '连接失败'}`);
  };

  return (
    <>
      <SectionTitle>🤖 AI / LLM</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelToggle
            label="启用 AI（战报叙事 / 一句话生成委托与 Boss）"
            value={config.llmEnabled}
            onValueChange={(v) => actions.setConfig({ llmEnabled: v })}
          />
          <PixelText style={{ color: colors.ink, fontSize: 12 }}>Base URL（OpenAI 兼容）</PixelText>
          <PixelTextInput value={baseURL} onChangeText={setBaseURL} placeholder="https://api.deepseek.com/v1" />
          <PixelText style={{ color: colors.ink, fontSize: 12 }}>模型名</PixelText>
          <PixelTextInput value={model} onChangeText={setModel} placeholder="deepseek-chat / gpt-4o-mini" />
          <PixelText style={{ color: colors.ink, fontSize: 12 }}>API Key（仅存本机，不随存档导出）</PixelText>
          <PixelTextInput value={key} onChangeText={setKey} placeholder={keyLoaded ? 'sk-…' : '读取中…'} secure />
          {Platform.OS === 'web' ? (
            <PixelText style={{ color: colors.danger, fontSize: 11 }}>
              ⚠️ 网页端 key 不加密存储，仅建议开发用；正式使用请在手机 App 内配置。
            </PixelText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            <View style={{ flex: 1 }}><PixelButton label="保存" color={colors.success} onPress={saveAll} /></View>
            <View style={{ flex: 1 }}><PixelButton label="测试连接" color={colors.bgPanel} onPress={testConn} /></View>
          </View>
          {msg ? <PixelText style={{ color: colors.textDim, fontSize: 12 }}>{msg}</PixelText> : null}
        </View>
      </PixelPanel>
    </>
  );
}
