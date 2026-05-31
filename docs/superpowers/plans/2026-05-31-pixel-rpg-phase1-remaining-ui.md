# Phase 1 — 剩余 UI（试炼/讨伐/商店/设置 + 字体 + 动画）Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 Phase 1 剩余 UI——先修正领域模型（给 `Trial`/`Boss` 加 `archived` 软归档并让结算跳过），再建试炼/讨伐(Boss)/商店/设置四屏、加载像素字体、用 reanimated 实现庆祝动画与打卡浮字，完成「可玩闭环 + 仪式感」的 Phase 1 验收。

**Architecture:** 领域层（`src/domain/`，纯函数、TDD）先补 `archived` 字段与结算跳过逻辑；`src/store/gameActions.ts` 把 `archiveTrial` 改软归档并补 `archiveBoss`/`editTrial`/`editBoss`/`addBoss(weights)`。UI 层在已有 `theme`/`Pixel`/`TopStatusBar`/`QuestsScreen` 基础上扩展：新增字体加载（`expo-font` + Press Start 2P + Zpix）、共享像素组件（`PixelText`/`PixelTextInput`/`PixelModal`/`ConfirmDialog`/`SectionTitle`）、四个功能屏、`CelebrationOverlay`（消费 `pendingCelebrations`）+ 长假提示（消费 `pendingNotice`）、以及打卡 reanimated 浮字。

**Tech Stack:** Expo SDK 56 / React Native 0.85 / React 19 / TypeScript（strict）；zustand + immer + persist；react-native-reanimated 4（babel 插件 `react-native-worklets/plugin` 已就绪）；expo-font + `@expo-google-fonts/press-start-2p` + 本地 `Zpix.ttf`。测试：领域/store 纯逻辑走 Jest（ts-jest，仅 `*.test.ts`）；UI 走 `npm run web` 运行时 + 截图验收。

**Spec:** `docs/superpowers/specs/2026-05-31-pixel-rpg-habit-tracker-phase1-design.md`（本计划实现其 §7.11 软归档/编辑、§8 试炼/讨伐/商店/设置四屏与动效、§9 像素字体、撤销/全清/庆祝信号消费）。

**Prereq:** Plan 1 + Plan 2 已合并入 `main`（`npm test` 72 绿、`npx tsc --noEmit` clean、expo-web 闭环已验）。

---

## 工作方式与约束（执行前必读）

- **分支**：本计划在 `main` 的最新状态上开特性分支执行（如 `feat/phase1-plan3-ui`），**不要直接在 `main` 提交实现**。每个 Task 末尾 commit。全部完成 + 验收后用 `superpowers:finishing-a-development-branch` 合并回 `main`。
- **领域逻辑 → Jest TDD**：先写失败测试再实现。`npm test` 只跑 `**/__tests__/**/*.test.ts`（ts-jest，`tsconfig.jest.json`，仅 `.ts`）。UI（`.tsx`）不做单测。
- **类型检查**：`npx tsc --noEmit` 用项目 `tsconfig.json`（继承 `expo/tsconfig.base`，覆盖 `.ts`+`.tsx`，已 exclude `__tests__`）。
- **⚠️ zustand 选择器陷阱（MEMORY: `zustand-selector-stability`）**：**绝不**从 `useGameStore` 选择器返回新数组/对象（`.filter`/`.map`/对象字面量）→ React #185 无限循环白屏，`tsc`/Jest 抓不到，只有 expo-web 运行时暴露。**规则：选 stable ref，在 render body 里派生**：`const dailies = useGameStore((s) => s.dailies).filter(...)`。每个新屏都照此写。
- **npm 缓存（MEMORY: `npm-cache-workaround`）**：`~/.npm` 损坏；项目根 `.npmrc`（gitignore）已指向 `/tmp/rpglife-npm-cache`。若 `npm install` 报 EACCES，确认 `.npmrc` 存在或加 `--cache /tmp/rpglife-npm-cache`。**不要 sudo**。
- **每屏建好后 expo-web 截图验收**（preview 工具或 `npm run web`），核对功能 + 无红屏 + 控制台无 React #185。
- **AGENTS.md**：写任何 Expo API 前先核对 https://docs.expo.dev/versions/v56.0.0/ 。本计划用到的 `expo-font` `useFonts` 签名已核对（返回 `[loaded, error]`，值用 `require()` 或 google-fonts 模块）。

---

## 文件结构（本计划新增/修改）

```
src/domain/
  types.ts            # 修改：Trial/Boss 加 archived: boolean
  trials.ts           # 修改：settleTrials 跳过 archived
  actions.ts          # 修改：applyBossDamageForTask 跳过 archived
  initialState.ts     # 修改：示例 trial/boss 补 archived: false
src/store/
  gameActions.ts      # 修改：archiveTrial 软归档；+ archiveBoss/editTrial/editBoss；addBoss 支持 weights
src/ui/
  theme.ts            # 修改：加 font token
  fonts.ts            # 新增：useAppFonts()（expo-font）
  components/
    Pixel.tsx         # 修改：+ PixelText/PixelTextInput/PixelModal/ConfirmDialog/SectionTitle
    TopStatusBar.tsx  # 修改：改用 PixelText（像素字体）
    CelebrationOverlay.tsx  # 新增：消费 pendingCelebrations + pendingNotice
    GainFloat.tsx     # 新增：打卡 reanimated 浮字（+🪙N ✨M）
  screens/
    QuestsScreen.tsx  # 修改：接入 GainFloat + PixelText
    TrialsScreen.tsx  # 新增
    BossScreen.tsx    # 新增
    ShopScreen.tsx    # 新增
    SettingsScreen.tsx# 新增
  navigation.tsx      # 修改：4 占位换真屏 + 挂 CelebrationOverlay
App.tsx               # 修改：hydrate 门 + 字体门
assets/fonts/Zpix.ttf # 新增（下载）
__tests__/
  archived.test.ts    # 新增（Task 1）
  migrate.test.ts     # 修改：+ archived 容忍用例（Task 1）
  store.test.ts       # 修改：+ 软归档/编辑/addBoss weights 用例（Task 2）
```

---

### Task 1: 领域模型 — `Trial`/`Boss` 加 `archived` + 结算跳过（TDD）

**Files:**
- Create: `__tests__/archived.test.ts`
- Modify: `src/domain/types.ts:10-21`
- Modify: `src/domain/trials.ts:22-39`
- Modify: `src/domain/actions.ts:31-54`
- Modify: `src/domain/initialState.ts:34-39`
- Modify: `src/store/gameActions.ts:70-77`
- Modify: `__tests__/checkinTrial.test.ts:5-10`、`__tests__/trials.test.ts:5-11`、`__tests__/boss.test.ts:5-11`（帮助函数）
- Modify: `__tests__/rollover.test.ts:81`、`__tests__/undo.test.ts:33,46,59,113`（内联字面量）
- Modify: `__tests__/migrate.test.ts`（追加用例）

- [ ] **Step 1: 写失败测试 `__tests__/archived.test.ts`**

```ts
import { makeState } from './factory';
import { Trial, Boss, Daily } from '../src/domain/types';
import { settleTrials } from '../src/domain/trials';
import { checkInDaily } from '../src/domain/actions';

const trial = (over: Partial<Trial> = {}): Trial => ({
  id: 't1', name: '背单词', icon: '', startDate: '2026-06-01',
  completedDates: [], protectedDates: [], streak: 5, claimedMilestones: [1, 3],
  graduated: false, archived: false,
  milestones: [{ day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 }],
  ...over,
});
const boss = (over: Partial<Boss> = {}): Boss => ({
  id: 'b1', name: 'B', icon: '', maxHp: 100, hp: 100, damagePerHit: 20,
  totalRewardGold: 600, totalRewardExp: 300, weights: [0.2, 0.3, 0.5],
  linkedTaskIds: ['d1'], clearedStages: [], defeated: false, archived: false,
  ...over,
});
const day = (id: string): Daily => ({ id, name: id, gold: 10, exp: 5, icon: '', doneDate: null, archived: false });

test('settleTrials skips an archived trial (streak/milestones untouched on a missed day)', () => {
  const s = makeState({ trials: [trial({ archived: true })] });
  s.restDays = { weekKey: '', remaining: 0 };
  s.inventory.freezeCards = 0;
  settleTrials(s, '2026-06-02'); // 未打卡、无保护：若不跳过会断签清里程碑
  expect(s.trials[0].streak).toBe(5);
  expect(s.trials[0].claimedMilestones).toEqual([1, 3]);
});

test('settleTrials still breaks a non-archived trial (control)', () => {
  const s = makeState({ trials: [trial({ archived: false })] });
  s.restDays = { weekKey: '', remaining: 0 };
  s.inventory.freezeCards = 0;
  settleTrials(s, '2026-06-02');
  expect(s.trials[0].streak).toBe(0);
  expect(s.trials[0].claimedMilestones).toEqual([]);
});

test('applyBossDamageForTask (via checkInDaily) does NOT damage an archived boss', () => {
  const s = makeState({ dailies: [day('d1')], bosses: [boss({ archived: true, linkedTaskIds: ['d1'] })] });
  checkInDaily(s, 'd1', new Date(2026, 5, 1));
  expect(s.bosses[0].hp).toBe(100); // 归档 boss 不掉血
});

test('checkInDaily still damages a non-archived linked boss (control)', () => {
  const s = makeState({ dailies: [day('d1')], bosses: [boss({ archived: false, linkedTaskIds: ['d1'] })] });
  checkInDaily(s, 'd1', new Date(2026, 5, 1));
  expect(s.bosses[0].hp).toBe(80);
});
```

- [ ] **Step 2: 运行，确认失败（编译错误：`archived` 不存在于 Trial/Boss）**

Run: `npm test -- archived.test.ts`
Expected: FAIL —— ts 报 `Object literal may only specify known properties ... 'archived' does not exist in type 'Trial'/'Boss'`。

- [ ] **Step 3: 给 `Trial`/`Boss` 加 `archived` 字段 `src/domain/types.ts`**

把第 10-21 行的两个接口改为（仅在末尾各加 `archived: boolean;`）：

```ts
export interface Trial {
  id: string; name: string; icon: string; startDate: DateStr;
  completedDates: DateStr[]; protectedDates: DateStr[];
  streak: number; claimedMilestones: number[]; graduated: boolean; milestones: Milestone[];
  archived: boolean;
}
export interface Boss {
  id: string; name: string; icon: string;
  maxHp: number; hp: number; damagePerHit: number;
  totalRewardGold: number; totalRewardExp: number;
  weights: [number, number, number];
  linkedTaskIds: string[]; clearedStages: number[]; defeated: boolean;
  archived: boolean;
}
```

- [ ] **Step 4: 修所有 Trial/Boss 构造点（加 `archived: false`）——枚举如下，逐个改**

> `archived` 现在是必填字段。下列生产代码与测试帮助函数会**编译报错**（必须改）；`undo.test.ts` 的 4 处 `as Trial`/`as Boss` 断言会**吞掉缺字段错误**（编译器不报，但运行期为 `undefined`，仍逐个补齐以保持显式正确）。

1. `src/domain/initialState.ts:35`（示例 trial）—— 在 `graduated: false,` 后加 `archived: false,`：
```ts
{ id: 't-words', name: '每天背 10 个单词', icon: '🔤', startDate: dateStr(now), completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, archived: false, milestones: [...defaultMilestones] },
```
2. `src/domain/initialState.ts:38`（示例 boss）—— 在 `defeated: false` 后加 `archived: false`：
```ts
{ id: 'b-book', name: '读完一本书', icon: '👹', maxHp: 200, hp: 200, damagePerHit: 20, totalRewardGold: 600, totalRewardExp: 300, weights: [0.2, 0.3, 0.5], linkedTaskIds: [readingId], clearedStages: [], defeated: false, archived: false },
```
3. `src/store/gameActions.ts:71`（addTrial push）—— `graduated: false,` 后加 `archived: false,`：
```ts
s.trials.push({ id: genId('trial'), name, icon, startDate: dateStr(now), completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, archived: false, milestones: MILESTONES.map((m) => ({ ...m })) });
```
4. `src/store/gameActions.ts:76`（addBoss push）—— `defeated: false` 后加 `archived: false`（本步先补字段；weights 由 Task 2 处理）：
```ts
s.bosses.push({ id: genId('boss'), name: b.name, icon: b.icon ?? '👹', maxHp: b.maxHp, hp: b.maxHp, damagePerHit: b.damagePerHit, totalRewardGold: b.totalRewardGold, totalRewardExp: b.totalRewardExp, weights: [0.2, 0.3, 0.5], linkedTaskIds: b.linkedTaskIds, clearedStages: [], defeated: false, archived: false });
```
5. `__tests__/checkinTrial.test.ts:5-10`（`trial()` 帮助函数）—— `graduated: false,` 后加 `archived: false,`。
6. `__tests__/trials.test.ts:5-11`（`trial()` 帮助函数）—— `graduated: false,` 行后加 `archived: false,`。
7. `__tests__/boss.test.ts:5-11`（`boss()` 帮助函数）—— `defeated: false,` 后加 `archived: false,`。
8. `__tests__/rollover.test.ts:81`（内联 trial）—— `graduated: false,` 后加 `archived: false,`。
9. `__tests__/undo.test.ts:33`（内联 `as Trial`）—— `graduated: false,` 后加 `archived: false,`。
10. `__tests__/undo.test.ts:46`（内联 `as Trial`）—— `graduated: false,` 后加 `archived: false,`。
11. `__tests__/undo.test.ts:59`（内联 `as Boss`）—— `defeated: false` 后加 `archived: false`。
12. `__tests__/undo.test.ts:113`（内联 `as Boss`）—— `defeated: false` 后加 `archived: false`。

- [ ] **Step 5: 运行新测试，确认仍逻辑失败（字段已加，但 settle/boss 未跳过）**

Run: `npm test -- archived.test.ts`
Expected: 编译通过；`settleTrials skips...` 与 `... archived boss` 两条 FAIL（archived trial 仍被断签、archived boss 仍掉血）；两条 control PASS。

- [ ] **Step 6: 实现跳过逻辑**

`src/domain/trials.ts` `settleTrials` 循环开头（第 23-26 行附近），在 `if (t.graduated) continue;` 后加一行：

```ts
export function settleTrials(state: AppState, D: DateStr): void {
  for (const t of state.trials) {
    if (t.graduated) continue;
    if (t.archived) continue;
    if (D < t.startDate) continue;
    // ...保持其余不变
```

`src/domain/actions.ts` `applyBossDamageForTask`（第 33 行）把守卫条件加上 `b.archived`：

```ts
export function applyBossDamageForTask(state: AppState, r: Receipt, taskId: string, now: Date): void {
  for (const b of state.bosses) {
    if (b.defeated || b.archived || !b.linkedTaskIds.includes(taskId)) continue;
    // ...保持其余不变
```

- [ ] **Step 7: 运行，确认通过 + 全量回归**

Run: `npm test -- archived.test.ts` — Expected: PASS（4/4）。
Run: `npm test` — Expected: PASS（全部，含已补字段的旧测试）。

- [ ] **Step 8: 加 migrate 容忍测试（旧存档无 archived 仍安全）`__tests__/migrate.test.ts` 追加**

```ts
test('migrate tolerates persisted trials/bosses lacking the new archived field', () => {
  const persisted: any = {
    version: 1,
    trials: [{ id: 't', name: 't', icon: '', startDate: '2026-06-01', completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, milestones: [] }],
    bosses: [{ id: 'b', name: 'b', icon: '', maxHp: 100, hp: 100, damagePerHit: 10, totalRewardGold: 0, totalRewardExp: 0, weights: [0.2, 0.3, 0.5], linkedTaskIds: [], clearedStages: [], defeated: false }],
  };
  const result = migrate(persisted, 1);
  // 旧数组按原样保留（不与 seed 合并 / 不重复）：
  expect(result.trials).toHaveLength(1);
  expect(result.bosses).toHaveLength(1);
  // archived 缺失 → undefined，运行期 `!archived` 视为未归档（不崩、不误归档）
  expect(result.trials[0].archived ?? false).toBe(false);
  expect(result.bosses[0].archived ?? false).toBe(false);
});
```

> 说明：Phase 1 `version` 恒为 1，`migrate` 仅在版本不匹配时由 persist 调用；现有 v1 存档实际走 persist 默认浅合并，也同样不补 `archived`。两条路径下 `archived` 都可能为 `undefined`，而领域逻辑用 `!t.archived`/`b.archived` 均把 `undefined` 当未归档——这是**有意的容忍，不要"修"成强制补值**。

- [ ] **Step 9: 运行 + 类型检查 + 提交**

Run: `npm test -- migrate.test.ts` — Expected: PASS。
Run: `npx tsc --noEmit` — Expected: 无错误。
```bash
git add -A && git commit -m "feat(domain): add archived to Trial/Boss; settle & boss-damage skip archived"
```

---

### Task 2: store 动作 — 软归档 + 编辑 + addBoss(weights)（TDD）

**Files:**
- Modify: `src/store/gameActions.ts`
- Modify: `__tests__/store.test.ts`

- [ ] **Step 1: 写失败测试 `__tests__/store.test.ts` 追加**

> 沿用文件顶部已有的 `makeStore()` / `now` 助手（Plan 2 建立，用 zustand vanilla store）。在文件末尾追加：

```ts
test('archiveTrial soft-archives (keeps the trial, sets archived=true)', () => {
  const s = makeStore();
  const id = s.getState().trials[0].id; // seed 't-words'
  s.getState().actions.archiveTrial(id);
  const t = s.getState().trials.find((x) => x.id === id);
  expect(t).toBeDefined();          // 不物理删除
  expect(t!.archived).toBe(true);
});

test('archiveBoss soft-archives a boss', () => {
  const s = makeStore();
  const id = s.getState().bosses[0].id; // seed 'b-book'
  s.getState().actions.archiveBoss(id);
  expect(s.getState().bosses.find((x) => x.id === id)!.archived).toBe(true);
});

test('editTrial patches name/icon', () => {
  const s = makeStore();
  const id = s.getState().trials[0].id;
  s.getState().actions.editTrial(id, { name: '每天背 20 个单词', icon: '📚' });
  const t = s.getState().trials.find((x) => x.id === id)!;
  expect(t.name).toBe('每天背 20 个单词');
  expect(t.icon).toBe('📚');
});

test('editBoss patches fields and clamps hp to maxHp', () => {
  const s = makeStore();
  const id = s.getState().bosses[0].id;
  s.getState().actions.editBoss(id, { name: '读完两本书', maxHp: 50 });
  const b = s.getState().bosses.find((x) => x.id === id)!;
  expect(b.name).toBe('读完两本书');
  expect(b.maxHp).toBe(50);
  expect(b.hp).toBeLessThanOrEqual(50); // 原 hp=200 被夹到 <=50
});

test('addBoss appends with given weights and full hp', () => {
  const s = makeStore();
  const before = s.getState().bosses.length;
  s.getState().actions.addBoss({ name: '健身 30 天', maxHp: 300, damagePerHit: 30, totalRewardGold: 900, totalRewardExp: 450, linkedTaskIds: ['d-exercise'], weights: [0.1, 0.4, 0.5] });
  expect(s.getState().bosses.length).toBe(before + 1);
  const b = s.getState().bosses[s.getState().bosses.length - 1];
  expect(b.id).toMatch(/^boss-/);
  expect(b.hp).toBe(300);
  expect(b.weights).toEqual([0.1, 0.4, 0.5]);
  expect(b.archived).toBe(false);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- store.test.ts`
Expected: FAIL —— `actions.archiveBoss/editTrial/editBoss is not a function`，且 `addBoss` 的 weights 入参类型报错。

- [ ] **Step 3: 改 `src/store/gameActions.ts`**

3a. `GameActions` 接口（第 34-36 行附近）改/补这几条：
```ts
  addTrial: (name: string, icon?: string, now?: Date) => void;
  editTrial: (id: string, patch: Partial<{ name: string; icon: string }>) => void;
  archiveTrial: (id: string) => void;
  addBoss: (b: { name: string; icon?: string; maxHp: number; damagePerHit: number; totalRewardGold: number; totalRewardExp: number; linkedTaskIds: string[]; weights?: [number, number, number] }) => void;
  editBoss: (id: string, patch: Partial<{ name: string; icon: string; maxHp: number; damagePerHit: number; totalRewardGold: number; totalRewardExp: number; weights: [number, number, number]; linkedTaskIds: string[] }>) => void;
  archiveBoss: (id: string) => void;
```

3b. 实现部分：把 `archiveTrial`（第 73 行，当前物理删除）改为软归档，并在其后补 `editTrial`；把 `addBoss`（第 75-77 行）改为支持 weights 并补 `archived: false`，其后补 `editBoss`/`archiveBoss`：

```ts
  addTrial: (name, icon = '🎯', now = new Date()) => set((s) => {
    s.trials.push({ id: genId('trial'), name, icon, startDate: dateStr(now), completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, archived: false, milestones: MILESTONES.map((m) => ({ ...m })) });
  }),
  editTrial: (id, patch) => set((s) => { const t = s.trials.find((x) => x.id === id); if (t) Object.assign(t, patch); }),
  archiveTrial: (id) => set((s) => { const t = s.trials.find((x) => x.id === id); if (t) t.archived = true; }),

  addBoss: (b) => set((s) => {
    s.bosses.push({ id: genId('boss'), name: b.name, icon: b.icon ?? '👹', maxHp: b.maxHp, hp: b.maxHp, damagePerHit: b.damagePerHit, totalRewardGold: b.totalRewardGold, totalRewardExp: b.totalRewardExp, weights: b.weights ?? [0.2, 0.3, 0.5], linkedTaskIds: b.linkedTaskIds, clearedStages: [], defeated: false, archived: false });
  }),
  editBoss: (id, patch) => set((s) => {
    const b = s.bosses.find((x) => x.id === id);
    if (!b) return;
    Object.assign(b, patch);
    // 改 maxHp 后把 hp 夹到 [0, maxHp]（编辑通常发生在开战前；夹紧避免 hp>maxHp 的非法态）
    if (patch.maxHp !== undefined) b.hp = Math.min(b.hp, b.maxHp);
  }),
  archiveBoss: (id) => set((s) => { const b = s.bosses.find((x) => x.id === id); if (b) b.archived = true; }),
```

> 注意：删掉原先那行物理删除的 `archiveTrial: (id) => set((s) => { s.trials = s.trials.filter(...) })`。

- [ ] **Step 4: 运行，确认通过 + 全量回归 + 类型检查**

Run: `npm test -- store.test.ts` — Expected: PASS。
Run: `npm test` — Expected: PASS（全部）。
Run: `npx tsc --noEmit` — Expected: 无错误。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat(store): soft archiveTrial; add archiveBoss/editTrial/editBoss; addBoss weights"
```

---

### Task 3: UI 基础 — 像素字体 + 共享组件扩展

**Files:**
- Create: `assets/fonts/Zpix.ttf`（下载）
- Modify: `package.json`（依赖）
- Create: `src/ui/fonts.ts`
- Modify: `src/ui/theme.ts`
- Modify: `src/ui/components/Pixel.tsx`
- Modify: `src/ui/components/TopStatusBar.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: 安装字体依赖 + 下载 Zpix**

Run:
```bash
npx expo install expo-font
npm install @expo-google-fonts/press-start-2p
mkdir -p assets/fonts
# 通过 GitHub API 动态解析最新 release 的 .ttf 资源（防版本漂移）：
ZPIX_URL=$(curl -fsSL https://api.github.com/repos/SolidZORO/zpix-pixel-font/releases/latest | grep -o 'https://[^"]*\.ttf' | head -1)
echo "Zpix ttf: $ZPIX_URL"
curl -fL "$ZPIX_URL" -o assets/fonts/Zpix.ttf
ls -la assets/fonts/Zpix.ttf   # 期望体积 >1MB（含 CJK 字形）
```
Expected: `assets/fonts/Zpix.ttf` 存在且体积 >1MB。
**若下载失败（无网络/资源名变更）**：跳过 Zpix，本任务后续把 `fonts.ts` 里 `Zpix: require(...)` 一行删掉、`theme.font.body` 设为 `undefined`（中文退回系统字体，英文/数字仍用 Press Start 2P）。**不要**让缺失的 ttf 进入 `require()`（Metro 会因找不到文件报错）。

- [ ] **Step 2: 写 `src/ui/fonts.ts`**

```ts
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';

/** 加载像素字体；返回 [loaded, error]。App 在 hydrate + 字体就绪后再渲染主界面。 */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts({
    PressStart2P_400Regular,
    Zpix: require('../../assets/fonts/Zpix.ttf'),
  });
}
```

- [ ] **Step 3: `src/ui/theme.ts` 追加 font token**

在文件末尾追加：
```ts
/** 字体族：body=Zpix（覆盖中英数像素字形）；display=Press Start 2P（仅英文/数字大标题，无 CJK）。 */
export const font = {
  body: 'Zpix' as string | undefined,
  display: 'PressStart2P_400Regular',
};
```

- [ ] **Step 4: `src/ui/components/Pixel.tsx` 追加共享组件**

在文件顶部 import 行补上需要的 RN API 与 theme.font，并在文件末尾追加组件：

```tsx
// 顶部 import 改为：
import { Modal, Pressable, Text, TextInput, TextProps, View, ViewStyle, StyleProp } from 'react-native';
import { colors, pixelBorder, pixelShadow, space, font } from '../theme';
```

```tsx
// 文件末尾追加：

/** 像素文本：默认 body 字体（Zpix，覆盖中英数）；display 用 Press Start 2P（仅英数）。 */
export function PixelText({ style, display, ...rest }: TextProps & { display?: boolean }) {
  return <Text {...rest} style={[{ color: colors.ink, fontFamily: display ? font.display : font.body }, style]} />;
}

/** 像素标题（金色加粗）。 */
export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 14 }}>{children}</PixelText>
    </View>
  );
}

/** 像素输入框（深底 + 硬边）。numeric 时 keyboardType=numeric。 */
export function PixelTextInput({
  value, onChangeText, placeholder, numeric, multiline, style,
}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
  numeric?: boolean; multiline?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#7a7f9a"
      keyboardType={numeric ? 'numeric' : 'default'}
      multiline={multiline}
      style={[
        { backgroundColor: colors.bgDeep, color: colors.ink, paddingHorizontal: space(2), paddingVertical: space(2), fontFamily: font.body, minHeight: multiline ? space(20) : undefined, textAlignVertical: multiline ? 'top' : 'center' },
        pixelBorder,
        style,
      ]}
    />
  );
}

/** 像素模态：居中 PixelPanel，半透明遮罩。 */
export function PixelModal({ visible, onRequestClose, children }: { visible: boolean; onRequestClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: space(4) }}>
        <View style={[{ backgroundColor: colors.bgPanel, padding: space(3), width: '100%', maxWidth: 420, gap: space(2) }, pixelBorder, pixelShadow]}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** 二次确认对话框（仪式化操作用）。 */
export function ConfirmDialog({
  visible, title, message, confirmLabel = '确认', onConfirm, onCancel, danger,
}: {
  visible: boolean; title: string; message?: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <PixelModal visible={visible} onRequestClose={onCancel}>
      <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>{title}</PixelText>
      {message ? <PixelText style={{ color: colors.ink }}>{message}</PixelText> : null}
      <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
        <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={onCancel} /></View>
        <View style={{ flex: 1 }}><PixelButton label={confirmLabel} color={danger ? colors.danger : colors.success} onPress={onConfirm} /></View>
      </View>
    </PixelModal>
  );
}
```

- [ ] **Step 5: `src/ui/components/TopStatusBar.tsx` 改用 `PixelText`**

把其中两处 `<Text ...>`（玩家名/等级、金币）替换为 `PixelText`，import 补 `PixelText`：

```tsx
import { View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { expNeeded } from '../../domain/economy';
import { colors, pixelBorder, space } from '../theme';
import { PixelProgressBar, PixelText } from './Pixel';

export function TopStatusBar() {
  const player = useGameStore((s) => s.player);
  const gold = useGameStore((s) => s.player.gold);
  const config = useGameStore((s) => s.config);
  const need = expNeeded(player.level, config);
  return (
    <View style={[{ backgroundColor: colors.bgPanel, paddingTop: space(8), paddingBottom: space(2), paddingHorizontal: space(3), flexDirection: 'row', alignItems: 'center', gap: space(3) }, { borderBottomWidth: 3, borderColor: colors.border }]}>
      <View style={[{ width: space(10), height: space(10), backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' }, pixelBorder]}>
        <PixelText style={{ fontSize: 20 }}>🧙</PixelText>
      </View>
      <View style={{ flex: 1 }}>
        <PixelText style={{ color: colors.ink, fontWeight: 'bold' }}>{player.name}  Lv.{player.level}</PixelText>
        <PixelProgressBar value={player.exp} max={need} />
      </View>
      <PixelText style={{ color: colors.gold, fontWeight: 'bold' }}>🪙 {gold}</PixelText>
    </View>
  );
}
```

- [ ] **Step 6: `App.tsx` 加字体门（hydrate + 字体就绪后再渲染）**

```tsx
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGameStore } from './src/store/useGameStore';
import { useAppFonts } from './src/ui/fonts';
import { RootNavigation } from './src/ui/navigation';
import { colors } from './src/ui/theme';

export default function App() {
  const [hydrated, setHydrated] = useState(useGameStore.persist.hasHydrated());
  const [fontsLoaded, fontsError] = useAppFonts();

  useEffect(() => {
    const unsub = useGameStore.persist.onFinishHydration(() => setHydrated(true));
    if (useGameStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated) useGameStore.getState().actions.rollover();
  }, [hydrated]);

  const fontsReady = fontsLoaded || !!fontsError; // 字体出错也放行（退回系统字体），不卡死
  if (!hydrated || !fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.gold }}>加载中…</Text>
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <RootNavigation />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 7: 类型检查 + expo-web 冒烟 + 提交**

Run: `npx tsc --noEmit` — Expected: 无错误。
Run（后台）：`npm run web`，截图核对：顶部状态栏文字呈像素字体（Zpix），无红屏，控制台无报错。
```bash
git add -A && git commit -m "feat(ui): load pixel fonts (expo-font) + shared pixel components (text/input/modal/confirm)"
```

---

### Task 4: 试炼屏 `TrialsScreen.tsx`

**Files:**
- Create: `src/ui/screens/TrialsScreen.tsx`
- Modify: `src/ui/navigation.tsx`（用真屏替换试炼占位）

- [ ] **Step 1: 写 `src/ui/screens/TrialsScreen.tsx`**

> ⚠️ 选择器只选 stable ref（`s.trials`/`s.todayReceipts`/`s.actions`），`.filter`/派生都在 render body。

```tsx
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { dateStr } from '../../domain/dateUtils';
import { Trial } from '../../domain/types';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, PixelProgressBar, PixelTextInput, PixelModal, ConfirmDialog, SectionTitle } from '../components/Pixel';

export function TrialsScreen() {
  const trials = useGameStore((s) => s.trials);
  const todayReceipts = useGameStore((s) => s.todayReceipts);
  const actions = useGameStore((s) => s.actions);

  const today = dateStr(new Date());
  const active = trials.filter((t) => !t.archived && !t.graduated);
  const graduated = trials.filter((t) => !t.archived && t.graduated);
  const ridFor = (id: string) => todayReceipts.find((r) => r.kind === 'trial' && r.taskId === id)?.rid;

  // 新建 / 编辑 / 放弃 的模态状态
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Trial | null>(null);
  const [editName, setEditName] = useState('');
  const [abandon, setAbandon] = useState<Trial | null>(null);

  const nextMilestone = (t: Trial) => [...t.milestones].sort((a, b) => a.day - b.day).find((m) => m.day > t.streak);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionTitle>进行中的试炼</SectionTitle>
        <PixelButton label="＋ 开启新试炼" onPress={() => { setNewName(''); setAdding(true); }} />
      </View>

      {active.length === 0 ? <PixelText style={{ color: colors.ink }}>暂无进行中的试炼。</PixelText> : null}

      {active.map((t) => {
        const done = t.completedDates.includes(today);
        const rid = ridFor(t.id);
        const nm = nextMilestone(t);
        return (
          <PixelPanel key={t.id}>
            <View style={{ gap: space(2) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 20 }}>{t.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1, fontWeight: 'bold' }}>{t.name}</PixelText>
                <PixelText style={{ color: colors.gold }}>🔥{t.streak} 天</PixelText>
              </View>
              {nm ? (
                <>
                  <PixelProgressBar value={t.streak} max={nm.day} color={colors.gold} />
                  <PixelText style={{ color: colors.ink }}>距 D{nm.day} 还差 {nm.day - t.streak} 天　奖励 🪙{nm.gold} ✨{nm.exp}</PixelText>
                </>
              ) : (
                <PixelText style={{ color: colors.success }}>已达最高里程碑，连满 14 天将毕业转为每日任务。</PixelText>
              )}
              <View style={{ flexDirection: 'row', gap: space(2), flexWrap: 'wrap' }}>
                {done && rid
                  ? <PixelButton label="撤销今日打卡" color={colors.bgPanel} onPress={() => actions.undo(rid)} />
                  : <PixelButton label={done ? '今日已打卡' : '今日打卡'} color={colors.success} disabled={done && !rid} onPress={() => actions.checkInTrial(t.id)} />}
                <PixelButton label="编辑" color={colors.bgPanel} onPress={() => { setEditing(t); setEditName(t.name); }} />
                <PixelButton label="放弃" color={colors.danger} onPress={() => setAbandon(t)} />
              </View>
            </View>
          </PixelPanel>
        );
      })}

      {graduated.length > 0 ? <SectionTitle style={{ marginTop: space(2) }}>已毕业</SectionTitle> : null}
      {graduated.map((t) => (
        <PixelPanel key={t.id} style={{ opacity: 0.8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
            <PixelText style={{ fontSize: 18 }}>{t.icon}</PixelText>
            <PixelText style={{ color: colors.ink, flex: 1 }}>{t.name}</PixelText>
            <PixelText style={{ color: colors.success }}>✅ 已毕业（已转每日任务）</PixelText>
          </View>
        </PixelPanel>
      ))}

      {/* 新建 */}
      <PixelModal visible={adding} onRequestClose={() => setAdding(false)}>
        <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>开启新试炼</PixelText>
        <PixelText style={{ color: colors.ink }}>名称（默认里程碑 D1/3/7/14，连满 14 天毕业）</PixelText>
        <PixelTextInput value={newName} onChangeText={setNewName} placeholder="例：每天冥想 10 分钟" />
        <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
          <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={() => setAdding(false)} /></View>
          <View style={{ flex: 1 }}><PixelButton label="开启" color={colors.success} disabled={!newName.trim()} onPress={() => { actions.addTrial(newName.trim()); setAdding(false); }} /></View>
        </View>
      </PixelModal>

      {/* 编辑（重命名） */}
      <PixelModal visible={!!editing} onRequestClose={() => setEditing(null)}>
        <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>编辑试炼</PixelText>
        <PixelTextInput value={editName} onChangeText={setEditName} placeholder="名称" />
        <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
          <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={() => setEditing(null)} /></View>
          <View style={{ flex: 1 }}><PixelButton label="保存" color={colors.success} disabled={!editName.trim()} onPress={() => { if (editing) actions.editTrial(editing.id, { name: editName.trim() }); setEditing(null); }} /></View>
        </View>
      </PixelModal>

      {/* 放弃 = 软归档 */}
      <ConfirmDialog
        visible={!!abandon}
        title="放弃这个试炼？"
        message={abandon ? `「${abandon.name}」将被归档（不再计入结算，历史保留）。` : ''}
        confirmLabel="放弃"
        danger
        onCancel={() => setAbandon(null)}
        onConfirm={() => { if (abandon) actions.archiveTrial(abandon.id); setAbandon(null); }}
      />
    </ScrollView>
  );
}
```

- [ ] **Step 2: `src/ui/navigation.tsx` 用真屏替换试炼占位**

import 顶部加 `import { TrialsScreen } from './screens/TrialsScreen';`，删除 `const Trials = () => <Placeholder title="试炼" />;`，把 `<Tab.Screen name="试炼" component={Trials} />` 改为 `component={TrialsScreen}`。

- [ ] **Step 3: 类型检查 + expo-web 截图验收**

Run: `npx tsc --noEmit` — Expected: 无错误。
Run（后台）：`npm run web`，切到「试炼」Tab，截图核对：
1. 示例试炼「每天背 10 个单词」显示，🔥0 天，进度条 + 「距 D1 还差 1 天 奖励 🪙20 ✨10」。
2. 点「今日打卡」→ streak 变 1、领 D1 里程碑、顶部金币 +20、按钮变「撤销今日打卡」。
3. 点「撤销今日打卡」→ 回退到 🔥0、金币退回。
4. 「＋ 开启新试炼」→ 输入名称 → 开启 → 列表多一条；**无红屏、控制台无 React #185**。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat(ui): add Trials screen (streak/milestone/check-in/undo, new/edit/abandon)"
```

---

### Task 5: 讨伐(Boss)屏 `BossScreen.tsx`

**Files:**
- Create: `src/ui/screens/BossScreen.tsx`
- Modify: `src/ui/navigation.tsx`（用真屏替换讨伐占位）

- [ ] **Step 1: 写 `src/ui/screens/BossScreen.tsx`**

> 关联任务名从 dailies/weeklies/trials 反查；HP 条按 hp/maxHp 填充并在 1/3、2/3 处画分段线；三个阶段 chip 显示比重奖励与 ✅。新建/编辑用同一表单模态。⚠️ 选择器只选 stable ref。

```tsx
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { Boss } from '../../domain/types';
import { colors, pixelBorder, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, PixelTextInput, PixelModal, ConfirmDialog, SectionTitle } from '../components/Pixel';

type Draft = {
  name: string; maxHp: string; damagePerHit: string;
  totalRewardGold: string; totalRewardExp: string;
  w0: string; w1: string; w2: string; linkedTaskIds: string[];
};
const emptyDraft: Draft = { name: '', maxHp: '200', damagePerHit: '20', totalRewardGold: '600', totalRewardExp: '300', w0: '0.2', w1: '0.3', w2: '0.5', linkedTaskIds: [] };

export function BossScreen() {
  const bosses = useGameStore((s) => s.bosses);
  const dailies = useGameStore((s) => s.dailies);
  const weeklies = useGameStore((s) => s.weeklies);
  const trials = useGameStore((s) => s.trials);
  const actions = useGameStore((s) => s.actions);

  const active = bosses.filter((b) => !b.archived);
  // 关联任务可选项（未归档的 daily/weekly/trial）
  const linkOptions = useMemo(
    () => [
      ...dailies.filter((d) => !d.archived).map((d) => ({ id: d.id, label: `📜 ${d.name}` })),
      ...weeklies.filter((w) => !w.archived).map((w) => ({ id: w.id, label: `🗓 ${w.name}` })),
      ...trials.filter((t) => !t.archived).map((t) => ({ id: t.id, label: `🎯 ${t.name}` })),
    ],
    [dailies, weeklies, trials]
  );
  const nameOf = (id: string) => linkOptions.find((o) => o.id === id)?.label ?? id;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<Boss | null>(null);

  const openNew = () => { setEditingId(null); setDraft({ ...emptyDraft }); };
  const openEdit = (b: Boss) => {
    setEditingId(b.id);
    setDraft({ name: b.name, maxHp: String(b.maxHp), damagePerHit: String(b.damagePerHit), totalRewardGold: String(b.totalRewardGold), totalRewardExp: String(b.totalRewardExp), w0: String(b.weights[0]), w1: String(b.weights[1]), w2: String(b.weights[2]), linkedTaskIds: [...b.linkedTaskIds] });
  };
  const toggleLink = (id: string) => setDraft((d) => d ? { ...d, linkedTaskIds: d.linkedTaskIds.includes(id) ? d.linkedTaskIds.filter((x) => x !== id) : [...d.linkedTaskIds, id] } : d);

  const saveDraft = () => {
    if (!draft) return;
    const payload = {
      name: draft.name.trim() || '未命名 Boss',
      maxHp: Math.max(1, Number(draft.maxHp) || 1),
      damagePerHit: Math.max(1, Number(draft.damagePerHit) || 1),
      totalRewardGold: Math.max(0, Number(draft.totalRewardGold) || 0),
      totalRewardExp: Math.max(0, Number(draft.totalRewardExp) || 0),
      weights: [Number(draft.w0) || 0, Number(draft.w1) || 0, Number(draft.w2) || 0] as [number, number, number],
      linkedTaskIds: draft.linkedTaskIds,
    };
    if (editingId) actions.editBoss(editingId, payload);
    else actions.addBoss(payload);
    setDraft(null);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionTitle>讨伐 Boss</SectionTitle>
        <PixelButton label="＋ 新建 Boss" onPress={openNew} />
      </View>

      {active.length === 0 ? <PixelText style={{ color: colors.ink }}>暂无 Boss。</PixelText> : null}

      {active.map((b) => {
        const pct = b.maxHp > 0 ? Math.max(0, Math.min(100, (b.hp / b.maxHp) * 100)) : 0;
        return (
          <PixelPanel key={b.id}>
            <View style={{ gap: space(2) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                <PixelText style={{ fontSize: 22 }}>{b.icon}</PixelText>
                <PixelText style={{ color: colors.ink, flex: 1, fontWeight: 'bold' }}>{b.name}</PixelText>
                <PixelText style={{ color: b.defeated ? colors.success : colors.danger }}>{b.defeated ? '☠ 已击杀' : `${b.hp}/${b.maxHp} HP`}</PixelText>
              </View>

              {/* 分 3 段血条：填充 + 1/3、2/3 分段线 */}
              <View style={[{ height: space(5), backgroundColor: colors.bgDeep, justifyContent: 'center' }, pixelBorder]}>
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: colors.danger }} />
                <View style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 2, backgroundColor: colors.border }} />
                <View style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 2, backgroundColor: colors.border }} />
              </View>

              {/* 三个阶段 chip：比重奖励 + 是否已结算 */}
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                {[1, 2, 3].map((i) => {
                  const cleared = b.clearedStages.includes(i);
                  return (
                    <View key={i} style={[{ flex: 1, padding: space(1), backgroundColor: cleared ? colors.success : colors.bgDeep }, pixelBorder]}>
                      <PixelText style={{ color: colors.ink, fontSize: 11 }}>阶段{i}{cleared ? ' ✅' : ''}</PixelText>
                      <PixelText style={{ color: colors.gold, fontSize: 11 }}>🪙{Math.floor(b.totalRewardGold * b.weights[i - 1])} ✨{Math.floor(b.totalRewardExp * b.weights[i - 1])}</PixelText>
                    </View>
                  );
                })}
              </View>

              <PixelText style={{ color: colors.ink, fontSize: 12 }}>关联任务：{b.linkedTaskIds.length ? b.linkedTaskIds.map(nameOf).join('，') : '（无）'}　每次伤害 {b.damagePerHit}</PixelText>
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                <PixelButton label="编辑" color={colors.bgPanel} onPress={() => openEdit(b)} />
                <PixelButton label="归档" color={colors.danger} onPress={() => setArchiving(b)} />
              </View>
            </View>
          </PixelPanel>
        );
      })}

      {/* 新建 / 编辑 表单 */}
      <PixelModal visible={!!draft} onRequestClose={() => setDraft(null)}>
        {draft ? (
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: space(2) }}>
            <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>{editingId ? '编辑 Boss' : '新建 Boss'}</PixelText>
            <PixelText style={{ color: colors.ink }}>名称</PixelText>
            <PixelTextInput value={draft.name} onChangeText={(t) => setDraft({ ...draft, name: t })} placeholder="例：读完一本书" />
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>最大 HP</PixelText><PixelTextInput value={draft.maxHp} onChangeText={(t) => setDraft({ ...draft, maxHp: t })} numeric /></View>
              <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>单次伤害</PixelText><PixelTextInput value={draft.damagePerHit} onChangeText={(t) => setDraft({ ...draft, damagePerHit: t })} numeric /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>总奖励金币</PixelText><PixelTextInput value={draft.totalRewardGold} onChangeText={(t) => setDraft({ ...draft, totalRewardGold: t })} numeric /></View>
              <View style={{ flex: 1, gap: space(1) }}><PixelText style={{ color: colors.ink }}>总奖励经验</PixelText><PixelTextInput value={draft.totalRewardExp} onChangeText={(t) => setDraft({ ...draft, totalRewardExp: t })} numeric /></View>
            </View>
            <PixelText style={{ color: colors.ink }}>三阶段比重（和≈1，默认 0.2/0.3/0.5）</PixelText>
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}><PixelTextInput value={draft.w0} onChangeText={(t) => setDraft({ ...draft, w0: t })} numeric /></View>
              <View style={{ flex: 1 }}><PixelTextInput value={draft.w1} onChangeText={(t) => setDraft({ ...draft, w1: t })} numeric /></View>
              <View style={{ flex: 1 }}><PixelTextInput value={draft.w2} onChangeText={(t) => setDraft({ ...draft, w2: t })} numeric /></View>
            </View>
            <PixelText style={{ color: colors.ink }}>关联任务（完成即扣血，可多选）</PixelText>
            {linkOptions.length === 0 ? <PixelText style={{ color: colors.accent }}>（暂无可关联任务）</PixelText> : null}
            {linkOptions.map((o) => {
              const on = draft.linkedTaskIds.includes(o.id);
              return <PixelButton key={o.id} label={`${on ? '☑' : '☐'} ${o.label}`} color={on ? colors.success : colors.bgDeep} onPress={() => toggleLink(o.id)} />;
            })}
            <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
              <View style={{ flex: 1 }}><PixelButton label="取消" color={colors.bgDeep} onPress={() => setDraft(null)} /></View>
              <View style={{ flex: 1 }}><PixelButton label="保存" color={colors.success} onPress={saveDraft} /></View>
            </View>
          </ScrollView>
        ) : null}
      </PixelModal>

      <ConfirmDialog
        visible={!!archiving}
        title="归档这个 Boss？"
        message={archiving ? `「${archiving.name}」将不再被关联任务扣血（历史保留）。` : ''}
        confirmLabel="归档"
        danger
        onCancel={() => setArchiving(null)}
        onConfirm={() => { if (archiving) actions.archiveBoss(archiving.id); setArchiving(null); }}
      />
    </ScrollView>
  );
}
```

- [ ] **Step 2: `src/ui/navigation.tsx` 用真屏替换讨伐占位**

import 加 `import { BossScreen } from './screens/BossScreen';`，删除 `const Boss = () => <Placeholder title="讨伐 Boss" />;`，把 `<Tab.Screen name="讨伐" component={Boss} />` 改为 `component={BossScreen}`。

- [ ] **Step 3: 类型检查 + expo-web 截图验收**

Run: `npx tsc --noEmit` — Expected: 无错误。
Run（后台）：`npm run web`，切到「讨伐」Tab，截图核对：
1. 示例 Boss「读完一本书」显示 200/200 HP，三阶段 chip（🪙120/180/300）。
2. 到「委托」屏完成关联的「阅读 20 分钟」每日 → 回「讨伐」屏，HP 降到 180；继续多次完成（可改设备日期或撤销重打）跨越 2/3 阈值时阶段1 chip 变 ✅ 高亮、金币入账。
3. 「＋ 新建 Boss」→ 填表 + 勾关联任务 → 保存 → 列表多一条。
4. 「编辑」改 maxHp → 保存后 HP 上限更新、hp 被夹紧。**无红屏、无 React #185**。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat(ui): add Boss screen (3-stage hp bar, stage rewards, linked tasks, new/edit/archive)"
```

---

### Task 6: 商店屏 `ShopScreen.tsx`（冻结卡 + 提现）

**Files:**
- Create: `src/ui/screens/ShopScreen.tsx`
- Modify: `src/ui/navigation.tsx`（用真屏替换商店占位）

- [ ] **Step 1: 写 `src/ui/screens/ShopScreen.tsx`**

> 提现走仪式化二次确认（`ConfirmDialog`）。可提现额度 = 当前金币（需 ≥ `cashOutThreshold`）。⚠️ 选择器只选 stable ref。

```tsx
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, ConfirmDialog, SectionTitle } from '../components/Pixel';

export function ShopScreen() {
  const gold = useGameStore((s) => s.player.gold);
  const freezeCards = useGameStore((s) => s.inventory.freezeCards);
  const config = useGameStore((s) => s.config);
  const actions = useGameStore((s) => s.actions);

  const canBuy = gold >= config.freezeCardCost;
  const canCashOut = gold >= config.cashOutThreshold;
  const yuan = (gold / config.goldToYuanRate).toFixed(2);
  const [confirming, setConfirming] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <SectionTitle>商店</SectionTitle>

      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.ink, fontWeight: 'bold' }}>❄ 冻结卡</PixelText>
          <PixelText style={{ color: colors.ink }}>断签时自动消耗一张保护连击。当前持有：{freezeCards} 张</PixelText>
          <PixelText style={{ color: colors.gold }}>单价 🪙{config.freezeCardCost}（你有 🪙{gold}）</PixelText>
          <PixelButton label={canBuy ? '购买一张' : '金币不足'} color={canBuy ? colors.success : colors.bgPanel} disabled={!canBuy} onPress={() => actions.buyFreezeCard()} />
        </View>
      </PixelPanel>

      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelText style={{ color: colors.ink, fontWeight: 'bold' }}>💰 提现</PixelText>
          <PixelText style={{ color: colors.ink }}>{config.goldToYuanRate} 金 = ¥1，满 🪙{config.cashOutThreshold} 可提现。</PixelText>
          <PixelText style={{ color: colors.gold }}>当前 🪙{gold} ≈ ¥{yuan}</PixelText>
          <PixelButton label={canCashOut ? `提现全部（¥${yuan}）` : `未达提现门槛 🪙${config.cashOutThreshold}`} color={canCashOut ? colors.gold : colors.bgPanel} disabled={!canCashOut} onPress={() => setConfirming(true)} />
        </View>
      </PixelPanel>

      <ConfirmDialog
        visible={confirming}
        title="确认提现？"
        message={`将提现 🪙${gold} = ¥${yuan}。金币会从账户扣除，此操作不可撤销。`}
        confirmLabel="确认提现"
        onCancel={() => setConfirming(false)}
        onConfirm={() => { actions.cashOut(gold); setConfirming(false); }}
      />
    </ScrollView>
  );
}
```

- [ ] **Step 2: `src/ui/navigation.tsx` 用真屏替换商店占位**

import 加 `import { ShopScreen } from './screens/ShopScreen';`，删除 `const Shop = () => <Placeholder title="商店" />;`，把 `<Tab.Screen name="商店" component={Shop} />` 改为 `component={ShopScreen}`。

- [ ] **Step 3: 类型检查 + expo-web 截图验收**

Run: `npx tsc --noEmit` — Expected: 无错误。
Run（后台）：`npm run web`，切到「商店」Tab，截图核对：
1. 冻结卡面板显示持有数与单价；金币不足时按钮禁用。
2. 先在「委托」屏多打卡攒到 ≥100 金 → 回商店点「购买一张」→ 持有数 +1、金币 -100。
3. 提现按钮在未达 `cashOutThreshold`（默认 1000）时显示门槛提示且禁用；达标后点击 → 弹仪式化确认 → 确认后金币清零、`ledger` 记 cashout（控制台或刷新后顶部金币归 0）。**无红屏。**

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat(ui): add Shop screen (freeze card purchase + ritual cash-out)"
```

---

### Task 7: 设置屏 `SettingsScreen.tsx`（配置编辑 + 导出/导入 + 重置）

**Files:**
- Create: `src/ui/screens/SettingsScreen.tsx`
- Modify: `src/ui/navigation.tsx`（用真屏替换设置占位）

- [ ] **Step 1: 写 `src/ui/screens/SettingsScreen.tsx`**

> config 14 项用本地 draft 编辑、点「保存配置」一次性 `setConfig`。导出：按需 `JSON.stringify(getState 去 actions)` 显示在只读多行框；导入：粘贴 → `JSON.parse` → 校验 `version` + 关键字段 → `importState`。重置：二次确认 → `reset`。⚠️ 选择器只选 stable ref。

```tsx
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { Config } from '../../domain/types';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, PixelTextInput, ConfirmDialog, SectionTitle } from '../components/Pixel';

const FIELDS: Array<{ key: keyof Config; label: string }> = [
  { key: 'goldToYuanRate', label: '金币兑换率（X 金 = ¥1）' },
  { key: 'perfectDailyBonus', label: '每日全清奖励金币' },
  { key: 'perfectDailyBonusExp', label: '每日全清奖励经验' },
  { key: 'perfectWeeklyBonus', label: '每周全清奖励金币' },
  { key: 'perfectWeeklyBonusExp', label: '每周全清奖励经验' },
  { key: 'missedDailyPenaltyRate', label: '漏做每日扣罚比例' },
  { key: 'dailyPenaltyCap', label: '每日扣罚上限' },
  { key: 'weeklyPenaltyRate', label: '漏做每周扣罚比例' },
  { key: 'freezeCardCost', label: '冻结卡单价' },
  { key: 'cashOutThreshold', label: '提现门槛' },
  { key: 'restDaysPerWeek', label: '每周请假名额' },
  { key: 'longAbsenceThreshold', label: '长时间未用阈值（天）' },
  { key: 'levelExpBase', label: '升级经验基数' },
  { key: 'levelExpStep', label: '每级经验增量' },
];

export function SettingsScreen() {
  const config = useGameStore((s) => s.config);
  const actions = useGameStore((s) => s.actions);

  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(config[f.key])])));
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [resetting, setResetting] = useState(false);

  const saveConfig = () => {
    const patch: Partial<Config> = {};
    for (const f of FIELDS) {
      const n = Number(draft[f.key]);
      if (!Number.isNaN(n)) (patch as any)[f.key] = n;
    }
    actions.setConfig(patch);
  };

  const doExport = () => {
    const { actions: _omit, ...data } = useGameStore.getState();
    setExportText(JSON.stringify(data, null, 2));
  };

  const doImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (typeof parsed !== 'object' || parsed === null || parsed.version !== 1 || !parsed.player || !Array.isArray(parsed.dailies)) {
        setImportMsg('❌ 格式无效或版本不匹配（需 version=1 且含 player/dailies）。');
        return;
      }
      actions.importState(parsed);
      setImportMsg('✅ 已导入。');
    } catch {
      setImportMsg('❌ JSON 解析失败。');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <SectionTitle>经济数值配置</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          {FIELDS.map((f) => (
            <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <PixelText style={{ color: colors.ink, flex: 1, fontSize: 12 }}>{f.label}</PixelText>
              <View style={{ width: space(22) }}>
                <PixelTextInput value={draft[f.key]} onChangeText={(t) => setDraft((d) => ({ ...d, [f.key]: t }))} numeric />
              </View>
            </View>
          ))}
          <PixelButton label="保存配置" color={colors.success} onPress={saveConfig} />
        </View>
      </PixelPanel>

      <SectionTitle>导出 / 导入存档</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelButton label="生成导出 JSON" color={colors.bgPanel} onPress={doExport} />
          {exportText ? <PixelTextInput value={exportText} onChangeText={() => {}} multiline /> : null}
          <PixelText style={{ color: colors.ink }}>粘贴 JSON 导入（覆盖当前存档）：</PixelText>
          <PixelTextInput value={importText} onChangeText={setImportText} placeholder='{"version":1,...}' multiline />
          <PixelButton label="导入" color={colors.accent} disabled={!importText.trim()} onPress={doImport} />
          {importMsg ? <PixelText style={{ color: colors.ink }}>{importMsg}</PixelText> : null}
        </View>
      </PixelPanel>

      <SectionTitle>危险区</SectionTitle>
      <PixelButton label="清空并重置为初始状态" color={colors.danger} onPress={() => setResetting(true)} />

      <ConfirmDialog
        visible={resetting}
        title="确认重置？"
        message="将清空全部进度（金币/经验/任务/试炼/Boss/历史）并恢复初始示例数据，不可撤销。"
        confirmLabel="清空重置"
        danger
        onCancel={() => setResetting(false)}
        onConfirm={() => { actions.reset(); setResetting(false); }}
      />
    </ScrollView>
  );
}
```

- [ ] **Step 2: `src/ui/navigation.tsx` 用真屏替换设置占位 + 清理 Placeholder import**

import 加 `import { SettingsScreen } from './screens/SettingsScreen';`，删除 `const Settings = () => <Placeholder title="设置" />;`，把 `<Tab.Screen name="设置" component={Settings} />` 改为 `component={SettingsScreen}`。此时 4 个占位已全部替换，删除 `import { Placeholder } from './screens/Placeholder';`（`Placeholder.tsx` 文件保留备用，不必删）。

- [ ] **Step 3: 类型检查 + expo-web 截图验收**

Run: `npx tsc --noEmit` — Expected: 无错误。
Run（后台）：`npm run web`，切到「设置」Tab，截图核对：
1. 14 项配置可编辑，改 `freezeCardCost` 为 50 → 「保存配置」→ 去商店看冻结卡单价变 50。
2. 「生成导出 JSON」→ 只读框出现完整存档 JSON。
3. 把导出的 JSON 粘到导入框 → 「导入」→ 提示 ✅。改坏 version 再导入 → 提示 ❌。
4. 「清空并重置」→ 仪式确认 → 金币/任务回到初始（顶部 🪙0、示例任务复原）。**无红屏、无 React #185。**

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat(ui): add Settings screen (config edit + export/import JSON + reset)"
```

---

### Task 8: 庆祝动画 `CelebrationOverlay` + 长假提示（消费 pending*）

**Files:**
- Create: `src/ui/components/CelebrationOverlay.tsx`
- Modify: `src/ui/navigation.tsx`（在根挂载 overlay）

- [ ] **Step 1: 写 `src/ui/components/CelebrationOverlay.tsx`**

> 消费 `pendingCelebrations` 队列：取队首播一段 reanimated 缩放+淡入淡出（~1200ms），结束 `runOnJS(consumeCelebration)`；队列空时不渲染。`pendingNotice==='longAbsence'` 弹一次性提示，点确定 `consumeNotice()`。⚠️ 选择器只选 stable ref（`s.pendingCelebrations`/`s.pendingNotice`/`s.actions`），队首在 render body 取。

```tsx
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing } from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { CelebrationKind } from '../../domain/types';
import { colors, pixelBorder, pixelShadow, space } from '../theme';
import { PixelText, PixelButton } from './Pixel';

const TEXT: Record<CelebrationKind, { title: string; color: string }> = {
  levelUp: { title: 'LEVEL UP!', color: colors.gold },
  perfectDay: { title: '每日全清！🎁', color: colors.success },
  perfectWeek: { title: '每周全清！🏆', color: colors.success },
  graduation: { title: '试炼毕业！🎓', color: colors.exp },
  bossDefeated: { title: 'BOSS 击杀！☠', color: colors.danger },
};

export function CelebrationOverlay() {
  const pending = useGameStore((s) => s.pendingCelebrations);
  const notice = useGameStore((s) => s.pendingNotice);
  const actions = useGameStore((s) => s.actions);
  const head = pending[0]; // render body 取队首，稳定

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    if (!head) return;
    opacity.value = 0;
    scale.value = 0.6;
    opacity.value = withSequence(withTiming(1, { duration: 200 }), withDelay(700, withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }, (fin) => { if (fin) runOnJS(actions.consumeCelebration)(); })));
    scale.value = withSequence(withTiming(1.1, { duration: 200 }), withTiming(1, { duration: 150 }));
  }, [head, pending.length]); // 队首变化 / 队列推进时重播

  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <>
      {head ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ backgroundColor: colors.bgPanel, paddingVertical: space(4), paddingHorizontal: space(6) }, pixelBorder, pixelShadow, aStyle]}>
            {/* 用 body 字体（Zpix，覆盖中英数）：标题含中文，不能用 display(Press Start 2P，无 CJK) */}
            <PixelText style={{ color: TEXT[head].color, fontSize: 20, textAlign: 'center' }}>{TEXT[head].title}</PixelText>
          </Animated.View>
        </View>
      ) : null}

      {notice === 'longAbsence' ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: space(4) }}>
          <View style={[{ backgroundColor: colors.bgPanel, padding: space(3), gap: space(2), maxWidth: 420 }, pixelBorder, pixelShadow]}>
            <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>欢迎回来，冒险者</PixelText>
            <PixelText style={{ color: colors.ink }}>检测到你已离开较长时间。暂停期间已免除全部金币惩罚，但试炼连击按保护规则处理（请假/冻结卡用尽则归零）。</PixelText>
            <PixelButton label="知道了" color={colors.success} onPress={() => actions.consumeNotice()} />
          </View>
        </View>
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: 在 `src/ui/navigation.tsx` 根挂载 overlay（给出整文件最终形态）**

> 经 Task 4-7 已把 4 个占位逐个换成真屏，本步再外包一层 `flex:1` 容器并把 `<CelebrationOverlay />` 作为同级最后节点（绝对覆盖在导航之上）。下面是 `navigation.tsx` 的**完整最终内容**，直接整文件替换：

```tsx
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from './theme';
import { TopStatusBar } from './components/TopStatusBar';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { QuestsScreen } from './screens/QuestsScreen';
import { TrialsScreen } from './screens/TrialsScreen';
import { BossScreen } from './screens/BossScreen';
import { ShopScreen } from './screens/ShopScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const ICON: Record<string, string> = { 委托: '📜', 试炼: '🎯', 讨伐: '👹', 商店: '🏪', 设置: '⚙️' };

export function RootNavigation() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <NavigationContainer>
        <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
          <TopStatusBar />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: { backgroundColor: colors.bgPanel, borderTopWidth: 3, borderTopColor: colors.border },
              tabBarActiveTintColor: colors.gold,
              tabBarInactiveTintColor: colors.ink,
              tabBarIcon: () => null,
              tabBarLabel: `${ICON[route.name] ?? ''} ${route.name}`,
            })}
          >
            <Tab.Screen name="委托" component={QuestsScreen} />
            <Tab.Screen name="试炼" component={TrialsScreen} />
            <Tab.Screen name="讨伐" component={BossScreen} />
            <Tab.Screen name="商店" component={ShopScreen} />
            <Tab.Screen name="设置" component={SettingsScreen} />
          </Tab.Navigator>
        </View>
      </NavigationContainer>
      <CelebrationOverlay />
    </View>
  );
}
```

> 注：`Placeholder` 已不再被引用（其 import 在 Task 7 删除）。`Placeholder.tsx` 文件保留备用。

- [ ] **Step 3: 类型检查 + expo-web 截图验收**

Run: `npx tsc --noEmit` — Expected: 无错误。
Run（后台）：`npm run web`，核对：
1. 「委托」屏完成全部每日 → 屏幕中央弹「每日全清！🎁」缩放闪现约 1.2s 后消失。
2. 多次打卡攒够经验触发升级 → 弹「LEVEL UP!」（Press Start 2P）。
3.（可临时把某 daily 的 exp 调大或连续打卡）队列多个庆祝时**逐个**播放、最终清空（`pendingCelebrations` 归零）。
4. longAbsence：到「设置」导入一个 `player.lastActiveDate` 为 10 天前的存档（或改系统日期重启）触发 rollover → 弹长假提示，点「知道了」消失且不再复现。**无红屏、无 React #185。**

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat(ui): add CelebrationOverlay (consume pendingCelebrations) + long-absence notice"
```

---

### Task 9: 打卡浮字动画 `GainFloat`（reanimated）

**Files:**
- Create: `src/ui/components/GainFloat.tsx`
- Modify: `src/ui/screens/QuestsScreen.tsx`（接入浮字）
- Modify: `src/ui/screens/TrialsScreen.tsx`（接入浮字）

- [ ] **Step 1: 写 `src/ui/components/GainFloat.tsx`（hook + 浮字节点）**

> `useGainFloat()` 返回 `{ floatNode, fire }`。`fire(text)` 触发一段上浮+淡出；`floatNode` 绝对定位在屏幕上方居中。打卡后从最新回执读金币/经验增量再 `fire`。

```tsx
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, runOnJS, Easing } from 'react-native-reanimated';
import { colors, space } from '../theme';
import { PixelText } from './Pixel';

export function useGainFloat() {
  const [text, setText] = useState<string | null>(null);
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);

  const clear = () => setText(null);
  const fire = (t: string) => {
    setText(t);
    y.value = 0;
    opacity.value = 0;
    opacity.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }, (fin) => { if (fin) runOnJS(clear)(); }));
    y.value = withTiming(-space(10), { duration: 800, easing: Easing.out(Easing.quad) });
  };

  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));

  const floatNode = text ? (
    <View pointerEvents="none" style={{ position: 'absolute', top: space(2), left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
      <Animated.View style={aStyle}>
        <PixelText style={{ color: colors.gold, fontWeight: 'bold', fontSize: 18 }}>{text}</PixelText>
      </Animated.View>
    </View>
  ) : null;

  return { floatNode, fire };
}
```

- [ ] **Step 2: `QuestsScreen.tsx` 接入浮字**

在组件内取 `const { floatNode, fire } = useGainFloat();`，把打卡封装成读取增量再触发：

```tsx
// import 顶部加：
import { useGainFloat } from '../components/GainFloat';

// 组件内、return 之前加：
const { floatNode, fire } = useGainFloat();
const checkInWithFloat = (kind: 'daily' | 'weekly', id: string) => {
  const before = useGameStore.getState().player;
  if (kind === 'daily') actions.checkInDaily(id); else actions.checkInWeekly(id);
  const after = useGameStore.getState().player;
  const dg = after.gold - before.gold;
  const de = after.expTotal - before.expTotal;
  if (dg !== 0 || de !== 0) fire(`🪙+${dg} ✨+${de}`);
};
```

把两处「打卡」按钮的 `onPress` 由 `() => actions.checkInDaily(d.id)` / `() => actions.checkInWeekly(w.id)` 改为 `() => checkInWithFloat('daily', d.id)` / `() => checkInWithFloat('weekly', w.id)`；并在最外层 `<ScrollView>` **外面**包一个 `<View style={{ flex: 1 }}>`，把 `{floatNode}` 放在 ScrollView 同级（浮在内容之上）：

```tsx
return (
  <View style={{ flex: 1 }}>
    {floatNode}
    <ScrollView /* ...原样... */>
      {/* ...原内容... */}
    </ScrollView>
  </View>
);
```

> 注意：增量从 `expTotal` 取（撤销不在此路径，浮字只在打卡正向触发）。全清奖励也会算进 `dg/de`（顺带飘出，符合"全清更多金币"的反馈），可接受。

- [ ] **Step 3: `TrialsScreen.tsx` 接入浮字（同法）**

`import { useGainFloat } from '../components/GainFloat';`；组件内 `const { floatNode, fire } = useGainFloat();`；新增：

```tsx
const checkInTrialWithFloat = (id: string) => {
  const before = useGameStore.getState().player;
  actions.checkInTrial(id);
  const after = useGameStore.getState().player;
  const dg = after.gold - before.gold;
  const de = after.expTotal - before.expTotal;
  if (dg !== 0 || de !== 0) fire(`🪙+${dg} ✨+${de}`);
};
```

把「今日打卡」按钮 `onPress` 改为 `() => checkInTrialWithFloat(t.id)`；最外层用 `<View style={{ flex: 1 }}>{floatNode}<ScrollView>...</ScrollView></View>` 包裹（同 Step 2）。

- [ ] **Step 4: 类型检查 + expo-web 截图验收**

Run: `npx tsc --noEmit` — Expected: 无错误。
Run（后台）：`npm run web`，在「委托」/「试炼」屏点打卡 → 屏幕上方飘出「🪙+N ✨+M」上浮淡出约 0.8s；顶部金币/经验同步增加。**无红屏、无 React #185。**

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat(ui): add reanimated gain-float on check-in (Quests/Trials)"
```

---

### Task 10: Phase 1 全量验收（expo-web 闭环 + 回归）

**Files:** 无（验收 + 可能的微调）

- [ ] **Step 1: 全量单测 + 类型回归**

Run: `npm test` — Expected: PASS（Plan 1/2 的 72 + 本计划新增 archived/migrate/store 用例，全绿）。
Run: `npx tsc --noEmit` — Expected: 无错误。

- [ ] **Step 2: expo-web 端到端闭环截图（对照 spec §13 验收标准）**

Run（后台）：`npm run web`。逐项截图核对：
1. **导航**：5 Tab（委托/试炼/讨伐/商店/设置）均为真屏可切换；顶部状态栏像素字体、实时更新。
2. **委托闭环**：每日打卡 → 金币/经验浮字 + 顶部增加 → 撤销完整回退 → 全清触发「每日全清！」庆祝 + 奖励。
3. **升级**：攒够经验 → 「LEVEL UP!」全屏闪现；顶部 Lv 进位。
4. **试炼**：打卡推进 streak 与里程碑；新建/编辑/放弃可用；（连满 14 天路径）毕业 → 「试炼毕业！」+ 转每日任务。
5. **Boss**：完成关联任务扣血 → 跨阶段 chip 高亮发奖 → 击杀「BOSS 击杀！」；新建/编辑/归档可用。
6. **商店**：买冻结卡（金币门槛）；提现仪式确认。
7. **设置**：改数值即时生效（去商店验证）；导出/导入 JSON；清空重置。
8. **持久化**：刷新浏览器 → 金币/等级/打卡/试炼/Boss 状态保持；控制台无报错、无 React #185。
9. **跨天/长假**（改设备日期或导入构造存档）：跨天后旧打卡不可撤；长假触发提示且全免金币惩罚。

- [ ] **Step 3: 更新 STATUS.md（标记 Phase 1 完成）**

把 `docs/superpowers/STATUS.md` 的 Plan 3 行从 `⏳` 改为 `✅`，并在「当前状态」记一句：Phase 1 三份计划全部完成、待用户验收；验证基线更新（npm test 数量、tsc clean、expo-web 全闭环）。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "chore: verify Phase 1 full loop on expo-web; mark Plan 3 done in STATUS"
```

- [ ] **Step 5: 停下来等用户验收**

**不要**自动合并。向用户报告 Phase 1 完成 + 截图/验证证据，等用户验收后再用 `superpowers:finishing-a-development-branch` 合并回 `main`，并讨论 Phase 2/3。

---

## Plan 3 完成标准

- [ ] 领域/store 新增用例（archived 跳过、migrate 容忍、软归档/编辑/addBoss weights）全绿；全量 `npm test` 绿；`npx tsc --noEmit` clean。
- [ ] 试炼/讨伐/商店/设置四屏功能完整，5 Tab 全为真屏。
- [ ] 像素字体加载生效（Zpix body + Press Start 2P display），失败时优雅退回系统字体。
- [ ] `CelebrationOverlay` 逐个消费 `pendingCelebrations`；长假提示消费 `pendingNotice`；打卡浮字生效。
- [ ] 每屏 expo-web 截图验收通过，**全程无 React #185 白屏**。
- [ ] spec §13 四条验收标准全部可演示。

## Self-Review（写计划后自检，已执行）

- **Spec 覆盖**：§7.11 软归档/编辑（Task 1-2）、§8 四屏 + 动效（Task 4-9）、§9 像素字体（Task 3）、撤销/全清/庆祝消费（Task 8-9）、§13 验收（Task 10）均有任务。Boss 三阶段血条/比重奖励（§7.9 的 UI 呈现）在 Task 5。
- **占位符扫描**：无 TODO/“类似上文”；每段代码完整。字体下载有失败兜底。
- **类型一致**：`archived: boolean` 必填，所有构造点（生产 4 处 + 测试帮助/内联 8 处）已枚举；store 动作签名（`editTrial`/`editBoss`/`archiveBoss`/`addBoss.weights`）与各屏调用一致；组件名（`PixelText`/`PixelTextInput`/`PixelModal`/`ConfirmDialog`/`SectionTitle`/`useGainFloat`/`CelebrationOverlay`）在定义与使用处一致。
- **已知风险**：① Zpix ttf 依赖网络下载——有兜底；② reanimated 在 web 的动画——用标准 hooks，低风险；③ 选择器陷阱——每屏已用 stable-ref 模式并在验收中专门核对 React #185。
