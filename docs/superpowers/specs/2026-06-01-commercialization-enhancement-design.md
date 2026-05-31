# RPGLife 商业化增强 — 设计规格（2026-06-01）

> 状态：自审通过，作为本轮 5 小时自主迭代的事实来源。
> 上游：[竞品调研综合](../research/2026-06-01-competitor-research-synthesis.md) + [Phase 1 设计规格](./2026-05-31-pixel-rpg-habit-tracker-phase1-design.md)。
> 约束（来自用户目标）：**核心循环不变**，尽量扩展功能 + 美化界面，向商业级演化；每个优化点一个 commit；自主审批。

## 1. 愿景与原则

把 RPGLife 从"功能完整的 MVP"提升到"有商业级观感与留存深度的像素 RPG 习惯 App"，同时**完整保留**核心循环
（委托/试炼/讨伐打卡 → 金币+经验 → 升级 / Boss 击杀 / 提现）与 Phase 1 全部已拍板产品决策。

**设计原则（护栏，详见综合文档 §3）**：
1. 不改核心循环语义与既有产品决策（惩罚去向、撤销窗口、断签、长假守卫、经济数值默认）。
2. 偏白帽（成就/拥有/赋能）；惩罚保留但文案温柔，杜绝羞辱式压力与赌博观感。
3. 领域改动必 **TDD**；UI 改动 expo-web 快照/截图验收；原生能力 web 仅验不崩、观感留真机。
4. 每个优化点提交前过 `npm test` + `npx tsc --noEmit`，保持**始终全绿**。
5. 像素一致性：8 倍数字号才用 Press Start 2P，正文 Zpix；新色对齐既有调色板。
6. zustand 选择器纪律：不返回新数组/对象，空集合用模块级常量兜底。

## 2. 数据模型演进策略（关键）

现有 `migrate(persisted, fromVersion)` 忽略 fromVersion，**深填**：对每个顶层字段 `p.x ?? fresh.x`，对对象 `{...fresh.x, ...p.x}`。
该函数对任意旧版本幂等安全。但 zustand `persist` **仅在 `version` 变化时调用 migrate**。

**决策**：每个**新增持久化字段**的优化点，将 `initialState.version` 与 `persist.version` **同步 +1**，并在 `migrate` 与
`initialState` 中补该字段默认。这样任何低版本旧存档加载时都会重跑 migrate 补齐新字段，**根除"旧存档 `s.newField` 为
undefined → 运行时崩"**。配置类偏好（动效/音效/触感/提醒）入 `config`（migrate 已 `{...fresh.config, ...p.config}` 合并），
但仍随所在优化点一并 bump version 以确保旧存档补默认。读取侧对可空字段一律防御性默认。

新增/扩展的持久化结构（最终形态，分散在各优化点落地，每次落地即 bump version）：
- `oneoffs: OneOff[]`（一次性委托，Plan 4）：`{id,name,gold,exp,icon,doneDate:DateStr|null,archived}`。
- `Receipt.kind` 增 `'oneoff' | 'boss'`；撤销通用回退已覆盖金币/经验/Boss。
- `achievements: { unlockedAt: Record<AchievementId, DateStr> }`（成就解锁时间）。
- `dailyChest: { date: DateStr; opened: boolean } | null`（每日宝箱，防重复领）。
- 任务可选 `category?: string`（分类/标签，纯附加，不影响结算）。
- `config` 增：`reduceMotion`、`soundEnabled`、`hapticsEnabled`、`reminderEnabled`、`reminderHour`（偏好）。
- `onboarded: boolean`（是否完成首启引导）。
- 派生数据（统计/热力图/连续记录/趋势）**不新增持久化**，由 `history`/`ledger`/`trials` 纯函数计算。

## 3. 史诗与验收标准

> 详细顺序见 [路线图](../plans/2026-06-01-commercialization-roadmap.md)。此处给"完成定义"。

### E1 手感与动效打磨（💄，复用 reanimated，web 可验）
- 统一 `useHaptic()`（web no-op）；签到/升级/击杀触发分级触感。
- 签到数字弹跳上浮 + 进度条 overshoot；顶栏经验条动画填充、金币变动脉冲、升级高亮。
- Boss 受击：闪白 + 抖动 + 伤害浮字 + 血条平滑过渡。
- 庆祝层升级：纸屑 + 轻屏震 + 像素横幅；动效全部受 `reduceMotion` 开关约束。
- **验收**：expo-web 快照含新元素、控制台无新报错、`reduceMotion=on` 时降级为无动效。

### E2 商业就绪打磨（💄）
- 修复 RN-web 弃用告警（`pointerEvents`→`style.pointerEvents`、`shadow*`→`boxShadow`）。
- 各列表空状态：像素插画占位 + 鼓励标题 + 主 CTA。
- 微文案语气统一（鼓励式、断签温柔）。
- 设置增"动效/音效/触感/提醒"开关区。
- **验收**：空状态快照可见；控制台告警清零；设置开关即时生效。

### E3 Plan 4 收尾（⚙️，领域 TDD + UI）
- 一次性委托：`checkInOneoff` 发金币/经验 + 回执（`kind:'oneoff'`，同日可撤），**不触发每日全清、不参与 rollover**。
- 委托增删改 UI：每日/每周/一次性区"＋发布"+"管理"切换；编辑/删除（二次确认）。
- Boss 手动攻击：抽 `applyBossHit(state,r,boss,dmg,now)`，新 `attackBoss(state,bossId,damage,now)`（`kind:'boss'`，可撤）；Boss 卡"攻击"按钮 → 数值输入 → 扣血发阶段奖励。
- **验收**：新增 Jest 全绿；UI 端到端（发布/编辑/删除一次性委托、手动攻击扣血并可撤）截图。

### E4 「数据」统计页（⚙️，纯派生 + 新 Tab）
- 新增第 6 Tab「数据」。展示：年度像素热力图（按 `history[date].status`/完成比上色）、当前/历史最佳连击（按 trial）、
  本周完成率、累计（任务完成数/金币赚取/已提现）、近 N 日金币与经验趋势（像素折线/柱）。
- 全部由 `history`/`ledger`/`trials` 纯选择器计算（`src/domain/stats.ts`，TDD）。
- **验收**：stats 选择器单测全绿；数据页快照展示热力图与各卡；空数据优雅降级。

### E5 成就系统（⚙️，领域 TDD + UI）
- `src/domain/achievements.ts`：静态目录（id/标题/描述/图标/判定谓词）；`evaluateAchievements(state,now)` 纯函数扫描并解锁新达成项，push `levelUp`-style 庆祝（新增 `'achievement'` celebration kind）。
- 在 store 各 action 后调用评估；持久化 `achievements.unlockedAt`（bump version）。
- 成就墙 UI（数据页内的区块或独立区）：像素奖杯网格，已解锁高亮 + 解锁日期。
- **验收**：成就判定单测（连击 7/30、首杀 Boss、累计提现等）全绿；解锁弹庆祝；墙可见。

### E6 留存与引导（⚙️/💄）
- 每日宝箱：每日首次任意打卡可开一次像素宝箱，随机金币（确定性下限 + 封顶），`dailyChest` 防重复。
- 晨间"昨日战报"卡：跨天后首屏弹像素战报（昨日 status/收益/连胜/待讨伐 Boss）。
- 首启 onboarding：3–4 屏像素向导（可含打字机），结束引导完成首个打卡（即时奖励），置 `onboarded`。
- 本地提醒（expo-notifications）：鼓励式中文文案，设置可开关/调时段；web/无权限安全降级。
- **验收**：宝箱领取单测（每日一次、上下限）；战报/onboarding 截图；提醒在 web 不崩。

### E7 拉伸（时间允许）
分类/标签筛选、装扮/主题皮肤（调色板切换）、CRT 扫描线、可分享成就卡（view-shot）、灵活排程、i18n 基建。

## 4. 明确不做（本轮）
真后端/云同步/登录、订阅与 IAP 接入（仅做装扮皮肤的本地解锁占位）、跨天撤销、属性系统全量（雷达图留拉伸）、
社交/组队、Widget（需原生构建，留独立任务）。

## 5. 风险与缓解
- **原生模块 web 不可观感验**（haptics/audio/notifications）：Platform 守卫 + web no-op，仅验证 build/tsc 不破；真机复核。
- **新增 Tab 改导航**：6 Tab 仍在移动端常规范围；保持原 5 Tab 行为不变，仅追加。
- **动效性能/晕动**：统一 `reduceMotion` 开关；动效短（≤300ms）且自清理。
- **经济失衡**：宝箱/掉落封顶 + 确定性下限；成就奖励克制或纯荣誉。
- **存档兼容**：见 §2 版本 bump 策略；导入校验放宽为"version ≤ 当前且含 player/dailies"。
