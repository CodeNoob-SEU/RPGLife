import { useState } from 'react';
import { Linking, View } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, SectionTitle, ConfirmDialog } from './Pixel';
import { checkOta, applyOta } from '../../services/update/checkOta';
import { checkApk } from '../../services/update/checkApk';
import { decideUpdate, UpdateAction } from '../../domain/update/decide';

// 原生安装版本号（web 下为 null → 回退 app.json version）。
const currentVersion = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
const buildNumber = Application.nativeBuildVersion ?? '';

export function UpdateSection() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<UpdateAction | null>(null);

  const onCheck = async () => {
    if (busy) return;
    setBusy(true);
    setStatus('检查中…');
    const [ota, apk] = await Promise.all([checkOta(), checkApk(currentVersion)]);
    const action = decideUpdate(ota, apk);
    setBusy(false);
    switch (action.kind) {
      case 'ota':
        setStatus(action.alsoApk ? `另有新安装包 v${action.alsoApk.latestVersion}，可前往下载` : '');
        setDialog(action);
        break;
      case 'apk':
        setStatus('');
        setDialog(action);
        break;
      case 'uptodate':
        setStatus('✅ 已是最新版本');
        break;
      case 'unsupported':
        setStatus('当前为开发 / 网页环境，仅检查安装包；已是最新');
        break;
      case 'error':
        setStatus(`检查失败：${action.reason}`);
        break;
    }
  };

  const onConfirm = async () => {
    const action = dialog;
    setDialog(null);
    if (action?.kind === 'apk') {
      Linking.openURL(action.url).catch(() => setStatus('无法打开下载链接'));
      return;
    }
    if (action?.kind === 'ota') {
      setBusy(true);
      setStatus('下载中，完成后将重启…');
      try {
        const restarting = await applyOta(); // 有新内容则重启，下面不会执行
        if (!restarting) {
          setBusy(false);
          setStatus('未获取到更新内容，请稍后再试');
        }
      } catch {
        setBusy(false);
        setStatus('热更新失败，请稍后再试');
      }
    }
  };

  // 收窄到 apk 变体（或 null）：TS 不会因为一个独立布尔变量去收窄 dialog，必须这样赋值才能访问 latestVersion/notes。
  const apkDialog = dialog?.kind === 'apk' ? dialog : null;
  return (
    <>
      <SectionTitle>关于与更新</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.ink, fontSize: 12 }}>
            当前版本 v{currentVersion}{buildNumber ? ` (${buildNumber})` : ''}
          </PixelText>
          <PixelButton label={busy ? '请稍候…' : '检查更新'} color={colors.bgPanel} onPress={onCheck} disabled={busy} />
          {status ? <PixelText style={{ color: colors.textDim, fontSize: 12 }}>{status}</PixelText> : null}
        </View>
      </PixelPanel>

      <ConfirmDialog
        visible={dialog?.kind === 'ota' || dialog?.kind === 'apk'}
        title={apkDialog ? `发现新版本 v${apkDialog.latestVersion}` : '发现热更新'}
        message={
          apkDialog
            ? `需下载安装新安装包。${apkDialog.notes ? '\n\n' + apkDialog.notes : ''}`
            : '下载后将重启应用以生效。现在更新？'
        }
        confirmLabel={apkDialog ? '前往下载' : '立即更新'}
        onConfirm={onConfirm}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
