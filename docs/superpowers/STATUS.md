# RPGLife — 进度与待办（会话交接）

> 像素 RPG 习惯打卡 APP。Expo (React Native) + TypeScript + Zustand。
> 本文件给新会话快速接手用。**先读这份 + `MEMORY.md` + 下面列的 spec/plan。**

## 当前状态（2026-05-31）

Phase 1 共 3 份计划，已完成 2 份并**合并入 `main`**：

- ✅ **Plan 1 — 领域核心 & 结算引擎**（纯 TS，全 TDD）：`src/domain/`（types / dateUtils / economy / settlement / trials / actions / migrate / initialState）。结算、试炼连击/里程碑/毕业、Boss 三段扣血、可撤销打卡、长时间未用守卫、经济（升/降级）全部实现并单测。
- ✅ **Plan 2 — Store / 持久化 / App 骨架 + 可用委托屏**：`src/store/`（gameActions / useGameStore / idGen）+ `src/ui/`（theme / components / screens / navigation）+ `App.tsx`。Zustand+immer+persist(AsyncStorage)、migrate、任务 CRUD、启动结算、5 Tab 导航、顶部状态栏、可用的「委托」屏（每日/每周打卡+撤销+全清进度）。
- ⏳ **Plan 3 — 剩余 UI**：未开始（见下）。

**验证基线**：`npm test` → 72 passed；`npx tsc --noEmit` → clean；expo-web 端到端闭环已人工验证（打卡→金币/经验更新→刷新仍在→撤销回退）。

## 怎么跑 / 测 / 验

- 单测：`npm test`（领域+store 纯逻辑，ts-jest）
- 类型：`npx tsc --noEmit`（app，已排除 __tests__）
- 跑 web：`npm run web`（= `expo start --web`），或一次性构建 `npx expo export --platform web`（产物在 `dist/`，已 gitignore）
- ⚠️ `~/.npm` 缓存损坏（EACCES）；项目根 `.npmrc`（gitignore）已指向 `/tmp/rpglife-npm-cache`。见 MEMORY。

## 代码结构

```
src/domain/   纯逻辑引擎（零 RN 依赖，全单测）— Plan 1 完成
src/store/    Zustand：gameActions(包装领域+CRUD) / useGameStore(persist) / idGen
src/ui/       theme.ts / components(Pixel,TopStatusBar) / screens(Quests=可用，其余占位) / navigation.tsx
App.tsx       启动：hydrate 门 → processRollover → 渲染
__tests__/    Jest（72 个）
docs/superpowers/specs/2026-05-31-...-design.md   ← 权威 spec（机制/数据模型/结算算法）
docs/superpowers/plans/2026-05-31-...-domain-engine.md   ← Plan 1
docs/superpowers/plans/2026-05-31-...-store-shell.md     ← Plan 2（末尾「延到 Plan 3」列了起手必处理项）
```

---

## 待办

### ▶ Plan 3 — 完成 Phase 1 的剩余 UI（下一步）

**起手先补数据模型/动作（Plan 2 终审发现，建屏前必做）：**
- `Trial`/`Boss` 类型加 `archived` 字段；`archiveTrial` 由物理删除改为软归档；新增 `archiveBoss`、`editTrial`、`editBoss`；`settleTrials` 及 Boss 逻辑跳过 `archived`。
- （会改 `src/domain/types.ts` + settlement/trials + 对应单测；migrate 已能容忍新字段。）

**四屏 + 动效：**
- **试炼屏**：进行中副本（连击天数 / 下一里程碑进度+金额 / 今日是否已打卡 / 当天可撤销）、「开启新试炼」、已毕业进历史区。
- **讨伐(Boss)屏**：分 3 段的血条（已结算段高亮）+ 各段奖励 + 关联任务列表 + 击杀状态；新建/编辑 Boss（maxHp/总奖励/weights/关联任务/单次伤害）。
- **商店屏**：冻结卡购买（`config.freezeCardCost`）+ 提现（满 `config.cashOutThreshold` 触发仪式化二次确认）。
- **设置屏**：config 全部数值可编辑（spec §6）+ 导出/导入 JSON（用 `actions.importState`）+ 清空重置（`actions.reset`，二次确认）。
- **reanimated 动画**：打卡金币飞向顶部+「+N」浮字、升级全屏「LEVEL UP!」闪光、全清宝箱、Boss 阶段达成/击杀、断签碎裂。
- **像素字体**：expo-font 加载 `Press Start 2P`（英数）+ `Zpix`（中文），带 `sans-serif` 兜底。
- **CelebrationOverlay**：消费 `state.pendingCelebrations` 队列（levelUp/perfectDay/perfectWeek/graduation/bossDefeated），播完 `actions.consumeCelebration()`；`pendingNotice==='longAbsence'` 弹一次性「已暂停期间金币惩罚」，然后 `actions.consumeNotice()`。
- 每屏建好后 **expo-web 截图验收**。⚠️ 切记 zustand 选择器陷阱（见 MEMORY：别从 `useGameStore` 选择器返回新数组/对象）。
- 可选加固测试：persist 后 `actions` 仍在；`migrate` 版本不匹配时不重复 seed。

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
