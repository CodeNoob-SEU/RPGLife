# RPGLife 商业化迭代 — 执行路线图（2026-06-01）

> 每个优化点（OP）= 一个 commit。顺序按"低风险高 ROI → 领域功能 → 大特性 → 留存 → 拉伸"。
> 每 OP 完成前置门：`npm test` + `npx tsc --noEmit` 全绿；UI 项 expo-web 快照/截图。
> 进度标记：☐ 待办 / ▶ 进行中 / ✅ 完成。

## 阶段 0：文档（调研→规格→计划）
- ✅ OP-0a 竞品调研综合文档
- ✅ OP-0b 商业化增强规格
- ✅ OP-0c 本路线图

## 阶段 1：手感与商业就绪打磨（E1/E2，纯 UI/低风险，web 可验）
- ☐ OP-1 **主题与告警清理**：扩展 theme token（语义色/字号阶/间距别名）；修复 `pointerEvents`/`shadow*` RN-web 弃用告警；config 增 `reduceMotion/soundEnabled/hapticsEnabled` 偏好 + 迁移（**bump v2**）。
- ☐ OP-2 **触感封装 useHaptic()**：新增 `expo-haptics`；`src/ui/haptics.ts` 统一分级（light/success/error），受 `hapticsEnabled` 控；接入打卡/撤销/升级/击杀。web/无模块 no-op。
- ☐ OP-3 **签到反馈升级**：GainFloat 数字弹跳 + 进度条 overshoot；受 `reduceMotion` 约束。
- ☐ OP-4 **顶栏 HUD 抛光**：经验条动画填充 + 金币变动脉冲 + 升级高亮；头像随 avatarTier 变化。
- ☐ OP-5 **Boss 受击反馈**：血条平滑过渡 + 受击闪白/抖动 + 伤害浮字。
- ☐ OP-6 **庆祝层升级**：像素纸屑 + 轻屏震 + 横幅分级（普通/里程碑）；受 `reduceMotion` 约束。
- ☐ OP-7 **空状态 + 微文案**：任务/试炼/Boss/数据空列表配像素插画 + 鼓励 + CTA；设置加"动效/音效/触感"开关区。

## 阶段 2：Plan 4 收尾（E3，领域 TDD + UI）
- ☐ OP-8 **一次性委托（领域）**：types `OneOff` + `Receipt.kind:'oneoff'`；initialState/migrate（**bump v3**）；`checkInOneoff/addOneoff/editOneoff/archiveOneoff` + undo 支持；不触发全清、不进 rollover。Jest TDD。
- ☐ OP-9 **委托 CRUD + 一次性委托 UI**：委托页加一次性区 + 可折叠已完成；每区"＋发布/管理"切换；共享表单模态 + 删除二次确认。
- ☐ OP-10 **Boss 手动攻击**：抽 `applyBossHit`；`attackBoss(state,bossId,damage,now)`（`kind:'boss'`，可撤）；Boss 卡"攻击"按钮 → 数值输入。Jest TDD + UI。

## 阶段 3：数据与成就大特性（E4/E5）
- ☐ OP-11 **统计选择器（领域）**：`src/domain/stats.ts` 纯函数——当前/最佳连击、完成率、热力图数据、金币/经验趋势、累计。Jest TDD。
- ☐ OP-12 **「数据」Tab（UI）**：新增第 6 Tab；年度像素热力图 + 记录卡 + 趋势 + 累计；空数据降级。
- ☐ OP-13 **成就目录与判定（领域）**：`src/domain/achievements.ts` + `evaluateAchievements`；persist `achievements`（**bump v4**）；新增 `'achievement'` celebration。Jest TDD。
- ☐ OP-14 **成就墙（UI）+ 接线**：store 各 action 后评估；数据页成就墙；解锁庆祝。

## 阶段 4：留存与引导（E6）
- ☐ OP-15 **每日宝箱**：`openDailyChest` 领域（每日一次、确定性下限+封顶）+ persist `dailyChest`（**bump v5**）+ 委托页宝箱 UI/动画。Jest TDD。
- ☐ OP-16 **昨日战报卡**：跨天后首屏像素战报（昨日 status/收益/连胜/待讨伐 Boss）；纯派生 + 一次性消费信号。
- ☐ OP-17 **首启 onboarding**：3–4 屏像素向导（打字机）→ 引导首次打卡；persist `onboarded`（**bump v6**）。
- ☐ OP-18 **本地提醒**：新增 `expo-notifications`；鼓励式文案 + 设置开关/时段；web/无权限安全降级。

## 阶段 5：拉伸（时间允许，择优）
- ☐ OP-19 任务分类/标签 + 筛选
- ☐ OP-20 主题皮肤（多调色板切换）
- ☐ OP-21 CRT/扫描线 overlay 主题
- ☐ OP-22 可分享像素成就卡（react-native-view-shot）
- ☐ OP-23 灵活排程（每周 N 次/隔日）
- ☐ OP-24 i18n 基建 + 英文包

## 收尾
- ☐ 更新 STATUS.md（本轮成果 + 验证基线 + 后续）
- ☐ 全量 `npm test` + `tsc` + 关键屏截图终验
- ☐ 整理 commit 历史，确认每 OP 一 commit

## 备注
- 分支：当前 worktree 分支 `claude/suspicious-taussig-f00868`，直接在此提交。
- 版本号链：v1(基线) → v2(OP-1) → v3(OP-8) → v4(OP-13) → v5(OP-15) → v6(OP-17)。migrate 保持穷举深填。
- 原生包用 `npx expo install` 取 SDK56 兼容版本；装包走 `/tmp/rpglife-npm-cache`（已配 `.npmrc`）。
