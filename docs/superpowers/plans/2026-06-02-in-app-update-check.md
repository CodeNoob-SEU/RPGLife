# 应用内检查更新（OTA 优先 + APK 兜底）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在设置页加一个「检查更新」按钮，点一次并行检查 OTA 热更新（expo-updates）与 GitHub Releases 上的新 APK，按「OTA 优先、APK 兜底」提示用户更新。

**Architecture:** 沿用项目三层解耦——`src/domain/update`（纯函数：版本比较 + 决策，TDD 单测）→ `src/services/update`（IO：包 expo-updates 与 GitHub fetch）→ `src/ui/components/UpdateSection.tsx`（设置页分区，副作用/弹窗/跳转）。决策逻辑全部下沉为可穷举单测的纯函数；原生与网络只在 services/UI 层。

**Tech Stack:** Expo SDK 56 · React Native 0.85 · TypeScript（strict）· Jest + ts-jest · expo-updates（OTA）· expo-application（读原生版本号）· expo-constants（web 版本回退）· react-native `Linking`（跳转下载）。

**Spec:** [docs/superpowers/specs/2026-06-02-in-app-update-check-design.md](../specs/2026-06-02-in-app-update-check-design.md)

**关键事实（实现前必读）:**
- 本 worktree 是全新副本，**尚未 `npm install`**（node_modules 不存在）——Task 1 先装依赖，否则 `npm test` / `tsc` 跑不起来。
- 项目是 **managed/CNG**（无 `android/ios` 目录）：EAS Build 在云端 prebuild，**app.json 是唯一原生配置源**，手动编辑 app.json 等价于 `eas update:configure` 写入的结果，无需交互式跑该命令。
- EAS `projectId` = `16771102-b660-4550-88ac-28471ac3fcd2`（app.json `extra.eas.projectId`），OTA 的 `updates.url` 即 `https://u.expo.dev/<projectId>`。
- GitHub 仓库 = `CodeNoob-SEU/RPGLife`（公开，免鉴权拉 Releases）。
- 测试惯例：`__tests__/*.test.ts` 扁平命名；fetch 用 `(global as any).fetch = jest.fn()` mock，`afterEach` 复位（见 `__tests__/llm-openaiCompatClient.test.ts`）。
- `npx tsc --noEmit`（根 tsconfig）覆盖 `src/**`（含 .tsx）但**排除** `__tests__`；`__tests__` 的类型检查靠 `npm test`（ts-jest）。验收两者都要跑。

---

## 文件结构（先锁定边界）

| 文件 | 职责 | 新建/修改 |
|:--|:--|:--|
| `src/domain/update/semver.ts` | `compareVersions(a,b)` 纯函数 | 新建 |
| `src/domain/update/decide.ts` | `decideUpdate(ota,apk)` 纯函数 + 输入/动作类型 | 新建 |
| `src/services/update/types.ts` | `OtaResult` / `ApkResult` | 新建 |
| `src/services/update/checkApk.ts` | 拉 GitHub Releases latest + 比较 | 新建 |
| `src/services/update/checkOta.ts` | 包 expo-updates 的 `checkOta` / `applyOta` | 新建 |
| `src/ui/components/UpdateSection.tsx` | 设置页「关于与更新」分区 UI | 新建 |
| `src/ui/screens/SettingsScreen.tsx` | 挂载 `<UpdateSection />` | 修改 |
| `app.json` | `updates`(url/checkAutomatically) + `runtimeVersion` | 修改 |
| `eas.json` | preview/production 加 `channel` | 修改 |
| `docs/BUILD-ANDROID.md` | 两条发版路径 + GitHub Release 规范 + 设备验证 | 修改 |
| `__tests__/update-semver.test.ts` | semver 单测 | 新建 |
| `__tests__/update-decide.test.ts` | decide 单测 | 新建 |
| `__tests__/update-checkApk.test.ts` | checkApk fetch-mock 单测 | 新建 |

---

## Task 1: 工作区初始化（npm install）

**Files:** 无（仅安装依赖，生成 node_modules）

- [ ] **Step 1: 安装依赖**

Run:
```bash
npm install
```
Expected: 安装完成，无 EACCES（仓库 `.npmrc` 已把缓存指向本地临时目录；若报缓存错见 `docs/BUILD-ANDROID.md` 故障排查）。

- [ ] **Step 2: 跑现有测试确认基线全绿**

Run:
```bash
npm test
```
Expected: 全部测试通过（基线，约 30+ 个测试文件全绿）。这是后续改动的对照基准。

> 本任务不提交（node_modules 已 gitignore，无文件变更）。

---

## Task 2: `compareVersions` 语义化版本比较（纯函数 TDD）

**Files:**
- Create: `src/domain/update/semver.ts`
- Test: `__tests__/update-semver.test.ts`

- [ ] **Step 1: 写失败测试**

Create `__tests__/update-semver.test.ts`:
```ts
import { compareVersions } from '../src/domain/update/semver';

test('detects newer patch / minor / major', () => {
  expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  expect(compareVersions('1.1.0', '1.0.9')).toBe(1);
  expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
});

test('numeric (not lexicographic) comparison', () => {
  expect(compareVersions('1.10.0', '1.2.0')).toBe(1);
  expect(compareVersions('1.2.0', '1.10.0')).toBe(-1);
});

test('ignores v prefix, whitespace, and missing parts', () => {
  expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
  expect(compareVersions('1.0', '1.0.0')).toBe(0);
  expect(compareVersions(' v1.2 ', '1.1.9')).toBe(1);
});

test('equal and older', () => {
  expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
});

test('dirty input degrades to zero parts', () => {
  expect(compareVersions('', '0.0.0')).toBe(0);
  expect(compareVersions('abc', '0')).toBe(0);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx jest update-semver`
Expected: FAIL — `Cannot find module '../src/domain/update/semver'`。

- [ ] **Step 3: 实现**

Create `src/domain/update/semver.ts`:
```ts
/** 语义化版本比较：忽略 'v' 前缀与空白、补齐缺位、按数值（非字典序）比较。返回 -1 / 0 / 1。 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (s: string) =>
    s.trim().replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx jest update-semver`
Expected: PASS（5 个测试全绿）。

- [ ] **Step 5: 提交**

```bash
git add src/domain/update/semver.ts __tests__/update-semver.test.ts
git commit -m "feat(update): semver compareVersions (pure)"
```

---

## Task 3: `decideUpdate` 决策纯函数（TDD）

**Files:**
- Create: `src/domain/update/decide.ts`
- Test: `__tests__/update-decide.test.ts`

- [ ] **Step 1: 写失败测试**

Create `__tests__/update-decide.test.ts`:
```ts
import { decideUpdate } from '../src/domain/update/decide';

const noOta = { enabled: true, available: false };
const noApk = { available: false };

test('OTA available → ota (OTA 优先)', () => {
  expect(decideUpdate({ enabled: true, available: true }, noApk)).toEqual({ kind: 'ota' });
});

test('OTA + APK both available → ota with alsoApk note', () => {
  const r = decideUpdate(
    { enabled: true, available: true },
    { available: true, latestVersion: '1.1.0', url: 'http://x/app.apk' },
  );
  expect(r).toEqual({ kind: 'ota', alsoApk: { latestVersion: '1.1.0', url: 'http://x/app.apk' } });
});

test('only APK available → apk', () => {
  const r = decideUpdate(noOta, { available: true, latestVersion: '1.2.0', url: 'http://x/app.apk', notes: 'hi' });
  expect(r).toEqual({ kind: 'apk', latestVersion: '1.2.0', url: 'http://x/app.apk', notes: 'hi' });
});

test('nothing available, all checked ok → uptodate', () => {
  expect(decideUpdate(noOta, noApk)).toEqual({ kind: 'uptodate' });
});

test('OTA disabled (web/dev), APK no update → unsupported', () => {
  expect(decideUpdate({ enabled: false, available: false }, noApk)).toEqual({ kind: 'unsupported' });
});

test('a check errored with nothing found → error (not falsely uptodate)', () => {
  expect(decideUpdate(noOta, { available: false, error: 'network' }).kind).toBe('error');
  expect(decideUpdate({ enabled: true, available: false, error: 'x' }, noApk).kind).toBe('error');
});

test('one path errors but the other has an update → still surfaces the update', () => {
  const r = decideUpdate(
    { enabled: true, available: false, error: 'ota down' },
    { available: true, latestVersion: '1.1.0', url: 'u' },
  );
  expect(r.kind).toBe('apk');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx jest update-decide`
Expected: FAIL — `Cannot find module '../src/domain/update/decide'`。

- [ ] **Step 3: 实现**

Create `src/domain/update/decide.ts`:
```ts
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

/** OTA 优先、APK 兜底（优先级见 spec §4.2）。 */
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx jest update-decide`
Expected: PASS（7 个测试全绿）。

- [ ] **Step 5: 提交**

```bash
git add src/domain/update/decide.ts __tests__/update-decide.test.ts
git commit -m "feat(update): decideUpdate (OTA-first, APK-fallback) pure logic"
```

---

## Task 4: services 类型 + `checkApk`（GitHub Releases，TDD with fetch mock）

**Files:**
- Create: `src/services/update/types.ts`
- Create: `src/services/update/checkApk.ts`
- Test: `__tests__/update-checkApk.test.ts`

- [ ] **Step 1: 写失败测试**

Create `__tests__/update-checkApk.test.ts`:
```ts
import { checkApk } from '../src/services/update/checkApk';

function ghRelease(body: any, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as any);
}

afterEach(() => { (global as any).fetch = undefined; });

test('newer release with .apk asset → available + download url + stripped version + notes', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(ghRelease({
    tag_name: 'v1.1.0',
    html_url: 'https://gh/rel',
    body: 'changelog',
    assets: [{ name: 'rpglife.apk', browser_download_url: 'https://gh/rpglife.apk' }],
  }));
  const r = await checkApk('1.0.0');
  expect(r).toEqual({ available: true, latestVersion: '1.1.0', url: 'https://gh/rpglife.apk', notes: 'changelog' });
});

test('same or older version → not available', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(ghRelease({ tag_name: 'v1.0.0', html_url: 'x', assets: [] }));
  expect((await checkApk('1.0.0')).available).toBe(false);
});

test('no .apk asset → falls back to release html_url', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(ghRelease({
    tag_name: 'v2.0.0',
    html_url: 'https://gh/rel',
    assets: [{ name: 'notes.txt', browser_download_url: 'x' }],
  }));
  const r = await checkApk('1.0.0');
  expect(r.available).toBe(true);
  expect(r.url).toBe('https://gh/rel');
});

test('404 (no releases yet) → not available, no error', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(ghRelease({}, 404));
  expect(await checkApk('1.0.0')).toEqual({ available: false });
});

test('network rejection → available:false with a string error', async () => {
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
  const r = await checkApk('1.0.0');
  expect(r.available).toBe(false);
  expect(typeof r.error).toBe('string');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx jest update-checkApk`
Expected: FAIL — `Cannot find module '../src/services/update/checkApk'`。

- [ ] **Step 3: 实现类型**

Create `src/services/update/types.ts`:
```ts
/** OTA 检查结果（结构与 domain/update/decide 的 OtaInput 一致）。 */
export interface OtaResult { enabled: boolean; available: boolean; error?: string; }
/** APK 检查结果（结构与 domain/update/decide 的 ApkInput 一致）。 */
export interface ApkResult { available: boolean; latestVersion?: string; url?: string; notes?: string; error?: string; }
```

- [ ] **Step 4: 实现 checkApk**

Create `src/services/update/checkApk.ts`:
```ts
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
  return {
    available: true,
    latestVersion: latest.replace(/^v/i, ''),
    url: apkAsset?.browser_download_url ?? data.html_url ?? '',
    notes: data.body ? data.body.slice(0, 300) : undefined,
  };
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx jest update-checkApk`
Expected: PASS（5 个测试全绿）。

- [ ] **Step 6: 提交**

```bash
git add src/services/update/types.ts src/services/update/checkApk.ts __tests__/update-checkApk.test.ts
git commit -m "feat(update): checkApk against GitHub Releases latest"
```

---

## Task 5: 安装原生依赖（expo-updates + expo-application）

**Files:**
- Modify: `package.json`、`package-lock.json`（由 `expo install` 自动写入）

- [ ] **Step 1: 安装**

Run:
```bash
npx expo install expo-updates expo-application
```
Expected: 两个包以 SDK 56 兼容版本（`~56.x`）写入 `package.json` 的 `dependencies`，并更新 `package-lock.json`。

- [ ] **Step 2: 确认写入**

Run:
```bash
grep -E '"expo-(updates|application)"' package.json
```
Expected: 两行均出现，版本形如 `"~56.x.x"`。

> `expo-constants` 作为 `expo` 的传递依赖已在 node_modules 中（SDK 56 核心包），后续 UI 可直接 `import Constants from 'expo-constants'`，无需单独安装。

- [ ] **Step 3: 提交**

```bash
git add package.json package-lock.json
git commit -m "build(deps): add expo-updates + expo-application (SDK 56)"
```

---

## Task 6: `checkOta` / `applyOta`（包 expo-updates）

**Files:**
- Create: `src/services/update/checkOta.ts`

> 该文件 import `expo-updates`，jest（node 环境，仅匹配 `*.test.ts`）不编译它；验证靠 `npx tsc --noEmit`。

- [ ] **Step 1: 实现**

Create `src/services/update/checkOta.ts`:
```ts
import * as Updates from 'expo-updates';
import { OtaResult } from './types';

/** 只「检查」是否有 OTA 更新；不下载（下载/重启留到用户确认后）。 */
export async function checkOta(): Promise<OtaResult> {
  // dev / web / Expo Go 下 isEnabled=false，且 checkForUpdateAsync 会 reject —— 直接短路。
  if (!Updates.isEnabled) return { enabled: false, available: false };
  try {
    const res = await Updates.checkForUpdateAsync();
    return { enabled: true, available: res.isAvailable };
  } catch (e) {
    return { enabled: true, available: false, error: String(e) };
  }
}

/** 用户确认后：下载最新 OTA 并重启应用以生效。reloadAsync 成功会重启进程（其后代码不再执行）。 */
export async function applyOta(): Promise<void> {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}
```

- [ ] **Step 2: 类型检查通过**

Run: `npx tsc --noEmit`
Expected: 无错误（expo-updates 类型已随 Task 5 安装解析）。

- [ ] **Step 3: 提交**

```bash
git add src/services/update/checkOta.ts
git commit -m "feat(update): checkOta/applyOta wrapping expo-updates"
```

---

## Task 7: `UpdateSection` UI 分区 + 挂进设置页

**Files:**
- Create: `src/ui/components/UpdateSection.tsx`
- Modify: `src/ui/screens/SettingsScreen.tsx`

- [ ] **Step 1: 实现 UpdateSection**

Create `src/ui/components/UpdateSection.tsx`:
```tsx
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
      Linking.openURL(action.url);
      return;
    }
    if (action?.kind === 'ota') {
      setBusy(true);
      setStatus('下载中，完成后将重启…');
      try {
        await applyOta(); // 成功则重启，下面不会执行
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
```

- [ ] **Step 2: 在设置页导入**

Modify `src/ui/screens/SettingsScreen.tsx` — 在 `LLMSettingsSection` 的 import 行下方加一行。

找到:
```tsx
import { LLMSettingsSection } from '../components/LLMSettingsSection';
```
改为:
```tsx
import { LLMSettingsSection } from '../components/LLMSettingsSection';
import { UpdateSection } from '../components/UpdateSection';
```

- [ ] **Step 3: 在设置页挂载（危险区之上）**

Modify `src/ui/screens/SettingsScreen.tsx` — 在「危险区」标题前插入分区。

找到:
```tsx
      <SectionTitle>危险区</SectionTitle>
```
改为:
```tsx
      <UpdateSection />

      <SectionTitle>危险区</SectionTitle>
```

- [ ] **Step 4: 类型检查通过**

Run: `npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 5: web 预览验证渲染与降级**

使用 preview_* 工具（不要用 Bash 起服务）：
1. `preview_start`（命令 `npm run web`，即 `expo start --web`）。
2. `preview_console_logs` 确认无红色报错。
3. `preview_snapshot` 找到底部「关于与更新」分区，确认显示「当前版本 v1.0.0」与「检查更新」按钮。
4. `preview_click` 点「检查更新」。
5. `preview_snapshot` 确认状态行出现合理结果——仓库当前无 Release 时，web 下 OTA 关闭 + APK 404 → 应显示「当前为开发 / 网页环境，仅检查安装包；已是最新」（或 GitHub 偶发网络错误时显示「检查失败：…」，亦为预期降级）。
6. `preview_screenshot` 截图留证。

Expected: 分区渲染正常、点击有反馈、控制台无崩溃。

- [ ] **Step 6: 提交**

```bash
git add src/ui/components/UpdateSection.tsx src/ui/screens/SettingsScreen.tsx
git commit -m "feat(update): 关于与更新 settings section with check button"
```

---

## Task 8: EAS Update 配置（app.json + eas.json）

**Files:**
- Modify: `app.json`
- Modify: `eas.json`

> managed/CNG 项目，app.json 即原生配置源；以下手动编辑等价于 `eas update:configure` 写入的 app.json 键，EAS Build 会在 prebuild 时应用到原生。

- [ ] **Step 1: app.json 加 runtimeVersion + updates**

Modify `app.json` — 在 `"version": "1.0.0",` 行后插入。

找到:
```json
    "version": "1.0.0",
    "orientation": "portrait",
```
改为:
```json
    "version": "1.0.0",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/16771102-b660-4550-88ac-28471ac3fcd2",
      "checkAutomatically": "NEVER"
    },
    "orientation": "portrait",
```

- [ ] **Step 2: eas.json 给 preview / production 加 channel**

Modify `eas.json` — preview 与 production 各加一行 `"channel"`。

找到:
```json
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
```
改为:
```json
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      }
    },
```

再找到:
```json
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
```
改为:
```json
    "production": {
      "channel": "production",
      "android": {
        "buildType": "app-bundle"
      }
    }
```

- [ ] **Step 3: 校验 JSON 合法**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); JSON.parse(require('fs').readFileSync('eas.json','utf8')); console.log('json ok')"
```
Expected: 输出 `json ok`。

- [ ] **Step 4: 提交**

```bash
git add app.json eas.json
git commit -m "feat(update): configure EAS Update (appVersion runtime, manual channels)"
```

---

## Task 9: 文档（发版流程 + 设备验证清单）

**Files:**
- Modify: `docs/BUILD-ANDROID.md`

- [ ] **Step 1: 追加「应用内更新与发版」章节**

在 `docs/BUILD-ANDROID.md` 末尾追加以下内容:
```markdown

## 应用内更新（OTA 优先 + APK 兜底）

设置页「关于与更新 → 检查更新」会并行查两路：**OTA 热更新**（expo-updates / EAS Update）优先，**GitHub Releases 新 APK** 兜底。两条发版路径：

| 场景 | 操作 | 用户侧效果 |
| --- | --- | --- |
| **纯 JS 小修** | **不动** `app.json` 的 `version`；`eas update --channel preview --message "..."` | 点「检查更新」→ 发现热更新 → 重启生效，无需重装 |
| **原生 / 大版本** | `app.json` 的 `version` **与** `android.versionCode` 都 +1 → `npm run build:android` → 在 GitHub 建 Release（tag `v<version>`，上传产出的 `.apk`） | 点「检查更新」→ 发现新安装包 → 前往下载安装 |

> ⚠️ **APK 检测前提**：每个面向用户的 APK 发布都必须 bump 语义化 `version` 并发 GitHub Release（tag 形如 `v1.1.0`）。仅 +`versionCode`、`version` 长期不变会让 APK 检测「看不见」更新。
>
> `runtimeVersion` 用 `appVersion` 策略：`version` 不变 → 同一 OTA 流（热更新能送达老安装）；`version` 变 → 新 runtime + 新 APK，两条路天然隔离。

### 首次落地（鸡生蛋）

`expo-updates` / `expo-application` 是原生依赖，加入后**必须重新构建并安装一次 APK**，本功能才生效；已装的旧 APK 无法通过 OTA 获得此功能。

### 设备端验证清单（此环境无法端到端验证，需真机自验）

**OTA 路径：**
1. `npm run build:android` 出带 expo-updates 的 preview APK，装到真机。
2. 改一处 JS（如某文案），`eas update --channel preview --message "test ota"` 发布。
3. 真机打开 App → 设置 → 检查更新 → 应弹「发现热更新」→ 立即更新 → 应用重启后看到改动。

**APK 路径：**
1. `app.json` 的 `version` 改为比当前高（如 `1.0.1`）、`versionCode` +1，`npm run build:android`。
2. 在 GitHub 建 Release：tag `v1.0.1`，上传该 `.apk`。
3. 旧版本真机 → 检查更新 → 应弹「发现新版本 v1.0.1」→ 前往下载 → 跳转到 APK 下载。
```

- [ ] **Step 2: 提交**

```bash
git add docs/BUILD-ANDROID.md
git commit -m "docs(build): in-app update release workflow + device verification checklist"
```

---

## Task 10: 全量验收

**Files:** 无（仅验证）

- [ ] **Step 1: 全量单测**

Run: `npm test`
Expected: 全绿（含新增 `update-semver` / `update-decide` / `update-checkApk`，及全部既有测试）。

- [ ] **Step 2: 全量类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 3: 确认无遗漏改动**

Run: `git status`
Expected: 干净（所有改动已提交）。

> OTA / APK 的真机端到端验证见 Task 9 的设备清单——**不在本环境验证范围内**，交付时如实说明。

---

## 实现备注

- **DRY**：版本比较只此一处 `compareVersions`；checkApk 与 UI 都复用它。
- **YAGNI**：无启动自动检查、无「跳过版本」、无持久化字段（不触发 `MEMORY.md` 的加持久化字段 checklist）。
- **类型一致性**：`OtaResult`/`ApkResult`（services）与 `OtaInput`/`ApkInput`（domain）结构刻意一致，UI 把检查结果直接喂给 `decideUpdate`，无需映射层。
- **降级铁律**：web/dev（`Updates.isEnabled=false`）跳过 OTA；网络/超时/404 全部走 `available:false`，绝不崩溃。
