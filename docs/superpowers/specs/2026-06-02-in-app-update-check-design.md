# RPGLife × 应用内检查更新 — 设计规格（2026-06-02）

> 状态：已确认设计，待用户终审 → 进入 writing-plans
> 日期：2026-06-02
> 范围：设置页新增「检查更新」按钮，点一次并行查两路——**OTA 热更新优先（expo-updates / EAS Update）+ APK 兜底（GitHub Releases latest）**。
> 约束：沿用「`domain` 纯逻辑 ↔ `services` IO ↔ UI」三层解耦；不破坏纯本地定位（无网络/未发版时优雅降级）；Expo SDK 56——任何 expo-* API 实现时按 <https://docs.expo.dev/versions/v56.0.0/> 核对。
> 相关：[LLM 接入设计](./2026-06-01-llm-integration-design.md) · [商业化增强](./2026-06-01-commercialization-enhancement-design.md) · [Android 打包指南](../../BUILD-ANDROID.md) · `MEMORY.md`（加持久化字段 checklist / persist 版本 bump 注意）

---

## 1. 背景与目标

RPGLife 当前以**侧载 APK** 分发（EAS `preview` profile，internal distribution，用户手动下载安装），版本来源 `appVersionSource: "local"`（app.json `version 1.0.0` + `android.versionCode 3`，每次发版手动 +`versionCode`）。当前**未接入 expo-updates**，也无任何应用内更新感知——用户无从得知有没有新版本。

- **目标**：设置页加一个「检查更新」按钮，让用户在应用内主动检查并获取更新。两条路径协同：
  - **OTA（热更新）**：纯 JS/资源改动 → 应用内检查 → 下载 → 重启生效，**无需重装**。
  - **APK（兜底）**：原生/大版本改动 → 检测到 GitHub 有更高语义化版本的 Release → 提示并跳转下载安装新 APK。
- **非目标**：本批不做启动自动检查、不做「跳过此版本」、不加任何持久化字段（见 §8）。

## 2. 范围

**做：**
- 纯逻辑 `src/domain/update/`：`compareVersions`（语义化版本比较）+ `decideUpdate`（OTA 优先、APK 兜底的决策纯函数），全部单测。
- IO 层 `src/services/update/`：`checkOta`（包 expo-updates）+ `checkApk`（拉 GitHub Releases latest 并比较）+ 类型。
- UI `src/ui/components/UpdateSection.tsx`：设置页「关于与更新」分区——当前版本展示 + 「检查更新」按钮 + 状态行 + 两个确认弹窗；接进 `SettingsScreen`。
- EAS Update 配置接入（`expo install expo-updates`、`eas update:configure`、eas.json 加 `channel`、`runtimeVersion` 策略）。
- 新增依赖 `expo-application`（读原生 version/versionCode）。
- 配套发版流程文档更新（`docs/BUILD-ANDROID.md`）。

**不做（YAGNI，以后再加）：**
- ❌ 启动自动检查 / 后台静默下载（`checkAutomatically: "NEVER"`，纯按钮驱动）。
- ❌ 「跳过此版本」「稍后提醒」等记忆型交互（不加持久化字段）。
- ❌ 应用内直接安装 APK（Android 安装器权限坑多）——只 `Linking.openURL` 跳转下载，由系统安装器接管。
- ❌ iOS 的 APK 兜底（iOS 无侧载 APK 概念；OTA 路径对 iOS 仍可用，但本项目当前只发 Android）。

## 3. 架构总览（三层）

```
UI 层                         ←— 副作用：触发检查、loading、弹窗、跳转/重启
  SettingsScreen · UpdateSection
        │ 调用
src/domain/update（新增，纯函数，TDD）  ←— 无副作用：版本比较 + 决策
  compareVersions · decideUpdate
        │ 依赖接口
src/services/update（新增）    ←— 唯一触碰原生(expo-updates)/网络(GitHub)的层
  checkOta · checkApk · types
```

**铁律：**
1. 原生（expo-updates / expo-application）与网络（GitHub fetch）**只**存在于 `src/services/update` 与 UI 层；`src/domain/update` 是纯函数，不 import 任何原生/网络模块，可像 `settlement.ts` 一样离线单测。
2. 任何环境（web / dev / Expo Go / 无网络 / 无 Release）都**优雅降级，绝不崩溃**（§7）。
3. OTA 下载/重启、APK 跳转下载都需**用户显式确认**后才执行，不偷偷做。

## 4. 纯逻辑 `src/domain/update/`（TDD）

### 4.1 `semver.ts`
```ts
/** 语义化版本比较：忽略 'v' 前缀、补齐缺位、数值化比较。返回 -1 / 0 / 1。 */
export function compareVersions(a: string, b: string): -1 | 0 | 1;
```
- 容忍 `v1.2.0` / `1.2` / `1.2.0` / 前后空白；非数字段按 0 处理（预发布后缀忽略，本项目用不到）。
- 单测穷举：`1.0.0 vs 1.0.1`、`1.10.0 vs 1.2.0`（数值非字典序）、`v1.0.0 vs 1.0.0`、`1.0 vs 1.0.0`、相等、脏输入。

### 4.2 `decide.ts`
```ts
export interface OtaInput { enabled: boolean; available: boolean; error?: boolean; }
export interface ApkInput { available: boolean; latestVersion?: string; url?: string; notes?: string; error?: boolean; }
export type UpdateAction =
  | { kind: 'ota'; alsoApk?: { latestVersion: string; url: string } }   // 有热更新（可能同时存在新 APK，附带提示）
  | { kind: 'apk'; latestVersion: string; url: string; notes?: string } // 仅有新 APK
  | { kind: 'uptodate' }                                                 // 都没有
  | { kind: 'unsupported' }                                              // OTA 环境不支持且 APK 也无更新（web/dev）
  | { kind: 'error'; reason: string };                                   // 两路都失败
/** OTA 优先、APK 兜底的纯决策。 */
export function decideUpdate(ota: OtaInput, apk: ApkInput): UpdateAction;
```
- 精确优先级（自上而下，命中即返回）：
  1. `ota.available` → `{ kind:'ota', alsoApk? }`（APK 也更新时挂 `alsoApk` 作状态行附注，主弹窗仍走 OTA——「OTA 优先」即此）。
  2. `apk.available` → `{ kind:'apk' }`。
  3. `ota.error || apk.error`（已无可用更新但有检查失败）→ `{ kind:'error' }`（避免把「检查没成功」误报成「已是最新」）。
  4. `!ota.enabled`（web/dev 环境 OTA 关闭，且 APK 检查正常无更新）→ `{ kind:'unsupported' }`。
  5. 否则 → `{ kind:'uptodate' }`。
- 容错：步骤 1–2 先判「有更新」，故「一路失败、另一路有更新」会走有更新的那路。
- 单测穷举上述所有分支组合。

## 5. IO 层 `src/services/update/`

### 5.1 `types.ts`
```ts
export interface OtaResult { enabled: boolean; available: boolean; error?: string; }
export interface ApkResult { available: boolean; latestVersion?: string; url?: string; notes?: string; error?: string; }
```

### 5.2 `checkOta.ts`
```ts
import * as Updates from 'expo-updates';
/** 只「检查」，不下载（下载/重启留到用户确认后）。 */
export async function checkOta(): Promise<OtaResult>;
/** 用户确认后：下载并重启应用以应用更新。 */
export async function applyOta(): Promise<void>;  // fetchUpdateAsync() → reloadAsync()
```
- 守卫：`Updates.isEnabled === false`（web/dev/Expo Go）→ 直接返回 `{ enabled:false, available:false }`，**不调用** `checkForUpdateAsync`（dev 下它会 reject）。
- `checkForUpdateAsync()` → `{ isAvailable }`；异常 → `{ enabled:true, available:false, error }`。
- `applyOta`：`fetchUpdateAsync()` 成功后 `reloadAsync()`（reloadAsync 会重启，后续代码不再执行）。

### 5.3 `checkApk.ts`
```ts
const REPO = 'CodeNoob-SEU/RPGLife';
/** 拉 GitHub Releases latest，比较语义化版本，返回是否有更新。 */
export async function checkApk(currentVersion: string): Promise<ApkResult>;
```
- 请求 `https://api.github.com/repos/${REPO}/releases/latest`，header `Accept: application/vnd.github+json`，`AbortController` 超时 ~10s。
- 解析：`tag_name`（如 `v1.1.0`）→ `compareVersions(tag, currentVersion) === 1` 即有更新；下载链接取 `assets[]` 中首个 name 以 `.apk` 结尾者的 `browser_download_url`，无 APK 资源则回退 `html_url`（Release 页）；`notes` 取 `body`（截断展示）。
- 404（仓库尚无任何 Release）→ `{ available:false }`（视为已是最新，非错误）。
- 网络/超时/限流(403) → `{ available:false, error }`（错误信息友好化）。

### 5.4 当前版本读取
- `import * as Application from 'expo-application'`：`Application.nativeApplicationVersion`（= app.json `version`）、`Application.nativeBuildVersion`（= `versionCode`）。
- Web 下二者为 `null` → 回退 `Constants.expoConfig?.version`（`expo-constants` 为 expo 传递依赖，无需新增）。

## 6. UI：`UpdateSection.tsx` + 接进 `SettingsScreen`

### 6.1 展示
- 复用 `PixelPanel / PixelButton / PixelText / SectionTitle / ConfirmDialog`（`src/ui/components/Pixel.tsx`）与现有分区排版范式。
- 顶部一行：`当前版本 v{nativeApplicationVersion} ({nativeBuildVersion})`。
- 「检查更新」按钮 + 其下状态行（`检查中… / ✅ 已是最新版本 / 检查失败：… / 当前环境仅检查安装包`）。
- 放置：`SettingsScreen` 最底部「危险区」**之上**，独立 `<SectionTitle>关于与更新</SectionTitle>` 分区。

### 6.2 交互（点一次按钮）
```
状态=检查中… → 并行 await [checkOta(), checkApk(version)]
            → action = decideUpdate(ota, apk)
switch action.kind:
  'ota'        → ConfirmDialog「发现热更新，下载后将重启应用生效。现在更新？」
                 [立即更新→applyOta()] [稍后]
                 （若 action.alsoApk 存在，状态行附「另有新安装包 v{latestVersion}，可前往下载」）
  'apk'        → ConfirmDialog「发现新版本 v{latestVersion}（需下载安装新安装包）\n{notes}」
                 [前往下载→Linking.openURL(url)] [稍后]
  'uptodate'   → 状态行「✅ 已是最新版本」
  'unsupported'→ 状态行「当前为开发/网页环境，仅检查安装包；已是最新」
  'error'      → 状态行「检查失败：{reason}」
```
- `applyOta` 调用前后用 loading 态防重复点击；`reloadAsync` 触发重启。
- 下载用 `Linking.openURL`（react-native 内置，无新依赖）；web 下打开 Release 页。

## 7. 环境守卫与降级（绝不崩溃）

| 环境/失败 | 表现 | 处理 |
|:--|:--|:--|
| web / dev / Expo Go（`Updates.isEnabled=false`） | 跳过 OTA，仅 APK 检查 | `checkOta` 返回 `enabled:false`，不触碰 expo-updates API |
| 无网络 / 超时 / GitHub 限流 | 对应路返回 `error` | 两路皆败才显示「检查失败」；一路有结果即用之 |
| 仓库尚无 Release（404） | APK 视为「已是最新」 | 非错误，正常显示 |
| 无 `.apk` 资源的 Release | 跳转 Release 页 | 回退 `html_url` |
| `nativeApplicationVersion` 为 null（web） | 回退 `Constants.expoConfig?.version` | 版本展示与比较不为空 |

## 8. 持久化

**不新增任何持久化字段**（无 `Config` 改动、无 migrate、`CURRENT_VERSION` 不变）。因此**不触发** `MEMORY.md` 的「加持久化字段五处 checklist」。这是有意的范围收敛（无「跳过版本/上次检查时间」记忆需求）。

## 9. EAS Update 接入与发版流程（⚠️ 配套改动，OTA 能工作的前提）

### 9.1 一次性配置
- `npx expo install expo-updates expo-application`（按 v56 锁版本）。
- `eas update:configure`：写入 app.json 的 `updates.url`（`https://u.expo.dev/<projectId>`）+ `runtimeVersion`，并改原生 manifest。
- 设 `runtimeVersion: { "policy": "appVersion" }`（runtime = app `version`）。
- 设 `updates.checkAutomatically: "NEVER"`（纯按钮驱动，不在启动时偷偷下载/重启）。
- eas.json 各 profile 加 `channel`：`preview → "preview"`、`production → "production"`。

### 9.2 两条发版路径（写进 `docs/BUILD-ANDROID.md`）

| 场景 | 操作 | 用户侧效果 |
|:--|:--|:--|
| **纯 JS 小修** | **不动** `version`；`eas update --channel preview --message "..."` | 点「检查更新」→ OTA → 重启生效 |
| **原生 / 大版本** | `version` + `versionCode` 都 +1 → `eas build` → 在 GitHub 建 Release（tag `v<version>` + 上传 `.apk`） | 点「检查更新」→ 检测到新 APK → 前往下载 |

> **硬性要求**：每个面向用户的 **APK 发布都必须 bump 语义化 `version`** 并发 GitHub Release（tag `v<version>`）。当前习惯（只 +`versionCode`、`version` 长期 1.0.0）会让 APK 检测「看不见」更新。`runtimeVersion=appVersion` 策略下，version 不变 → 同一 OTA 流；version 变 → 新 runtime + 新 APK，两条路径天然隔离不打架。

### 9.3 「鸡生蛋」首次落地
- `expo-updates`/`expo-application` 是**原生依赖**，加入后**必须重新 EAS 构建**。当前已装在手机上的 APK 无法 OTA 获得本功能——**第一版必须手动装新 APK**，此后 OTA/版本检查才生效。

## 10. 测试与验证策略

**能在此环境验证（jest + web preview）：**
- 单测 `__tests__/updateSemver.test.ts`：`compareVersions` 全分支。
- 单测 `__tests__/updateDecide.test.ts`：`decideUpdate`（OTA 优先 / APK 兜底 / 同时存在 / uptodate / unsupported / error）。
- 单测 `__tests__/checkApk.test.ts`：用 `fetch` mock 喂样例 GitHub Release JSON，验证 tag 解析、`.apk` 资源挑选、404/限流/无资源回退分支。
- 验收门：`npm test` 全绿 + `npx tsc --noEmit` 全绿。
- web preview：渲染设置页「关于与更新」分区，展示版本号、点按钮（无 Release → 优雅显示「已是最新/检查失败」，web 下 OTA 关闭），截图为证。

**此环境无法端到端验证（须诚实标注，不假称已验证）：**
- 真实 OTA（需 EAS 构建嵌入 expo-updates + `eas update` 发布一条更新 + 真机点按钮）。
- 真实 APK 检测与安装（需在 GitHub 发一个高版本 Release + 真机）。
- 交付物附「设备验证步骤」清单（确切命令），供用户在真机自验。

## 11. 依赖变更
- **新增**：`expo-updates`、`expo-application`（均原生，`npx expo install` 锁 v56 版本，需重构建）。
- **不新增**：第三方 HTTP 库（用内置 `fetch`）、安装器库（用 `Linking.openURL`）、`expo-constants`（已是传递依赖）。

## 12. 实现顺序（供 writing-plans 切分）
1. **纯逻辑**：`domain/update/semver.ts` + `decide.ts` + 单测（先红后绿，零依赖最易 TDD）。
2. **IO 层**：`services/update/{types,checkOta,checkApk}.ts` + `checkApk` 的 fetch-mock 单测。
3. **UI**：`UpdateSection.tsx` + 接进 `SettingsScreen`；web preview 验证渲染与降级。
4. **EAS 配置**：`expo install` 两个依赖 → `eas update:configure` → app.json(`runtimeVersion`/`checkAutomatically`) + eas.json(`channel`)。
5. **文档**：更新 `docs/BUILD-ANDROID.md`（两条发版路径 + GitHub Release 规范）；交付物附设备验证清单。

## 13. 关键决策记录（ADR）
- **D1 OTA 优先 + APK 兜底**：OTA 覆盖高频 JS 迭代（即时、应用内）；APK 覆盖原生/大版本（侧载分发的现实）。`runtimeVersion=appVersion` 让两路天然隔离。
- **D2 APK 真相源 = GitHub Releases latest**：项目已有公开 GitHub 仓库，免鉴权、直接托管 APK 资源；代价是每次发版需建 Release 并 bump 语义化 `version`。
- **D3 纯按钮驱动（checkAutomatically: NEVER）**：用户只要了「按钮」，不偷偷在启动时下载/重启，行为可预期。
- **D4 不加持久化字段**：无「跳过版本/上次检查」记忆需求，避免 migrate 与五处 checklist 复杂度。
- **D5 只跳转下载、不内置安装 APK**：Android 安装器权限坑多收益小，交给系统安装器。
- **D6 决策逻辑下沉 domain 纯函数**：`decideUpdate`/`compareVersions` 可穷举单测，UI 只做副作用，契合现有三层解耦。
