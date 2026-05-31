# 像素 RPG 习惯打卡 APP — Phase 1 MVP 设计规格

> 状态：已确认，待用户终审 → 进入 writing-plans
> 日期：2026-05-31
> 范围：仅 **Phase 1（MVP 核心循环）**。Phase 2/3 仅作预留，不在本规格实现。

本规格是实现计划（plan）的唯一事实来源。源产品规格由用户提供（像素 RPG 习惯打卡 APP 完整设计文档），本文件在其基础上**裁剪到 Phase 1、并把所有结算语义精确化**。

---

## 1. 已确认的决策（Decision Log）

| 维度 | 决定 | 说明 |
|---|---|---|
| 技术栈 | **Expo（React Native + TypeScript）** | 一套代码产出 iOS/Android；开发期 `expo start --web`（react-native-web）在浏览器预览+截图验收 |
| 状态管理 | **Zustand + `persist` 中间件** | 持久化到 AsyncStorage，单一 JSON blob；启动 rehydrate → 跑 `processRollover` → 再渲染 |
| 导航 | **React Navigation**（bottom-tabs + native-stack) | 固定 4 Tab，web 下稳定 |
| 惩罚去向 | **扣掉直接消失** | `gold = max(0, gold - penalty)`，永不为负、不回流、无捐赠罐 |
| 打卡留证 | **Phase 1 不做** | 照片/日志留 Phase 2 |
| 初始任务 | **合理占位示例** | APP 内可随时增删改 |
| 经济数值 | **采用源文档第 7 节默认值** | 全部进「设置页」可调（见 §6） |
| 试炼断签里程碑 | **断签后清空该试炼的 `claimedMilestones`** | 重爬可重新领 D1/D3/D7，符合「正向略大于负向」 |
| 长时间未用（>7天） | **连击照常按保护规则断、但全免金币惩罚** | 缺勤日记为 `rest`；试炼仍逐日消耗请假/冻结卡，用尽则归零（不掉金币） |
| 打卡可逆性 | **打卡一律不可逆（一次性）** | 因「EXP 只增不减」是硬原则，撤销会与之冲突；避免反向扣减/重复发奖的复杂度 |
| Phase 3 | **暂不决定** | Phase 1+2 验收后再议 |

---

## 2. 范围：Phase 1 MVP

### In（本规格实现）
- 数据模型 + AsyncStorage 持久化 + `version`/migration 骨架
- `processRollover` 结算引擎（每日惩罚 6.1 / 试炼 6.3 / 周惩罚 6.4 + 长时间未用守卫）
- 每日任务、每周任务：增删改 + 打卡 + 金币/经验结算 + 全清奖励（Perfect Day / Perfect Week，即时发放）
- 双货币（Gold/EXP）+ 等级系统 + 顶部常驻状态栏
- 试炼副本：1/3/7/14 里程碑 + 毕业（转入每日任务）
- 基础惩罚 + 请假名额/冻结卡保护逻辑
- `ledger`（流水账）与 `history`（每日结果）**从第一天即记录**（可视化留 Phase 2）
- 像素 UI 基础：调色板、像素字体、组件、关键打卡/升级/全清动画
- 底部 4 Tab：委托 / 试炼 / 商店（仅冻结卡 + 提现）/ 设置（配置编辑 + 导出/导入 JSON + 清空重置）

### Out（明确不做，见 §11）
禁忌任务、Boss 战、统计/热力图页（「数据」Tab）、成就系统、音效、本地通知、打卡留证、角色外观切换、皮肤商店、随机事件、双倍卡、CRT 主题、云同步。

---

## 3. 技术栈与项目结构

- Expo（最新 stable SDK）+ TypeScript（strict）
- 依赖：`zustand`、`@react-navigation/native` + `@react-navigation/bottom-tabs` + `@react-navigation/native-stack`、`react-native-reanimated`、`@react-native-async-storage/async-storage`、`expo-font`
- 测试：`jest` + `ts-jest`（或 `jest-expo`），仅针对 `src/domain/` 纯逻辑做 TDD
- 字体：`Press Start 2P`（英文/数字）+ `Zpix`（中文），均带 `sans-serif` 兜底，加载失败不崩

```
src/
  domain/              # 纯逻辑，零 RN 依赖，可单测（TDD 重点）
    types.ts           # AppState 及全部子类型
    dateUtils.ts       # dateStr / weekKey / daysFrom / daysBetween / isWeekEnd（本地时区）
    economy.ts         # expNeeded / addExp / addGold / 奖惩计算 / 兑换
    settlement.ts      # processRollover 及子结算（核心）
    actions.ts         # checkInDaily/Weekly/Trial、buyFreezeCard、cashOut、graduateTrial（纯函数 (state,...) => state）
    initialState.ts    # 默认 config + 占位任务 + 版本号
    migrate.ts         # version 迁移骨架
  store/
    useGameStore.ts    # Zustand + persist；包装 domain 纯函数为 actions；启动跑 processRollover
  ui/
    theme.ts           # 调色板 / 边框 / 阴影 / 间距 token
    components/        # PixelPanel, PixelButton, PixelProgressBar, CoinText, TopStatusBar, QuestCard, TrialCard, FlyingCoin, CelebrationOverlay
    screens/           # QuestsScreen, TrialsScreen, ShopScreen, SettingsScreen
    navigation.tsx     # bottom-tabs + 顶部 StatusBar 作为公共 header
  App.tsx
__tests__/             # domain 单测
assets/fonts/          # PressStart2P, Zpix
```

**关键原则**：`src/domain/` 不 import 任何 RN / Zustand / AsyncStorage。所有结算与状态变更是 `(state, ...args, now) => newState` 的纯函数（不可变更新或受控 mutate-then-return），store 只负责调用它们 + 持久化 + 触发 UI。`now: Date` 由调用方注入，便于测试。

---

## 4. 数据模型（Phase 1）

```typescript
type DateStr = string;  // 'YYYY-MM-DD'（本地时区）
type WeekKey = string;  // 'YYYY-Www' ISO 周，如 '2026-W23'

interface AppState {
  version: number;                 // 当前 = 1，用于 migration
  player: {
    name: string;
    level: number;
    exp: number;                   // 当前等级内已积累经验
    expTotal: number;              // 历史总经验（统计用）
    gold: number;                  // 可用金币，恒 >= 0
    avatarTier: number;            // 外观档位（Phase 1 仅按等级计算并存储，切换外观留 Phase 2）
    lastActiveDate: DateStr | null;
  };
  dailies: Array<{
    id: string; name: string; gold: number; exp: number; icon: string;
    doneDate: DateStr | null;      // === today 视为今日已完成
    archived: boolean;
  }>;
  weeklies: Array<{
    id: string; name: string; gold: number; exp: number; icon: string;
    doneWeek: WeekKey | null;      // === 本周 视为本周已完成
    archived: boolean;
  }>;
  trials: Array<{
    id: string; name: string; icon: string;
    startDate: DateStr;
    completedDates: DateStr[];     // 实际打卡日
    protectedDates: DateStr[];     // 被请假/冻结卡保护的日
    streak: number;                // 当前连续天数（由 completedDates ∪ protectedDates 推导）
    claimedMilestones: number[];   // 已领里程碑天数；断签归零时清空（见 §7.5）
    graduated: boolean;
    milestones: Array<{ day: number; gold: number; exp: number }>;
  }>;
  inventory: { freezeCards: number };
  restDays: { weekKey: WeekKey; remaining: number };
  config: {
    goldToYuanRate: number;
    perfectDailyBonus: number; perfectDailyBonusExp: number;
    perfectWeeklyBonus: number; perfectWeeklyBonusExp: number;
    missedDailyPenaltyRate: number; dailyPenaltyCap: number;
    weeklyPenaltyRate: number;
    freezeCardCost: number;
    cashOutThreshold: number;
    restDaysPerWeek: number;
    longAbsenceThreshold: number;  // 天数，> 此值触发长时间未用守卫
    levelExpBase: number;          // 升级曲线 base（默认 50）
    levelExpStep: number;          // 升级曲线 step（默认 50）
  };
  ledger: Array<{
    ts: number; date: DateStr;
    type: 'earn' | 'penalty' | 'purchase' | 'cashout' | 'bonus';
    amount: number;                // 金币变动，正/负（penalty/purchase/cashout 为负）
    expAmount?: number;
    note: string;
  }>;
  history: {
    [date: DateStr]: {
      status: 'perfect' | 'partial' | 'missed' | 'rest';
      dailiesDone: number; dailiesTotal: number;
      goldNet: number;             // 当日净金币（由 ledger 该日求和）
    };
  };
  // 瞬时 UI 信号（不必持久化，或持久化后消费即清）：
  pendingCelebration?: 'levelUp' | 'perfectDay' | 'perfectWeek' | 'graduation' | null;
  pendingNotice?: 'longAbsence' | null;
}
```

> Phase 1 **不包含** `antis` / `bosses` / `achievements` 字段——Phase 2/3 通过 `version` + migration 增补，避免在 MVP 里建半成品。

---

## 5. 持久化与版本迁移

- Zustand `persist`：`name: 'rpglife-state'`，`storage` 用 AsyncStorage 适配器，整个 `AppState` 序列化为一个 JSON。
- 启动流程：persist `onRehydrateStorage` 完成后，store 暴露 `hydrated` 标志；`App.tsx` 在 `hydrated === true` 前显示加载占位，**之后立刻调用一次 `processRollover(state, new Date())`** 再渲染主界面。
- `migrate.ts`：`migrate(persisted, fromVersion) => AppState`。Phase 1 仅 v1，迁移函数对未知字段做安全默认填充（为 Phase 2 增字段铺路）。`persist` 的 `version` + `migrate` 选项接管。
- `pendingCelebration` / `pendingNotice` 可不持久化（放在 `partialize` 排除），或持久化后由 UI 消费即清空——二者皆可，实现时取其一并在测试中固定行为。

---

## 6. 经济数值与默认配置（源文档第 7 节，全部进设置页可调）

| config 字段 | 默认值 |
|---|---|
| `goldToYuanRate` | 100（100 金币 = ¥1） |
| `perfectDailyBonus` / `perfectDailyBonusExp` | 50 / 20 |
| `perfectWeeklyBonus` / `perfectWeeklyBonusExp` | 200 / 100 |
| `missedDailyPenaltyRate` | 0.5 |
| `dailyPenaltyCap` | 100 |
| `weeklyPenaltyRate` | 0.5 |
| `freezeCardCost` | 100 |
| `cashOutThreshold` | 1000（= ¥10） |
| `restDaysPerWeek` | 1 |
| `longAbsenceThreshold` | 7 |
| `levelExpBase` / `levelExpStep` | 50 / 50 |

**试炼里程碑默认**（新建试炼时写入）：`[{day:1,gold:20,exp:10},{day:3,gold:50,exp:30},{day:7,gold:150,exp:80},{day:14,gold:500,exp:300}]`（D14 含毕业大奖）。

**初始占位数据**（`initialState.ts`）：
- player：name `冒险者`，level 1，exp 0，gold 0，avatarTier 0，lastActiveDate null
- dailies：`喝水 8 杯`(10/5)、`运动 30 分钟`(20/10)、`阅读 20 分钟`(15/8)、`23:00 前睡`(15/8)
- weeklies：`大扫除`(80/40)、`复盘本周`(100/50)、`给家人打电话`(60/30)
- trials：1 个示例 `每天背 10 个单词`（startDate = 首次启动日，默认里程碑）
- inventory.freezeCards：1（欢迎赠送，可在设置重置后归零）
- restDays：{ weekKey: 本周, remaining: 1 }

---

## 7. 结算引擎（核心）—— 精确规格

> 全部为纯函数。`now: Date` 注入。所有日期用**设备本地时区**。

### 7.1 dateUtils
- `dateStr(d: Date): DateStr` → 本地 `YYYY-MM-DD`
- `weekKey(d: Date): WeekKey` → ISO 周（周一起始，周日结束），`YYYY-Www`
- `daysFrom(last: DateStr, today: DateStr): DateStr[]` → `[last, today)`，**含 last、不含 today**（例：last=6/1,today=6/3 → ['6/1','6/2']）
- `daysBetween(last: DateStr, today: DateStr): number` → `daysFrom(...).length`（= today−last 的天数）
- `isWeekEnd(d: DateStr): boolean` → 该日是 ISO 周的周日

### 7.2 processRollover(state, now) → state
```
today = dateStr(now)
last  = state.player.lastActiveDate
if last == null:                          # 首次运行
  state.player.lastActiveDate = today
  ensureRestDayQuota(state, weekKey(today))
  return state
if today == last:                         # 同一天
  return state

gap = daysBetween(last, today)
longAbsence = gap > config.longAbsenceThreshold

for D in daysFrom(last, today):           # 逐个"已结束"的日子
  ensureRestDayQuota(state, weekKey(D))   # 幂等：跨入新周时刷新名额（保证每个被结算的周有独立名额）
  if not longAbsence:
    settleDailies(state, D)               # §7.3 金币惩罚
  settleTrials(state, D)                   # §7.5 连击保护/归零（始终按正常规则；长假也消耗保护）
  if isWeekEnd(D) and not longAbsence:
    settleWeeklies(state, D)               # §7.4（内部 week = weekKey(D)）
  recordHistory(state, D, { forceRest: longAbsence })

ensureRestDayQuota(state, weekKey(today)) # 今天所属周的名额就位
if longAbsence: state.pendingNotice = 'longAbsence'
state.player.lastActiveDate = today
return state
```
**关键澄清**：
- 每日/每周「已完成」均以 `doneDate===D` / `doneWeek===week` 判断，跨天/跨周**由比较自动失效**，无需清零标志（源文档的 `resetDailyFlags/resetWeeklyFlags` 在本设计中不需要）。保留 `doneDate` 是多日补算正确性的前提。
- `ensureRestDayQuota(state, wk)`：若 `restDays.weekKey !== wk` → `restDays = { weekKey: wk, remaining: config.restDaysPerWeek }`；否则不动（幂等）。

**`recordHistory(state, D, { forceRest })`：**
```
total   = dailies.filter(d => !d.archived).length
done    = dailies.filter(d => !d.archived && d.doneDate === D).length
goldNet = sum(l.amount for l in ledger if l.date === D)        # 该日净金币（含惩罚负值）
status  = forceRest        ? 'rest'
        : total === 0      ? 'rest'        # 无每日任务，视为休息日
        : done === total   ? 'perfect'
        : done === 0       ? 'missed'
        :                    'partial'
state.history[D] = { status, dailiesDone: done, dailiesTotal: total, goldNet }
```

### 7.3 settleDailies(state, D)
```
incomplete = dailies.filter(d => !d.archived && d.doneDate !== D)
penalty = sum( floor(d.gold * config.missedDailyPenaltyRate) for d in incomplete )
penalty = min(penalty, config.dailyPenaltyCap)
if penalty > 0:
  state.player.gold = max(0, gold - penalty)
  ledger.push({ ts, date: D, type:'penalty', amount: -penalty, note:`漏做每日任务 x${incomplete.length}` })
```

### 7.4 settleWeeklies(state, D)   # 仅在 isWeekEnd(D) 时调用；week = weekKey(D)
```
week = weekKey(D)
incomplete = weeklies.filter(w => !w.archived && w.doneWeek !== week)
penalty = sum( floor(w.gold * config.weeklyPenaltyRate) for w in incomplete )   # 无封顶
if penalty > 0:
  state.player.gold = max(0, gold - penalty)
  ledger.push({ ts, date: D, type:'penalty', amount: -penalty, note:`漏做每周任务 x${incomplete.length}` })
# 说明：settleWeeklies 只在 isWeekEnd(D) 时被调用，故 D 即该周最后一天，直接用作 ledger.date。
```

### 7.5 settleTrials(state, D) + 连击 / 里程碑 / 毕业
**结算（针对过去某日 D 未打卡的非毕业试炼）：**
```
for t in trials where !t.graduated:
  if D < t.startDate: continue
  if t.completedDates.includes(D): continue          # 当天已打卡，连击在打卡时已处理
  # 未打卡 → 逐级保护
  if restDays.remaining > 0 and restDays.weekKey == weekKey(D):
    restDays.remaining -= 1; t.protectedDates.push(D)
  else if inventory.freezeCards > 0:
    inventory.freezeCards -= 1; t.protectedDates.push(D)
  else:
    t.streak = 0
    t.claimedMilestones = []                          # 断签清空 → 重爬可重新领（已确认）
```
**打卡（实时，今天，一次性不可逆）`checkInTrial(state, trialId, now)`：**
```
today = dateStr(now); t = find(trialId)
if t.graduated or t.completedDates.includes(today): return
t.completedDates.push(today)
t.streak = computeStreak(t, today)                    # 见下
for m in t.milestones sorted by day asc:
  if t.streak >= m.day and !t.claimedMilestones.includes(m.day):
    addGold(state, m.gold, 'bonus', `试炼里程碑 D${m.day}: ${t.name}`)
    addExp(state, m.exp)
    t.claimedMilestones.push(m.day)
if t.streak >= 14 and !t.graduated:
  graduateTrial(state, t, today)
```
- `computeStreak(t, asOf)`：令 `set = completedDates ∪ protectedDates`；从 `asOf` 向前逐日，只要在 `set` 中就计数 +1 并前移一天，遇到不在 `set` 的日停止；返回计数。（即「以 asOf 结尾的最长连续段长度」。）
- `graduateTrial(state, t, today)`：`t.graduated = true`；把该习惯**转入 dailies**（push `{ id:new, name:t.name, gold:15, exp:8, icon:t.icon, doneDate:null, archived:false }`）；`state.pendingCelebration = 'graduation'`。（D14 的 500/300 已由上面的里程碑发放，graduation 不重复发金币。）

### 7.6 长时间未用守卫
`gap > config.longAbsenceThreshold` 时（见 §7.2）：
- **跳过 `settleDailies` 与 `settleWeeklies`**（金币惩罚全免）。
- `settleTrials` 照常运行（逐日消耗请假/冻结卡，用尽则连击归零、清空里程碑——不掉金币）。
- 每个缺勤日 `recordHistory(..., forceRest:true)` → `status:'rest'`、`goldNet:0`。
- 设 `state.pendingNotice = 'longAbsence'`，UI 显示一次性提示「检测到长时间未使用，已暂停期间金币惩罚」。

### 7.7 实时操作（纯函数，注入 now）
- `checkInDaily(state, id, now)`：若 `archived || doneDate===today` 则 return；否则 `doneDate=today`，`addGold(d.gold,'earn',...)`，`addExp(d.exp)`；**全清判定**：若全部非归档 dailies 均 `doneDate===today` → `addGold(perfectDailyBonus,'bonus','每日全清')` + `addExp(perfectDailyBonusExp)` + `pendingCelebration='perfectDay'`。
- `checkInWeekly(state, id, now)`：同理，`doneWeek=weekKey(today)`；全清 → `perfectWeeklyBonus`/`Exp` + `pendingCelebration='perfectWeek'`。
- `buyFreezeCard(state)`：`gold >= freezeCardCost` 才行；`gold -= cost`，`inventory.freezeCards += 1`，`ledger.push(type:'purchase', amount:-cost, note:'购买冻结卡')`。
- `cashOut(state, amount, now)`：要求 `amount >= cashOutThreshold` 且 `amount <= gold`；`gold -= amount`，`ledger.push(type:'cashout', amount:-amount, note:`提现 ${amount}金 = ¥${amount/goldToYuanRate}`)`。UI 须仪式化二次确认。
- 任务增删改：`addDaily/editDaily/archiveDaily`、`addWeekly/...`、`addTrial`（写入默认 milestones、startDate=today）。归档而非物理删除，保留历史正确性。

### 7.8 经验与升级（economy.ts）
- `expNeeded(level) = config.levelExpBase + (level-1) * config.levelExpStep`（默认 L1→L2=50，L2→L3=100…）。
- `addExp(state, n)`：`exp += n; expTotal += n;` `while exp >= expNeeded(level): exp -= expNeeded(level); level += 1; pendingCelebration='levelUp';` 然后 `avatarTier = computeAvatarTier(level)`（Phase 1 仅计算存储；阈值表如 L1/L5/L10/L20，外观切换 Phase 2）。
- `addGold(state, n, type, note)`：`gold = max(0, gold + n)`；`ledger.push({ts, date:today, type, amount:n, note})`。

**多升级触发**：单次 `addExp` 可能连升多级；`pendingCelebration='levelUp'` 取「本次至少升一级」即可（UI 播放一次升级动画；多级合并展示当前等级）。

---

## 8. UI / 导航 / 屏幕

- **顶部常驻 StatusBar**（所有 Tab 可见）：像素头像（按 avatarTier 占位）+ `Lv.N` + 经验条（`exp/expNeeded(level)`）+ 金币数（点击跳商店）。
- **底部 4 Tab**：委托 / 试炼 / 商店 / 设置。
- **委托页（默认首页）**：
  - 每日区：卷轴卡片列表，未完成可勾选打卡；顶部「再完成 X 个解锁全清奖励」进度条。
  - 每周区：同上，显示本周完成状态。
  - 右上「+」新增任务；卡片长按/侧滑进入编辑/归档。
- **试炼页**：进行中副本卡（连击天数、下一里程碑进度与金额、今日是否已打卡的打卡按钮）；「开启新试炼」入口；已毕业的进底部历史区（只读）。
- **商店页**：冻结卡（`freezeCardCost` 金币/张，显示持有数）；提现卡片（显示当前金币与可兑换 ¥，满 `cashOutThreshold` 才可点，点击弹仪式化确认）。
- **设置页**：config 数值编辑（§6 全部，带输入校验）；导出 JSON（拷贝/分享字符串）/ 导入 JSON（校验 version 后替换状态）；清空重置（二次确认 → 回到 initialState）。

**关键动效（Phase 1，reanimated）**：
- 打卡：卡片闪一下 + 金币像素从卡片飞向顶部金币计数（`FlyingCoin`）+「+30」浮字弹出。
- 升级：全屏闪光 +「LEVEL UP!」像素大字（`CelebrationOverlay` 消费 `pendingCelebration='levelUp'`）。
- 全清：宝箱打开动画（`perfectDay`/`perfectWeek`）。
- 断签：试炼卡上克制的「连击碎裂」提示。
- 音效留 Phase 2。

---

## 9. 像素设计系统（theme.ts）

调色板（源文档第 9 节）：
```
bg-deep #1a1c2c | bg-panel #2b2f4a | ink #f4f4f4 | gold #f7c948 | exp #5fcde4
success #6abe30 | danger #d34b4b | accent #ef7d57 | border #0d0e1a
```
- 组件：`2–3px` 黑色硬边框 + `4px` 硬投影（无模糊、无圆角、无抗锯齿）。
- 字体：`Press Start 2P`（英文/数字）、`Zpix`（中文），`sans-serif` 兜底。
- 任务项 = 委托卷轴样式；金币用堆叠金币像素图标；经验用顶部像素进度条。
- token 化：颜色、边框宽、阴影偏移、间距、字号统一从 `theme.ts` 取，便于 Phase 3 加 CRT 主题。

---

## 10. 测试策略（TDD 清单）

仅对 `src/domain/` 做 TDD（Jest，注入固定 `now`，不碰 RN/存储）。先写测试再实现：

**dateUtils**：`daysFrom` 边界（含 last 不含 today、跨月、跨年）；`weekKey` ISO 周（年初/年末跨周）；`isWeekEnd` 周日判定。
**settleDailies**：全完成→0 惩罚；部分漏做→按率 floor 求和；超上限→封顶 100；金币不足→`max(0,…)` 不为负；ledger 记一条负 amount。
**settleWeeklies**：周末触发；漏做按率扣；不为负。
**processRollover**：首次运行只置 lastActiveDate；同日 no-op；隔 1 日单次结算；隔多日逐日结算且顺序正确；跨周触发周结算 + 名额刷新；`doneDate` 自动失效不需清零。
**试炼**：打卡推进 streak；到 1/3/7/14 发对应里程碑且不重复；`computeStreak` 连续/含保护日/遇缺口停止；断签未保护→streak=0 且 `claimedMilestones` 清空→重爬可重新领；请假名额优先于冻结卡；名额/卡用尽才断；满 14 毕业（转 dailies + graduation 信号，D14 不重复发）。
**长时间未用**：gap>7 → 跳过金币惩罚、缺勤日记 rest、trials 仍消耗保护、置 `pendingNotice`。
**经济**：`expNeeded` 曲线；`addExp` 连环升级进位；`addGold` 不为负 + ledger；`cashOut` 门槛/上限校验；`buyFreezeCard` 余额校验。
**Perfect**：点完最后一个每日/周任务即时发全清奖励且只发一次；补算过去日不发全清（只惩罚）。

**UI 验收**：每 Phase 末用 `expo start --web` 跑浏览器，截图核心流程（打卡掉金币、升级、全清宝箱、试炼里程碑、提现确认、设置重置）供用户验收。

---

## 11. 明确不做（Out of Scope，Phase 1）

禁忌任务（antis）、Boss 战、统计/热力图「数据」Tab、成就系统、音效、本地通知、打卡留证（照片/日志）、角色外观切换、皮肤商店、随机事件/双倍卡、CRT 单色主题、云同步/登录。数据模型用 `version` + migration 预留，Phase 2/3 增补。

---

## 12. 后续 Phase 预留（仅备忘，不实现）

- **Phase 2**：禁忌任务、热力图日历 + 统计页、成就、音效（expo-av）、本地通知（expo-notifications）、外观随等级解锁、皮肤商店、打卡留证。
- **Phase 3**：Boss 战 / 大目标、随机事件、CRT 主题、云备份增强。

---

## 13. 验收标准（Phase 1 Done 的定义）

1. `__tests__` 全绿，覆盖 §10 所列引擎用例。
2. `expo start --web` 可启动，4 个 Tab 可导航，顶部状态栏实时更新。
3. 核心循环手感可验：打卡→掉金币/经验动画→（攒够经验）升级动画→每日全清宝箱→试炼打卡推进里程碑与毕业→商店买冻结卡与提现确认→设置改数值即时生效 + 导出/导入/重置可用。
4. 关闭重开 APP 状态保持；改设备日期模拟跨天/跨周/长时间未用，结算行为符合 §7。
