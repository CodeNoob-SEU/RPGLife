/**
 * 决策输入：与 services/update/types.ts 的 OtaResult/ApkResult 结构一致（故 UI 可直接把检查结果传进来）。
 * 决策为纯函数，不依赖任何 IO / 原生模块，便于穷举单测。
 */
export interface OtaInput { enabled: boolean; available: boolean; error?: string; }
export interface ApkInput { available: boolean; latestVersion?: string; url?: string; notes?: string; error?: string; }

export type UpdateAction =
  | { kind: 'ota'; alsoApk?: { latestVersion: string; url: string } } // 有热更新（APK 也更新时挂提示）
  | { kind: 'apk'; latestVersion: string; url: string; notes?: string } // 仅有新 APK
  | { kind: 'uptodate' }                                                // 都没有，检查均成功
  | { kind: 'unsupported' }                                             // web/dev 环境 OTA 关闭且 APK 无更新
  | { kind: 'error'; reason: string };                                 // 无可用更新但有检查失败

/** OTA 优先、APK 兜底。优先级：ota.available → apk.available → 有检查失败则 error → OTA 环境不支持则 unsupported → uptodate。 */
export function decideUpdate(ota: OtaInput, apk: ApkInput): UpdateAction {
  if (ota.available) {
    return apk.available && apk.latestVersion && apk.url
      ? { kind: 'ota', alsoApk: { latestVersion: apk.latestVersion, url: apk.url } }
      : { kind: 'ota' };
  }
  if (apk.available && apk.latestVersion && apk.url) {
    return { kind: 'apk', latestVersion: apk.latestVersion, url: apk.url, notes: apk.notes };
  }
  if (ota.error || apk.error) {
    return { kind: 'error', reason: '检查未完成，请检查网络后重试' };
  }
  if (!ota.enabled) return { kind: 'unsupported' };
  return { kind: 'uptodate' };
}
