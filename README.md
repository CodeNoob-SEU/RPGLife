<div align="center">

<img src="./assets/icon.png" alt="RPGLife" width="128" height="128" />

# RPGLife · 像素人生 RPG

**把自律变成一场像素冒险** —— 打卡即升级，攒金币、刷连击、打 Boss。
*A pixel-art RPG that turns your habits & to-dos into quests, gold and boss fights.*

<br/>

![Expo SDK](https://img.shields.io/badge/Expo_SDK-56-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?logo=react&logoColor=black)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-129_passing-6abe30)
![Platforms](https://img.shields.io/badge/platforms-Android_·_iOS_·_Web-8957e5)
![License](https://img.shields.io/badge/license-MIT-f7c948)

</div>

---

## 🎮 这是什么

RPGLife 是一款**像素风的「人生管理 / 习惯养成」App**：你的每日习惯、每周目标、待办、想戒掉的坏习惯，都被包装成 RPG 世界里的「委托、试炼、讨伐」。完成它们获得 🪙金币 与 ✨经验，升级、解锁成就、攒够金币还能「提现」兑换给自己一个真实奖励。

整套界面坚持**纯像素美学**：无圆角、硬边框、硬投影、像素字体（标题 `Press Start 2P`，中文 `Zpix`），动效用 Reanimated 手工编排，并提供「减弱动效」无障碍开关。

## ✨ 核心玩法

| Tab | 名称 | 内容 |
| :-: | :-- | :-- |
| 📜 | **委托** | 每日 / 每周 / 一次性任务 + 「禁忌」（想戒的坏习惯，记一次扣金）。分类筛选、分区可折叠、管理模式批量编辑。 |
| 🎯 | **试炼** | 连续打卡挑战（streak），里程碑奖励、冻结保护、毕业机制。 |
| 👹 | **讨伐** | Boss 战：把任务「链接」到 Boss，完成任务即造成伤害，分阶段发奖。 |
| 📊 | **数据** | 热力图、最长连击、完成率、金币趋势、累计统计 + 像素成就墙。 |
| 🏪 | **商店** | 冻结卡、金币「提现」兑换现实奖励（可配置兑换率与门槛）。 |
| ⚙️ | **设置** | 经济数值微调、偏好（动效/音效/触感）、每日提醒、**存档导出/导入**、重置。 |

外加这些「让人愿意每天回来」的设计：

- 🎁 **每日宝箱** —— 每天首次进入可开，随机金币奖励。
- 🌅 **昨日战报** —— 跨天首屏弹一次，回顾昨天战绩。
- 🏆 **成就系统** —— 解锁即庆祝动画 + 具体成就名。
- 🔔 **本地每日提醒** —— 像素角色口吻、鼓励不催促。
- 🎉 **打卡反馈** —— 金币/经验浮字、升级/全清/通关庆祝、像素纸屑。
- ♿ **无障碍 & 经济防御** —— 减弱动效开关；配置下限钳制根除 NaN/除零/升级死循环。

## 🛠 技术栈

| 领域 | 选型 |
| :-- | :-- |
| 框架 | **Expo SDK 56** · React Native 0.85 · React 19 · TypeScript（strict） |
| 状态 | **zustand** + immer，`persist` 持久化（AsyncStorage）+ **版本化 migrate**（当前 v11） |
| 导航 | `@react-navigation/bottom-tabs` v7（6 Tab） |
| 动效 | `react-native-reanimated` v4 + worklets |
| 原生能力 | expo-haptics（触感）· expo-notifications（提醒）· expo-clipboard（一键复制/粘贴）· expo-font |
| 测试 | **Jest + ts-jest**，领域逻辑 TDD，**129** 测试 |
| 打包 | **EAS Build**（云端出通用 APK / AAB），含可复用脚本 |

> 架构原则：**领域逻辑（`src/domain`）与 UI 完全解耦、可独立单测**；UI 只负责渲染与触发 actions。

## 🚀 快速开始

```bash
# 1) 安装依赖
npm install

# 2) 启动开发服务器（按 a 进安卓 / i 进 iOS / w 进网页）
npm start

# 或直接指定平台
npm run web        # 浏览器（react-native-web）
npm run android    # 需安卓模拟器 / 真机 + Expo Go 或开发版
npm run ios        # 需 macOS + iOS 模拟器

# 3) 跑测试
npm test
```

> 真机预览最省事：手机装 **Expo Go**，`npm start` 后扫终端二维码。

## 📦 打包成安卓 APK

通过 [EAS Build](https://docs.expo.dev/build/introduction/) 云端构建，本机**无需** Android SDK / JDK。一行搞定：

```bash
# 鉴权：先 `npx eas-cli login`，或设置 EXPO_TOKEN 免交互
npm run build:android        # preview → 可直接安装的通用 APK（arm64/armeabi）
npm run build:android:prod   # production → AAB（上架 Google Play）
```

可复用脚本 [`scripts/build-android.sh`](./scripts/build-android.sh) 会自动预检依赖、鉴权、首次链接项目，再发起构建；档案见 [`eas.json`](./eas.json)。完整用法与排错见 **[docs/BUILD-ANDROID.md](./docs/BUILD-ANDROID.md)**。

## 💾 存档备份 / 恢复（重装不丢数据）

- **覆盖安装**（不卸载、同签名）即可保留数据。
- 彻底备份：**设置 → 导出 JSON →「📋 复制到剪贴板」** 存到任意地方；重装后 **「📋 从剪贴板粘贴」→ 导入** 恢复。
- 也支持导出 **CSV 流水账**。导入走版本化 `migrate`，旧存档自动补齐新字段。

## 🗂 项目结构

```
RPGLife/
├── App.tsx                  # 入口：字体/状态水合/引导门控
├── src/
│   ├── domain/              # 纯领域逻辑（类型·结算·统计·成就·迁移），TDD 覆盖
│   ├── store/               # zustand 持久化 store + actions
│   └── ui/
│       ├── navigation.tsx   # 底部 6 Tab
│       ├── screens/         # 委托 / 试炼 / 讨伐 / 数据 / 商店 / 设置
│       ├── components/      # 像素 UI 组件库（Pixel.tsx、各类卡片/浮层）
│       └── theme.ts         # 像素风 tokens（无圆角 · 硬边框 · 硬投影）
├── assets/                  # 图标 / 启动图 / 像素字体
├── scripts/build-android.sh # 可复用 EAS 打包脚本
├── eas.json · app.json      # EAS 构建档案 / 应用配置
├── docs/                    # 设计文档 / 路线图 / 打包指南
└── __tests__/               # 129 个 Jest 测试
```

## 🧪 质量

- **TDD**：领域规则（结算、经济、连击、迁移……）先写测试再实现。
- `npm test` → **23 套件 / 129 测试** 全绿。
- 持久化每加一个字段即 `CURRENT_VERSION + 1` 并补 `migrate`，旧存档平滑升级。

## 📜 License

[MIT](./LICENSE) © 2026 CodeNoob-SEU

## 🙏 致谢

- [Expo](https://expo.dev) / [React Native](https://reactnative.dev) —— 跨端基石
- 字体：[Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)（标题）· [Zpix 最像素](https://github.com/SolidZORO/zpix-pixel-font)（中文）
- 像素 UI / 动效 / 经济系统均为本项目手作

<div align="center"><sub>用像素，把每一天过成一场值得记录的冒险。✨</sub></div>
