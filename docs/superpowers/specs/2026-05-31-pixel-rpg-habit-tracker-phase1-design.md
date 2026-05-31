# 像素 RPG 习惯打卡 APP — Phase 1 MVP 设计规格

> 状态：已确认，待用户终审 → 进入 writing-plans
> 日期：2026-05-31
> 范围：仅 **Phase 1（MVP 核心循环）**。Phase 2/3 仅作预留，不在本规格实现。
>
> **修订（2026-05-31，第 2 版）**：根据用户反馈，①**Boss 战拉进 Phase 1**（分 3 阶段、设总奖励按比重发放）；②**打卡改为可撤销**（即时打卡 + 同日按单个任务完整回退）。原「打卡不可逆」「Boss 延后」决定已废弃。

本规格是实现计划（plan）的唯一事实来源。源产品规格由用户提供（像素 RPG 习惯打卡 APP 完整设计文档），本文件在其基础上**裁剪到 Phase 1、并把所有结算/撤销语义精确化**。

---

## 1. 已确认的决策（Decision Log）

| 维度 | 决定 | 说明 |
|---|---|---|
| 技术栈 | **Expo（React Native + TypeScript）** | 一套代码产出 iOS/Android；开发期 `expo start --web`（react-native-web）在浏览器预览+截图验收 |
| 状态管理 | **Zustand + `persist` 中间件** | 持久化到 AsyncStorage，单一 JSON blob；启动 rehydrate → 跑 `processRollover` → 再渲染 |
| 导航 | **React Navigation**（bottom-tabs + native-stack) | 固定 **5** Tab，web 下稳定 |
| 惩罚去向 | **扣掉直接消失** | `gold = max(0, gold - penalty)`，永不为负、不回流、无捐赠罐 |
| 打卡留证 | **Phase 1 不做** | 照片/日志留 Phase 2 |
| 初始任务 | **合理占位示例** | APP 内可随时增删改 |
| 经济数值 | **采用源文档第 7 节默认值** | 全部进「设置页」可调（见 §6） |
| 试炼断签里程碑 | **断签后清空该试炼的 `claimedMilestones`** | 重爬可重新领 D1/D3/D7，符合「正向略大于负向」 |
| 长时间未用（>7天） | **连击照常按保护规则断、但全免金币惩罚** | 缺勤日记为 `rest`；试炼仍逐日消耗请假/冻结卡，用尽则归零（不掉金币） |
| **Boss 战** | **拉进 Phase 1**；分 3 阶段，设「总奖励」按 `weights` 比重发放 | 完成关联任务扣血，跨阶段阈值发该段奖励；默认 `weights=[0.2,0.3,0.5]`（后段更重）。见 §7.9 |
| **打卡可逆性** | **即时打卡 + 同日撤销**；撤销针对**单个任务**、**完整回退** | 撤销=改正手滑（金币+经验+全清/里程碑/毕业/Boss 扣血一并精确回退，必要时等级回退）。无前置确认弹窗 |
| **撤销时间窗** ⚠️ | **仅限当天**（跨天的打卡已结算成历史，不可撤）— **请用户终审确认此点** | 跨天撤销需「反结算」，复杂且与「历史不可变」冲突，MVP 不做 |
| Phase 3 | **暂不决定** | Phase 1+2 验收后再议（Boss 已提前，Phase 3 现仅剩随机事件/CRT 主题/云备份） |

---

## 2. 范围：Phase 1 MVP

### In（本规格实现）
- 数据模型 + AsyncStorage 持久化 + `version`/migration 骨架
- `processRollover` 结算引擎（每日惩罚 / 试炼连击 / 周惩罚 + 长时间未用守卫）
- 每日 / 每周任务：增删改 + 打卡 + 金币/经验结算 + 全清奖励（即时发放）
- **打卡撤销**：同日、按单个任务完整回退（含全清/里程碑/毕业/Boss 扣血/等级的精确回退）
- 双货币（Gold/EXP）+ 等级系统 + 顶部常驻状态栏
- 试炼副本：1/3/7/14 里程碑 + 毕业（转入每日任务）
- **Boss 战**：3 阶段、总奖励按比重、关联任务扣血、阶段结算发奖、击杀
- 基础惩罚 + 请假名额/冻结卡保护逻辑
- `ledger`（流水账）与 `history`（每日结果）**从第一天即记录**（可视化留 Phase 2）
- 像素 UI 基础：调色板、像素字体、组件、关键打卡/升级/全清/Boss 动画
- 底部 5 Tab：委托 / 试炼 / 讨伐(Boss) / 商店（仅冻结卡 + 提现）/ 设置（配置编辑 + 导出/导入 JSON + 清空重置）

### Out（明确不做，见 §11）
禁忌任务、统计/热力图页（「数据」Tab）、成就系统、音效、本地通知、打卡留证、角色外观切换、皮肤商店、随机事件/双倍卡、CRT 主题、云同步、**跨天撤销**。

---

## 3. 技术栈与项目结构

- Expo（最新 stable SDK）+ TypeScript（strict）
- 依赖：`zustand`、`@react-navigation/native` + `bottom-tabs` + `native-stack`、`react-native-reanimated`、`@react-native-async-storage/async-storage`、`expo-font`
- 测试：`jest`（`jest-expo`/`ts-jest`），仅针对 `src/domain/` 纯逻辑做 TDD
- 字体：`Press Start 2P`（英文/数字）+ `Zpix`（中文），均带 `sans-serif` 兜底

```
src/
  domain/              # 纯逻辑，零 RN 依赖，可单测（TDD 重点）
    types.ts           # AppState 及全部子类型 + Receipt
    dateUtils.ts       # dateStr / weekKey / daysFrom / daysBetween / isWeekEnd（本地时区）
    economy.ts         # expNeeded / applyExpDelta / addGold / 奖惩计算 / 兑换
    settlement.ts      # processRollover 及子结算
    actions.ts         # checkInDaily/Weekly/Trial、undoCheckIn、buyFreezeCard、cashOut、graduateTrial、applyBossDamageForTask
    initialState.ts    # 默认 config + 占位任务 + 示例 Boss + 版本号
    migrate.ts         # version 迁移骨架
  store/useGameStore.ts   # Zustand + persist；包装 domain 纯函数为 actions；启动跑 processRollover
  ui/
    theme.ts           # 调色板 / 边框 / 阴影 / 间距 token
    components/        # PixelPanel, PixelButton, PixelProgressBar, CoinText, TopStatusBar, QuestCard, TrialCard, BossCard, FlyingCoin, CelebrationOverlay, UndoButton
    screens/           # QuestsScreen, TrialsScreen, BossScreen, ShopScreen, SettingsScreen
    navigation.tsx     # bottom-tabs + 顶部 StatusBar 作为公共 header
  App.tsx
__tests__/             # domain 单测
assets/fonts/          # PressStart2P, Zpix
```

**关键原则**：`src/domain/` 不 import 任何 RN / Zustand / AsyncStorage。所有结算与状态变更是 `(state, ...args, now) => newState` 的纯函数。`now: Date` 由调用方注入，便于测试。

---

## 4. 数据模型（Phase 1）

```typescript
type DateStr = string;  // 'YYYY-MM-DD'（本地时区）
type WeekKey = string;  // 'YYYY-Www' ISO 周，如 '2026-W23'

interface AppState {
  version: number;                 // 当前 = 1
  player: {
    name: string; level: number;
    exp: number;                   // 当前等级内已积累经验
    expTotal: number;              // 历史总经验（统计用；撤销时同步回退）
    gold: number;                  // 可用金币，恒 >= 0
    avatarTier: number;            // 按等级计算并存储（外观切换留 Phase 2）
    lastActiveDate: DateStr | null;
  };
  dailies: Array<{ id; name; gold; exp; icon; doneDate: DateStr | null; archived: boolean }>;
  weeklies: Array<{ id; name; gold; exp; icon; doneWeek: WeekKey | null; archived: boolean }>;
  trials: Array<{
    id; name; icon; startDate: DateStr;
    completedDates: DateStr[]; protectedDates: DateStr[];
    streak: number; claimedMilestones: number[];   // 断签归零时清空（§7.5）
    graduated: boolean;
    milestones: Array<{ day: number; gold: number; exp: number }>;
  }>;
  bosses: Array<{                  // ★ Phase 1 新增
    id; name; icon;
    maxHp: number; hp: number;     // hp 仅由关联任务打卡/撤销改变（不参与 rollover）
    damagePerHit: number;          // 每次关联任务完成造成的伤害
    totalRewardGold: number; totalRewardExp: number;
    weights: [number, number, number];  // 3 阶段比重，和 ≈ 1，默认 [0.2,0.3,0.5]
    linkedTaskIds: string[];       // 关联的 daily/weekly/trial id
    clearedStages: number[];       // 已结算阶段，子集 of [1,2,3]
    defeated: boolean;
  }>;
  inventory: { freezeCards: number };
  restDays: { weekKey: WeekKey; remaining: number };
  config: { /* 见 §6 */ };
  ledger: Array<{
    ts: number; date: DateStr;
    type: 'earn' | 'penalty' | 'purchase' | 'cashout' | 'bonus' | 'undo';  // ★ 新增 'undo'
    amount: number; expAmount?: number; note: string;
  }>;
  history: { [date: DateStr]: { status: 'perfect'|'partial'|'missed'|'rest'; dailiesDone: number; dailiesTotal: number; goldNet: number } };

  // ★ 撤销支持（同日有效）：
  todayReceipts: Receipt[];        // 当天每次打卡的"回执"，跨天由 rollover 清空 → 撤销天然限当天
  dailyPerfect: { date: DateStr; gold: number; exp: number } | null;   // 今日全清奖励发放记录（独立于回执，便于撤销时按集合状态精确回退）
  weeklyPerfect: { week: WeekKey; gold: number; exp: number } | null;

  // 瞬时 UI 信号：
  pendingCelebrations: Array<'levelUp'|'perfectDay'|'perfectWeek'|'graduation'|'bossDefeated'>;  // 队列，UI 逐个播放后清空
  pendingNotice: 'longAbsence' | null;
}

interface Receipt {                // 一次打卡造成的全部可逆变更
  rid: string;
  kind: 'daily' | 'weekly' | 'trial';
  taskId: string;
  date: DateStr;                   // 创建时 == today
  goldDelta: number;               // 本次打卡新增金币之和（任务奖励 + 试炼里程碑 + Boss 阶段奖励；不含全清奖励）
  expDelta: number;                // 同上的经验之和（不含全清奖励）
  claimedMilestones?: number[];    // (trial) 本次打卡领取的里程碑天数
  graduation?: { addedDailyId: string };  // (trial) 本次打卡触发毕业时，记录新建的 daily id
  bossHits?: Array<{ bossId: string; damage: number; clearedStages: number[]; defeated: boolean }>;
}
```

> Phase 1 **不包含** `antis` / `achievements` 字段——Phase 2 通过 `version` + migration 增补。`todayReceipts`/`dailyPerfect`/`weeklyPerfect`/`pending*` 可不持久化或持久化后即清，实现时取其一并在测试中固定行为。

---

## 5. 持久化与版本迁移

- Zustand `persist`：`name:'rpglife-state'`，AsyncStorage 适配器，整个 `AppState` 序列化为一个 JSON。
- 启动：`onRehydrateStorage` 完成后置 `hydrated`；`App.tsx` 在 `hydrated` 前显示加载占位，**之后立刻 `processRollover(state, new Date())`** 再渲染。
- `migrate.ts`：`migrate(persisted, fromVersion) => AppState`，对未知/缺失字段安全默认填充（为 Phase 2 增字段铺路）。`persist` 的 `version`+`migrate` 选项接管。

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

**试炼里程碑默认**：`[{day:1,gold:20,exp:10},{day:3,gold:50,exp:30},{day:7,gold:150,exp:80},{day:14,gold:500,exp:300}]`（D14 含毕业大奖）。
**Boss 默认（新建时）**：`weights=[0.2,0.3,0.5]`、`damagePerHit=20`，`maxHp`/`totalRewardGold`/`totalRewardExp` 由用户填（建议默认 `maxHp=200`、`totalRewardGold=600`、`totalRewardExp=300`）。

**初始占位数据**（`initialState.ts`）：
- player：name `冒险者`，level 1，exp 0，gold 0，avatarTier 0，lastActiveDate null
- dailies：`喝水 8 杯`(10/5)、`运动 30 分钟`(20/10)、`阅读 20 分钟`(15/8)、`23:00 前睡`(15/8)
- weeklies：`大扫除`(80/40)、`复盘本周`(100/50)、`给家人打电话`(60/30)
- trials：1 个示例 `每天背 10 个单词`（startDate=首次启动日，默认里程碑）
- bosses：1 个示例 `读完一本书`（maxHp 200，damagePerHit 20，total 600/300，weights[0.2,0.3,0.5]，linkedTaskIds=[阅读 daily 的 id]）
- inventory.freezeCards：1（欢迎赠送）
- restDays：{ weekKey: 本周, remaining: 1 }；todayReceipts: []；dailyPerfect/weeklyPerfect: null；pendingCelebrations: []

---

## 7. 结算引擎（核心）—— 精确规格

> 全部纯函数。`now: Date` 注入。日期用**设备本地时区**。

### 7.1 dateUtils
- `dateStr(d)` → 本地 `YYYY-MM-DD`
- `weekKey(d)` → ISO 周（周一起始/周日结束）`YYYY-Www`
- `daysFrom(last, today)` → `[last, today)`，**含 last、不含 today**（例：last=6/1,today=6/3 → ['6/1','6/2']）
- `daysBetween(last, today)` → `daysFrom(...).length`
- `isWeekEnd(d)` → 该日是 ISO 周的周日

### 7.2 processRollover(state, now) → state
```
today = dateStr(now); last = state.player.lastActiveDate
if last == null:                          # 首次运行
  state.player.lastActiveDate = today; ensureRestDayQuota(state, weekKey(today)); return state
if today == last: return state            # 同一天

state.todayReceipts = []                   # ★ 跨天 → 清空回执（撤销天然限当天）
gap = daysBetween(last, today); longAbsence = gap > config.longAbsenceThreshold
for D in daysFrom(last, today):
  ensureRestDayQuota(state, weekKey(D))    # 幂等：跨入新周刷新名额
  if not longAbsence: settleDailies(state, D)
  settleTrials(state, D)                    # 始终按正常规则（长假也消耗保护）
  if isWeekEnd(D) and not longAbsence: settleWeeklies(state, D)
  recordHistory(state, D, { forceRest: longAbsence })
ensureRestDayQuota(state, weekKey(today))
if longAbsence: state.pendingNotice = 'longAbsence'
state.player.lastActiveDate = today
return state
```
**关键澄清**：
- 每日/每周「已完成」以 `doneDate===D` / `doneWeek===week` 判断，跨天/跨周由比较**自动失效**，无需清零（不要源文档的 `resetDailyFlags/resetWeeklyFlags`）。保留 `doneDate` 是多日补算正确性的前提。
- `ensureRestDayQuota(state,wk)`：若 `restDays.weekKey!==wk` → `restDays={weekKey:wk, remaining:config.restDaysPerWeek}`；否则不动（幂等）。
- **Bosses 不参与 rollover**（无时间惩罚），仅由实时打卡/撤销改变。

**`recordHistory(state, D, {forceRest})`：**
```
total = dailies.filter(!archived).length
done  = dailies.filter(!archived && doneDate===D).length
goldNet = sum(l.amount for l in ledger if l.date===D)
status = forceRest ? 'rest' : total===0 ? 'rest' : done===total ? 'perfect' : done===0 ? 'missed' : 'partial'
state.history[D] = { status, dailiesDone:done, dailiesTotal:total, goldNet }
```

### 7.3 settleDailies(state, D)
```
incomplete = dailies.filter(d => !d.archived && d.doneDate !== D)
penalty = min( sum(floor(d.gold*config.missedDailyPenaltyRate) for d in incomplete), config.dailyPenaltyCap )
if penalty>0: gold=max(0,gold-penalty); ledger.push({ts,date:D,type:'penalty',amount:-penalty,note:`漏做每日任务 x${incomplete.length}`})
```

### 7.4 settleWeeklies(state, D)   # 仅 isWeekEnd(D) 调用；week=weekKey(D)，D 即该周末
```
week = weekKey(D)
incomplete = weeklies.filter(w => !w.archived && w.doneWeek !== week)
penalty = sum(floor(w.gold*config.weeklyPenaltyRate) for w in incomplete)   # 无封顶
if penalty>0: gold=max(0,gold-penalty); ledger.push({ts,date:D,type:'penalty',amount:-penalty,note:`漏做每周任务 x${incomplete.length}`})
```

### 7.5 settleTrials(state, D) + 连击 / 里程碑 / 毕业
**结算（过去某日 D 未打卡的非毕业试炼）：**
```
for t in trials where !t.graduated:
  if D < t.startDate or t.completedDates.includes(D): continue
  if restDays.remaining>0 and restDays.weekKey==weekKey(D): restDays.remaining--; t.protectedDates.push(D)
  else if inventory.freezeCards>0: inventory.freezeCards--; t.protectedDates.push(D)
  else: t.streak=0; t.claimedMilestones=[]            # 断签清空 → 重爬可重新领
```
- **`computeStreak(t, asOf)`**：令 `set=completedDates∪protectedDates`；取 `set` 中 `<= asOf` 的最新一天 d（无则返回 0）；从 d 向前逐日计数，遇不在 `set` 的日停止；返回计数。（即「以 ≤asOf 的最近活跃日结尾的连续段长度」——同时适配打卡推进与撤销回退。）

**打卡（实时，今天）`checkInTrial(state, trialId, now)`：**
```
today=dateStr(now); t=find; if t.graduated or t.completedDates.includes(today): return
r = newReceipt('trial', trialId, today)
t.completedDates.push(today); t.streak = computeStreak(t, today)
for m in t.milestones sorted by day asc:
  if t.streak>=m.day and !t.claimedMilestones.includes(m.day):
    addGoldR(state,r,m.gold,'bonus',`试炼里程碑 D${m.day}: ${t.name}`); addExpR(state,r,m.exp)
    t.claimedMilestones.push(m.day); (r.claimedMilestones ??= []).push(m.day)
if t.streak>=14 and !t.graduated:
  newDailyId = graduateTrial(state, t, today); r.graduation = { addedDailyId:newDailyId }; pushCelebration('graduation')
applyBossDamageForTask(state, r, trialId, now)        # §7.9
state.todayReceipts.push(r)
```
- `graduateTrial(state,t,today)` → `t.graduated=true`；push 新 daily `{id:new, name:t.name, gold:15, exp:8, icon:t.icon, doneDate:null, archived:false}`；返回新 id。（D14 的 500/300 已由里程碑发放，毕业不重复发金币。）

### 7.6 长时间未用守卫
`gap > config.longAbsenceThreshold`：跳过 `settleDailies/settleWeeklies`（金币惩罚全免）；`settleTrials` 照常（逐日消耗请假/冻结卡，用尽则连击归零+清里程碑，不掉金币）；缺勤日 `recordHistory(forceRest:true)` → `rest`/`goldNet:0`；置 `pendingNotice='longAbsence'`（UI 一次性提示）。

### 7.7 实时打卡（每日/每周）
**`checkInDaily(state, id, now)`**：
```
today=dateStr(now); d=find; if d.archived or d.doneDate===today: return
r=newReceipt('daily',id,today); d.doneDate=today
addGoldR(state,r,d.gold,'earn',`完成每日: ${d.name}`); addExpR(state,r,d.exp)
applyBossDamageForTask(state,r,id,now); state.todayReceipts.push(r)
if allNonArchivedDailiesDone(state,today) and state.dailyPerfect?.date!==today:
  state.player.gold = max(0,gold+config.perfectDailyBonus)
  applyExpDelta(state, +config.perfectDailyBonusExp)
  state.dailyPerfect = {date:today, gold:config.perfectDailyBonus, exp:config.perfectDailyBonusExp}
  ledger.push({ts,date:today,type:'bonus',amount:config.perfectDailyBonus,expAmount:config.perfectDailyBonusExp,note:'每日全清'})
  pushCelebration('perfectDay')
```
**`checkInWeekly(state, id, now)`**：与 daily **完全对称**——建回执、`addGoldR(w.gold)`+`addExpR(w.exp)`、`applyBossDamageForTask(state,r,id,now)`（周任务也可关联 Boss）、push 回执；`doneWeek=weekKey(today)`；全清判定用 `weeklyPerfect.week===thisWeek`，发 `perfectWeekly*`，`pushCelebration('perfectWeek')`。（注：周任务也只在打卡当日可撤，见 §7.8 时间窗说明。）

### 7.8 撤销打卡（同日、按单个任务、完整回退）`undoCheckIn(state, rid)`
```
r = state.todayReceipts.find(rid); if !r: return    # 仅当天回执可撤
# 1) 结构回退
if r.kind=='daily':  find(r.taskId).doneDate=null
if r.kind=='weekly': find(r.taskId).doneWeek=null
if r.kind=='trial':
  t=find(r.taskId); remove r.date from t.completedDates
  for m in (r.claimedMilestones||[]): remove m from t.claimedMilestones
  if r.graduation: t.graduated=false; remove daily where id==r.graduation.addedDailyId
  t.streak = computeStreak(t, today)
# 2) Boss 回退
for h in (r.bossHits||[]):
  b=find(h.bossId); b.hp=min(b.maxHp, b.hp+h.damage)
  for s in h.clearedStages: remove s from b.clearedStages
  if h.defeated: b.defeated=false
# 3) 金币/经验完整回退
state.player.gold = max(0, gold - r.goldDelta); applyExpDelta(state, -r.expDelta)
ledger.push({ts,date:today,type:'undo',amount:-r.goldDelta,expAmount:-r.expDelta,note:`撤销: ${taskName}`})
# 4) 全清奖励重判（撤销破坏了全清则回退）
if r.kind=='daily' and state.dailyPerfect?.date===today and !allNonArchivedDailiesDone(state,today):
  gold=max(0,gold-dailyPerfect.gold); applyExpDelta(state,-dailyPerfect.exp)
  ledger.push({...type:'undo', amount:-dailyPerfect.gold, expAmount:-dailyPerfect.exp, note:'撤销每日全清'}); state.dailyPerfect=null
if r.kind=='weekly' and state.weeklyPerfect?.week===thisWeek and !allNonArchivedWeekliesDone(...): (对称回退)
remove r from state.todayReceipts
```
> UI：仅对「今天打卡且回执仍在 `todayReceipts`」的卡片显示「撤销」。跨天后回执已被 rollover 清空，不可撤（⚠️ 待用户终审）。

### 7.9 Boss 扣血 / 阶段 / 击杀 `applyBossDamageForTask(state, receipt, taskId, now)`
```
for b in bosses where !b.defeated and b.linkedTaskIds.includes(taskId):
  dmg=b.damagePerHit; b.hp=max(0, b.hp-dmg); cleared=[]
  for i in [1,2,3]:
    threshold = b.maxHp * (3-i)/3            # 阶段1 hp<=2/3、阶段2<=1/3、阶段3<=0
    if b.hp<=threshold and !b.clearedStages.includes(i):
      b.clearedStages.push(i); cleared.push(i)
      addGoldR(state,receipt,floor(b.totalRewardGold*b.weights[i-1]),'bonus',`Boss「${b.name}」阶段${i}`)
      addExpR (state,receipt,floor(b.totalRewardExp *b.weights[i-1]))
  defeated=false
  if b.hp<=0 and !b.defeated: b.defeated=true; defeated=true; pushCelebration('bossDefeated')
  (receipt.bossHits ??= []).push({bossId:b.id, damage:dmg, clearedStages:cleared, defeated})
```
- 一次打卡可一次跨过多个阈值（按 i 升序逐个发奖）。`floor` 取整可能使三段和略小于 total（可接受）。
- Boss 仅由实时打卡扣血、由撤销回血；**结算（settle*）不碰 Boss**。

### 7.10 经验/金币基元（economy.ts）
- `expNeeded(level)=config.levelExpBase+(level-1)*config.levelExpStep`（L1→L2=50…）。
- `applyExpDelta(state, delta)`（delta 可负，用于撤销）：
```
exp=player.exp+delta; expTotal=max(0,player.expTotal+delta)
if delta>=0: while exp>=expNeeded(level): exp-=expNeeded(level); level++; pushCelebration('levelUp')
else: while exp<0 and level>1: level--; exp+=expNeeded(level)
      if exp<0: exp=0
player.exp=exp; player.level=level; player.expTotal=expTotal; player.avatarTier=computeAvatarTier(level)
```
- `addGoldR(state, receipt, n, type, note)`：`gold=max(0,gold+n)`；`ledger.push({ts,date:today,type,amount:n,note})`；`receipt.goldDelta+=n`。
- `addExpR(state, receipt, n)`：`applyExpDelta(state,+n)`；`receipt.expDelta+=n`（ledger 的 expAmount 记在对应金币条目上或单列，实现时统一）。
- `computeAvatarTier(level)`：阈值表（如 L1/5/10/20）→ tier 0/1/2/3；Phase 1 仅存储，外观切换 Phase 2。

### 7.11 商店与任务管理
- `buyFreezeCard(state)`：`gold>=freezeCardCost` → `gold-=cost`，`inventory.freezeCards++`，`ledger(type:'purchase',amount:-cost)`。
- `cashOut(state, amount, now)`：要求 `amount>=cashOutThreshold` 且 `<=gold`；`gold-=amount`，`ledger(type:'cashout',amount:-amount,note:`提现 ${amount}金=¥${amount/rate}`)`。UI 须仪式化二次确认。
- 任务/试炼/Boss 增删改：归档而非物理删除（保历史正确）；新建试炼写默认里程碑+startDate=today；新建 Boss 填 maxHp/总奖励/weights/linkedTaskIds（带默认）。

---

## 8. UI / 导航 / 屏幕

- **顶部常驻 StatusBar**：像素头像（按 avatarTier 占位）+ `Lv.N` + 经验条（`exp/expNeeded(level)`）+ 金币（点击跳商店）。
- **底部 5 Tab**：委托 / 试炼 / 讨伐 / 商店 / 设置。
- **委托页（默认首页）**：每日区（含「再完成 X 个解锁全清」进度条）+ 每周区，卷轴卡片可勾选打卡；**已完成卡显示「撤销」**（仅当天）。右上「+」增改任务。
- **试炼页**：进行中副本（连击、下一里程碑进度与金额、今日打卡按钮、当天可撤销）；「开启新试炼」；已毕业进历史区。
- **讨伐页（Boss）**：Boss 卡显示**分 3 段的血条**（已结算阶段高亮）+ 各阶段奖励金额 + 关联任务列表 + 击杀状态；「新建/编辑 Boss」（设 maxHp/总奖励/weights/关联任务/damagePerHit）。Boss 血量随关联任务打卡下降、撤销回升。
- **商店页**：冻结卡（`freezeCardCost`/张，显持有数）+ 提现卡（显金币与可兑 ¥，满 `cashOutThreshold` 可点 → 仪式化确认）。
- **设置页**：config 数值编辑（§6 全部，带校验）+ 导出/导入 JSON（导入校验 version）+ 清空重置（二次确认 → initialState）。

**关键动效（Phase 1，reanimated）**：打卡「叮」+金币飞向顶部计数+「+N」浮字；**撤销**有克制的回退提示；升级全屏「LEVEL UP!」闪光；全清宝箱；Boss 阶段达成/击杀特效；断签「连击碎裂」。`pendingCelebrations` 队列由 `CelebrationOverlay` 逐个消费。音效留 Phase 2。

---

## 9. 像素设计系统（theme.ts）

调色板（源文档第 9 节）：`bg-deep #1a1c2c | bg-panel #2b2f4a | ink #f4f4f4 | gold #f7c948 | exp #5fcde4 | success #6abe30 | danger #d34b4b | accent #ef7d57 | border #0d0e1a`。
- 组件：`2–3px` 黑硬边 + `4px` 硬投影（无模糊/圆角/抗锯齿）。
- 字体：`Press Start 2P`（英文/数字）、`Zpix`（中文），`sans-serif` 兜底。
- 任务=委托卷轴；Boss=像素怪物立绘 + 分段血条；金币堆叠像素图标；经验顶部像素进度条。
- token 化（颜色/边框宽/阴影偏移/间距/字号）便于 Phase 3 加 CRT 主题。

---

## 10. 测试策略（TDD 清单）

仅对 `src/domain/` 做 TDD（Jest，注入固定 `now`）。先写测试再实现：

**dateUtils**：`daysFrom` 边界（含 last 不含 today、跨月/跨年）；`weekKey` ISO 周；`isWeekEnd`。
**settleDailies/Weeklies**：全完成→0；部分→按率 floor；超上限→封顶；不为负；ledger 负 amount；周末触发。
**processRollover**：首次/同日/隔1日/隔多日逐日顺序；跨周触发周结算+名额刷新；`doneDate` 自动失效；跨天清空 `todayReceipts`。
**试炼**：打卡推进 streak；1/3/7/14 发里程碑不重复；`computeStreak`（连续/含保护/遇缺口停止/取 ≤asOf 最近活跃日）；断签未保护→streak=0 且清 `claimedMilestones`→重爬可重新领；请假优先于冻结卡；用尽才断；满 14 毕业（转 daily + 信号，D14 不重复）。
**长时间未用**：gap>7 → 跳过金币惩罚、缺勤记 rest、trials 仍消耗保护、置 notice。
**经济**：`expNeeded`；`applyExpDelta` 正向连环升级 / 负向连环降级且 floor 于 L1/0；`addGold` 不为负；`cashOut`/`buyFreezeCard` 校验。
**全清**：点完最后一个即时发且只发一次；补算过去日不发全清。
**Boss**：关联任务打卡扣血；跨 1/2/3 阶段阈值发对应比重奖励（含一次跨多段）；hp<=0 击杀 + 信号；非关联任务不扣血；已击杀不再扣血。
**撤销（重点）**：同日撤销单个 daily/weekly/trial → 金币+经验完整回退；撤销破坏全清→回退全清奖励；撤销 trial → 移除 completedDate、un-claim 里程碑、streak 重算；撤销触发过毕业的 trial → 取消毕业+移除新建 daily；撤销造成过 Boss 阶段/击杀的打卡 → 回血+un-clear 阶段+取消击杀+回退阶段奖励；撤销导致等级回退；跨天后回执清空不可撤；连续「打卡→撤销→再打卡」状态自洽（无金币/经验泄漏或重复）。

**UI 验收**：每 Phase 末 `expo start --web` 截图核心流程（打卡掉金币、撤销回退、升级、全清宝箱、试炼里程碑/毕业、Boss 扣血与阶段/击杀、提现确认、设置重置）。

---

## 11. 明确不做（Out of Scope，Phase 1）

禁忌任务（antis）、统计/热力图「数据」Tab、成就系统、音效、本地通知、打卡留证、角色外观切换、皮肤商店、随机事件/双倍卡、CRT 主题、云同步/登录、**跨天撤销**。数据模型用 `version`+migration 预留。

---

## 12. 后续 Phase 预留（仅备忘，不实现）

- **Phase 2**：禁忌任务、热力图日历 + 统计页、成就、音效（expo-av）、本地通知（expo-notifications）、外观随等级解锁、皮肤商店、打卡留证。
- **Phase 3**：随机事件 / 双倍卡、CRT 主题、云备份增强。（Boss 已提前至 Phase 1。）

---

## 13. 验收标准（Phase 1 Done 的定义）

1. `__tests__` 全绿，覆盖 §10 全部用例（含 Boss 与撤销）。
2. `expo start --web` 可启动，5 个 Tab 可导航，顶部状态栏实时更新。
3. 核心循环手感可验：打卡→掉金币/经验动画→**撤销可完整回退**→（攒够经验）升级动画→每日全清宝箱→试炼推进里程碑与毕业→**Boss 关联任务扣血、跨阶段发奖、击杀**→商店买冻结卡与提现确认→设置改数值即时生效 + 导出/导入/重置可用。
4. 关闭重开状态保持；改设备日期模拟跨天/跨周/长时间未用，结算行为符合 §7；跨天后旧打卡不可撤。
