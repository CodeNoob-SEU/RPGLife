# Phase 1 — Store / 持久化 / App 骨架 Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Plan 1 的纯领域引擎接成可运行的 App——Zustand+immer+persist 状态层、版本迁移、任务 CRUD、启动结算，加上 5 Tab 导航骨架、顶部常驻状态栏、以及一个可用的「委托」屏，形成「打卡→金币/经验变化→刷新仍在」的可验证闭环。

**Architecture:** 领域层（`src/domain/`，Plan 1，纯函数、已测）保持不变。新增 `src/store/`：`gameActions` 把领域纯函数包成 Zustand action（在 immer draft 上调用），`useGameStore` 加 `persist`（AsyncStorage）+ `migrate` + 启动 rehydrate→`processRollover`。UI 用 React Navigation 底部 5 Tab + 顶部状态栏，先做可用的「委托」屏，其余 4 屏占位（Plan 3 补全）。

**Tech Stack:** Expo SDK 56 / React Native 0.85 / React 19 / TypeScript；zustand + immer + @react-native-async-storage/async-storage；@react-navigation/native + bottom-tabs（+ react-native-screens、react-native-safe-area-context）；react-native-reanimated。测试沿用 Jest + ts-jest（`tsconfig.jest.json`）。

**Spec:** `docs/superpowers/specs/2026-05-31-pixel-rpg-habit-tracker-phase1-design.md`（本计划实现其 §5 持久化/迁移、§7.11 任务 CRUD、§8 导航与顶部状态栏 + 委托屏、§9 像素 token 基础）。

**Prereq:** Plan 1 已合并入 `main`（`src/domain/` 全套 + 64 测试绿）。本计划在 `main` 基础上新开分支执行。

**测试策略：** 纯逻辑（`migrate`、`idGen`、`gameActions`）走 Jest TDD（`gameActions` 用 zustand vanilla store 测，不引入 AsyncStorage/RN）。`useGameStore` 的 persist 与所有 UI 走 **`expo start --web` 运行时 + 截图**可视化验收（RN 组件在本环境不做单测）。

---

### Task 1: 安装依赖 + reanimated babel + expo-web 启动验证

**Files:**
- Modify: `package.json`（依赖）
- Create: `babel.config.js`
- Modify: `App.tsx`（临时验证内容）

- [ ] **Step 1: 安装运行时依赖**

Run:
```bash
npx expo install zustand immer @react-native-async-storage/async-storage @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context react-native-reanimated
```
Expected: 安装成功（`expo install` 会选择与 SDK 56 兼容的版本）。若 `npm` 缓存报 EACCES，使用项目根 `.npmrc`（已设 `cache=/tmp/rpglife-npm-cache`）。

- [ ] **Step 2: 创建 `babel.config.js`（reanimated 插件必须在最后）**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 3: 临时改 `App.tsx` 验证 web 能渲染**

```tsx
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1c2c' }}>
      <Text style={{ color: '#f7c948', fontSize: 24 }}>RPGLife boot OK</Text>
    </View>
  );
}
```

- [ ] **Step 4: 启动 expo-web 验证（人工/截图）**

Run（后台启动）：`npm run web`（即 `expo start --web`）
Expected: 浏览器打开本地地址，页面深蓝底显示金色 “RPGLife boot OK”。控制器用预览/浏览器工具截图确认。若 Metro 或 react-native-web 报错，在此停下排查（这是集成风险前置点）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: add store/nav/reanimated deps + verify expo-web boot"
```

---

### Task 2: 版本迁移 `migrate.ts`

**Files:**
- Create: `src/domain/migrate.ts`
- Create: `__tests__/migrate.test.ts`

- [ ] **Step 1: 写失败测试 `__tests__/migrate.test.ts`**

```ts
import { migrate } from '../src/domain/migrate';

test('migrate fills missing fields from a fresh state and forces version 1', () => {
  const result = migrate({ player: { gold: 999 }, version: 1 } as any, 1);
  expect(result.version).toBe(1);
  expect(result.player.gold).toBe(999);          // persisted value kept
  expect(result.player.level).toBe(1);           // missing field defaulted
  expect(result.pendingCelebrations).toEqual([]); // missing transient defaulted
  expect(Array.isArray(result.dailies)).toBe(true);
  expect(result.config.cashOutThreshold).toBe(1000); // config merged from defaults
});

test('migrate returns a full fresh state for garbage input', () => {
  const result = migrate(null, 0);
  expect(result.version).toBe(1);
  expect(result.dailies.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- migrate.test.ts`  — Expected: FAIL（找不到模块）。

- [ ] **Step 3: 写 `src/domain/migrate.ts`**

```ts
import { AppState } from './types';
import { createInitialState } from './initialState';

/**
 * Phase 1 只有 version 1。把持久化数据并到一份新初始 state 上：缺失的顶层字段用默认值补齐，
 * 已有字段保留。这样旧/残缺的存档能安全加载，也为 Phase 2 新增字段（更高 version）铺路。
 */
export function migrate(persisted: unknown, _fromVersion: number): AppState {
  const fresh = createInitialState(new Date());
  if (!persisted || typeof persisted !== 'object') return fresh;
  const p = persisted as Partial<AppState>;
  return {
    ...fresh,
    ...p,
    player: { ...fresh.player, ...(p.player ?? {}) },
    inventory: { ...fresh.inventory, ...(p.inventory ?? {}) },
    restDays: { ...fresh.restDays, ...(p.restDays ?? {}) },
    config: { ...fresh.config, ...(p.config ?? {}) },
    dailies: p.dailies ?? fresh.dailies,
    weeklies: p.weeklies ?? fresh.weeklies,
    trials: p.trials ?? fresh.trials,
    bosses: p.bosses ?? fresh.bosses,
    ledger: p.ledger ?? fresh.ledger,
    history: p.history ?? fresh.history,
    todayReceipts: p.todayReceipts ?? [],
    dailyPerfect: p.dailyPerfect ?? null,
    weeklyPerfect: p.weeklyPerfect ?? null,
    pendingCelebrations: p.pendingCelebrations ?? [],
    pendingNotice: p.pendingNotice ?? null,
    version: 1,
  };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- migrate.test.ts`  — Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat(domain): add version migration"
```

---

### Task 3: id 生成器 `idGen.ts`

**Files:**
- Create: `src/store/idGen.ts`
- Create: `__tests__/idGen.test.ts`

- [ ] **Step 1: 写失败测试 `__tests__/idGen.test.ts`**

```ts
import { genId } from '../src/store/idGen';

test('genId returns prefixed, unique ids', () => {
  const a = genId('daily');
  const b = genId('daily');
  expect(a.startsWith('daily-')).toBe(true);
  expect(b.startsWith('daily-')).toBe(true);
  expect(a).not.toBe(b);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- idGen.test.ts`  — Expected: FAIL。

- [ ] **Step 3: 写 `src/store/idGen.ts`**

```ts
let counter = 0;

/** 运行期唯一 id（用于 UI 新建任务/试炼/Boss）。非确定式，仅在 store 层使用。 */
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- idGen.test.ts`  — Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat(store): add runtime id generator"
```

---

### Task 4: 状态动作 `gameActions.ts`（包装领域纯函数 + CRUD）

**Files:**
- Create: `src/store/gameActions.ts`
- Create: `__tests__/store.test.ts`

- [ ] **Step 1: 写失败测试 `__tests__/store.test.ts`（用 zustand vanilla store，不引入 AsyncStorage/RN）**

```ts
import { createStore } from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';
import { createInitialState } from '../src/domain/initialState';
import { createGameActions, GameStore } from '../src/store/gameActions';

function makeStore() {
  return createStore<GameStore>()(
    immer((set, get) => ({
      ...createInitialState(new Date(2026, 5, 1)),
      actions: createGameActions(set as any, get as any), // cast bridges zustand immer-middleware set typing
    }))
  );
}
const now = new Date(2026, 5, 1);

test('checkInDaily action updates gold and exp', () => {
  const s = makeStore();
  s.getState().actions.checkInDaily('d-water', now); // seed daily: 10g/5xp
  expect(s.getState().player.gold).toBe(10);
  expect(s.getState().player.expTotal).toBe(5);
});

test('undo action reverses a check-in', () => {
  const s = makeStore();
  s.getState().actions.checkInDaily('d-water', now);
  const rid = s.getState().todayReceipts[0].rid;
  s.getState().actions.undo(rid, now);
  expect(s.getState().player.gold).toBe(0);
  expect(s.getState().todayReceipts).toHaveLength(0);
});

test('addDaily appends a daily with a generated id; archiveDaily archives it', () => {
  const s = makeStore();
  const before = s.getState().dailies.length;
  s.getState().actions.addDaily('冥想 10 分钟', 12, 6, '🧘');
  expect(s.getState().dailies.length).toBe(before + 1);
  const added = s.getState().dailies[s.getState().dailies.length - 1];
  expect(added.name).toBe('冥想 10 分钟');
  expect(added.id).toMatch(/^daily-/);
  s.getState().actions.archiveDaily(added.id);
  expect(s.getState().dailies.find((d) => d.id === added.id)!.archived).toBe(true);
});

test('setConfig patches config; consumeCelebration shifts the queue', () => {
  const s = makeStore();
  s.getState().actions.setConfig({ goldToYuanRate: 50 });
  expect(s.getState().config.goldToYuanRate).toBe(50);
  // trigger a perfect-day to enqueue a celebration: complete all 4 seed dailies
  ['d-water', 'd-exercise', 'd-read', 'd-sleep'].forEach((id) => s.getState().actions.checkInDaily(id, now));
  expect(s.getState().pendingCelebrations.length).toBeGreaterThan(0);
  const n = s.getState().pendingCelebrations.length;
  s.getState().actions.consumeCelebration();
  expect(s.getState().pendingCelebrations.length).toBe(n - 1);
});

test('reset restores a fresh initial state', () => {
  const s = makeStore();
  s.getState().actions.checkInDaily('d-water', now);
  s.getState().actions.reset(now);
  expect(s.getState().player.gold).toBe(0);
  expect(s.getState().todayReceipts).toHaveLength(0);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- store.test.ts`  — Expected: FAIL（找不到模块）。

- [ ] **Step 3: 写 `src/store/gameActions.ts`**

```ts
import { AppState, Config } from '../domain/types';
import { dateStr } from '../domain/dateUtils';
import { processRollover } from '../domain/settlement';
import {
  checkInDaily as domainCheckInDaily,
  checkInWeekly as domainCheckInWeekly,
  checkInTrial as domainCheckInTrial,
  undoCheckIn,
  buyFreezeCard as domainBuyFreezeCard,
  cashOut as domainCashOut,
} from '../domain/actions';
import { createInitialState } from '../domain/initialState';
import { genId } from './idGen';

const MILESTONES = [
  { day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 },
  { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 },
];

export interface GameActions {
  rollover: (now?: Date) => void;
  checkInDaily: (id: string, now?: Date) => void;
  checkInWeekly: (id: string, now?: Date) => void;
  checkInTrial: (id: string, now?: Date) => void;
  undo: (rid: string, now?: Date) => void;
  buyFreezeCard: (now?: Date) => void;
  cashOut: (amount: number, now?: Date) => void;
  addDaily: (name: string, gold: number, exp: number, icon?: string) => void;
  editDaily: (id: string, patch: Partial<{ name: string; gold: number; exp: number; icon: string }>) => void;
  archiveDaily: (id: string) => void;
  addWeekly: (name: string, gold: number, exp: number, icon?: string) => void;
  editWeekly: (id: string, patch: Partial<{ name: string; gold: number; exp: number; icon: string }>) => void;
  archiveWeekly: (id: string) => void;
  addTrial: (name: string, icon?: string, now?: Date) => void;
  archiveTrial: (id: string) => void;
  addBoss: (b: { name: string; icon?: string; maxHp: number; damagePerHit: number; totalRewardGold: number; totalRewardExp: number; linkedTaskIds: string[] }) => void;
  setConfig: (patch: Partial<Config>) => void;
  consumeCelebration: () => void;
  consumeNotice: () => void;
  importState: (data: AppState) => void;
  reset: (now?: Date) => void;
}

export type GameStore = AppState & { actions: GameActions };

type SetFn = (recipe: (s: GameStore) => void) => void;
type GetFn = () => GameStore;

export const createGameActions = (set: SetFn, _get: GetFn): GameActions => ({
  rollover: (now = new Date()) => set((s) => { processRollover(s, now); }),
  checkInDaily: (id, now = new Date()) => set((s) => { domainCheckInDaily(s, id, now); }),
  checkInWeekly: (id, now = new Date()) => set((s) => { domainCheckInWeekly(s, id, now); }),
  checkInTrial: (id, now = new Date()) => set((s) => { domainCheckInTrial(s, id, now); }),
  undo: (rid, now = new Date()) => set((s) => { undoCheckIn(s, rid, now); }),
  buyFreezeCard: (now = new Date()) => set((s) => { domainBuyFreezeCard(s, now); }),
  cashOut: (amount, now = new Date()) => set((s) => { domainCashOut(s, amount, now); }),

  addDaily: (name, gold, exp, icon = '📝') => set((s) => {
    s.dailies.push({ id: genId('daily'), name, gold, exp, icon, doneDate: null, archived: false });
  }),
  editDaily: (id, patch) => set((s) => { const d = s.dailies.find((x) => x.id === id); if (d) Object.assign(d, patch); }),
  archiveDaily: (id) => set((s) => { const d = s.dailies.find((x) => x.id === id); if (d) d.archived = true; }),

  addWeekly: (name, gold, exp, icon = '📝') => set((s) => {
    s.weeklies.push({ id: genId('weekly'), name, gold, exp, icon, doneWeek: null, archived: false });
  }),
  editWeekly: (id, patch) => set((s) => { const w = s.weeklies.find((x) => x.id === id); if (w) Object.assign(w, patch); }),
  archiveWeekly: (id) => set((s) => { const w = s.weeklies.find((x) => x.id === id); if (w) w.archived = true; }),

  addTrial: (name, icon = '🎯', now = new Date()) => set((s) => {
    s.trials.push({ id: genId('trial'), name, icon, startDate: dateStr(now), completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, milestones: MILESTONES.map((m) => ({ ...m })) });
  }),
  archiveTrial: (id) => set((s) => { s.trials = s.trials.filter((t) => t.id !== id); }),

  addBoss: (b) => set((s) => {
    s.bosses.push({ id: genId('boss'), name: b.name, icon: b.icon ?? '👹', maxHp: b.maxHp, hp: b.maxHp, damagePerHit: b.damagePerHit, totalRewardGold: b.totalRewardGold, totalRewardExp: b.totalRewardExp, weights: [0.2, 0.3, 0.5], linkedTaskIds: b.linkedTaskIds, clearedStages: [], defeated: false });
  }),

  setConfig: (patch) => set((s) => { Object.assign(s.config, patch); }),
  consumeCelebration: () => set((s) => { s.pendingCelebrations.shift(); }),
  consumeNotice: () => set((s) => { s.pendingNotice = null; }),
  importState: (data) => set((s) => { Object.assign(s, data); }),
  reset: (now = new Date()) => set((s) => { Object.assign(s, createInitialState(now)); }),
});
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- store.test.ts`  — Expected: PASS。

- [ ] **Step 5: 全量回归 + 提交**

Run: `npm test`  — Expected: PASS（含 Plan 1 的 64 + 新增）。
```bash
git add -A && git commit -m "feat(store): add game actions wrapping domain + CRUD"
```

---

### Task 5: Zustand store + persist `useGameStore.ts`

**Files:**
- Create: `src/store/useGameStore.ts`

> 说明：persist 的默认 merge 是浅合并 `{...currentState, ...persistedState}`；`currentState` 含 `actions`（来自初始 state），`persistedState` 经 `partialize` 已剔除 `actions`，故 rehydrate 后 actions 仍在、数据被存档覆盖。`migrate` 只返回数据。本文件依赖运行时 AsyncStorage，不写单测，由 Task 10 在 expo-web 运行时验收。

- [ ] **Step 1: 写 `src/store/useGameStore.ts`**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInitialState } from '../domain/initialState';
import { migrate as migrateState } from '../domain/migrate';
import { createGameActions, GameStore } from './gameActions';

export const useGameStore = create<GameStore>()(
  persist(
    immer((set, get) => ({
      ...createInitialState(new Date()),
      actions: createGameActions(set as any, get as any), // cast bridges zustand immer-middleware set typing
    })),
    {
      name: 'rpglife-state',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => {
        const { actions, ...data } = s; // 不持久化函数
        return data;
      },
      migrate: (persisted, fromVersion) => migrateState(persisted, fromVersion),
    }
  )
);
```

- [ ] **Step 2: 类型检查通过**

Run: `npx tsc --noEmit`  — Expected: 无错误。用**项目 `tsconfig.json`**（继承 expo base：jsx、bundler 解析、skipLibCheck，能覆盖 `.ts` 与 `.tsx`）检查整个 app。`tsconfig.jest.json` 仅供 `npm test` 的 ts-jest 使用，不用于 app 类型检查。本步关注 `useGameStore.ts` 自身无类型错误。

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat(store): add persisted zustand store (AsyncStorage)"
```

---

### Task 6: 像素主题 token + 基础组件 `theme.ts` / `Pixel.tsx`

**Files:**
- Create: `src/ui/theme.ts`
- Create: `src/ui/components/Pixel.tsx`

> 纯展示组件，不写单测；由 Task 10 在 expo-web 截图验收。

- [ ] **Step 1: 写 `src/ui/theme.ts`**

```ts
export const colors = {
  bgDeep: '#1a1c2c',
  bgPanel: '#2b2f4a',
  ink: '#f4f4f4',
  gold: '#f7c948',
  exp: '#5fcde4',
  success: '#6abe30',
  danger: '#d34b4b',
  accent: '#ef7d57',
  border: '#0d0e1a',
};

export const space = (n: number) => n * 4;
export const radius = 0; // 像素风：无圆角

/** 像素硬边框 + 硬投影（无模糊）。 */
export const pixelBorder = {
  borderWidth: 3,
  borderColor: colors.border,
};
export const pixelShadow = {
  shadowColor: colors.border,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
};
```

- [ ] **Step 2: 写 `src/ui/components/Pixel.tsx`**

```tsx
import { Pressable, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors, pixelBorder, pixelShadow, space } from '../theme';

export function PixelPanel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: colors.bgPanel, padding: space(3) }, pixelBorder, pixelShadow, style]}>
      {children}
    </View>
  );
}

export function PixelButton({ label, onPress, color = colors.accent, disabled }: { label: string; onPress: () => void; color?: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[{ backgroundColor: disabled ? colors.bgPanel : color, paddingVertical: space(2), paddingHorizontal: space(3), opacity: disabled ? 0.5 : 1 }, pixelBorder]}
    >
      <Text style={{ color: colors.ink, fontWeight: 'bold', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function PixelProgressBar({ value, max, color = colors.exp }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <View style={[{ height: space(4), backgroundColor: colors.bgDeep }, pixelBorder]}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}
```

- [ ] **Step 3: 类型检查 + 提交**

Run: `npx tsc --noEmit`  — Expected: 无 theme/Pixel 相关错误。
```bash
git add -A && git commit -m "feat(ui): add pixel theme tokens and base components"
```

---

### Task 7: 顶部常驻状态栏 `TopStatusBar.tsx`

**Files:**
- Create: `src/ui/components/TopStatusBar.tsx`

- [ ] **Step 1: 写 `src/ui/components/TopStatusBar.tsx`**

```tsx
import { Text, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { expNeeded } from '../../domain/economy';
import { colors, pixelBorder, space } from '../theme';
import { PixelProgressBar } from './Pixel';

export function TopStatusBar() {
  const player = useGameStore((s) => s.player);
  const gold = useGameStore((s) => s.player.gold);
  const config = useGameStore((s) => s.config);
  const need = expNeeded(player.level, config);
  return (
    <View style={[{ backgroundColor: colors.bgPanel, paddingTop: space(8), paddingBottom: space(2), paddingHorizontal: space(3), flexDirection: 'row', alignItems: 'center', gap: space(3) }, { borderBottomWidth: 3, borderColor: colors.border }]}>
      <View style={[{ width: space(10), height: space(10), backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' }, pixelBorder]}>
        <Text style={{ fontSize: 20 }}>🧙</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontWeight: 'bold' }}>{player.name}  Lv.{player.level}</Text>
        <PixelProgressBar value={player.exp} max={need} />
      </View>
      <Text style={{ color: colors.gold, fontWeight: 'bold' }}>🪙 {gold}</Text>
    </View>
  );
}
```

- [ ] **Step 2: 类型检查 + 提交**

Run: `npx tsc --noEmit`  — Expected: 无相关错误。
```bash
git add -A && git commit -m "feat(ui): add persistent top status bar bound to store"
```

---

### Task 8: 委托屏 `QuestsScreen.tsx`（每日/每周打卡 + 撤销 + 全清进度）

**Files:**
- Create: `src/ui/screens/QuestsScreen.tsx`

- [ ] **Step 1: 写 `src/ui/screens/QuestsScreen.tsx`**

```tsx
import { ScrollView, Text, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton } from '../components/Pixel';

export function QuestsScreen() {
  const dailies = useGameStore((s) => s.dailies.filter((d) => !d.archived));
  const weeklies = useGameStore((s) => s.weeklies.filter((w) => !w.archived));
  const todayReceipts = useGameStore((s) => s.todayReceipts);
  const actions = useGameStore((s) => s.actions);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const doneCount = dailies.filter((d) => d.doneDate === todayStr).length;
  const ridFor = (kind: string, id: string) => todayReceipts.find((r) => r.kind === kind && r.taskId === id)?.rid;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: space(3), gap: space(3) }}>
      <Text style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16 }}>每日委托</Text>
      <Text style={{ color: colors.ink }}>
        {doneCount}/{dailies.length} 完成{doneCount < dailies.length ? `（再完成 ${dailies.length - doneCount} 个解锁全清奖励）` : '　★ 全清达成'}
      </Text>
      {dailies.map((d) => {
        const done = d.doneDate === todayStr;
        const rid = ridFor('daily', d.id);
        return (
          <PixelPanel key={d.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <Text style={{ fontSize: 18 }}>{d.icon}</Text>
              <Text style={{ color: colors.ink, flex: 1 }}>{d.name}　🪙{d.gold} ✨{d.exp}</Text>
              {done && rid
                ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => actions.undo(rid)} />
                : <PixelButton label={done ? '已完成' : '打卡'} color={done ? colors.success : colors.success} disabled={done && !rid} onPress={() => actions.checkInDaily(d.id)} />}
            </View>
          </PixelPanel>
        );
      })}

      <Text style={{ color: colors.gold, fontWeight: 'bold', fontSize: 16, marginTop: space(2) }}>每周委托</Text>
      {weeklies.map((w) => {
        const rid = ridFor('weekly', w.id);
        const done = !!w.doneWeek;
        return (
          <PixelPanel key={w.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <Text style={{ fontSize: 18 }}>{w.icon}</Text>
              <Text style={{ color: colors.ink, flex: 1 }}>{w.name}　🪙{w.gold} ✨{w.exp}</Text>
              {done && rid
                ? <PixelButton label="撤销" color={colors.bgPanel} onPress={() => actions.undo(rid)} />
                : <PixelButton label={done ? '已完成' : '打卡'} color={colors.success} disabled={done && !rid} onPress={() => actions.checkInWeekly(w.id)} />}
            </View>
          </PixelPanel>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 2: 类型检查 + 提交**

Run: `npx tsc --noEmit`  — Expected: 无相关错误。
```bash
git add -A && git commit -m "feat(ui): add functional Quests screen (check-in + undo)"
```

---

### Task 9: 导航 + 占位屏 + `App.tsx` 启动接线

**Files:**
- Create: `src/ui/screens/Placeholder.tsx`
- Create: `src/ui/navigation.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: 写占位屏 `src/ui/screens/Placeholder.tsx`**

```tsx
import { Text, View } from 'react-native';
import { colors, space } from '../theme';

export function Placeholder({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center', padding: space(4) }}>
      <Text style={{ color: colors.ink, fontSize: 18 }}>{title}</Text>
      <Text style={{ color: colors.accent, marginTop: space(2) }}>（Plan 3 实现）</Text>
    </View>
  );
}
```

- [ ] **Step 2: 写 `src/ui/navigation.tsx`（5 Tab + 顶部状态栏）**

```tsx
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from './theme';
import { TopStatusBar } from './components/TopStatusBar';
import { QuestsScreen } from './screens/QuestsScreen';
import { Placeholder } from './screens/Placeholder';

const Tab = createBottomTabNavigator();
const Trials = () => <Placeholder title="试炼" />;
const Boss = () => <Placeholder title="讨伐 Boss" />;
const Shop = () => <Placeholder title="商店" />;
const Settings = () => <Placeholder title="设置" />;

const ICON: Record<string, string> = { 委托: '📜', 试炼: '🎯', 讨伐: '👹', 商店: '🏪', 设置: '⚙️' };

export function RootNavigation() {
  return (
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
          <Tab.Screen name="试炼" component={Trials} />
          <Tab.Screen name="讨伐" component={Boss} />
          <Tab.Screen name="商店" component={Shop} />
          <Tab.Screen name="设置" component={Settings} />
        </Tab.Navigator>
      </View>
    </NavigationContainer>
  );
}
```

- [ ] **Step 3: 改写 `App.tsx`（hydrate 门 → 启动结算 → 渲染）**

```tsx
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGameStore } from './src/store/useGameStore';
import { RootNavigation } from './src/ui/navigation';
import { colors } from './src/ui/theme';

export default function App() {
  const [hydrated, setHydrated] = useState(useGameStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useGameStore.persist.onFinishHydration(() => setHydrated(true));
    if (useGameStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated) useGameStore.getState().actions.rollover();
  }, [hydrated]);

  if (!hydrated) {
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

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit` — Expected: 无相关错误（导航/屏幕/App）。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat(ui): add bottom-tab navigation, placeholders, app bootstrap"
```

---

### Task 10: expo-web 运行时验收（人工 + 截图）

**Files:** 无（验收）

- [ ] **Step 1: 启动 web**

Run（后台）：`npm run web`
Expected: 应用启动无红屏。

- [ ] **Step 2: 截图核对以下闭环（控制器用预览/浏览器工具）**

1. 顶部状态栏显示 `冒险者 Lv.1`、经验条、`🪙 0`。
2. 底部 5 个 Tab（委托/试炼/讨伐/商店/设置）可点击切换；后 4 个显示占位文案。
3. 在「委托」屏点某个每日任务「打卡」→ 顶部金币、经验条**即时增加**；该项变「撤销」。
4. 点「撤销」→ 金币/经验**退回**。
5. 完成全部每日 → 出现「全清达成」文案、金币含全清奖励。
6. **刷新浏览器** → 已打卡状态、金币、等级**保持**（persist 生效）；控制台无报错。

- [ ] **Step 3: 全量单测回归**

Run: `npm test`  — Expected: PASS（Plan 1 的 64 + migrate/idGen/store 新增，全绿）。

- [ ] **Step 4: 提交（若验收中有微调）**

```bash
git add -A && git commit -m "chore: verify Plan 2 store+shell loop on expo-web"
```

---

## Plan 2 完成标准

- [ ] 纯逻辑单测（migrate / idGen / gameActions）全绿；全量 `npm test` 绿。
- [ ] `expo start --web` 启动正常，5 Tab 可导航，顶部状态栏绑定 store。
- [ ] 委托屏可打卡/撤销，金币/经验即时变化；浏览器刷新后状态保持（AsyncStorage persist + 启动 rollover）。
- [ ] 验收后进入 Plan 3（试炼/讨伐/商店/设置四屏 + 动画 + 像素细节打磨）。

## 延到 Plan 3
试炼屏、讨伐(Boss)屏、商店屏（冻结卡+提现）、设置屏（配置编辑/导出导入/重置）、reanimated 动画（金币飞行/升级/全清/Boss）、像素字体加载、CelebrationOverlay 消费 `pendingCelebrations`、`pendingNotice` 长时间未用提示。
