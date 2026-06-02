# Android 打包指南（EAS 云端构建）

把本项目（Expo SDK 56 / RN 0.85）打成安卓安装包，统一走 [`scripts/build-android.sh`](../scripts/build-android.sh)。

## 一键命令

```bash
npm run build:android          # preview：通用 APK，可直接装到手机
npm run build:android:prod     # production：AAB，用于上架 Google Play
# 或直接调用脚本（可从任意目录）：
./scripts/build-android.sh [preview|production|development] [-- 透传给 eas build 的参数]
./scripts/build-android.sh preview -- --no-wait    # 例：提交后不等待
```

## 前置：Expo 鉴权（二选一，脚本都支持）

1. **交互式**：先 `npx eas-cli login`，之后跑脚本即可。
2. **免交互 / CI 推荐**：设置 `EXPO_TOKEN` 环境变量。
   - 在 <https://expo.dev> → Account settings → Access tokens 生成。
   - 用法：`EXPO_TOKEN=xxxx npm run build:android`
   - ⚠️ **不要把 token 写进任何文件或提交到 git**，只作为环境变量临时使用。

未登录且未设 `EXPO_TOKEN` 时，脚本会自动引导你执行 `eas login`。

## 构建档案（[eas.json](../eas.json)）

| profile       | 产物                  | 用途                                   |
| ------------- | --------------------- | -------------------------------------- |
| `preview`     | 通用 APK（internal）  | 侧载安装到主流手机（arm64 / armeabi）  |
| `development` | 带开发客户端的 APK    | 本地开发调试                           |
| `production`  | AAB                   | 上架 Google Play                       |

版本号来源为 `cli.appVersionSource = "local"`：以 [app.json](../app.json) 的 `version` 与 `android.versionCode` 为准。**每次发版前手动把 `android.versionCode` +1。**

## 应用标识

- 包名 `android.package`：`com.codenoob.rpglife`（**发布后不可更改**）
- 显示名：`RPGLife`
- EAS 项目：`@sharkyovo/rpglife`（`projectId` 写在 app.json 的 `extra.eas`）

## 取产物 / 安装

构建结束后 EAS 会给出下载链接；也可随时查看：

- 网页：<https://expo.dev/accounts/sharkyovo/projects/rpglife/builds>
- 命令：`npx eas-cli build:list --platform android`

把下载的 `.apk` 传到安卓手机，在系统里允许「未知来源 / 此来源安装」后点击安装即可。`preview` 产出的是**通用 APK**，覆盖 arm64-v8a / armeabi-v7a，主流机型可直接装。

## 🤖 Tag 自动发版到 GitHub Release（CI）

推送 `v*` tag 即由 GitHub Actions 自动用 EAS 云构建 APK 并发布到 **GitHub Releases**。Workflow 见 [`.github/workflows/release-apk.yml`](../.github/workflows/release-apk.yml)。

**一次性配置**（仅一个 secret）：repo → Settings → Secrets and variables → Actions → **New repository secret**，名称 `EXPO_TOKEN`，值在 <https://expo.dev> → Account settings → Access tokens 生成（账号需有本项目权限）。`GITHUB_TOKEN` 由 Actions 自动提供，无需配置。

**发版流程**：

1. 在 [app.json](../app.json) 把 `version` 与 `android.versionCode` **+1**（versionCode 必须递增，否则装到旧版机器无法覆盖升级）。
2. 提交后打 tag 并推送：
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. Actions 自动：EAS 云构建 preview APK → 下载 → 创建名为 `v1.0.1` 的 Release，挂上 `rpglife-v1.0.1.apk`（含自动生成的 changelog）。

构建用 EAS 托管的签名 keystore，与 `npm run build:android` 出的包**签名一致、可互相覆盖安装**。单次约 10–20 分钟（走 Expo 云构建额度）。

## 故障排查

- **`unbound variable`（bash）**：脚本已兼容 macOS 自带的 bash 3.2（空数组 + `set -u` 的坑），无需处理。
- **脚本退出 0，但 EAS 上没有新构建**：通常是 EAS 服务故障导致"提交"这一步被静默挡下。先看 <https://status.expo.dev>，恢复后重跑 `npm run build:android` 即可（鉴权、密钥等前置不用重做）。
- **`EACCES` / npm 缓存报错**：仓库根的 `.npmrc` 已把缓存指到 `/tmp/rpglife-npm-cache`（机器本地、已 gitignore）。换新机器若复现该报错，照样重建这个 `.npmrc`（或给 npm 传 `--cache /tmp/rpglife-npm-cache`）。
- **首次构建**会在 EAS 服务器端生成并托管 Android 签名 keystore，之后自动复用——本地不需要 Android SDK / JDK17。

## 应用内更新（OTA 优先 + APK 兜底）

设置页「关于与更新 → 检查更新」会并行查两路：**OTA 热更新**（expo-updates / EAS Update）优先，**GitHub Releases 新 APK** 兜底。两条发版路径：

| 场景 | 操作 | 用户侧效果 |
| --- | --- | --- |
| **纯 JS 小修** | **不动** `app.json` 的 `version`；`eas update --channel preview --message "..."` | 点「检查更新」→ 发现热更新 → 重启生效，无需重装 |
| **原生 / 大版本** | `app.json` 的 `version` **与** `android.versionCode` 都 +1 → 推 `v<version>` tag（CI [`release-apk.yml`](../.github/workflows/release-apk.yml) 自动 EAS 构建并发 GitHub Release，见上文「🤖 Tag 自动发版」） | 点「检查更新」→ 发现新安装包 → 前往下载安装 |

> ⚠️ **APK 检测前提**：每个面向用户的 APK 发布都必须 bump 语义化 `version` 并发 GitHub Release（tag 形如 `v1.1.0`）。仅 +`versionCode`、`version` 长期不变会让 APK 检测「看不见」更新。
>
> `runtimeVersion` 用 `appVersion` 策略：`version` 不变 → 同一 OTA 流（热更新能送达老安装）；`version` 变 → 新 runtime + 新 APK，两条路天然隔离。

### 首次落地（鸡生蛋）

`expo-updates` / `expo-application` 是原生依赖，加入后**必须重新构建并安装一次 APK**，本功能才生效；已装的旧 APK 无法通过 OTA 获得此功能。

### 设备端验证清单（CI/web 无法端到端验证，需真机自验）

**OTA 路径：**
1. 出一个带 expo-updates 的 preview APK 装到真机（推 `v<version>` tag 走 CI，或本地 `npm run build:android`）。
2. 改一处 JS（如某文案），`eas update --channel preview --message "test ota"` 发布（channel 与 preview profile 一致）。
3. 真机打开 App → 设置 → 检查更新 → 应弹「发现热更新」→ 立即更新 → 应用重启后看到改动。

**APK 路径：**
1. `app.json` 的 `version` 改为比当前高（当前已是 1.0.1，故用 `1.0.2`）、`versionCode` +1，提交后推 `v1.0.2` tag → CI 自动构建并发布 Release `v1.0.2`（挂 `rpglife-v1.0.2.apk`）。
2. 旧版本真机 → 检查更新 → 应弹「发现新版本 v1.0.2」→ 前往下载 → 跳转到 APK 下载。
