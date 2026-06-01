import { useState } from 'react';
import { View } from 'react-native';
import { colors, space } from '../theme';
import { PixelText, PixelButton, PixelTextInput } from './Pixel';
import { LLMError } from '../../services/llm/types';
import { isLLMReady } from '../../services/llm/getClient';

function errMsg(kind: string): string {
  switch (kind) {
    case 'unconfigured': return '未配置 AI，请到 设置 → AI/LLM 填入 key';
    case 'network': return '网络错误，请检查连接';
    case 'timeout': return '生成超时，请重试';
    case 'http': return '服务返回错误，请检查 baseURL / model / key';
    default: return '生成失败，请手动填写';
  }
}

/** 通用「✨ AI 生成」行：输入一句话 → 调用方回调（负责调 client + parse + 回填）。失败仅提示，不破坏手填。 */
export function AIGenerateRow({ placeholder, onGenerate }: {
  placeholder: string;
  onGenerate: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!text.trim() || loading) return;
    if (!isLLMReady()) { setError(errMsg('unconfigured')); return; }
    setLoading(true); setError('');
    try {
      await onGenerate(text.trim());
    } catch (e) {
      setError(e instanceof LLMError ? errMsg(e.kind) : '生成失败，请手动填写');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: space(1), backgroundColor: colors.panelHi, padding: space(2) }}>
      <PixelText style={{ color: colors.gold, fontSize: 12 }}>✨ AI 生成（一句话描述，自动填表）</PixelText>
      <PixelTextInput value={text} onChangeText={setText} placeholder={placeholder} />
      <PixelButton label={loading ? '生成中…' : '✨ 生成'} color={colors.accent} disabled={loading} onPress={run} />
      {error ? <PixelText style={{ color: colors.danger, fontSize: 11 }}>{error}</PixelText> : null}
    </View>
  );
}
