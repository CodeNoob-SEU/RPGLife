# Phase 1 — 领域核心 & 结算引擎 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 TDD 实现像素 RPG 习惯打卡 APP 的全部领域逻辑（结算引擎、试炼、Boss、可撤销打卡），全部为纯函数，Jest 全绿。

**Architecture:** `src/domain/` 内零 RN/Zustand/AsyncStorage 依赖的纯 TypeScript。状态变更函数签名为 `(state: AppState, ...args, now: Date) => void`——**原地修改传入的 state 对象**（Plan 2 的 Zustand store 用 immer `produce` 在 draft 上调用它们；单测直接构造 state、调用、断言）。`now: Date` 一律由调用方注入，保证确定性。id 用确定式拼接（`rid = ${kind}:${taskId}:${date}`），不使用随机数/系统时间，便于测试。

**Tech Stack:** TypeScript（strict）、Jest + ts-jest（纯 node 环境，不加载 RN）。Expo/RN 在 Plan 2 接入。

**Spec:** `docs/superpowers/specs/2026-05-31-pixel-rpg-habit-tracker-phase1-design.md`（本计划实现其中 §4 数据模型 与 §7 结算引擎全部子节）。

---

### Task 1: 项目脚手架 + 测试运行器

**Files:**
- Create: 整个 Expo 项目（经临时目录合并，保留既有 `.git`/`docs`/`.gitignore`）
- Create: `jest.config.js`
- Create: `__tests__/smoke.test.ts`
- Modify: `package.json`（加 test 脚本）

- [ ] **Step 1: 用临时目录脚手架 Expo（避免非空目录冲突），再合并回当前目录**

Run:
```bash
npx create-expo-app@latest .expo-init --template blank-typescript
rsync -a --exclude='.git' --exclude='node_modules' .expo-init/ ./
rm -rf .expo-init
npm install
```
Expected: 当前目录出现 `App.tsx`、`app.json`、`package.json`、`tsconfig.json`、`node_modules/`；`docs/` 与 `.git/` 仍在。

- [ ] **Step 2: 安装测试依赖**

Run:
```bash
npm install -D jest ts-jest @types/jest typescript
```
Expected: 安装成功，`package.json` devDependencies 含 jest/ts-jest/@types/jest。

- [ ] **Step 3: 写 `jest.config.js`**

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // ts-jest 用项目 tsconfig；domain 文件不含 JSX，纯 node 运行
};
```

- [ ] **Step 4: 在 `package.json` 的 "scripts" 加入 test 脚本**

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "test": "jest"
}
```

- [ ] **Step 5: 写冒烟测试 `__tests__/smoke.test.ts`**

```ts
test('jest runs', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 6: 运行测试，确认通过**

Run: `npm test`
Expected: PASS，1 个测试通过。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "chore: scaffold Expo + TS + Jest test runner"
```

---

### Task 2: 领域类型 `types.ts` + 测试工厂

**Files:**
- Create: `src/domain/types.ts`
- Create: `__tests__/factory.ts`
- Create: `__tests__/types.test.ts`

- [ ] **Step 1: 写类型测试 `__tests__/types.test.ts`（确保类型可用 + 工厂可构造合法 state）**

```ts
import { makeState } from './factory';

test('factory builds a valid initial-ish state', () => {
  const s = makeState();
  expect(s.version).toBe(1);
  expect(s.player.gold).toBe(0);
  expect(s.player.level).toBe(1);
  expect(Array.isArray(s.dailies)).toBe(true);
  expect(s.config.goldToYuanRate).toBe(100);
  expect(s.pendingCelebrations).toEqual([]);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- types.test.ts`
Expected: FAIL —— 找不到 `./factory` 模块。

- [ ] **Step 3: 写 `src/domain/types.ts`**

```ts
export type DateStr = string;  // 'YYYY-MM-DD'（本地时区）
export type WeekKey = string;  // 'YYYY-Www' ISO 周

export type CelebrationKind = 'levelUp' | 'perfectDay' | 'perfectWeek' | 'graduation' | 'bossDefeated';
export type LedgerType = 'earn' | 'penalty' | 'purchase' | 'cashout' | 'bonus' | 'undo';

export interface Daily { id: string; name: string; gold: number; exp: number; icon: string; doneDate: DateStr | null; archived: boolean; }
export interface Weekly { id: string; name: string; gold: number; exp: number; icon: string; doneWeek: WeekKey | null; archived: boolean; }
export interface Milestone { day: number; gold: number; exp: number; }
export interface Trial {
  id: string; name: string; icon: string; startDate: DateStr;
  completedDates: DateStr[]; protectedDates: DateStr[];
  streak: number; claimedMilestones: number[]; graduated: boolean; milestones: Milestone[];
}
export interface Boss {
  id: string; name: string; icon: string;
  maxHp: number; hp: number; damagePerHit: number;
  totalRewardGold: number; totalRewardExp: number;
  weights: [number, number, number];
  linkedTaskIds: string[]; clearedStages: number[]; defeated: boolean;
}
export interface LedgerEntry { ts: number; date: DateStr; type: LedgerType; amount: number; expAmount?: number; note: string; }
export interface HistoryEntry { status: 'perfect' | 'partial' | 'missed' | 'rest'; dailiesDone: number; dailiesTotal: number; goldNet: number; }
export interface Config {
  goldToYuanRate: number;
  perfectDailyBonus: number; perfectDailyBonusExp: number;
  perfectWeeklyBonus: number; perfectWeeklyBonusExp: number;
  missedDailyPenaltyRate: number; dailyPenaltyCap: number; weeklyPenaltyRate: number;
  freezeCardCost: number; cashOutThreshold: number; restDaysPerWeek: number;
  longAbsenceThreshold: number; levelExpBase: number; levelExpStep: number;
}
export interface BossHit { bossId: string; damage: number; clearedStages: number[]; defeated: boolean; }
export interface Receipt {
  rid: string; kind: 'daily' | 'weekly' | 'trial'; taskId: string; date: DateStr;
  goldDelta: number; expDelta: number;
  claimedMilestones?: number[]; graduation?: { addedDailyId: string }; bossHits?: BossHit[];
}
export interface Player { name: string; level: number; exp: number; expTotal: number; gold: number; avatarTier: number; lastActiveDate: DateStr | null; }
export interface AppState {
  version: number;
  player: Player;
  dailies: Daily[]; weeklies: Weekly[]; trials: Trial[]; bosses: Boss[];
  inventory: { freezeCards: number };
  restDays: { weekKey: WeekKey; remaining: number };
  config: Config;
  ledger: LedgerEntry[];
  history: Record<DateStr, HistoryEntry>;
  todayReceipts: Receipt[];
  dailyPerfect: { date: DateStr; gold: number; exp: number } | null;
  weeklyPerfect: { week: WeekKey; gold: number; exp: number } | null;
  pendingCelebrations: CelebrationKind[];
  pendingNotice: 'longAbsence' | null;
}
```

- [ ] **Step 4: 写测试工厂 `__tests__/factory.ts`**

```ts
import { AppState, Config } from '../src/domain/types';

export const testConfig: Config = {
  goldToYuanRate: 100,
  perfectDailyBonus: 50, perfectDailyBonusExp: 20,
  perfectWeeklyBonus: 200, perfectWeeklyBonusExp: 100,
  missedDailyPenaltyRate: 0.5, dailyPenaltyCap: 100, weeklyPenaltyRate: 0.5,
  freezeCardCost: 100, cashOutThreshold: 1000, restDaysPerWeek: 1,
  longAbsenceThreshold: 7, levelExpBase: 50, levelExpStep: 50,
};

/** 构造一个干净的空 state（无任务），供单测自由填充。 */
export function makeState(over: Partial<AppState> = {}): AppState {
  return {
    version: 1,
    player: { name: '冒险者', level: 1, exp: 0, expTotal: 0, gold: 0, avatarTier: 0, lastActiveDate: null },
    dailies: [], weeklies: [], trials: [], bosses: [],
    inventory: { freezeCards: 0 },
    restDays: { weekKey: '', remaining: 0 },
    config: { ...testConfig },
    ledger: [], history: {},
    todayReceipts: [], dailyPerfect: null, weeklyPerfect: null,
    pendingCelebrations: [], pendingNotice: null,
    ...over,
  };
}
```

- [ ] **Step 5: 运行，确认通过**

Run: `npm test -- types.test.ts`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat(domain): add AppState types and test factory"
```

---

### Task 3: 日期工具 `dateUtils.ts`

**Files:**
- Create: `src/domain/dateUtils.ts`
- Create: `__tests__/dateUtils.test.ts`

- [ ] **Step 1: 写测试 `__tests__/dateUtils.test.ts`**

```ts
import { dateStr, parseDate, weekKey, weekKeyStr, daysFrom, daysBetween, isWeekEnd } from '../src/domain/dateUtils';

test('dateStr formats local Y-M-D with padding', () => {
  expect(dateStr(new Date(2026, 0, 5))).toBe('2026-01-05'); // Jan=0
  expect(dateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
});

test('parseDate round-trips dateStr', () => {
  expect(dateStr(parseDate('2026-05-31'))).toBe('2026-05-31');
});

test('daysFrom is [last, today): includes last, excludes today', () => {
  expect(daysFrom('2026-06-01', '2026-06-03')).toEqual(['2026-06-01', '2026-06-02']);
  expect(daysFrom('2026-06-01', '2026-06-01')).toEqual([]);
});

test('daysFrom crosses month and year boundaries', () => {
  expect(daysFrom('2026-01-30', '2026-02-02')).toEqual(['2026-01-30', '2026-01-31', '2026-02-01']);
  expect(daysFrom('2026-12-31', '2027-01-02')).toEqual(['2026-12-31', '2027-01-01']);
});

test('daysBetween counts days', () => {
  expect(daysBetween('2026-06-01', '2026-06-09')).toBe(8);
  expect(daysBetween('2026-06-01', '2026-06-01')).toBe(0);
});

test('weekKey gives ISO week (Mon start)', () => {
  // 2026-01-01 is a Thursday -> ISO week 1 of 2026
  expect(weekKey(new Date(2026, 0, 1))).toBe('2026-W01');
  // 2026-06-01 is a Monday -> W23
  expect(weekKeyStr('2026-06-01')).toBe('2026-W23');
});

test('isWeekEnd is true only on Sunday', () => {
  expect(isWeekEnd('2026-06-07')).toBe(true);  // Sunday
  expect(isWeekEnd('2026-06-08')).toBe(false); // Monday
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- dateUtils.test.ts`
Expected: FAIL —— 找不到模块 `dateUtils`。

- [ ] **Step 3: 写 `src/domain/dateUtils.ts`**

```ts
import { DateStr, WeekKey } from './types';

export function dateStr(d: Date): DateStr {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight
}

/** ISO 8601 周（周一起始）。取本地 Y/M/D 当作 UTC 午夜计算，避免时区漂移。 */
export function weekKey(d: Date): WeekKey {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // 移到本周四
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function weekKeyStr(s: DateStr): WeekKey {
  return weekKey(parseDate(s));
}

export function daysFrom(last: DateStr, today: DateStr): DateStr[] {
  const res: DateStr[] = [];
  const cur = parseDate(last);
  const end = parseDate(today);
  while (cur < end) {
    res.push(dateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return res;
}

export function daysBetween(last: DateStr, today: DateStr): number {
  return daysFrom(last, today).length;
}

export function isWeekEnd(s: DateStr): boolean {
  return parseDate(s).getDay() === 0; // Sunday
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- dateUtils.test.ts`
Expected: PASS（全部 7 个测试）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat(domain): add dateUtils (local date, ISO week, day iteration)"
```

---

### Task 4: 经济基元 `economy.ts`（经验/升级/金币/称号）

**Files:**
- Create: `src/domain/economy.ts`
- Create: `__tests__/economy.test.ts`

- [ ] **Step 1: 写测试 `__tests__/economy.test.ts`**

```ts
import { makeState } from './factory';
import { expNeeded, applyExpDelta, addGold, pushCelebration, computeAvatarTier } from '../src/domain/economy';

test('expNeeded follows 50 + (level-1)*50', () => {
  const c = makeState().config;
  expect(expNeeded(1, c)).toBe(50);
  expect(expNeeded(2, c)).toBe(100);
  expect(expNeeded(3, c)).toBe(150);
});

test('applyExpDelta positive: single and chained level ups', () => {
  const s = makeState();
  applyExpDelta(s, 30);
  expect(s.player.level).toBe(1);
  expect(s.player.exp).toBe(30);
  applyExpDelta(s, 20); // total 50 -> level 2, exp 0
  expect(s.player.level).toBe(2);
  expect(s.player.exp).toBe(0);
  expect(s.player.expTotal).toBe(50);
  expect(s.pendingCelebrations).toContain('levelUp');
});

test('applyExpDelta positive: one delta crossing multiple levels', () => {
  const s = makeState();
  applyExpDelta(s, 200); // 50(->L2) + 100(->L3) = 150, remainder 50 sits in L3 (needs 150)
  expect(s.player.level).toBe(3);
  expect(s.player.exp).toBe(50);
  expect(s.player.expTotal).toBe(200);
});

test('applyExpDelta negative: chained level down, floors at L1/0', () => {
  const s = makeState();
  applyExpDelta(s, 200); // L3, exp 50, total 200
  applyExpDelta(s, -200); // full reverse
  expect(s.player.level).toBe(1);
  expect(s.player.exp).toBe(0);
  expect(s.player.expTotal).toBe(0);
});

test('addGold never goes negative and logs ledger', () => {
  const s = makeState();
  const now = new Date(2026, 4, 31);
  addGold(s, 30, 'earn', 'test', now);
  expect(s.player.gold).toBe(30);
  addGold(s, -100, 'penalty', 'big', now);
  expect(s.player.gold).toBe(0);
  expect(s.ledger).toHaveLength(2);
  expect(s.ledger[0]).toMatchObject({ date: '2026-05-31', type: 'earn', amount: 30 });
});

test('computeAvatarTier thresholds', () => {
  expect(computeAvatarTier(1)).toBe(0);
  expect(computeAvatarTier(5)).toBe(1);
  expect(computeAvatarTier(10)).toBe(2);
  expect(computeAvatarTier(20)).toBe(3);
});

test('pushCelebration appends', () => {
  const s = makeState();
  pushCelebration(s, 'levelUp');
  pushCelebration(s, 'perfectDay');
  expect(s.pendingCelebrations).toEqual(['levelUp', 'perfectDay']);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- economy.test.ts`
Expected: FAIL —— 找不到模块 `economy`。

- [ ] **Step 3: 写 `src/domain/economy.ts`**

```ts
import { AppState, Config, CelebrationKind, LedgerType } from './types';
import { dateStr } from './dateUtils';

export function expNeeded(level: number, config: Config): number {
  return config.levelExpBase + (level - 1) * config.levelExpStep;
}

export function computeAvatarTier(level: number): number {
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  if (level >= 5) return 1;
  return 0;
}

export function pushCelebration(state: AppState, c: CelebrationKind): void {
  state.pendingCelebrations.push(c);
}

/** 经验增减；delta 可为负（撤销用）。正向连环升级，负向连环降级，floor 于 L1/0。 */
export function applyExpDelta(state: AppState, delta: number): void {
  const p = state.player;
  p.expTotal = Math.max(0, p.expTotal + delta);
  let exp = p.exp + delta;
  let level = p.level;
  if (delta >= 0) {
    while (exp >= expNeeded(level, state.config)) {
      exp -= expNeeded(level, state.config);
      level += 1;
      pushCelebration(state, 'levelUp');
    }
  } else {
    while (exp < 0 && level > 1) {
      level -= 1;
      exp += expNeeded(level, state.config); // 回补"从 level 到 level+1"所需经验
    }
    if (exp < 0) exp = 0;
  }
  p.level = level;
  p.exp = exp;
  p.avatarTier = computeAvatarTier(level);
}

/** 金币增减（永不为负）+ 记 ledger。 */
export function addGold(state: AppState, n: number, type: LedgerType, note: string, now: Date): void {
  state.player.gold = Math.max(0, state.player.gold + n);
  state.ledger.push({ ts: now.getTime(), date: dateStr(now), type, amount: n, note });
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- economy.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat(domain): add economy (exp curve, level up/down, gold, tiers)"
```

---

### Task 5: 结算子函数 `settlement.ts`（名额/每日/每周/历史）

**Files:**
- Create: `src/domain/settlement.ts`
- Create: `__tests__/settlement.test.ts`

- [ ] **Step 1: 写测试 `__tests__/settlement.test.ts`**

```ts
import { makeState } from './factory';
import { Daily, Weekly } from '../src/domain/types';
import { ensureRestDayQuota, settleDailies, settleWeeklies, recordHistory } from '../src/domain/settlement';

const D = (g: number, doneDate: string | null): Daily =>
  ({ id: 'd' + g + (doneDate ?? ''), name: 'd', gold: g, exp: 0, icon: '', doneDate, archived: false });
const now = new Date(2026, 5, 2);

test('ensureRestDayQuota refills only when week changes (idempotent)', () => {
  const s = makeState();
  ensureRestDayQuota(s, '2026-W23');
  expect(s.restDays).toEqual({ weekKey: '2026-W23', remaining: 1 });
  s.restDays.remaining = 0;
  ensureRestDayQuota(s, '2026-W23'); // same week -> no refill
  expect(s.restDays.remaining).toBe(0);
  ensureRestDayQuota(s, '2026-W24'); // new week -> refill
  expect(s.restDays.remaining).toBe(1);
});

test('settleDailies penalizes incomplete at 50%, floors, sums', () => {
  const s = makeState();
  s.player.gold = 100;
  s.dailies = [D(10, '2026-06-01'), D(20, null), D(30, null)]; // 2 incomplete on 06-01
  settleDailies(s, '2026-06-01', now);
  // floor(20*0.5)+floor(30*0.5) = 10+15 = 25
  expect(s.player.gold).toBe(75);
  expect(s.ledger[0]).toMatchObject({ date: '2026-06-01', type: 'penalty', amount: -25 });
});

test('settleDailies caps at dailyPenaltyCap', () => {
  const s = makeState();
  s.player.gold = 500;
  s.dailies = [D(300, null), D(300, null)]; // floor sum = 300, cap 100
  settleDailies(s, '2026-06-01', now);
  expect(s.player.gold).toBe(400);
});

test('settleDailies never below zero', () => {
  const s = makeState();
  s.player.gold = 5;
  s.dailies = [D(100, null)]; // penalty 50 capped... 50 > gold 5
  settleDailies(s, '2026-06-01', now);
  expect(s.player.gold).toBe(0);
});

test('settleDailies all-done -> no penalty, no ledger', () => {
  const s = makeState();
  s.player.gold = 100;
  s.dailies = [D(10, '2026-06-01')];
  settleDailies(s, '2026-06-01', now);
  expect(s.player.gold).toBe(100);
  expect(s.ledger).toHaveLength(0);
});

test('settleWeeklies penalizes incomplete weeklies for the week of D', () => {
  const s = makeState();
  s.player.gold = 200;
  const W = (g: number, done: string | null): Weekly =>
    ({ id: 'w' + g, name: 'w', gold: g, exp: 0, icon: '', doneWeek: done, archived: false });
  s.weeklies = [W(100, '2026-W23'), W(80, null)]; // 06-07 is Sunday of W23
  settleWeeklies(s, '2026-06-07', now); // floor(80*0.5)=40
  expect(s.player.gold).toBe(160);
  expect(s.ledger[0]).toMatchObject({ date: '2026-06-07', type: 'penalty', amount: -40 });
});

test('recordHistory computes status and goldNet from ledger of that date', () => {
  const s = makeState();
  s.dailies = [D(10, '2026-06-01'), D(20, null)];
  s.ledger = [
    { ts: 0, date: '2026-06-01', type: 'earn', amount: 10, note: '' },
    { ts: 0, date: '2026-06-01', type: 'penalty', amount: -10, note: '' },
  ];
  recordHistory(s, '2026-06-01', false);
  expect(s.history['2026-06-01']).toEqual({ status: 'partial', dailiesDone: 1, dailiesTotal: 2, goldNet: 0 });
});

test('recordHistory: perfect, missed, forceRest, and no-dailies', () => {
  const s = makeState();
  s.dailies = [D(10, '2026-06-01')];
  recordHistory(s, '2026-06-01', false);
  expect(s.history['2026-06-01'].status).toBe('perfect');

  const s2 = makeState();
  s2.dailies = [D(10, null)];
  recordHistory(s2, '2026-06-01', false);
  expect(s2.history['2026-06-01'].status).toBe('missed');

  const s3 = makeState();
  s3.dailies = [D(10, null)];
  recordHistory(s3, '2026-06-01', true);
  expect(s3.history['2026-06-01'].status).toBe('rest');

  const s4 = makeState(); // no dailies
  recordHistory(s4, '2026-06-01', false);
  expect(s4.history['2026-06-01'].status).toBe('rest');
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- settlement.test.ts`
Expected: FAIL —— 找不到模块 `settlement`。

- [ ] **Step 3: 写 `src/domain/settlement.ts`（本任务只实现 4 个子函数；processRollover/settleTrials 在后续任务追加）**

```ts
import { AppState, DateStr, WeekKey } from './types';
import { weekKeyStr } from './dateUtils';

export function ensureRestDayQuota(state: AppState, wk: WeekKey): void {
  if (state.restDays.weekKey !== wk) {
    state.restDays = { weekKey: wk, remaining: state.config.restDaysPerWeek };
  }
}

export function settleDailies(state: AppState, D: DateStr, now: Date): void {
  const incomplete = state.dailies.filter((d) => !d.archived && d.doneDate !== D);
  let penalty = incomplete.reduce((sum, d) => sum + Math.floor(d.gold * state.config.missedDailyPenaltyRate), 0);
  penalty = Math.min(penalty, state.config.dailyPenaltyCap);
  if (penalty > 0) {
    state.player.gold = Math.max(0, state.player.gold - penalty);
    state.ledger.push({ ts: now.getTime(), date: D, type: 'penalty', amount: -penalty, note: `漏做每日任务 x${incomplete.length}` });
  }
}

export function settleWeeklies(state: AppState, D: DateStr, now: Date): void {
  const week = weekKeyStr(D);
  const incomplete = state.weeklies.filter((w) => !w.archived && w.doneWeek !== week);
  const penalty = incomplete.reduce((sum, w) => sum + Math.floor(w.gold * state.config.weeklyPenaltyRate), 0);
  if (penalty > 0) {
    state.player.gold = Math.max(0, state.player.gold - penalty);
    state.ledger.push({ ts: now.getTime(), date: D, type: 'penalty', amount: -penalty, note: `漏做每周任务 x${incomplete.length}` });
  }
}

export function recordHistory(state: AppState, D: DateStr, forceRest: boolean): void {
  const active = state.dailies.filter((d) => !d.archived);
  const total = active.length;
  const done = active.filter((d) => d.doneDate === D).length;
  const goldNet = state.ledger.filter((l) => l.date === D).reduce((sum, l) => sum + l.amount, 0);
  const status = forceRest ? 'rest' : total === 0 ? 'rest' : done === total ? 'perfect' : done === 0 ? 'missed' : 'partial';
  state.history[D] = { status, dailiesDone: done, dailiesTotal: total, goldNet };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- settlement.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat(domain): add daily/weekly settlement, rest-day quota, history"
```

---

### Task 6: 试炼连击 `trials.ts`（computeStreak + settleTrials）

**Files:**
- Create: `src/domain/trials.ts`
- Create: `__tests__/trials.test.ts`

- [ ] **Step 1: 写测试 `__tests__/trials.test.ts`**

```ts
import { makeState } from './factory';
import { Trial } from '../src/domain/types';
import { computeStreak, settleTrials } from '../src/domain/trials';

const trial = (over: Partial<Trial> = {}): Trial => ({
  id: 't1', name: '背单词', icon: '', startDate: '2026-06-01',
  completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [],
  graduated: false,
  milestones: [{ day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 }, { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 }],
  ...over,
});

test('computeStreak counts consecutive run ending at latest set-day <= asOf', () => {
  const t = trial({ completedDates: ['2026-06-01', '2026-06-02', '2026-06-03'] });
  expect(computeStreak(t, '2026-06-03')).toBe(3);
  expect(computeStreak(t, '2026-06-05')).toBe(3); // latest <= asOf is 06-03
});

test('computeStreak: protected days count, gaps stop the run', () => {
  const t = trial({ completedDates: ['2026-06-01', '2026-06-03'], protectedDates: ['2026-06-02'] });
  expect(computeStreak(t, '2026-06-03')).toBe(3);
  const t2 = trial({ completedDates: ['2026-06-01', '2026-06-04'] }); // gap at 06-02/03
  expect(computeStreak(t2, '2026-06-04')).toBe(1);
  expect(computeStreak(trial(), '2026-06-03')).toBe(0); // empty
});

test('settleTrials: rest-day protects before freeze card', () => {
  const s = makeState();
  s.restDays = { weekKey: '2026-W23', remaining: 1 };
  s.inventory.freezeCards = 1;
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 1 })];
  settleTrials(s, '2026-06-02'); // missed 06-02 (a W23 day)
  expect(s.restDays.remaining).toBe(0);
  expect(s.inventory.freezeCards).toBe(1); // not touched
  expect(s.trials[0].protectedDates).toContain('2026-06-02');
});

test('settleTrials: freeze card used after rest quota exhausted', () => {
  const s = makeState();
  s.restDays = { weekKey: '2026-W23', remaining: 0 };
  s.inventory.freezeCards = 1;
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 1 })];
  settleTrials(s, '2026-06-02');
  expect(s.inventory.freezeCards).toBe(0);
  expect(s.trials[0].protectedDates).toContain('2026-06-02');
});

test('settleTrials: no protection -> streak 0 and claimedMilestones cleared', () => {
  const s = makeState();
  s.restDays = { weekKey: '2026-W23', remaining: 0 };
  s.inventory.freezeCards = 0;
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 3, claimedMilestones: [1, 3] })];
  settleTrials(s, '2026-06-02');
  expect(s.trials[0].streak).toBe(0);
  expect(s.trials[0].claimedMilestones).toEqual([]);
});

test('settleTrials: skips done-that-day, before-start, and graduated', () => {
  const s = makeState();
  s.restDays = { weekKey: '2026-W23', remaining: 0 };
  s.trials = [
    trial({ id: 'done', completedDates: ['2026-06-02'], streak: 1 }),
    trial({ id: 'future', startDate: '2026-06-10', streak: 0 }),
    trial({ id: 'grad', graduated: true, streak: 5 }),
  ];
  settleTrials(s, '2026-06-02');
  expect(s.trials[0].streak).toBe(1);
  expect(s.trials[1].streak).toBe(0);
  expect(s.trials[2].streak).toBe(5);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- trials.test.ts`
Expected: FAIL —— 找不到模块 `trials`。

- [ ] **Step 3: 写 `src/domain/trials.ts`**

```ts
import { AppState, DateStr, Trial } from './types';
import { dateStr, parseDate, weekKeyStr } from './dateUtils';

/** 以 (completedDates ∪ protectedDates) 中 ≤asOf 的最近一天为终点，向前数连续天数。 */
export function computeStreak(t: Trial, asOf: DateStr): number {
  const set = new Set<DateStr>([...t.completedDates, ...t.protectedDates]);
  let latest: DateStr | null = null;
  for (const day of set) {
    if (day <= asOf && (latest === null || day > latest)) latest = day;
  }
  if (latest === null) return 0;
  let count = 0;
  const cur = parseDate(latest);
  while (set.has(dateStr(cur))) {
    count += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return count;
}

/** 结算过去某日 D 未打卡的非毕业试炼：请假名额优先于冻结卡，用尽则断签+清里程碑。 */
export function settleTrials(state: AppState, D: DateStr): void {
  for (const t of state.trials) {
    if (t.graduated) continue;
    if (D < t.startDate) continue;
    if (t.completedDates.includes(D)) continue;
    const wk = weekKeyStr(D);
    if (state.restDays.remaining > 0 && state.restDays.weekKey === wk) {
      state.restDays.remaining -= 1;
      t.protectedDates.push(D);
    } else if (state.inventory.freezeCards > 0) {
      state.inventory.freezeCards -= 1;
      t.protectedDates.push(D);
    } else {
      t.streak = 0;
      t.claimedMilestones = [];
    }
  }
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- trials.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat(domain): add trial streak computation and settlement"
```

---

### Task 7: 跨天结算引擎 `processRollover`（含长时间未用守卫）

**Files:**
- Modify: `src/domain/settlement.ts`（追加 `processRollover`）
- Create: `__tests__/rollover.test.ts`

- [ ] **Step 1: 写测试 `__tests__/rollover.test.ts`**

```ts
import { makeState } from './factory';
import { Daily } from '../src/domain/types';
import { processRollover } from '../src/domain/settlement';

const D = (id: string, g: number, doneDate: string | null): Daily =>
  ({ id, name: id, gold: g, exp: 0, icon: '', doneDate, archived: false });

test('first run only sets lastActiveDate and rest quota', () => {
  const s = makeState();
  processRollover(s, new Date(2026, 5, 1));
  expect(s.player.lastActiveDate).toBe('2026-06-01');
  expect(s.restDays.weekKey).toBe('2026-W23');
  expect(s.ledger).toHaveLength(0);
});

test('same day is a no-op', () => {
  const s = makeState();
  s.player.lastActiveDate = '2026-06-01';
  s.dailies = [D('a', 20, null)];
  processRollover(s, new Date(2026, 5, 1));
  expect(s.ledger).toHaveLength(0);
});

test('one day gap settles that single day', () => {
  const s = makeState();
  s.player.gold = 100;
  s.player.lastActiveDate = '2026-06-01';
  s.dailies = [D('a', 20, null)]; // missed on 06-01
  processRollover(s, new Date(2026, 5, 2));
  expect(s.player.gold).toBe(90); // floor(20*0.5)=10
  expect(s.player.lastActiveDate).toBe('2026-06-02');
  expect(s.history['2026-06-01'].status).toBe('missed');
  expect(s.todayReceipts).toEqual([]);
});

test('multi-day gap settles each elapsed day in order', () => {
  const s = makeState();
  s.player.gold = 100;
  s.player.lastActiveDate = '2026-06-01';
  s.dailies = [D('a', 20, null)];
  processRollover(s, new Date(2026, 5, 4)); // settles 06-01,06-02,06-03 => 3*10
  expect(s.player.gold).toBe(70);
  expect(Object.keys(s.history)).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
});

test('crossing week settles weeklies on Sunday and refills rest quota', () => {
  const s = makeState();
  s.player.gold = 200;
  s.player.lastActiveDate = '2026-06-07'; // Sunday of W23
  s.weeklies = [{ id: 'w', name: 'w', gold: 100, exp: 0, icon: '', doneWeek: null, archived: false }];
  processRollover(s, new Date(2026, 5, 8)); // settle 06-07 (week end) -> weekly penalty 50
  expect(s.player.gold).toBe(150);
  expect(s.restDays.weekKey).toBe('2026-W24');
});

test('long absence (>7 days) waives gold penalties, marks rest, sets notice', () => {
  const s = makeState();
  s.player.gold = 100;
  s.player.lastActiveDate = '2026-06-01';
  s.dailies = [D('a', 20, null)];
  processRollover(s, new Date(2026, 5, 12)); // gap 11 > 7
  expect(s.player.gold).toBe(100); // no penalty
  expect(s.pendingNotice).toBe('longAbsence');
  expect(s.history['2026-06-01'].status).toBe('rest');
});

test('rollover clears yesterday todayReceipts', () => {
  const s = makeState();
  s.player.lastActiveDate = '2026-06-01';
  s.todayReceipts = [{ rid: 'x', kind: 'daily', taskId: 'a', date: '2026-06-01', goldDelta: 10, expDelta: 5 }];
  processRollover(s, new Date(2026, 5, 2));
  expect(s.todayReceipts).toEqual([]);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- rollover.test.ts`
Expected: FAIL —— `processRollover` 未导出。

- [ ] **Step 3: 在 `src/domain/settlement.ts` 顶部补充 import，并追加 `processRollover`**

把文件顶部第二行的 import（原 `import { weekKeyStr } from './dateUtils';`）替换为下面两行（types 那行不变）：
```ts
import { dateStr, weekKey, weekKeyStr, daysFrom, daysBetween, isWeekEnd } from './dateUtils';
import { settleTrials } from './trials';
```

在文件末尾追加：
```ts
export function processRollover(state: AppState, now: Date): void {
  const today = dateStr(now);
  const last = state.player.lastActiveDate;
  if (last === null) {
    state.player.lastActiveDate = today;
    ensureRestDayQuota(state, weekKey(now));
    return;
  }
  if (today === last) return;

  state.todayReceipts = []; // 跨天 -> 清空回执（撤销天然限当天）
  const gap = daysBetween(last, today);
  const longAbsence = gap > state.config.longAbsenceThreshold;

  for (const D of daysFrom(last, today)) {
    ensureRestDayQuota(state, weekKeyStr(D));
    if (!longAbsence) settleDailies(state, D, now);
    settleTrials(state, D);
    if (isWeekEnd(D) && !longAbsence) settleWeeklies(state, D, now);
    recordHistory(state, D, longAbsence);
  }

  ensureRestDayQuota(state, weekKey(now));
  if (longAbsence) state.pendingNotice = 'longAbsence';
  state.player.lastActiveDate = today;
}
```

> `dateStr` 已在本步的 import 中引入；`settleDailies`/`settleWeeklies`/`recordHistory`/`ensureRestDayQuota` 都在同文件，直接调用。

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- rollover.test.ts`
Expected: PASS（7 个测试）。

- [ ] **Step 5: 运行全部测试，确认无回归**

Run: `npm test`
Expected: PASS（全部文件）。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat(domain): add processRollover with long-absence guard"
```

---

### Task 8: 实时打卡（每日/每周）+ 全清奖励 `actions.ts`

**Files:**
- Create: `src/domain/actions.ts`
- Create: `__tests__/checkin.test.ts`

> 说明：本任务先实现 `checkInDaily`/`checkInWeekly` 及内部辅助 `newReceipt`、`allDailiesDone`、`allWeekliesDone`；其中调用的 `applyBossDamageForTask` 在 Task 10 实现，本任务先以「无 Boss 关联时为空操作」的最小桩实现并在 Task 10 替换。为避免桩/正式实现脱节，**本任务直接实现完整的 `applyBossDamageForTask`**（见下方代码），Task 10 仅补充其专项测试。

- [ ] **Step 1: 写测试 `__tests__/checkin.test.ts`**

```ts
import { makeState } from './factory';
import { Daily, Weekly } from '../src/domain/types';
import { checkInDaily, checkInWeekly } from '../src/domain/actions';

const day = (id: string, gold: number, exp: number): Daily =>
  ({ id, name: id, gold, exp, icon: '', doneDate: null, archived: false });
const now = new Date(2026, 5, 1); // 2026-06-01 (Mon, W23)

test('checkInDaily marks done, adds gold/exp, pushes receipt', () => {
  const s = makeState();
  s.dailies = [day('a', 30, 60), day('b', 10, 0)];
  checkInDaily(s, 'a', now);
  expect(s.dailies[0].doneDate).toBe('2026-06-01');
  expect(s.player.gold).toBe(30);
  expect(s.player.level).toBe(2); // 60 exp -> L2 (needs 50), exp 10
  expect(s.todayReceipts).toHaveLength(1);
  expect(s.todayReceipts[0]).toMatchObject({ rid: 'daily:a:2026-06-01', goldDelta: 30, expDelta: 60 });
});

test('checkInDaily is idempotent same day', () => {
  const s = makeState();
  s.dailies = [day('a', 30, 0), day('b', 10, 0)]; // 2 dailies: re-checking 'a' must not double-credit nor complete the set
  checkInDaily(s, 'a', now);
  checkInDaily(s, 'a', now);
  expect(s.player.gold).toBe(30);
  expect(s.todayReceipts).toHaveLength(1);
});

test('perfect day bonus when last daily completed', () => {
  const s = makeState();
  s.dailies = [day('a', 10, 0), day('b', 10, 0)];
  checkInDaily(s, 'a', now);
  expect(s.dailyPerfect).toBeNull();
  checkInDaily(s, 'b', now);
  expect(s.dailyPerfect).toMatchObject({ date: '2026-06-01', gold: 50, exp: 20 });
  expect(s.player.gold).toBe(10 + 10 + 50);
  expect(s.pendingCelebrations).toContain('perfectDay');
});

test('checkInWeekly marks done and gives perfect week bonus', () => {
  const s = makeState();
  const wk = (id: string, g: number): Weekly => ({ id, name: id, gold: g, exp: 0, icon: '', doneWeek: null, archived: false });
  s.weeklies = [wk('a', 100)];
  checkInWeekly(s, 'a', now);
  expect(s.weeklies[0].doneWeek).toBe('2026-W23');
  expect(s.player.gold).toBe(100 + 200); // reward + perfect week
  expect(s.weeklyPerfect).toMatchObject({ week: '2026-W23', gold: 200 });
  expect(s.pendingCelebrations).toContain('perfectWeek');
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- checkin.test.ts`
Expected: FAIL —— 找不到模块 `actions`。

- [ ] **Step 3: 写 `src/domain/actions.ts`（含完整 `applyBossDamageForTask`）**

```ts
import { AppState, Receipt } from './types';
import { dateStr, weekKey } from './dateUtils';
import { addGold, applyExpDelta, pushCelebration } from './economy';

function newReceipt(kind: Receipt['kind'], taskId: string, date: string): Receipt {
  return { rid: `${kind}:${taskId}:${date}`, kind, taskId, date, goldDelta: 0, expDelta: 0 };
}

/** addGold + 计入 receipt.goldDelta。 */
function addGoldR(state: AppState, r: Receipt, n: number, type: 'earn' | 'bonus', note: string, now: Date): void {
  addGold(state, n, type, note, now);
  r.goldDelta += n;
}
/** applyExpDelta + 计入 receipt.expDelta。 */
function addExpR(state: AppState, r: Receipt, n: number): void {
  applyExpDelta(state, n);
  r.expDelta += n;
}

function allDailiesDone(state: AppState, date: string): boolean {
  const active = state.dailies.filter((d) => !d.archived);
  return active.length > 0 && active.every((d) => d.doneDate === date);
}
function allWeekliesDone(state: AppState, week: string): boolean {
  const active = state.weeklies.filter((w) => !w.archived);
  return active.length > 0 && active.every((w) => w.doneWeek === week);
}

/** 完成关联任务对 Boss 造成伤害；跨阶段阈值发该段奖励；记入 receipt 以便撤销。 */
export function applyBossDamageForTask(state: AppState, r: Receipt, taskId: string, now: Date): void {
  for (const b of state.bosses) {
    if (b.defeated || !b.linkedTaskIds.includes(taskId)) continue;
    const dmg = b.damagePerHit;
    b.hp = Math.max(0, b.hp - dmg);
    const cleared: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const threshold = (b.maxHp * (3 - i)) / 3; // 阶段1<=2/3, 2<=1/3, 3<=0
      if (b.hp <= threshold && !b.clearedStages.includes(i)) {
        b.clearedStages.push(i);
        cleared.push(i);
        addGoldR(state, r, Math.floor(b.totalRewardGold * b.weights[i - 1]), 'bonus', `Boss「${b.name}」阶段${i}`, now);
        addExpR(state, r, Math.floor(b.totalRewardExp * b.weights[i - 1]));
      }
    }
    let defeated = false;
    if (b.hp <= 0 && !b.defeated) {
      b.defeated = true;
      defeated = true;
      pushCelebration(state, 'bossDefeated');
    }
    (r.bossHits ??= []).push({ bossId: b.id, damage: dmg, clearedStages: cleared, defeated });
  }
}

export function checkInDaily(state: AppState, id: string, now: Date): void {
  const today = dateStr(now);
  const d = state.dailies.find((x) => x.id === id);
  if (!d || d.archived || d.doneDate === today) return;
  const r = newReceipt('daily', id, today);
  d.doneDate = today;
  addGoldR(state, r, d.gold, 'earn', `完成每日: ${d.name}`, now);
  addExpR(state, r, d.exp);
  applyBossDamageForTask(state, r, id, now);
  state.todayReceipts.push(r);
  if (allDailiesDone(state, today) && state.dailyPerfect?.date !== today) {
    addGold(state, state.config.perfectDailyBonus, 'bonus', '每日全清', now);
    applyExpDelta(state, state.config.perfectDailyBonusExp);
    state.dailyPerfect = { date: today, gold: state.config.perfectDailyBonus, exp: state.config.perfectDailyBonusExp };
    pushCelebration(state, 'perfectDay');
  }
}

export function checkInWeekly(state: AppState, id: string, now: Date): void {
  const today = dateStr(now);
  const week = weekKey(now);
  const w = state.weeklies.find((x) => x.id === id);
  if (!w || w.archived || w.doneWeek === week) return;
  const r = newReceipt('weekly', id, today);
  w.doneWeek = week;
  addGoldR(state, r, w.gold, 'earn', `完成每周: ${w.name}`, now);
  addExpR(state, r, w.exp);
  applyBossDamageForTask(state, r, id, now);
  state.todayReceipts.push(r);
  if (allWeekliesDone(state, week) && state.weeklyPerfect?.week !== week) {
    addGold(state, state.config.perfectWeeklyBonus, 'bonus', '每周全清', now);
    applyExpDelta(state, state.config.perfectWeeklyBonusExp);
    state.weeklyPerfect = { week, gold: state.config.perfectWeeklyBonus, exp: state.config.perfectWeeklyBonusExp };
    pushCelebration(state, 'perfectWeek');
  }
}
```

> `newReceipt`/`addGoldR`/`addExpR`/`allDailiesDone`/`allWeekliesDone` 为文件内私有函数，后续任务（试炼打卡、撤销、商店）都在同一文件 `actions.ts` 内追加，可直接调用，无需导出。

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- checkin.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat(domain): add daily/weekly check-in with perfect bonus + boss damage"
```

---

### Task 9: 试炼打卡 `checkInTrial` + 里程碑 + 毕业

**Files:**
- Modify: `src/domain/actions.ts`（追加 `checkInTrial`、`graduateTrial`）
- Create: `__tests__/checkinTrial.test.ts`

- [ ] **Step 1: 写测试 `__tests__/checkinTrial.test.ts`**

```ts
import { makeState } from './factory';
import { Trial } from '../src/domain/types';
import { checkInTrial } from '../src/domain/actions';

const trial = (over: Partial<Trial> = {}): Trial => ({
  id: 't1', name: '背单词', icon: '📖', startDate: '2026-06-01',
  completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false,
  milestones: [{ day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 }, { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 }],
  ...over,
});

test('first check-in advances streak to 1 and claims D1', () => {
  const s = makeState();
  s.trials = [trial()];
  checkInTrial(s, 't1', new Date(2026, 5, 1));
  expect(s.trials[0].streak).toBe(1);
  expect(s.trials[0].claimedMilestones).toEqual([1]);
  expect(s.player.gold).toBe(20);
  expect(s.todayReceipts[0].claimedMilestones).toEqual([1]);
});

test('milestone not re-claimed if already claimed', () => {
  const s = makeState();
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 1, claimedMilestones: [1] })];
  checkInTrial(s, 't1', new Date(2026, 5, 2)); // streak 2, no new milestone (D3 not reached)
  expect(s.player.gold).toBe(0);
  expect(s.trials[0].claimedMilestones).toEqual([1]);
});

test('reaching day 14 graduates: adds daily, sets graduated, D14 reward once', () => {
  const s = makeState();
  // 13 consecutive done days 06-01..06-13, claimed 1/3/7
  const completed: string[] = [];
  for (let d = 1; d <= 13; d++) completed.push(`2026-06-${String(d).padStart(2, '0')}`);
  s.trials = [trial({ completedDates: completed, streak: 13, claimedMilestones: [1, 3, 7] })];
  checkInTrial(s, 't1', new Date(2026, 5, 14)); // streak 14
  expect(s.trials[0].streak).toBe(14);
  expect(s.trials[0].graduated).toBe(true);
  expect(s.player.gold).toBe(500); // D14
  expect(s.dailies.find((d) => d.id === 'daily-from-t1')).toBeTruthy();
  expect(s.todayReceipts[0].graduation).toEqual({ addedDailyId: 'daily-from-t1' });
  expect(s.pendingCelebrations).toContain('graduation');
});

test('check-in idempotent same day; skips graduated', () => {
  const s = makeState();
  s.trials = [trial({ completedDates: ['2026-06-01'], streak: 1 })];
  checkInTrial(s, 't1', new Date(2026, 5, 1)); // already done today
  expect(s.todayReceipts).toHaveLength(0);
  s.trials[0].graduated = true;
  checkInTrial(s, 't1', new Date(2026, 5, 2));
  expect(s.todayReceipts).toHaveLength(0);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- checkinTrial.test.ts`
Expected: FAIL —— `checkInTrial` 未导出。

- [ ] **Step 3: 在 `src/domain/actions.ts` 追加 import 与函数**

文件顶部 import 增补（与首行 `from './types'` 的具名导入合并，得到 `import { AppState, Receipt, Trial } from './types';`）：
```ts
import { computeStreak } from './trials';
```

文件末尾追加：
```ts
function graduateTrial(state: AppState, t: Trial): string {
  t.graduated = true;
  const newId = `daily-from-${t.id}`;
  state.dailies.push({ id: newId, name: t.name, gold: 15, exp: 8, icon: t.icon, doneDate: null, archived: false });
  return newId;
}

export function checkInTrial(state: AppState, id: string, now: Date): void {
  const today = dateStr(now);
  const t = state.trials.find((x) => x.id === id);
  if (!t || t.graduated || t.completedDates.includes(today)) return;
  const r = newReceipt('trial', id, today);
  t.completedDates.push(today);
  t.streak = computeStreak(t, today);
  const claimed: number[] = [];
  for (const m of [...t.milestones].sort((a, b) => a.day - b.day)) {
    if (t.streak >= m.day && !t.claimedMilestones.includes(m.day)) {
      addGoldR(state, r, m.gold, 'bonus', `试炼里程碑 D${m.day}: ${t.name}`, now);
      addExpR(state, r, m.exp);
      t.claimedMilestones.push(m.day);
      claimed.push(m.day);
    }
  }
  if (claimed.length) r.claimedMilestones = claimed;
  if (t.streak >= 14 && !t.graduated) {
    const newId = graduateTrial(state, t);
    r.graduation = { addedDailyId: newId };
    pushCelebration(state, 'graduation');
  }
  applyBossDamageForTask(state, r, id, now);
  state.todayReceipts.push(r);
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- checkinTrial.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat(domain): add trial check-in with milestones and graduation"
```

---

### Task 10: Boss 扣血专项测试（实现已在 Task 8 完成）

**Files:**
- Create: `__tests__/boss.test.ts`

- [ ] **Step 1: 写测试 `__tests__/boss.test.ts`**

```ts
import { makeState } from './factory';
import { Boss, Daily } from '../src/domain/types';
import { checkInDaily } from '../src/domain/actions';

const boss = (over: Partial<Boss> = {}): Boss => ({
  id: 'b1', name: '读完一本书', icon: '👹',
  maxHp: 100, hp: 100, damagePerHit: 20,
  totalRewardGold: 600, totalRewardExp: 300,
  weights: [0.2, 0.3, 0.5], linkedTaskIds: ['a'], clearedStages: [], defeated: false,
  ...over,
});
const day = (id: string): Daily => ({ id, name: id, gold: 0, exp: 0, icon: '', doneDate: null, archived: false });
const now = new Date(2026, 5, 1);

test('linked task completion damages boss', () => {
  const s = makeState();
  s.dailies = [day('a')];
  s.bosses = [boss()];
  checkInDaily(s, 'a', now);
  expect(s.bosses[0].hp).toBe(80);
  expect(s.bosses[0].clearedStages).toEqual([]); // 80 > 66.67
});

test('crossing stage 1 threshold grants stage-1 reward', () => {
  const s = makeState();
  s.dailies = [day('a'), day('keep')]; // 2nd incomplete, non-linked daily prevents perfect-day bonus from skewing gold
  s.bosses = [boss({ hp: 80 })];
  checkInDaily(s, 'a', now); // hp 60 <= 66.67 -> stage 1
  expect(s.bosses[0].clearedStages).toEqual([1]);
  expect(s.player.gold).toBe(Math.floor(600 * 0.2)); // 120
});

test('one hit can cross multiple stages', () => {
  const s = makeState();
  s.dailies = [day('a'), day('keep')]; // 2nd incomplete, non-linked daily prevents perfect-day bonus from skewing gold
  s.bosses = [boss({ hp: 40, damagePerHit: 40 })]; // -> hp 0: stages 1,2,3 + defeat
  checkInDaily(s, 'a', now);
  expect(s.bosses[0].clearedStages).toEqual([1, 2, 3]);
  expect(s.bosses[0].defeated).toBe(true);
  expect(s.player.gold).toBe(120 + 180 + 300); // 0.2/0.3/0.5 of 600
  expect(s.pendingCelebrations).toContain('bossDefeated');
  expect(s.todayReceipts[0].bossHits![0]).toMatchObject({ damage: 40, clearedStages: [1, 2, 3], defeated: true });
});

test('non-linked task does not damage; defeated boss ignored', () => {
  const s = makeState();
  s.dailies = [day('z')];
  s.bosses = [boss({ linkedTaskIds: ['a'] })];
  checkInDaily(s, 'z', now);
  expect(s.bosses[0].hp).toBe(100);

  const s2 = makeState();
  s2.dailies = [day('a')];
  s2.bosses = [boss({ hp: 20, defeated: true })];
  checkInDaily(s2, 'a', now);
  expect(s2.bosses[0].hp).toBe(20); // untouched
});
```

- [ ] **Step 2: 运行，确认通过（实现已在 Task 8 完成）**

Run: `npm test -- boss.test.ts`
Expected: PASS。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "test(domain): add boss damage/stage/defeat coverage"
```

---

### Task 11: 撤销打卡 `undoCheckIn`（完整回退）

**Files:**
- Modify: `src/domain/actions.ts`（追加 `undoCheckIn`）
- Create: `__tests__/undo.test.ts`

- [ ] **Step 1: 写测试 `__tests__/undo.test.ts`**

```ts
import { makeState } from './factory';
import { Boss, Daily, Trial, Weekly } from '../src/domain/types';
import { checkInDaily, checkInWeekly, checkInTrial, undoCheckIn } from '../src/domain/actions';

const day = (id: string, g: number, e: number): Daily => ({ id, name: id, gold: g, exp: e, icon: '', doneDate: null, archived: false });
const now = new Date(2026, 5, 1);

test('undo daily fully reverses gold, exp, doneDate, receipt', () => {
  const s = makeState();
  s.dailies = [day('a', 30, 60), day('b', 10, 0)];
  checkInDaily(s, 'a', now); // L2, gold 30
  undoCheckIn(s, 'daily:a:2026-06-01', now);
  expect(s.dailies[0].doneDate).toBeNull();
  expect(s.player.gold).toBe(0);
  expect(s.player.level).toBe(1);
  expect(s.player.exp).toBe(0);
  expect(s.todayReceipts).toHaveLength(0);
});

test('undo that breaks a perfect day reverses the perfect bonus', () => {
  const s = makeState();
  s.dailies = [day('a', 10, 0), day('b', 10, 0)];
  checkInDaily(s, 'a', now);
  checkInDaily(s, 'b', now); // perfect: +50
  expect(s.player.gold).toBe(70);
  undoCheckIn(s, 'daily:b:2026-06-01', now);
  expect(s.player.gold).toBe(10); // 70 - 10(b) - 50(perfect)
  expect(s.dailyPerfect).toBeNull();
});

test('undo trial removes completedDate, un-claims milestone, recomputes streak', () => {
  const s = makeState();
  s.trials = [{ id: 't1', name: 't', icon: '', startDate: '2026-06-01', completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, milestones: [{ day: 1, gold: 20, exp: 10 }] } as Trial];
  checkInTrial(s, 't1', now); // streak 1, claim D1, +20
  undoCheckIn(s, 'trial:t1:2026-06-01', now);
  expect(s.trials[0].completedDates).toEqual([]);
  expect(s.trials[0].claimedMilestones).toEqual([]);
  expect(s.trials[0].streak).toBe(0);
  expect(s.player.gold).toBe(0);
});

test('undo a graduation: reverts graduated flag and removes added daily', () => {
  const s = makeState();
  const completed: string[] = [];
  for (let d = 1; d <= 13; d++) completed.push(`2026-06-${String(d).padStart(2, '0')}`);
  s.trials = [{ id: 't1', name: 't', icon: '', startDate: '2026-06-01', completedDates: completed, protectedDates: [], streak: 13, claimedMilestones: [1, 3, 7], graduated: false, milestones: [{ day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 }, { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 }] } as Trial];
  checkInTrial(s, 't1', new Date(2026, 5, 14));
  expect(s.trials[0].graduated).toBe(true);
  undoCheckIn(s, 'trial:t1:2026-06-14', new Date(2026, 5, 14));
  expect(s.trials[0].graduated).toBe(false);
  expect(s.dailies.find((d) => d.id === 'daily-from-t1')).toBeUndefined();
  expect(s.trials[0].claimedMilestones).toEqual([1, 3, 7]);
  expect(s.trials[0].streak).toBe(13);
});

test('undo a boss hit heals hp, un-clears stages, reverts defeat and reward', () => {
  const s = makeState();
  s.dailies = [day('a', 0, 0)];
  s.bosses = [{ id: 'b1', name: 'B', icon: '', maxHp: 100, hp: 40, damagePerHit: 40, totalRewardGold: 600, totalRewardExp: 300, weights: [0.2, 0.3, 0.5], linkedTaskIds: ['a'], clearedStages: [], defeated: false } as Boss];
  checkInDaily(s, 'a', now); // hp 0, stages 1/2/3, defeated, +600 gold
  undoCheckIn(s, 'daily:a:2026-06-01', now);
  expect(s.bosses[0].hp).toBe(40);
  expect(s.bosses[0].clearedStages).toEqual([]);
  expect(s.bosses[0].defeated).toBe(false);
  expect(s.player.gold).toBe(0);
});

test('check-in -> undo -> check-in is self-consistent (no leak)', () => {
  const s = makeState();
  s.dailies = [day('a', 30, 10)];
  checkInDaily(s, 'a', now);
  undoCheckIn(s, 'daily:a:2026-06-01', now);
  checkInDaily(s, 'a', now);
  expect(s.player.gold).toBe(30);
  expect(s.player.expTotal).toBe(10);
  expect(s.todayReceipts).toHaveLength(1);
});

test('undo no-op for unknown rid', () => {
  const s = makeState();
  undoCheckIn(s, 'nope', now);
  expect(s.player.gold).toBe(0);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- undo.test.ts`
Expected: FAIL —— `undoCheckIn` 未导出。

- [ ] **Step 3: 在 `src/domain/actions.ts` 追加 `undoCheckIn`**

文件顶部 import 增补（与已有合并，不重复）：
```ts
import { weekKey } from './dateUtils'; // 若已 import 则忽略
```

文件末尾追加：
```ts
export function undoCheckIn(state: AppState, rid: string, now: Date): void {
  const idx = state.todayReceipts.findIndex((x) => x.rid === rid);
  if (idx === -1) return;
  const r = state.todayReceipts[idx];
  const today = dateStr(now);

  // 1) 结构回退
  if (r.kind === 'daily') {
    const d = state.dailies.find((x) => x.id === r.taskId);
    if (d) d.doneDate = null;
  } else if (r.kind === 'weekly') {
    const w = state.weeklies.find((x) => x.id === r.taskId);
    if (w) w.doneWeek = null;
  } else {
    const t = state.trials.find((x) => x.id === r.taskId);
    if (t) {
      t.completedDates = t.completedDates.filter((x) => x !== r.date);
      if (r.claimedMilestones) t.claimedMilestones = t.claimedMilestones.filter((m) => !r.claimedMilestones!.includes(m));
      if (r.graduation) {
        t.graduated = false;
        const gid = r.graduation.addedDailyId;
        state.dailies = state.dailies.filter((x) => x.id !== gid);
      }
      t.streak = computeStreak(t, today);
    }
  }

  // 2) Boss 回退
  for (const h of r.bossHits ?? []) {
    const b = state.bosses.find((x) => x.id === h.bossId);
    if (!b) continue;
    b.hp = Math.min(b.maxHp, b.hp + h.damage);
    b.clearedStages = b.clearedStages.filter((s) => !h.clearedStages.includes(s));
    if (h.defeated) b.defeated = false;
  }

  // 3) 金币/经验完整回退
  state.player.gold = Math.max(0, state.player.gold - r.goldDelta);
  applyExpDelta(state, -r.expDelta);
  state.ledger.push({ ts: now.getTime(), date: today, type: 'undo', amount: -r.goldDelta, expAmount: -r.expDelta, note: `撤销: ${r.taskId}` });

  // 4) 全清奖励重判
  if (r.kind === 'daily' && state.dailyPerfect?.date === today && !allDailiesDone(state, today)) {
    state.player.gold = Math.max(0, state.player.gold - state.dailyPerfect.gold);
    applyExpDelta(state, -state.dailyPerfect.exp);
    state.ledger.push({ ts: now.getTime(), date: today, type: 'undo', amount: -state.dailyPerfect.gold, expAmount: -state.dailyPerfect.exp, note: '撤销每日全清' });
    state.dailyPerfect = null;
  }
  if (r.kind === 'weekly') {
    const week = weekKey(now);
    if (state.weeklyPerfect?.week === week && !allWeekliesDone(state, week)) {
      state.player.gold = Math.max(0, state.player.gold - state.weeklyPerfect.gold);
      applyExpDelta(state, -state.weeklyPerfect.exp);
      state.ledger.push({ ts: now.getTime(), date: today, type: 'undo', amount: -state.weeklyPerfect.gold, expAmount: -state.weeklyPerfect.exp, note: '撤销每周全清' });
      state.weeklyPerfect = null;
    }
  }

  state.todayReceipts.splice(idx, 1);
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- undo.test.ts`
Expected: PASS（7 个测试）。

- [ ] **Step 5: 全量回归**

Run: `npm test`
Expected: PASS（全部）。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat(domain): add undoCheckIn with full reversal across all kinds"
```

---

### Task 12: 商店动作 `buyFreezeCard` / `cashOut`

**Files:**
- Modify: `src/domain/actions.ts`（追加两个函数）
- Create: `__tests__/shop.test.ts`

- [ ] **Step 1: 写测试 `__tests__/shop.test.ts`**

```ts
import { makeState } from './factory';
import { buyFreezeCard, cashOut } from '../src/domain/actions';
const now = new Date(2026, 5, 1);

test('buyFreezeCard succeeds with enough gold', () => {
  const s = makeState();
  s.player.gold = 150;
  expect(buyFreezeCard(s, now)).toBe(true);
  expect(s.player.gold).toBe(50);
  expect(s.inventory.freezeCards).toBe(1);
  expect(s.ledger[0]).toMatchObject({ type: 'purchase', amount: -100 });
});

test('buyFreezeCard fails when insufficient', () => {
  const s = makeState();
  s.player.gold = 50;
  expect(buyFreezeCard(s, now)).toBe(false);
  expect(s.inventory.freezeCards).toBe(0);
});

test('cashOut requires threshold and sufficient balance', () => {
  const s = makeState();
  s.player.gold = 1200;
  expect(cashOut(s, 500, now)).toBe(false); // below threshold 1000
  expect(cashOut(s, 2000, now)).toBe(false); // exceeds balance
  expect(cashOut(s, 1000, now)).toBe(true);
  expect(s.player.gold).toBe(200);
  expect(s.ledger.find((l) => l.type === 'cashout')).toMatchObject({ amount: -1000 });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- shop.test.ts`
Expected: FAIL —— 未导出。

- [ ] **Step 3: 在 `src/domain/actions.ts` 追加**

```ts
export function buyFreezeCard(state: AppState, now: Date): boolean {
  if (state.player.gold < state.config.freezeCardCost) return false;
  state.player.gold -= state.config.freezeCardCost;
  state.inventory.freezeCards += 1;
  state.ledger.push({ ts: now.getTime(), date: dateStr(now), type: 'purchase', amount: -state.config.freezeCardCost, note: '购买冻结卡' });
  return true;
}

export function cashOut(state: AppState, amount: number, now: Date): boolean {
  if (amount < state.config.cashOutThreshold || amount > state.player.gold) return false;
  state.player.gold -= amount;
  state.ledger.push({ ts: now.getTime(), date: dateStr(now), type: 'cashout', amount: -amount, note: `提现 ${amount}金 = ¥${amount / state.config.goldToYuanRate}` });
  return true;
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- shop.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat(domain): add shop actions (buy freeze card, cash out)"
```

---

### Task 13: 初始状态 `initialState.ts`

**Files:**
- Create: `src/domain/initialState.ts`
- Create: `__tests__/initialState.test.ts`

- [ ] **Step 1: 写测试 `__tests__/initialState.test.ts`**

```ts
import { createInitialState } from '../src/domain/initialState';

test('createInitialState seeds placeholder content and valid config', () => {
  const s = createInitialState(new Date(2026, 5, 1));
  expect(s.version).toBe(1);
  expect(s.dailies.length).toBe(4);
  expect(s.weeklies.length).toBe(3);
  expect(s.trials.length).toBe(1);
  expect(s.bosses.length).toBe(1);
  // 示例 Boss 关联"阅读"每日任务
  const reading = s.dailies.find((d) => d.name.includes('阅读'))!;
  expect(s.bosses[0].linkedTaskIds).toContain(reading.id);
  expect(s.inventory.freezeCards).toBe(1);
  expect(s.restDays.weekKey).toBe('2026-W23');
  expect(s.player.lastActiveDate).toBeNull(); // 首次 rollover 时设置
  expect(s.config.cashOutThreshold).toBe(1000);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test -- initialState.test.ts`
Expected: FAIL —— 找不到模块 `initialState`。

- [ ] **Step 3: 写 `src/domain/initialState.ts`**

```ts
import { AppState, Config, Milestone } from './types';
import { dateStr, weekKey } from './dateUtils';

export const defaultConfig: Config = {
  goldToYuanRate: 100,
  perfectDailyBonus: 50, perfectDailyBonusExp: 20,
  perfectWeeklyBonus: 200, perfectWeeklyBonusExp: 100,
  missedDailyPenaltyRate: 0.5, dailyPenaltyCap: 100, weeklyPenaltyRate: 0.5,
  freezeCardCost: 100, cashOutThreshold: 1000, restDaysPerWeek: 1,
  longAbsenceThreshold: 7, levelExpBase: 50, levelExpStep: 50,
};

const defaultMilestones: Milestone[] = [
  { day: 1, gold: 20, exp: 10 }, { day: 3, gold: 50, exp: 30 },
  { day: 7, gold: 150, exp: 80 }, { day: 14, gold: 500, exp: 300 },
];

export function createInitialState(now: Date): AppState {
  const readingId = 'd-read';
  return {
    version: 1,
    player: { name: '冒险者', level: 1, exp: 0, expTotal: 0, gold: 0, avatarTier: 0, lastActiveDate: null },
    dailies: [
      { id: 'd-water', name: '喝水 8 杯', gold: 10, exp: 5, icon: '💧', doneDate: null, archived: false },
      { id: 'd-exercise', name: '运动 30 分钟', gold: 20, exp: 10, icon: '🏃', doneDate: null, archived: false },
      { id: readingId, name: '阅读 20 分钟', gold: 15, exp: 8, icon: '📖', doneDate: null, archived: false },
      { id: 'd-sleep', name: '23:00 前睡', gold: 15, exp: 8, icon: '🌙', doneDate: null, archived: false },
    ],
    weeklies: [
      { id: 'w-clean', name: '大扫除', gold: 80, exp: 40, icon: '🧹', doneWeek: null, archived: false },
      { id: 'w-review', name: '复盘本周', gold: 100, exp: 50, icon: '📝', doneWeek: null, archived: false },
      { id: 'w-call', name: '给家人打电话', gold: 60, exp: 30, icon: '📞', doneWeek: null, archived: false },
    ],
    trials: [
      { id: 't-words', name: '每天背 10 个单词', icon: '🔤', startDate: dateStr(now), completedDates: [], protectedDates: [], streak: 0, claimedMilestones: [], graduated: false, milestones: [...defaultMilestones] },
    ],
    bosses: [
      { id: 'b-book', name: '读完一本书', icon: '👹', maxHp: 200, hp: 200, damagePerHit: 20, totalRewardGold: 600, totalRewardExp: 300, weights: [0.2, 0.3, 0.5], linkedTaskIds: [readingId], clearedStages: [], defeated: false },
    ],
    inventory: { freezeCards: 1 },
    restDays: { weekKey: weekKey(now), remaining: defaultConfig.restDaysPerWeek },
    config: { ...defaultConfig },
    ledger: [], history: {},
    todayReceipts: [], dailyPerfect: null, weeklyPerfect: null,
    pendingCelebrations: [], pendingNotice: null,
  };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test -- initialState.test.ts`
Expected: PASS。

- [ ] **Step 5: 全量回归 + 提交**

Run: `npm test`
Expected: PASS（全部 11 个测试文件）。

```bash
git add -A
git commit -m "feat(domain): add createInitialState with placeholder seed data"
```

---

## 延到 Plan 2 的领域操作（本计划不含，刻意的范围边界）

spec §7.11 提到的**任务/试炼/Boss 的增删改（addDaily/editDaily/archiveDaily/addTrial/addBoss…）**不在 Plan 1：它们需要生成唯一 id（计数器/uuid，非确定式），更适合放在 Plan 2 的 Zustand store 层（store 持有 id 生成器并调用这些纯函数）。Plan 1 只覆盖**确定式、可单测**的结算与打卡/撤销引擎。

## Plan 1 完成标准

- [ ] `npm test` 全绿，覆盖 spec §10 中所有领域用例（dateUtils / 每日周结算 / rollover / 试炼 / 长时间未用 / 经济 / 全清 / Boss / 撤销 / 商店）。
- [ ] `src/domain/` 内 7 个文件（types/dateUtils/economy/settlement/trials/actions/initialState）零 RN 依赖，可被 Plan 2 的 store 直接 import。
- [ ] 验收后进入 Plan 2（Store / 持久化 / APP 骨架 / 任务 CRUD）。
