# RPGLife — 进度与待办（会话交接）

> 像素 RPG 习惯打卡 APP。Expo (React Native) + TypeScript + Zustand。
> 本文件给新会话快速接手用。**先读这份 + `MEMORY.md` + 下面列的 spec/plan。**

## 当前状态（2026-06-01）

Phase 1：Plan 1/2 已**合并入 `main`**；Plan 3 已完成（在分支 `feat/phase1-plan3-ui`，**待合并/验收**）；Plan 4（追加三项）已 brainstorming 定案、待实现。

- ✅ **Plan 1 — 领域核心 & 结算引擎**（纯 TS，全 TDD）：`src/domain/`（types / dateUtils / economy / settlement / trials / actions / migrate / initialState）。结算、试炼连击/里程碑/毕业、Boss 三段扣血、可撤销打卡、长时间未用守卫、经济（升/降级）全部实现并单测。
- ✅ **Plan 2 — Store / 持久化 / App 骨架 + 可用委托屏**：`src/store/`（gameActions / useGameStore / idGen）+ `src/ui/`（theme / components / screens / navigation）+ `App.tsx`。Zustand+immer+persist(AsyncStorage)、migrate、任务 CRUD、启动结算、5 Tab 导航、顶部状态栏、可用的「委托」屏。
- ✅ **Plan 3 — 剩余 UI（四屏 + 字体 + 动画）**：试炼/讨伐(Boss)/商店/设置四屏全部可用（5 Tab 皆真屏）；领域补 `Trial/Boss.archived` + 结算跳过；store 补软归档/`archiveBoss`/`editTrial`/`editBoss`/`addBoss(weights)`；expo-font 加载 Press Start 2P + Zpix；`CelebrationOverlay` 消费 `pendingCelebrations` + 长假提示；reanimated 打卡浮字。终审通过（无 Critical），已修两条 Important（庆祝消费用 `animatingRef` 串行化、`importState` 走 `migrate` 深填并清瞬态）。

**验证基线**：`npm test` → 84 passed；`npx tsc --noEmit` → clean；expo-web 各屏截图验收通过（试炼里程碑、Boss 端到端扣血/阶段奖励、配置编辑跨屏生效、重置、长假提示）。⚠️ reanimated 动画（庆祝/浮字）在无头 web 导出里因 rAF 时间轴压缩**截不到瞬态**（但队列消费/升级/全清效果均正确，无控制台报错）——真机/真实浏览器会按时长播放，需在真机复核观感。

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

### ▶ Plan 4 — Phase 1 追加三项（下一步，已 brainstorming 定案）

设计已与用户确认（待写 spec `docs/superpowers/specs/2026-06-01-...-design.md`）。在 Plan 3 合并后从 `main` 开新分支实现：

- **一次性委托（oneoffs）**：新顶层数组 `oneoffs`（`{id,name,gold,exp,icon,doneDate:DateStr|null,archived}`），**纯奖励待办、无截止无惩罚、不随 rollover 重置**（`doneDate!==null`=永久完成）。`checkInOneoff` 发金币/经验 + 建回执（`Receipt.kind` 加 `'oneoff'`，同日可撤），**不触发每日全清、不联动 Boss**。委托屏新增「一次性委托」区 + 可折叠「已完成」区。⚠️ **新顶层数组 → 必须把 persist `version` 升到 2** 并在 `migrate` 补 `oneoffs`（否则旧 v1 存档运行时 `s.oneoffs` 为 undefined → `.filter` 崩）。
- **委托增删改 UI**：每日/每周/一次性区标题旁放「＋发布」+「管理」切换；manage 开启时各卡显示「编辑」「删除」（store 的 add/edit/archive 动作已存在，纯接线 + 共享表单模态 + 删除二次确认）。
- **Boss 手动扣血（自定义伤害值）**：抽 `applyBossHit(state,r,boss,dmg,now)` 供 `applyBossDamageForTask`（dmg=damagePerHit）与新 `attackBoss(state,bossId,damage,now)` 共用；`Receipt.kind` 加 `'boss'`（同日可撤，undoCheckIn 的 bossHits 回退已通用）。Boss 卡加「攻击」按钮 → 数值输入（默认 damagePerHit）→ 扣血发阶段奖励。
- 领域/store 全 Jest TDD；UI expo-web 截图验收。⚠️ zustand 选择器陷阱：`oneoffs` 也选稳定 ref，空数组用模块级常量兜 undefined。

### Phase 2（Phase 1 全部验收后）
禁忌任务(antis)、热力图日历 + 统计页（新增「数据」Tab）、成就系统、音效(expo-av)、本地通知(expo-notifications)、外观随等级解锁、皮肤商店、打卡留证（照片/日志）。需把 persist `version` 升到 2 并在 `migrate` 补 `antis`/`achievements` 等字段。

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
