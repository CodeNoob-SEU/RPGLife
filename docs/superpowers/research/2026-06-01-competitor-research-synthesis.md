# RPGLife 竞品调研综合（2026-06-01）

> 目标：在**核心循环不变**（委托/试炼/讨伐打卡 → 金币+经验 → 升级/击杀/提现）的前提下，调研同类产品，
> 提炼可落地的功能扩展与界面美化方向，把 RPGLife 推向**商业级**。
> 本文综合 4 路并行调研（专业习惯追踪 / RPG 化待办 / 温情连胜类 / 设计手感与变现），是增强规格的事实来源之一。

## 0. 当前产品快照（基线）

- 5 Tab：委托 / 试炼 / 讨伐(Boss) / 商店 / 设置；顶部常驻状态栏（头像🧙 + Lv + 经验条 + 金币）。
- 领域引擎纯函数 + 全 TDD（84 测试通过）；状态 zustand+immer+persist(AsyncStorage)，version=1。
- 已记录 `history`（每日 status/done/total/goldNet）与 `ledger`（全量流水）—— **统计/热力图的现成数据源**。
- 动画：reanimated 打卡浮字 + CelebrationOverlay（升级/全清/毕业/Boss 击杀）。
- 已有产品独有卖点：**金币可提现为真实货币**（强反馈钩子，竞品几乎没有）。

**已识别的明显缺口**：无统计/数据页、无成就、无提醒、无分类/搜索、无 onboarding、无空状态插画、无音效/触感、
中文单语、商店去处单一（仅冻结卡+提现）、顶栏与庆祝偏静态、控制台有 RN-web 弃用告警。

## 1. 各赛道关键结论（含来源）

### A. 专业习惯追踪（Streaks / Habitify / HabitKit / TickTick / Loop / Way of Life）
- **数据可视化是最强竞争主题**：HabitKit 整个产品围绕 GitHub 式热力图；TickTick 显示当前/最佳连续 + 月度打卡率 + 年视图热力图；Habitify 用移动平均的"一致性曲线"避免单日漏打卡拉崩观感；Loop 用指数衰减的"习惯强度"分；Way of Life 用 chains + 趋势折线 + 周月计分板。([HabitKit](https://www.habitkit.app/), [TickTick](https://help.ticktick.com/articles/7055781896457814016), [Habitify](https://crm.org/news/habitify-review), [Loop](https://github.com/iSoron/uhabits), [Way of Life](https://wayoflifeapp.com/))
- **完成率应按目标频率算**（每周任务不因休息日被罚）。([TickTick](https://help.ticktick.com/articles/7055781896457814016))
- 组织：分类（生活领域/时段）、标签、归档（保留历史可恢复）、排序。([Habitify](https://crm.org/news/habitify-review), [HabitKit](https://www.habitkit.app/))
- 抱怨：付费墙激进、premium 统计太薄、负面措辞通知。→ RPGLife 全免费离线是定位优势。

### B. RPG 化待办（Habitica / LifeUp / Do It Now / EpicWin / SuperBetter）
- **LifeUp 是最近对标**：离线、买断、单机 RPG 待办。它有而我们缺：自定义属性/技能、随机掉落宝箱（用户设掉率）、合成配方、战利品陈列柜、番茄钟、多主题/暗色、Widget、丰富统计。([LifeUp](https://www.lifeupapp.fun/en/index.html), [GitHub](https://github.com/Ayagikei/LifeUp))
- **Habitica**：L10 选职业、装备、宠物、组队打 Boss、四季节日活动（限定外观/商店，解决"新鲜感悬崖"）。订阅+宝石，但明确非 pay-to-win。([Grokipedia](https://grokipedia.com/page/Habitica), [Grand Galas](https://habitica.fandom.com/wiki/Grand_Galas))
- **Do It Now / LifeRPG**：任务绑定多属性 + 雷达图显示强弱项；难度/重要/恐惧滑块缩放奖励。抱怨：设置太繁琐。([LifeRPG](https://play.google.com/store/apps/details?id=com.levor.liferpgtasks))
- **EpicWin**：像素 RPG 魅力天花板（角色穿越地图、战利品收集格、幽默音效）；教训："30–90 天的爽，不是 forever app"——奖励见底即流失。([Gamezebo](https://www.gamezebo.com/reviews/epicwin-review/))
- **SuperBetter**："I DID THIS!" 即时肯定的微反馈范式。
- **共性陷阱**：过度合理化（外在奖励侵蚀内在动机）、新鲜感悬崖、连胜压力导致最糟时刻弃用、功能与核心循环脱节。([getlogly](https://getlogly.app/blog/tired-of-gamified-habit-apps/), [Naavik](https://naavik.co/deep-dives/deep-dives-new-horizons-in-gamification/))

### C. 温情/连胜驱动（Finch / Duolingo / Forest / Pokémon Sleep / Plant Nanny / Fabulous）
- **Finch**：电子宠物心理 + **纯正向零惩罚**（鸟永不死，漏打卡只是"等你回来"）；"探险"约定机制（完成晨间任务→宠物出发→傍晚回来开宝箱）制造二次回访；彩虹石装扮宠物房（金币的第二去处）；关系等级（185 天挚友…）。D1/D7 留存超 Duolingo。([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl))
- **Duolingo**：连胜=损失厌恶；**冻结卡是结构性核心**（有冻结 +48% 连胜寿命）；**里程碑专属全屏庆祝**（仅 7/30/100/365 触发火凤凰+纸屑+可分享成就卡，平日不放保稀缺感，Day-7 留存 +1.7%）；拟人化通知文案。([Trophy](https://trophy.so/blog/the-psychology-of-streaks-how-sylvi-weaponized-duolingos-best-feature-against-them), [Duolingo Blog](https://blog.duolingo.com/streak-milestone-design-animation/))
- **Plant Nanny**：首启即按体重算目标并**当场种下第一颗种子**（即时首奖）。
- **Onboarding 数据**：三步引导完成率 72% vs 七步 16%；多数 App 3 天流失 77%——**尽快给首个奖励**。([Appcues](https://www.appcues.com/blog/mobile-onboarding))

### D. 设计手感 / 商业就绪 / 变现
- **像素 UI**：9-slice 九宫格面板（可拉伸不糊角）；锁定调色板对齐 DawnBringer 32 防漂移；Press Start 2P **仅在 8 的倍数字号清晰**（8/16/24），只用于短标题，正文交给 Zpix；**JRPG 打字机对话框**（黑底白字+闪烁▼+角色名）是我们最缺的高魅力组件。([Lospec DB32](https://lospec.com/palette-list/dawnbringer-32), [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P), [JRPG Dialog](https://champicky.com/2020/09/15/dialog-box-in-jrpgs/))
- **Juice**（《Juice It or Lose It》）：叠层反馈不改规则只改手感——屏震(50–300ms 衰减)、粒子爆裂、数字弹跳上浮、squash/stretch、命中闪白。栈：reanimated（已用）+ expo-haptics（已用）+ expo-audio(SDK56) + Skia/reanimated 纸屑。([Juice It or Lose It](https://www.youtube.com/watch?v=Fy0aCDmgnxg), [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/))
- **商业就绪**：空状态=可教学的机会（插画+鼓励标题+主 CTA，30 秒内首个有意义动作）；微文案温暖非机械；无障碍底线（对比≥4.5:1、触控≥44pt、不只靠颜色、尊重 reduced-motion）；i18n 用 expo-localization + i18next（一次性抽串，之后双语免费）。([Raw.Studio](https://raw.studio/blog/empty-states-error-states-onboarding-the-hidden-ux-moments-users-notice/), [Expo Localization](https://docs.expo.dev/guides/localization/))
- **伦理 Octalysis**：白帽（成就/拥有/赋能）建持久健康参与；黑帽（稀缺/不可预测/损失规避）建紧迫但易成瘾——连胜要**人性化**（grace day / 护盾），通知按生命周期校准不刷屏。([Yu-kai Chou](https://yukaichou.com/gamification-examples/what-is-gamification/))
- **离线变现**：一次性解锁 + 装扮皮肤包（不影响数值）；RevenueCat（`react-native-purchases`，`expo-in-app-purchases` 已弃用）。

## 2. 合并去重后的优化点清单（按主题归类，标注 优先级/工作量/类型）

> 优先级 P0=本轮核心、P1=高价值、P2=进阶/拉伸。类型：💄打磨 / ⚙️功能。

### 手感与动效（复用 reanimated，可 web 直接验收）
- P0 ⚙️/💄 **统一触感封装 `useHaptic()`**（打卡 light / 升级·击杀 success / 错误 error），web 安全 no-op。S
- P0 💄 **签到 juice 叠层**：数字弹跳上浮 + 进度条 overshoot 回弹（金币飞行可后续）。S–M
- P0 💄 **Boss 受击反馈**：闪白 + 抖动 + 伤害数字飞出 + 血条平滑下降。S–M
- P1 💄 **升级/里程碑庆祝升级**：全屏纸屑 + 屏震 + 像素横幅；里程碑专属（稀缺）。M
- P1 💄 **顶栏 HUD 抛光**：经验条动画填充 + 升级高亮 + 金币变动滚动。S
- P0 💄 **修复控制台弃用告警**（pointerEvents/shadow*）+ 调色板/间距 token 扩展。S
- P1 💄 **空状态重做**（任务/试炼/Boss 空列表配像素插画 + 鼓励 + CTA）。S–M
- P1 💄 **微文案语气统一**（鼓励式；断签温柔不羞辱）。S
- P2 💄 **reduced-motion 总开关**（设置项；无障碍）。S
- P2 💄 **JRPG 打字机对话框组件**（onboarding/过场/Boss 嘲讽复用）。M
- P2 💄 **CRT/扫描线主题** + 多调色板皮肤。M

### 功能扩展（部分需领域改动 + 版本迁移 + TDD）
- P0 ⚙️ **「数据」Tab**：热力图（年度像素格）+ 完成率 + 连续记录 + 金币/经验趋势（**读 history/ledger，零核心改动**）。L
- P0 ⚙️ **成就/徽章系统**：连击 7/30/100、首杀 Boss、累计任务/提现等里程碑 → 像素奖杯墙。L
- P0 ⚙️ **Plan 4 收尾**：一次性委托(oneoffs) + 委托增删改 UI + Boss 手动攻击（已定案）。M
- P1 ⚙️ **每日宝箱/可变奖励**（每日首签开像素宝箱，封顶随机金币，防赌博感）。M
- P1 ⚙️ **晨间"昨日战报"卡**（昨日收益/连胜/待讨伐 Boss）—— 每日回访钩子。S–M
- P1 ⚙️ **可分享像素成就卡**（里程碑/升级/击杀 → 存图，react-native-view-shot）。S–M
- P1 ⚙️ **任务分类/标签 + 筛选**。M
- P1 ⚙️ **本地提醒**（expo-notifications，鼓励式中文文案，可调语气/时段）。M
- P2 ⚙️ **灵活排程**（每周 N 次 / 隔日）。M
- P2 ⚙️ **属性系统 + 雷达图**（任务绑定属性，主页强弱项）。L
- P2 ⚙️ **装扮/主题皮肤商店**（金币消费的第二去处 / 未来变现）。M–L
- P2 ⚙️ **专注/番茄钟换金币经验**。M
- P2 ⚙️ **i18n 基建 + 英文包**。M
- P2 ⚙️ **CSV 导出 / 备份打磨**。S–M

## 3. 护栏（务必避免的反模式）
1. **不动核心循环语义**：打卡→金币/经验→升级/Boss/提现 的算法与既有产品决策（惩罚去向、撤销窗口、断签规则、长假守卫）一律不改。
2. **正向偏置**：新增机制偏白帽；断签/漏做保持现有惩罚但**文案温柔**，不引入羞辱式压力。
3. **可变奖励封顶**：宝箱/掉落必须有上限与确定性下限，避免赌博观感与经济失衡。
4. **领域改动必 TDD + 版本迁移**：任何新增持久化字段 → 升 persist `version` + `migrate` 补默认（否则旧存档运行时崩）。
5. **zustand 选择器纪律**：不从 selector 返回新数组/对象；空集合用模块级常量兜底。
6. **像素一致性**：新文本 8 倍数字号用 Press Start 2P，正文用 Zpix；新色对齐既有调色板。
7. **每步绿**：每个优化点 commit 前过 `npm test` + `tsc`；UI 项 expo-web 截图/快照验收。原生能力（触感/音效/通知）web 仅验不崩，观感留真机。
