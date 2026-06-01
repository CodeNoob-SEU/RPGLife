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

## 故障排查

- **`unbound variable`（bash）**：脚本已兼容 macOS 自带的 bash 3.2（空数组 + `set -u` 的坑），无需处理。
- **脚本退出 0，但 EAS 上没有新构建**：通常是 EAS 服务故障导致"提交"这一步被静默挡下。先看 <https://status.expo.dev>，恢复后重跑 `npm run build:android` 即可（鉴权、密钥等前置不用重做）。
- **`EACCES` / npm 缓存报错**：仓库根的 `.npmrc` 已把缓存指到 `/tmp/rpglife-npm-cache`（机器本地、已 gitignore）。换新机器若复现该报错，照样重建这个 `.npmrc`（或给 npm 传 `--cache /tmp/rpglife-npm-cache`）。
- **首次构建**会在 EAS 服务器端生成并托管 Android 签名 keystore，之后自动复用——本地不需要 Android SDK / JDK17。
