import { compareVersions } from '../../domain/update/semver';
import { ApkResult } from './types';

const REPO = 'CodeNoob-SEU/RPGLife';
const TIMEOUT_MS = 10000;

interface GithubAsset { name: string; browser_download_url: string; }
interface GithubRelease { tag_name?: string; html_url?: string; body?: string; assets?: GithubAsset[]; }

/** 拉 GitHub Releases latest，与当前版本比较；有更高语义化版本即视为有新 APK。 */
export async function checkApk(currentVersion: string): Promise<ApkResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
  } catch {
    return { available: false, error: controller.signal.aborted ? '请求超时' : '网络错误' };
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 404) return { available: false };            // 仓库尚无任何 Release
  if (!res.ok) return { available: false, error: `HTTP ${res.status}` };

  let data: GithubRelease;
  try {
    data = await res.json();
  } catch {
    return { available: false, error: '响应解析失败' };
  }

  const latest = data.tag_name ?? '';
  if (compareVersions(latest, currentVersion) !== 1) return { available: false };

  const apkAsset = (data.assets ?? []).find((a) => a.name.toLowerCase().endsWith('.apk'));
  const url = apkAsset?.browser_download_url ?? data.html_url;
  if (!url) return { available: false }; // 无可用下载链接则不声称有更新，保持「available ⟹ 有真实 url」不变式
  return {
    available: true,
    latestVersion: latest.replace(/^v/i, ''),
    url,
    notes: data.body ? (data.body.length > 300 ? data.body.slice(0, 300) + '…' : data.body) : undefined,
  };
}
