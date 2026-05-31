# RPGLife — 进度与待办（会话交接）

> 像素 RPG 习惯打卡 APP。Expo (React Native) + TypeScript + Zustand。
> 本文件给新会话快速接手用。**先读这份 + `MEMORY.md` + 下面列的 spec/plan。**

## 当前状态（2026-06-01）

Phase 1：Plan 1/2 已**合并入 `main`**；Plan 3 已完成（在分支 `feat/phase1-plan3-ui`，**待合并/验收**）；Plan 4（追加三项）已 brainstorming 定案、待实现。

- ✅ **Plan 1 — 领域核心 & 结算引擎**（纯 TS，全 TDD）：`src/domain/`（types / dateUtils / economy / settlement / trials / actions / migrate / initialState）。结算、试炼连击/里程碑/毕业、Boss 三段扣血、可撤销打卡、长时间未用守卫、经济（升/降级）全部实现并单测。
- ✅ **Plan 2 — Store / 持久化 / App 骨架 + 可用委托屏**：`src/store/`（gameActions / useGameStore / idGen）+ `src/ui/`（theme / components / screens / navigation）+ `App.tsx`。Zustand+immer+persist(AsyncStorage)、migrate、任务 CRUD、启动结算、5 Tab 导航、顶部状态栏、可用的「委托」屏。
- ✅ **Plan 3 — 剩余 UI（四屏 + 字体 + 动画）**：试炼/讨伐(Boss)/商店/设置四屏全部可用（5 Tab 皆真屏）；领域补 `Trial/Boss.archived` + 结算跳过；store 补软归档/`archiveBoss`/`editTrial`/`editBoss`/`addBoss(weights)`；expo-font 加载 Press Start 2P + Zpix；`CelebrationOverlay` 消费 `pendingCelebrations` + 长假提示；reanimated 打卡浮字。终审通过（无 Critical），已修两条 Important（庆祝消费用 `animatingRef` 串行化、`importState` 走 `migrate` 深填并清瞬态）。

**验证基线（Plan 1-3）**：`npm test` → 84 passed；`npx tsc --noEmit` → clean；expo-web 各屏截图验收通过。

## 🆕 商业化迭代（2026-06-01，本会话，分支 `claude/suspicious-taussig-f00868`）

在 Plan 1-3 基础上：4 路并行竞品调研（`docs/superpowers/research/2026-06-01-competitor-research-synthesis.md`）→ [增强规格](specs/2026-06-01-commercialization-enhancement-design.md) → [路线图](plans/2026-06-01-commercialization-roadmap.md) → 18 个 commit 逐项落地（每优化点一 commit）：

- **手感/就绪打磨**：主题 token + 修 RN-web 弃用告警（web boxShadow / style.pointerEvents）；`src/ui/haptics.ts` 分级触感（expo-haptics，web no-op，受 `config.hapticsEnabled`）；签到分色浮字+缩放回弹；`PixelProgressBar` overshoot 动画；顶栏 HUD（金币脉冲/升级头像弹跳/头像随 avatarTier 演变/exp 比例）；`BossCard` 受击 juice（闪白/抖动/伤害浮字/平滑血条）；庆祝层升级（`Confetti` 像素纸屑+屏震+分级横幅）；`EmptyState`/`PixelToggle` + 设置「偏好」三开关（`reduceMotion` 统一控全局动效）。
- **Plan 4 收尾**：一次性委托 `oneoffs`（领域+UI，不触发全清/不联动 Boss/不进 rollover）；委托增删改 UI（`QuestFormModal` 共享表单 + 管理模式 + 删除二确）；Boss 手动攻击（`attackBoss` + 抽 `applyBossHit`；修过量击杀撤销溢出 bug）。
- **数据与成就**：`src/domain/stats.ts`（bestTrialStreak/currentDayStreak/completionRate/heatmapCells/goldTrend/lifetimeTotals，TDD）；新增第 6 Tab「数据」`DataScreen`（年度像素热力图+连续记录+完成率+累计+成就墙）；`src/domain/achievements.ts`（12 白帽成就 + `evaluateAchievements`，在 checkin/attack/cashout/rollover 后评估，推 `'achievement'` 庆祝）。
- **留存/引导**：每日宝箱 `openDailyChest`（随机金币区间）；首启 `Onboarding`（4 屏像素向导，`onboarded` 标记）；晨间 `MorningReport`（昨日战报，`reportSeenDate` 每日一次）。
- **健壮性**：`addGold`/`applyExpDelta` 拒绝非有限值（NaN 绝不污染金币/经验并持久化）；`openDailyChest` config 兜底。引入 `src/domain/version.ts` 的 `CURRENT_VERSION`，**persist v1→v7**（每加持久化字段 +1；`migrate` 穷举深填，旧档安全升级；导入校验放宽至 `version ≤ 当前`）。

**验证基线（更新）**：`npm test` → **119 passed（22 套件）**；`npx tsc --noEmit` → clean；expo-web 实测打卡/撤销、全清+升级庆祝、HUD、BossCard、委托 CRUD/一次性、Boss 手动攻击(−damage 精确)、数据页(热力图/成就墙 2/12)、每日宝箱(0→区间内无 NaN)、首启引导→主屏、昨日战报弹出/消费——均通过。
⚠️ **预览环境局限（非产品缺陷）**：reanimated 完成回调在无头预览偶不触发 → 庆祝可能"卡住"并被持久化（真机正常，已知）；reload 后 react-navigation Tab 锚点首点偶尔丢失（重点一次或重启预览实例即可）；`preview_screenshot` 偶发 `UnknownVizError`/滞后帧 → 用 `preview_snapshot`/`preview_eval` DOM 核验更可靠。

## 怎么跑 / 测 / 验

- 单测：`npm test`（领域+store 纯逻辑，ts-jest）
- 类型：`npx tsc --noEmit`（app，已排除 __tests__）
- 跑 web：`npm run web`（= `expo start --web`），或一次性构建 `npx expo export --platform web`（产物在 `dist/`，已 gitignore）
- ⚠️ `~/.npm` 缓存损坏（EACCES）；项目根 `.npmrc`（gitignore）已指向 `/tmp/rpglife-npm-cache`。见 MEMORY。

## 代码结构

```
src/domain/   纯逻辑引擎（零 RN 依赖，全单测）— Plan 1 完成
src/store/    Zustand：gameActions(包装领域+CRUD) / useGameStore(persist) / idGen
src/ui/       theme.ts / fonts.ts / components(Pixel,TopStatusBar,CelebrationOverlay,GainFloat) / screens(Quests/Trials/Boss/Shop/Settings 全可用) / navigation.tsx
App.tsx       启动：hydrate 门 + 字体门 → processRollover → 渲染
__tests__/    Jest（84 个）
docs/superpowers/specs/2026-05-31-...-design.md   ← 权威 spec（机制/数据模型/结算算法）
docs/superpowers/plans/2026-05-31-...-domain-engine.md   ← Plan 1
docs/superpowers/plans/2026-05-31-...-store-shell.md     ← Plan 2（末尾「延到 Plan 3」列了起手必处理项）
```

---

## 待办

### ✅ Plan 4 — Phase 1 追加三项（本会话已实现，见上「商业化迭代」）

三项（一次性委托 / 委托增删改 UI / Boss 手动攻击）均已实现并验证。原始设计如下（保留备查）：

- **一次性委托（oneoffs）**：新顶层数组 `oneoffs`（`{id,name,gold,exp,icon,doneDate:DateStr|null,archived}`），**纯奖励待办、无截止无惩罚、不随 rollover 重置**（`doneDate!==null`=永久完成）。`checkInOneoff` 发金币/经验 + 建回执（`Receipt.kind` 加 `'oneoff'`，同日可撤），**不触发每日全清、不联动 Boss**。委托屏新增「一次性委托」区 + 可折叠「已完成」区。⚠️ **新顶层数组 → 必须把 persist `version` 升到 2** 并在 `migrate` 补 `oneoffs`（否则旧 v1 存档运行时 `s.oneoffs` 为 undefined → `.filter` 崩）。
- **委托增删改 UI**：每日/每周/一次性区标题旁放「＋发布」+「管理」切换；manage 开启时各卡显示「编辑」「删除」（store 的 add/edit/archive 动作已存在，纯接线 + 共享表单模态 + 删除二次确认）。
- **Boss 手动扣血（自定义伤害值）**：抽 `applyBossHit(state,r,boss,dmg,now)` 供 `applyBossDamageForTask`（dmg=damagePerHit）与新 `attackBoss(state,bossId,damage,now)` 共用；`Receipt.kind` 加 `'boss'`（同日可撤，undoCheckIn 的 bossHits 回退已通用）。Boss 卡加「攻击」按钮 → 数值输入（默认 damagePerHit）→ 扣血发阶段奖励。
- 领域/store 全 Jest TDD；UI expo-web 截图验收。⚠️ zustand 选择器陷阱：`oneoffs` 也选稳定 ref，空数组用模块级常量兜 undefined。

### Phase 2（部分已在本会话提前交付）
- ✅ 热力图日历 + 统计页（「数据」Tab）— 已交付
- ✅ 成就系统 — 已交付（12 项，可继续扩充目录）
- ✅ 本地通知（expo-notifications，鼓励式文案 + 可调时段）— 已交付
- ✅ 分类/标签 + 筛选 — 已交付
- ☐ 剩余：禁忌任务(antis)、音效(expo-audio，触感已接)、外观随等级解锁/皮肤主题商店（多调色板切换需 theme context 重构）、打卡留证（照片/日志）、灵活排程(每周N次/隔日)、i18n 英文包、可分享成就卡(view-shot)、CRT 扫描线主题。
- 新增持久化字段沿用 `CURRENT_VERSION` +1 + `migrate` 深填策略（当前已到 **v8**）。

### Phase 3（可选）
随机事件 / 双倍卡、CRT 单色主题、云备份增强。（Boss 战已提前到 Phase 1。）

---

## 已拍板的产品决策（勿改，来自 spec 第 12 节 + 头脑风暴）
- 惩罚去向：**扣掉直接消失**（gold 永不为负、不回流）。
- 撤销：**同日、单个任务、完整回退**（金币+经验+全清/里程碑/毕业/Boss 一并回退，必要时等级回退）；**跨天不可撤**。
- 试炼断签：清空该试炼已领里程碑（重爬可重领）。
- 长时间未用(>7天)：连击照常按保护断、但**全免金币惩罚**。
- 经济数值：spec §6 默认，全部进设置页可调。

## 工作方式（本项目一直走 superpowers 流程）
1. 新功能：已有 spec，Plan 3 可直接 **writing-plans** 写计划（按上面的范围）。
2. **subagent-driven-development** 执行（每任务 TDD + 两阶段评审；逻辑高危任务派独立 code-reviewer）。
3. **finishing-a-development-branch** 合并（本项目用就地特性分支，非 worktree；合并回 `main`）。
4. 领域逻辑 → Jest TDD；UI → expo-web 截图验收。**在 `main` 上开特性分支干活，别直接在 main 提交实现。**

## 关键 gotchas（MEMORY.md 已存详情）
- npm install EACCES → `.npmrc` 已指向 `/tmp/rpglife-npm-cache`。
- 别从 `useGameStore` 选择器返回新数组/对象 → React #185 无限循环白屏（单测/tsc 抓不到，只有运行时暴露）。
- reanimated 4 的 babel 插件 = `react-native-worklets/plugin`（不是旧的 reanimated/plugin）；且需安装 `babel-preset-expo`。
