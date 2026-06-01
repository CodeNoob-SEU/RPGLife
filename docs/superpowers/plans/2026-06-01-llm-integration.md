# RPGLife × LLM 接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 RPGLife 引入一组干净的 LLM「插入点」——一层可测的 LLM 服务地基 + 一组纯函数，并接到战报、生成委托、Boss 助手三个端到端场景（提醒仅埋点）。

**Architecture:** 三层解耦。`src/services/llm`（唯一碰网络/密钥）→ `src/domain/llm`（纯函数：打包输入 + 校验输出，TDD）→ UI（触发、loading、降级）。LLM 只产「草稿」，落库一律走现有 action + 用户确认。未配置 / 失败时一切回退到现有行为，绝不白屏。

**Tech Stack:** Expo SDK 56 · RN 0.85 · TypeScript(strict) · zustand+immer+persist · Jest(ts-jest, `node` 环境) · 内置 `fetch` · `expo-secure-store`。OpenAI 兼容协议 + 自带 key。

**上游规格：** [docs/superpowers/specs/2026-06-01-llm-integration-design.md](../specs/2026-06-01-llm-integration-design.md)

---

## 全局约定（每个 task 都适用）

- **测试环境是 `node`**（`jest.config.js`）：可测模块**绝不能 `import` `react-native` / `expo-secure-store` / `useGameStore`**，否则 jest 加载原生模块会炸。因此 `parseStructured` / `openaiCompatClient`（注入配置）/ `mockClient` / 所有 `domain/llm` 函数都是纯 TS，可单测；而 `secureConfig` / `getClient` 是 IO 适配层（import RN/store），**不写自动测试，靠手动验证**。
- **prompt 内联在各 `domain/llm` 的 `buildXxxPrompt` 函数里**（prompt 与对应校验内聚、同文件可读），不单建 `services/llm/prompts/` 目录——这是对 spec §4 文件组织的优化。
- 测试文件放 `__tests__/<name>.test.ts`，命名 `llm-*.test.ts` 便于归组。
- 每步跑 `npx jest <file>` 或 `npm test`；**每个 task 末尾 `git commit`**。
- commit 前缀沿用项目习惯：`feat(llm)` / `test(llm)` / `feat(settings)` / `chore`。
- UI task 无法在 node jest 测（项目未装 RNTL），改用 **`npm run web` 手动验证**（符合 spec §10）。
- 不引入 zod / axios；手写校验 + 内置 `fetch`。
- expo-secure-store v56 API（已核对官方文档）：`setItemAsync(k,v)` / `getItemAsync(k):Promise<string|null>` / `deleteItemAsync(k)`；**不支持 Web**（Web 必须降级 `localStorage`）；key 仅允许 `[A-Za-z0-9._-]`，故用 `rpglife-llm-key`。
- **执行顺序有依赖**：Phase 0 → 1 → 2 → 3 → 4 必须顺序进行（`getClient` 依赖 Config v12，UI 依赖前三阶段）。

---

## Phase 0 — 地基组件（`src/services/llm/`，纯逻辑/IO，不依赖 Config 新字段）

### Task 0.1: 安装依赖 + 目录占位

**Files:**
- Modify: `package.json`（由 expo install 写入）
- Create: `src/services/llm/.gitkeep`

- [ ] **Step 1: 安装 expo-secure-store（按 v56 锁版本）**

Run:
```bash
npx expo install expo-secure-store
```
Expected: `package.json` 的 dependencies 出现 `"expo-secure-store": "~56.x.x"`，无报错。

- [ ] **Step 2: 建目录**

Run:
```bash
mkdir -p src/services/llm && touch src/services/llm/.gitkeep
```

- [ ] **Step 3: 确认安装没破坏现有测试**

Run: `npm test`
Expected: 现有 23 套件 / 129 测试全绿。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/services/llm/.gitkeep
git commit -m "chore(llm): add expo-secure-store and scaffold services/llm"
```

---

### Task 0.2: `types.ts` — 接口与错误类型

**Files:**
- Create: `src/services/llm/types.ts`
- Test: `__tests__/llm-types.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// __tests__/llm-types.test.ts
import { LLMError } from '../src/services/llm/types';

test('LLMError carries a kind and message', () => {
  const e = new LLMError('timeout', 'too slow');
  expect(e).toBeInstanceOf(Error);
  expect(e.kind).toBe('timeout');
  expect(e.message).toBe('too slow');
  expect(e.name).toBe('LLMError');
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest llm-types -i`
Expected: FAIL（Cannot find module `types`）。

- [ ] **Step 3: 实现**

```ts
// src/services/llm/types.ts
export type LLMRole = 'system' | 'user' | 'assistant';
export interface LLMMessage { role: LLMRole; content: string; }

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export type LLMErrorKind = 'unconfigured' | 'network' | 'timeout' | 'http' | 'parse';

export class LLMError extends Error {
  kind: LLMErrorKind;
  constructor(kind: LLMErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'LLMError';
  }
}

export interface LLMClient {
  generateText(messages: LLMMessage[], opts?: GenerateOptions): Promise<string>;
  generateStructured<T>(
    messages: LLMMessage[],
    parse: (raw: unknown) => T,
    opts?: GenerateOptions,
  ): Promise<T>;
  ping(opts?: GenerateOptions): Promise<{ ok: boolean; detail?: string }>;
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `npx jest llm-types -i`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/services/llm/types.ts __tests__/llm-types.test.ts
git commit -m "feat(llm): LLMClient interface and LLMError types"
```

---

### Task 0.3: `parseStructured.ts` — JSON 抽取 + 校验 + 重试

**Files:**
- Create: `src/services/llm/parseStructured.ts`
- Test: `__tests__/llm-parseStructured.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// __tests__/llm-parseStructured.test.ts
import { extractJSON, parseStructured } from '../src/services/llm/parseStructured';
import { LLMError } from '../src/services/llm/types';

test('extractJSON parses plain, fenced, and noisy JSON', () => {
  expect(extractJSON('{"a":1}')).toEqual({ a: 1 });
  expect(extractJSON('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  expect(extractJSON('好的：\n{"a":3}\n以上。')).toEqual({ a: 3 });
});

test('extractJSON throws when no object present', () => {
  expect(() => extractJSON('no json here')).toThrow();
});

test('parseStructured returns parsed value on first success', async () => {
  const callText = jest.fn().mockResolvedValue('{"n":5}');
  const out = await parseStructured(callText, [{ role: 'user', content: 'x' }], (raw: any) => raw.n as number);
  expect(out).toBe(5);
  expect(callText).toHaveBeenCalledTimes(1);
});

test('parseStructured retries once with a correction message, then succeeds', async () => {
  const callText = jest.fn()
    .mockResolvedValueOnce('garbage')
    .mockResolvedValueOnce('{"n":7}');
  const out = await parseStructured(callText, [{ role: 'user', content: 'x' }], (raw: any) => raw.n as number);
  expect(out).toBe(7);
  expect(callText).toHaveBeenCalledTimes(2);
  const secondMsgs = callText.mock.calls[1][0];
  expect(secondMsgs.length).toBe(2);
  expect(secondMsgs[1].role).toBe('user');
});

test('parseStructured throws LLMError(parse) after two bad outputs', async () => {
  const callText = jest.fn().mockResolvedValue('still garbage');
  await expect(
    parseStructured(callText, [{ role: 'user', content: 'x' }], () => { throw new Error('bad'); }),
  ).rejects.toMatchObject({ kind: 'parse' });
});

test('parseStructured does NOT swallow network errors', async () => {
  const callText = jest.fn().mockRejectedValue(new LLMError('network', 'offline'));
  await expect(
    parseStructured(callText, [{ role: 'user', content: 'x' }], (raw) => raw),
  ).rejects.toMatchObject({ kind: 'network' });
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest llm-parseStructured -i`
Expected: FAIL（module not found）。

- [ ] **Step 3: 实现**

```ts
// src/services/llm/parseStructured.ts
import { GenerateOptions, LLMError, LLMMessage } from './types';

/** 从模型输出中抽取第一个 JSON 对象：容忍 ```json 围栏与前后噪声。 */
export function extractJSON(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) throw new Error('no JSON object found');
  return JSON.parse(t.slice(start, end + 1));
}

const CORRECTION =
  '上次输出无法解析为要求的 JSON。请只返回一个符合要求的 JSON 对象，不要任何解释或代码块。';

/**
 * 调用 callText → 抽 JSON → 跑业务校验 parse。失败带纠正消息重试 1 次；仍失败抛 LLMError('parse')。
 * callText 自身抛出的网络/超时/HTTP 错误直接冒泡（不计入 parse 重试）。
 */
export async function parseStructured<T>(
  callText: (messages: LLMMessage[], opts?: GenerateOptions) => Promise<string>,
  messages: LLMMessage[],
  parse: (raw: unknown) => T,
  opts?: GenerateOptions,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const msgs = attempt === 0
      ? messages
      : [...messages, { role: 'user' as const, content: CORRECTION }];
    const text = await callText(msgs, opts); // 网络错误在此冒泡
    try {
      return parse(extractJSON(text));
    } catch (e) {
      lastErr = e;
    }
  }
  throw new LLMError('parse', `结构化解析失败：${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `npx jest llm-parseStructured -i`
Expected: PASS（6 个测试）。

- [ ] **Step 5: Commit**

```bash
git add src/services/llm/parseStructured.ts __tests__/llm-parseStructured.test.ts
git commit -m "feat(llm): parseStructured with JSON extraction and one retry"
```

---

### Task 0.4: `mockClient.ts` — 离线 / 未配置 / 测试用

**Files:**
- Create: `src/services/llm/mockClient.ts`
- Test: `__tests__/llm-mockClient.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// __tests__/llm-mockClient.test.ts
import { MockLLMClient } from '../src/services/llm/mockClient';

test('generateText returns the fixture text (or a default)', async () => {
  const c = new MockLLMClient({ text: '示例战报' });
  expect(await c.generateText([{ role: 'user', content: 'x' }])).toBe('示例战报');
  const d = new MockLLMClient();
  expect((await d.generateText([{ role: 'user', content: 'x' }])).length).toBeGreaterThan(0);
});

test('generateStructured runs parse over the fixture raw', async () => {
  const c = new MockLLMClient({ raw: { n: 9 } });
  expect(await c.generateStructured([{ role: 'user', content: 'x' }], (raw: any) => raw.n as number)).toBe(9);
});

test('generateStructured without a fixture throws unconfigured', async () => {
  const c = new MockLLMClient();
  await expect(
    c.generateStructured([{ role: 'user', content: 'x' }], (raw) => raw),
  ).rejects.toMatchObject({ kind: 'unconfigured' });
});

test('ping is ok', async () => {
  expect(await new MockLLMClient().ping()).toEqual({ ok: true, detail: 'mock' });
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest llm-mockClient -i`
Expected: FAIL。

- [ ] **Step 3: 实现**

```ts
// src/services/llm/mockClient.ts
import { GenerateOptions, LLMClient, LLMError, LLMMessage } from './types';

/** 确定性假 client：未配置 key 时由工厂返回，亦供 domain/store 测试使用，零网络。 */
export class MockLLMClient implements LLMClient {
  constructor(private fixtures: { text?: string; raw?: unknown } = {}) {}

  async generateText(_messages: LLMMessage[], _opts?: GenerateOptions): Promise<string> {
    return this.fixtures.text ?? '【示例】今天也辛苦啦，冒险者！明天继续推进你的委托吧。✨';
  }

  async generateStructured<T>(
    _messages: LLMMessage[],
    parse: (raw: unknown) => T,
    _opts?: GenerateOptions,
  ): Promise<T> {
    if (this.fixtures.raw === undefined) {
      throw new LLMError('unconfigured', 'mock 未提供结构化样本');
    }
    return parse(this.fixtures.raw);
  }

  async ping(_opts?: GenerateOptions): Promise<{ ok: boolean; detail?: string }> {
    return { ok: true, detail: 'mock' };
  }
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `npx jest llm-mockClient -i`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/services/llm/mockClient.ts __tests__/llm-mockClient.test.ts
git commit -m "feat(llm): deterministic MockLLMClient"
```

---

### Task 0.5: `openaiCompatClient.ts` — OpenAI 兼容实现

**Files:**
- Create: `src/services/llm/openaiCompatClient.ts`
- Test: `__tests__/llm-openaiCompatClient.test.ts`

> 备注：超时分支（AbortController 触发）不写自动测试（fake-timer 与 fetch promise 交互脆弱），靠手动/集成验证；此处覆盖请求拼装、内容提取、network/http 分类、generateStructured、ping。

- [ ] **Step 1: 写失败测试**

```ts
// __tests__/llm-openaiCompatClient.test.ts
import { OpenAICompatClient } from '../src/services/llm/openaiCompatClient';

const cfg = { baseURL: 'https://api.test/v1', apiKey: 'sk-abc', model: 'm1' };

function okJson(content: string) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => '',
  } as any);
}

afterEach(() => { (global as any).fetch = undefined; });

test('generateText posts to /chat/completions with auth + body, returns content', async () => {
  const fetchMock = jest.fn().mockReturnValue(okJson('hello'));
  (global as any).fetch = fetchMock;
  const c = new OpenAICompatClient(cfg);
  const out = await c.generateText([{ role: 'user', content: 'hi' }], { temperature: 0.5 });
  expect(out).toBe('hello');
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://api.test/v1/chat/completions');
  expect(init.method).toBe('POST');
  expect(init.headers.Authorization).toBe('Bearer sk-abc');
  const body = JSON.parse(init.body);
  expect(body.model).toBe('m1');
  expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  expect(body.temperature).toBe(0.5);
});

test('non-2xx maps to LLMError(http)', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
  const c = new OpenAICompatClient(cfg);
  await expect(c.generateText([{ role: 'user', content: 'x' }])).rejects.toMatchObject({ kind: 'http' });
});

test('fetch rejection maps to LLMError(network)', async () => {
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
  const c = new OpenAICompatClient(cfg);
  await expect(c.generateText([{ role: 'user', content: 'x' }])).rejects.toMatchObject({ kind: 'network' });
});

test('generateStructured parses JSON content', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(okJson('{"v":42}'));
  const c = new OpenAICompatClient(cfg);
  const out = await c.generateStructured([{ role: 'user', content: 'x' }], (raw: any) => raw.v as number);
  expect(out).toBe(42);
});

test('ping returns ok on success and not-ok on failure', async () => {
  (global as any).fetch = jest.fn().mockReturnValue(okJson('pong'));
  expect(await new OpenAICompatClient(cfg).ping()).toEqual({ ok: true });
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('down'));
  const r = await new OpenAICompatClient(cfg).ping();
  expect(r.ok).toBe(false);
  expect(typeof r.detail).toBe('string');
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest llm-openaiCompatClient -i`
Expected: FAIL。

- [ ] **Step 3: 实现**

```ts
// src/services/llm/openaiCompatClient.ts
import { GenerateOptions, LLMClient, LLMError, LLMMessage } from './types';
import { parseStructured } from './parseStructured';

export interface OpenAICompatConfig {
  baseURL: string;   // 末尾不带斜杠，如 https://api.deepseek.com/v1
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

export class OpenAICompatClient implements LLMClient {
  constructor(private cfg: OpenAICompatConfig) {}

  private async raw(messages: LLMMessage[], opts?: GenerateOptions): Promise<string> {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (opts?.signal) opts.signal.addEventListener('abort', onAbort);
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs ?? 20000);

    let res: Response;
    try {
      res = await fetch(`${this.cfg.baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.apiKey}` },
        body: JSON.stringify({
          model: this.cfg.model,
          messages,
          temperature: opts?.temperature ?? 0.7,
          max_tokens: opts?.maxTokens,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      throw new LLMError(controller.signal.aborted ? 'timeout' : 'network', String(e));
    } finally {
      clearTimeout(timer);
      if (opts?.signal) opts.signal.removeEventListener('abort', onAbort);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new LLMError('http', `HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  generateText(messages: LLMMessage[], opts?: GenerateOptions): Promise<string> {
    return this.raw(messages, opts);
  }

  generateStructured<T>(messages: LLMMessage[], parse: (raw: unknown) => T, opts?: GenerateOptions): Promise<T> {
    return parseStructured((m, o) => this.raw(m, o), messages, parse, opts);
  }

  async ping(opts?: GenerateOptions): Promise<{ ok: boolean; detail?: string }> {
    try {
      await this.raw([{ role: 'user', content: 'ping' }], { ...opts, maxTokens: 1 });
      return { ok: true };
    } catch (e) {
      return { ok: false, detail: e instanceof LLMError ? `${e.kind}: ${e.message}` : String(e) };
    }
  }
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `npx jest llm-openaiCompatClient -i`
Expected: PASS（5 个测试）。

- [ ] **Step 5: Commit**

```bash
git add src/services/llm/openaiCompatClient.ts __tests__/llm-openaiCompatClient.test.ts
git commit -m "feat(llm): OpenAI-compatible client (fetch + timeout + error classification)"
```

---

### Task 0.6: `secureConfig.ts` — apiKey 安全存取（IO，无自动测试）

**Files:**
- Create: `src/services/llm/secureConfig.ts`

> 🔐 apiKey 只存 SecureStore（原生）/ localStorage（Web 降级），**绝不进 store/AppState/Config**——`SettingsScreen.doExport()` 会序列化整个 store，进了就会被导出泄露。该文件 import `react-native` + `expo-secure-store`，node jest 测不了，靠 Task 3.5 的设置页手动验证。

- [ ] **Step 1: 实现**

```ts
// src/services/llm/secureConfig.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'rpglife-llm-key'; // 仅含 [A-Za-z0-9._-]，满足 SecureStore key 约束
let cached: string | null = null;

/** 启动时调用一次：把 key 读进内存缓存，供同步的 getCachedApiKey 使用。 */
export async function loadApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      cached = globalThis.localStorage?.getItem(KEY) ?? null;
    } else {
      cached = await SecureStore.getItemAsync(KEY);
    }
  } catch {
    cached = null;
  }
  return cached;
}

export function getCachedApiKey(): string | null {
  return cached;
}

export async function setApiKey(value: string): Promise<void> {
  const v = value.trim();
  cached = v || null;
  try {
    if (Platform.OS === 'web') {
      if (v) globalThis.localStorage?.setItem(KEY, v);
      else globalThis.localStorage?.removeItem(KEY);
    } else {
      if (v) await SecureStore.setItemAsync(KEY, v);
      else await SecureStore.deleteItemAsync(KEY);
    }
  } catch {
    // 存储不可用时静默：cached 仍生效于本次会话
  }
}

export function clearApiKey(): Promise<void> {
  return setApiKey('');
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增错误。

- [ ] **Step 3: Commit**

```bash
git add src/services/llm/secureConfig.ts
git commit -m "feat(llm): secure apiKey storage (SecureStore native / localStorage web)"
```

---

## Phase 1 — Config v12 与客户端装配

### Task 1.1: Config 新增 `llmEnabled/llmBaseURL/llmModel`（migrate v11→v12）

**Files:**
- Modify: `src/domain/types.ts`（Config 接口）
- Modify: `src/domain/initialState.ts:5-15`（defaultConfig）
- Modify: `__tests__/factory.ts:4-14`（testConfig）
- Modify: `src/domain/version.ts:11`（CURRENT_VERSION = 12 + 注释）
- Test: `__tests__/migrate.test.ts`（新增 v12 用例）

> migrate.ts 逻辑无需改：它对 config 做 `{ ...fresh.config, ...(p.config ?? {}) }` 浅合并，新字段会自动从 defaultConfig 补齐。

- [ ] **Step 1: 写失败测试（追加到 `__tests__/migrate.test.ts` 末尾）**

```ts
test('migrate backfills v12 llm config defaults and stamps version 12', () => {
  const r = migrate({ version: 11 } as any, 11);
  expect(r.version).toBe(12);
  expect(r.config.llmEnabled).toBe(false);
  expect(r.config.llmBaseURL).toBe('');
  expect(r.config.llmModel).toBe('');
});

test('migrate preserves a persisted llmBaseURL', () => {
  const r = migrate({ version: 12, config: { llmBaseURL: 'https://api.deepseek.com/v1' } } as any, 12);
  expect(r.config.llmBaseURL).toBe('https://api.deepseek.com/v1');
  expect(r.config.llmEnabled).toBe(false); // 缺失键仍取默认
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest migrate -i`
Expected: FAIL — 既因 `version` 仍是 11，也因 ts-jest 报 `config.llmEnabled` 不存在于 `Config`（strict）。

- [ ] **Step 3: 在 `src/domain/types.ts` 的 `Config` 接口尾部（`reminderHour: number;` 后）加字段**

```ts
  // LLM 接入（v12+）：总开关 + OpenAI 兼容 baseURL + 模型名。apiKey 不在此（走 SecureStore，不入存档）。
  llmEnabled: boolean; llmBaseURL: string; llmModel: string;
```

- [ ] **Step 4: 在 `src/domain/initialState.ts` 的 `defaultConfig` 尾部（`reminderEnabled/reminderHour` 那行后）加默认值**

```ts
  llmEnabled: false, llmBaseURL: '', llmModel: '',
```

- [ ] **Step 5: 在 `__tests__/factory.ts` 的 `testConfig` 尾部同样加（保持类型完整）**

```ts
  llmEnabled: false, llmBaseURL: '', llmModel: '',
```

- [ ] **Step 6: 改 `src/domain/version.ts`**

把 `export const CURRENT_VERSION = 11;` 改为 `12`，并在版本链注释末尾追加：
```
 *  → v12 LLM 接入配置(config llmEnabled/llmBaseURL/llmModel)。
```

- [ ] **Step 7: 跑测试验证通过**

Run: `npm test`
Expected: 全绿（含两个新 migrate 用例）。`tsc -p tsconfig.json` 不覆盖 `__tests__`，故 Step 5 漏改只会在 `npm test` 暴露——这就是为何此处用 `npm test`。

- [ ] **Step 8: Commit**

```bash
git add src/domain/types.ts src/domain/initialState.ts src/domain/version.ts __tests__/factory.ts __tests__/migrate.test.ts
git commit -m "feat(llm): Config v12 (llmEnabled/llmBaseURL/llmModel) + migrate"
```

---

### Task 1.2: `getClient.ts` 工厂 + App 启动预热（IO，无自动测试）

> 必须在 Task 1.1 之后：本 task 解构 `config.llmEnabled/llmBaseURL/llmModel`，依赖 v12 的 Config 字段。

**Files:**
- Create: `src/services/llm/getClient.ts`
- Modify: `App.tsx`（在 hydrated 后的 useEffect 内预热 key）

- [ ] **Step 1: 实现工厂**

```ts
// src/services/llm/getClient.ts
import { LLMClient } from './types';
import { OpenAICompatClient } from './openaiCompatClient';
import { MockLLMClient } from './mockClient';
import { getCachedApiKey } from './secureConfig';
import { useGameStore } from '../../store/useGameStore';

/** 配置齐全（启用 + baseURL + key）才视为就绪。 */
export function isLLMReady(): boolean {
  const { llmEnabled, llmBaseURL } = useGameStore.getState().config;
  return !!(llmEnabled && llmBaseURL.trim() && getCachedApiKey());
}

/** 同步返回一个 LLMClient：就绪用真实 client，否则用 mock（保证调用方永不拿到 null）。 */
export function getClient(): LLMClient {
  const { llmEnabled, llmBaseURL, llmModel } = useGameStore.getState().config;
  const apiKey = getCachedApiKey();
  if (llmEnabled && llmBaseURL.trim() && apiKey) {
    return new OpenAICompatClient({
      baseURL: llmBaseURL.trim().replace(/\/+$/, ''),
      apiKey,
      model: llmModel.trim() || 'gpt-4o-mini',
    });
  }
  return new MockLLMClient();
}
```

- [ ] **Step 2: App.tsx 预热 key**

在 `App.tsx` 顶部 import 区加：
```tsx
import { loadApiKey } from './src/services/llm/secureConfig';
```
在现有 `useEffect(() => { if (hydrated) { ... } }, [hydrated]);`（约 line 22-28）内、`syncReminder` 那行后追加一行：
```tsx
      void loadApiKey(); // 预热 LLM key 缓存，供 getClient 同步读取
```

- [ ] **Step 3: 类型检查 + 现有测试**

Run: `npx tsc --noEmit -p tsconfig.json && npm test`
Expected: 无新增类型错误；现有测试全绿。

- [ ] **Step 4: Commit**

```bash
git add src/services/llm/getClient.ts App.tsx
git commit -m "feat(llm): getClient factory + warm apiKey cache on app start"
```

---

## Phase 2 — `src/domain/llm/` 纯函数（TDD）

### Task 2.1: `validate.ts` — 共享校验工具

**Files:**
- Create: `src/domain/llm/validate.ts`
- Test: `__tests__/llm-validate.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// __tests__/llm-validate.test.ts
import { asRecord, clampInt } from '../src/domain/llm/validate';

test('clampInt floors and clamps within range', () => {
  expect(clampInt(5.9, 0, 10)).toBe(5);
  expect(clampInt(-3, 0, 10)).toBe(0);
  expect(clampInt(999, 0, 10)).toBe(10);
  expect(clampInt('7', 0, 10)).toBe(7);
});

test('clampInt throws on non-finite', () => {
  expect(() => clampInt('abc', 0, 10)).toThrow();
  expect(() => clampInt(undefined, 0, 10)).toThrow();
});

test('asRecord returns object or throws', () => {
  expect(asRecord({ a: 1 })).toEqual({ a: 1 });
  expect(() => asRecord(null)).toThrow();
  expect(() => asRecord('x')).toThrow();
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest llm-validate -i`
Expected: FAIL。

- [ ] **Step 3: 实现**

```ts
// src/domain/llm/validate.ts
export function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('not an object');
  return raw as Record<string, unknown>;
}

/** 转整数并夹到 [min,max]；非有限数抛错（视为模型失败，触发上层重试）。 */
export function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) throw new Error(`not a finite number: ${String(v)}`);
  return Math.max(min, Math.min(max, n));
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `npx jest llm-validate -i`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/llm/validate.ts __tests__/llm-validate.test.ts
git commit -m "feat(llm): shared draft validation helpers"
```

---

### Task 2.2: `questDraft.ts` — 生成委托（prompt + 校验）

**Files:**
- Create: `src/domain/llm/questDraft.ts`
- Test: `__tests__/llm-questDraft.test.ts`

> 命名注意：domain 类型叫 `GeneratedQuest`（结构化、数值型），不要与 `QuestFormModal` 内已有的 `QuestDraft`（全 string）混淆。第一批仅支持 `daily/weekly/oneoff`（与 `QuestFormModal` 的 `QuestKind` 对齐；anti 是另一个 modal，留待后续）。

- [ ] **Step 1: 写失败测试**

```ts
// __tests__/llm-questDraft.test.ts
import { buildQuestPrompt, parseQuestDraft } from '../src/domain/llm/questDraft';

test('buildQuestPrompt yields system+user messages carrying the user text', () => {
  const msgs = buildQuestPrompt('我想每天早起跑步');
  expect(msgs).toHaveLength(2);
  expect(msgs[0].role).toBe('system');
  expect(msgs[1]).toEqual({ role: 'user', content: '我想每天早起跑步' });
});

test('parseQuestDraft accepts a valid object and clamps numbers', () => {
  const q = parseQuestDraft({ kind: 'daily', name: '早起跑步', gold: 20, exp: 10, icon: '🏃', category: '健康' });
  expect(q).toEqual({ kind: 'daily', name: '早起跑步', gold: 20, exp: 10, icon: '🏃', category: '健康' });
  const clamped = parseQuestDraft({ kind: 'weekly', name: 'x', gold: 99999, exp: -5, icon: '📝' });
  expect(clamped.gold).toBe(9999);
  expect(clamped.exp).toBe(0);
});

test('parseQuestDraft defaults icon when missing/blank, category optional', () => {
  const q = parseQuestDraft({ kind: 'oneoff', name: '整理书桌', gold: 30, exp: 15 });
  expect(q.icon).toBe('📝');
  expect(q.category).toBeUndefined();
});

test('parseQuestDraft rejects bad kind, empty name, non-numeric gold', () => {
  expect(() => parseQuestDraft({ kind: 'monthly', name: 'x', gold: 1, exp: 1, icon: '📝' })).toThrow();
  expect(() => parseQuestDraft({ kind: 'daily', name: '  ', gold: 1, exp: 1, icon: '📝' })).toThrow();
  expect(() => parseQuestDraft({ kind: 'daily', name: 'x', gold: 'lots', exp: 1, icon: '📝' })).toThrow();
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest llm-questDraft -i`
Expected: FAIL。

- [ ] **Step 3: 实现**

```ts
// src/domain/llm/questDraft.ts
import { LLMMessage } from '../../services/llm/types';
import { asRecord, clampInt } from './validate';

export interface GeneratedQuest {
  kind: 'daily' | 'weekly' | 'oneoff';
  name: string;
  gold: number;
  exp: number;
  icon: string;
  category?: string;
}

const KINDS = ['daily', 'weekly', 'oneoff'] as const;

export function buildQuestPrompt(userText: string): LLMMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是像素 RPG 习惯养成 App 的任务设计助手。把用户一句话目标转成一个结构化「委托」。' +
        '只返回一个 JSON 对象，不要解释、不要代码块。字段：' +
        'kind（"daily" 每日重复 / "weekly" 每周一次 / "oneoff" 一次性），' +
        'name（简短中文任务名，不超过 16 字），gold（金币整数 5–100，越难越多），' +
        'exp（经验整数 3–60），icon（单个 emoji），category（可选：健康/学习/生活/工作 等）。',
    },
    { role: 'user', content: userText },
  ];
}

export function parseQuestDraft(raw: unknown): GeneratedQuest {
  const o = asRecord(raw);
  const kind = o.kind;
  if (typeof kind !== 'string' || !(KINDS as readonly string[]).includes(kind)) {
    throw new Error(`invalid kind: ${String(kind)}`);
  }
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) throw new Error('empty name');
  const gold = clampInt(o.gold, 0, 9999);
  const exp = clampInt(o.exp, 0, 9999);
  const icon = typeof o.icon === 'string' && o.icon.trim() ? o.icon.trim() : '📝';
  const category = typeof o.category === 'string' && o.category.trim() ? o.category.trim() : undefined;
  return { kind: kind as GeneratedQuest['kind'], name, gold, exp, icon, category };
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `npx jest llm-questDraft -i`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/llm/questDraft.ts __tests__/llm-questDraft.test.ts
git commit -m "feat(llm): quest draft prompt + validation"
```

---

### Task 2.3: `bossDraft.ts` — Boss 设计（prompt + 校验 + 权重归一化）

**Files:**
- Create: `src/domain/llm/bossDraft.ts`
- Test: `__tests__/llm-bossDraft.test.ts`

> `GeneratedBoss` 不含 `linkedTaskIds`——关联任务由用户在 UI 勾选（LLM 不应臆造任务 id，见 spec §6.3）。

- [ ] **Step 1: 写失败测试**

```ts
// __tests__/llm-bossDraft.test.ts
import { buildBossPrompt, parseBossDraft } from '../src/domain/llm/bossDraft';

test('buildBossPrompt yields system+user messages carrying the goal', () => {
  const msgs = buildBossPrompt('30 天读完 3 本书');
  expect(msgs).toHaveLength(2);
  expect(msgs[1].content).toContain('30 天读完 3 本书');
});

test('parseBossDraft validates and normalizes weights to sum 1', () => {
  const b = parseBossDraft({ name: '读书 Boss', maxHp: 300, damagePerHit: 20, totalRewardGold: 600, totalRewardExp: 300, weights: [1, 1, 2] });
  expect(b.name).toBe('读书 Boss');
  expect(b.maxHp).toBe(300);
  const sum = b.weights[0] + b.weights[1] + b.weights[2];
  expect(sum).toBeCloseTo(1, 5);
  expect(b.weights[2]).toBeCloseTo(0.5, 5);
});

test('parseBossDraft clamps damagePerHit to <= maxHp and rewards >= 0', () => {
  const b = parseBossDraft({ name: 'x', maxHp: 50, damagePerHit: 999, totalRewardGold: -10, totalRewardExp: 5, weights: [0.2, 0.3, 0.5] });
  expect(b.damagePerHit).toBe(50);
  expect(b.totalRewardGold).toBe(0);
});

test('parseBossDraft rejects empty name, bad weights', () => {
  expect(() => parseBossDraft({ name: '', maxHp: 1, damagePerHit: 1, totalRewardGold: 0, totalRewardExp: 0, weights: [0.2, 0.3, 0.5] })).toThrow();
  expect(() => parseBossDraft({ name: 'x', maxHp: 1, damagePerHit: 1, totalRewardGold: 0, totalRewardExp: 0, weights: [1, 1] })).toThrow();
  expect(() => parseBossDraft({ name: 'x', maxHp: 1, damagePerHit: 1, totalRewardGold: 0, totalRewardExp: 0, weights: [0, 0, 0] })).toThrow();
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest llm-bossDraft -i`
Expected: FAIL。

- [ ] **Step 3: 实现**

```ts
// src/domain/llm/bossDraft.ts
import { LLMMessage } from '../../services/llm/types';
import { asRecord, clampInt } from './validate';

export interface GeneratedBoss {
  name: string;
  maxHp: number;
  damagePerHit: number;
  totalRewardGold: number;
  totalRewardExp: number;
  weights: [number, number, number];
}

export function buildBossPrompt(goalText: string): LLMMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是像素 RPG App 的 Boss 设计助手。把用户的一个较大目标转成一只「Boss」。' +
        '只返回一个 JSON 对象，不要解释、不要代码块。字段：' +
        'name（中文 Boss 名，不超过 12 字），maxHp（最大血量整数 50–2000，目标越大越高），' +
        'damagePerHit（单次打卡伤害整数，约为 maxHp 的 1/15～1/8），' +
        'totalRewardGold（总金币整数 100–2000），totalRewardExp（总经验整数 50–1000），' +
        'weights（三阶段奖励比重，三个 0–1 的数，和约为 1，例如 [0.2,0.3,0.5]）。',
    },
    { role: 'user', content: goalText },
  ];
}

export function parseBossDraft(raw: unknown): GeneratedBoss {
  const o = asRecord(raw);
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) throw new Error('empty name');
  const maxHp = clampInt(o.maxHp, 1, 100000);
  const damagePerHit = clampInt(o.damagePerHit, 1, maxHp);
  const totalRewardGold = clampInt(o.totalRewardGold, 0, 100000);
  const totalRewardExp = clampInt(o.totalRewardExp, 0, 100000);

  const arr = Array.isArray(o.weights) ? o.weights.map((x) => Number(x)) : [];
  if (arr.length !== 3 || arr.some((n) => !Number.isFinite(n) || n < 0)) throw new Error('invalid weights');
  const sum = arr[0] + arr[1] + arr[2];
  if (sum <= 0) throw new Error('weights sum must be > 0');
  const weights: [number, number, number] = [arr[0] / sum, arr[1] / sum, arr[2] / sum];

  return { name, maxHp, damagePerHit, totalRewardGold, totalRewardExp, weights };
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `npx jest llm-bossDraft -i`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/llm/bossDraft.ts __tests__/llm-bossDraft.test.ts
git commit -m "feat(llm): boss draft prompt + validation with weight normalization"
```

---

### Task 2.4: `reportContext.ts` — 战报事实摘要 + prompt

**Files:**
- Create: `src/domain/llm/reportContext.ts`
- Test: `__tests__/llm-reportContext.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// __tests__/llm-reportContext.test.ts
import { buildReportContext, buildReportPrompt } from '../src/domain/llm/reportContext';
import { makeState } from './factory';

test('buildReportContext extracts compact facts from history + player', () => {
  const s = makeState({
    player: { name: '勇者', level: 3, exp: 0, expTotal: 0, gold: 250, avatarTier: 0, lastActiveDate: '2026-05-31' },
    history: {
      '2026-05-30': { status: 'perfect', dailiesDone: 4, dailiesTotal: 4, goldNet: 90 },
      '2026-05-31': { status: 'perfect', dailiesDone: 4, dailiesTotal: 4, goldNet: 80 },
    },
  });
  const f = buildReportContext(s, '2026-05-31');
  expect(f.status).toBe('perfect');
  expect(f.dailiesDone).toBe(4);
  expect(f.goldNet).toBe(80);
  expect(f.streak).toBe(2); // 30、31 连续非 missed
  expect(f.level).toBe(3);
  expect(f.gold).toBe(250);
});

test('buildReportContext tolerates a missing day', () => {
  const f = buildReportContext(makeState(), '2099-01-01');
  expect(f.status).toBe('missed');
  expect(f.dailiesTotal).toBe(0);
});

test('buildReportPrompt embeds the facts as a single instruction', () => {
  const msgs = buildReportPrompt(buildReportContext(makeState(), '2099-01-01'));
  expect(msgs).toHaveLength(2);
  expect(msgs[0].role).toBe('system');
  expect(msgs[1].content).toContain('2099-01-01');
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest llm-reportContext -i`
Expected: FAIL。

- [ ] **Step 3: 实现**

```ts
// src/domain/llm/reportContext.ts
import { AppState, DateStr } from '../types';
import { currentDayStreak } from '../stats';
import { LLMMessage } from '../../services/llm/types';

export interface ReportFacts {
  date: DateStr;
  status: 'perfect' | 'partial' | 'missed' | 'rest';
  dailiesDone: number;
  dailiesTotal: number;
  goldNet: number;
  streak: number;
  level: number;
  gold: number;
}

/** 把某日战绩压成紧凑事实摘要（避免把整个 AppState 倒给模型）。 */
export function buildReportContext(state: AppState, date: DateStr): ReportFacts {
  const h = state.history[date];
  return {
    date,
    status: h?.status ?? 'missed',
    dailiesDone: h?.dailiesDone ?? 0,
    dailiesTotal: h?.dailiesTotal ?? 0,
    goldNet: h?.goldNet ?? 0,
    streak: currentDayStreak(state.history, date),
    level: state.player.level,
    gold: state.player.gold,
  };
}

export function buildReportPrompt(facts: ReportFacts): LLMMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是像素 RPG 里的旁白伙伴。根据玩家昨天的战绩写一段 2–3 句的中文「昨日战报」，' +
        '像素冒险口吻、温暖鼓励、不说教，可含 1–2 个 emoji。只返回这段话本身，不要标题、不要 JSON。',
    },
    {
      role: 'user',
      content:
        `日期 ${facts.date}：状态=${facts.status}，完成每日 ${facts.dailiesDone}/${facts.dailiesTotal}，` +
        `净金币 ${facts.goldNet}，连续活跃 ${facts.streak} 天，当前等级 ${facts.level}，金币 ${facts.gold}。`,
    },
  ];
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `npx jest llm-reportContext -i`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/llm/reportContext.ts __tests__/llm-reportContext.test.ts
git commit -m "feat(llm): report facts context + narrative prompt"
```

---

### Task 2.5: `reminder.ts` — 智能提醒 prompt（仅埋点）

**Files:**
- Create: `src/domain/llm/reminder.ts`
- Test: `__tests__/llm-reminder.test.ts`

> 仅交付纯函数 + 测试；本批**不接** `notifications.ts`（本地通知须提前 schedule，预生成缓存坑多收益小，见 spec §6.4）。实现文件顶部注释标明未来扩展点。

- [ ] **Step 1: 写失败测试**

```ts
// __tests__/llm-reminder.test.ts
import { buildReminderPrompt } from '../src/domain/llm/reminder';
import { makeState } from './factory';

test('buildReminderPrompt counts unfinished dailies and streak', () => {
  const s = makeState({
    dailies: [
      { id: 'a', name: 'A', gold: 1, exp: 1, icon: '📝', doneDate: '2026-06-01', archived: false },
      { id: 'b', name: 'B', gold: 1, exp: 1, icon: '📝', doneDate: null, archived: false },
      { id: 'c', name: 'C', gold: 1, exp: 1, icon: '📝', doneDate: null, archived: true }, // archived 不计
    ],
    history: { '2026-05-31': { status: 'perfect', dailiesDone: 1, dailiesTotal: 1, goldNet: 10 } },
  });
  const msgs = buildReminderPrompt(s, '2026-06-01');
  expect(msgs).toHaveLength(2);
  expect(msgs[1].content).toContain('1'); // 1 个未完成（b；a 已完成、c 归档）
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx jest llm-reminder -i`
Expected: FAIL。

- [ ] **Step 3: 实现**

```ts
// src/domain/llm/reminder.ts
// 仅埋点：提供提醒文案 prompt。未来若实装，在 src/ui/notifications.ts 的 syncReminder/rollover
// 处用本函数预生成 N 条文案缓存，scheduleDailyReminder 从缓存取；缓存空则回退现有 MESSAGES。
import { AppState, DateStr } from '../types';
import { currentDayStreak } from '../stats';
import { LLMMessage } from '../../services/llm/types';

export function buildReminderPrompt(state: AppState, today: DateStr): LLMMessage[] {
  const pending = state.dailies.filter((d) => !d.archived && d.doneDate !== today).length;
  const streak = currentDayStreak(state.history, today);
  return [
    {
      role: 'system',
      content:
        '你是像素 RPG 里鼓励玩家的伙伴。用一句不超过 30 字的中文提醒玩家回来打卡，' +
        '鼓励不催促、不说教，可含 1 个 emoji。只返回这句话本身。',
    },
    { role: 'user', content: `今天还有 ${pending} 个每日委托未完成，当前连续活跃 ${streak} 天。` },
  ];
}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `npx jest llm-reminder -i`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/domain/llm/reminder.ts __tests__/llm-reminder.test.ts
git commit -m "feat(llm): reminder prompt builder (stub, not wired to notifications)"
```

---

## Phase 3 — UI 接入（手动验证）

> 项目未装 React Native Testing Library，UI 层不写自动测试；每个 task 用 `npm run web` 手动验证。统一调用范式：`getClient().generateText(...)` 或 `getClient().generateStructured(msgs, parseXxx)`，包在 `AIGenerateRow` / hook 内做 loading+降级。

### Task 3.1: `AIGenerateRow` 通用组件

**Files:**
- Create: `src/ui/components/AIGenerateRow.tsx`

- [ ] **Step 1: 实现**

```tsx
// src/ui/components/AIGenerateRow.tsx
import { useState } from 'react';
import { View } from 'react-native';
import { colors, space } from '../theme';
import { PixelText, PixelButton, PixelTextInput } from './Pixel';
import { LLMError } from '../../services/llm/types';
import { isLLMReady } from '../../services/llm/getClient';

function errMsg(kind: string): string {
  switch (kind) {
    case 'unconfigured': return '未配置 AI，请到 设置 → AI/LLM 填入 key';
    case 'network': return '网络错误，请检查连接';
    case 'timeout': return '生成超时，请重试';
    case 'http': return '服务返回错误，请检查 baseURL / model / key';
    default: return '生成失败，请手动填写';
  }
}

/** 通用「✨ AI 生成」行：输入一句话 → 调用方回调（负责调 client + parse + 回填）。失败仅提示，不破坏手填。 */
export function AIGenerateRow({ placeholder, onGenerate }: {
  placeholder: string;
  onGenerate: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!text.trim() || loading) return;
    if (!isLLMReady()) { setError(errMsg('unconfigured')); return; }
    setLoading(true); setError('');
    try {
      await onGenerate(text.trim());
    } catch (e) {
      setError(e instanceof LLMError ? errMsg(e.kind) : '生成失败，请手动填写');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: space(1), backgroundColor: colors.panelHi, padding: space(2) }}>
      <PixelText style={{ color: colors.gold, fontSize: 12 }}>✨ AI 生成（一句话描述，自动填表）</PixelText>
      <PixelTextInput value={text} onChangeText={setText} placeholder={placeholder} />
      <PixelButton label={loading ? '生成中…' : '✨ 生成'} color={colors.accent} disabled={loading} onPress={run} />
      {error ? <PixelText style={{ color: colors.danger, fontSize: 11 }}>{error}</PixelText> : null}
    </View>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增错误。

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/AIGenerateRow.tsx
git commit -m "feat(llm): reusable AIGenerateRow component"
```

---

### Task 3.2: 叙事战报接入（`useNarrativeReport` + `MorningReport`）

**Files:**
- Create: `src/ui/hooks/useNarrativeReport.ts`
- Modify: `src/ui/components/MorningReport.tsx`

> 叙事是**增强**而非替换：现有静态战绩始终显示，叙事文本在其下方追加；未就绪/失败则不显示叙事（零回退成本）。当天结果用模块级内存缓存，不持久化。

- [ ] **Step 1: 实现 hook**

```ts
// src/ui/hooks/useNarrativeReport.ts
import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { isLLMReady, getClient } from '../../services/llm/getClient';
import { buildReportContext, buildReportPrompt } from '../../domain/llm/reportContext';
import { DateStr } from '../../domain/types';

const cache = new Map<DateStr, string>(); // 内存缓存，重启清空，不进存档

export function useNarrativeReport(date: DateStr): { text: string | null; loading: boolean } {
  const [text, setText] = useState<string | null>(cache.get(date) ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (cache.has(date)) { setText(cache.get(date)!); return; }
    if (!isLLMReady()) { setText(null); return; }
    setLoading(true);
    const facts = buildReportContext(useGameStore.getState(), date);
    getClient().generateText(buildReportPrompt(facts))
      .then((t) => { if (!alive) return; const v = t.trim(); if (v) cache.set(date, v); setText(v || null); })
      .catch(() => { if (alive) setText(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [date]);

  return { text, loading };
}
```

- [ ] **Step 2: 接入 `MorningReport.tsx`**

顶部 import 区加：
```tsx
import { useNarrativeReport } from '../hooks/useNarrativeReport';
```
在组件内、`const st = STATUS_TEXT[h.status];` 那行后加：
```tsx
  const { text: narrative, loading: narrLoading } = useNarrativeReport(yStr);
```
在现有静态数据块（含「当前连续活跃」的 `</View>`）与 `<PixelText ...>新的一天，继续冒险吧！</PixelText>` 之间插入：
```tsx
        {narrLoading ? (
          <PixelText style={{ color: colors.textDim, fontSize: 12, textAlign: 'center' }}>旁白整理中…</PixelText>
        ) : narrative ? (
          <View style={[{ backgroundColor: colors.bgDeep, padding: space(3) }, pixelBorder]}>
            <PixelText style={{ color: colors.ink, fontSize: 13, lineHeight: 20 }}>{narrative}</PixelText>
          </View>
        ) : null}
```
（`pixelBorder`、`space` 已在 `MorningReport.tsx` 顶部从 `../theme` 导入，无需新增 import。）

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增错误。

- [ ] **Step 4: 手动验证三态（`npm run web`）**

1. **未配置**（默认）：触发跨天战报（清 `reportSeenDate` 并在 history 造一条昨日记录，或改系统日期）→ 只显示静态战绩，无叙事，无报错。
2. **已配置**：先在设置页填好 baseURL/model/key 并开启（Task 3.5），再触发 → 出现「旁白整理中…」后显示叙事段落。
3. **网络错**：把 baseURL 改成无效地址 → 只显示静态战绩（叙事静默消失），不白屏。

> 验证「未配置」前，按 `MEMORY.md` 的 persist 版本 bump 注意：必要时清 `localStorage['rpglife-state']` 以避免半迁移态。

- [ ] **Step 5: Commit**

```bash
git add src/ui/hooks/useNarrativeReport.ts src/ui/components/MorningReport.tsx
git commit -m "feat(llm): narrative morning report (enhance + graceful fallback)"
```

---

### Task 3.3: 委托 AI 生成（接入 `QuestFormModal`）

**Files:**
- Modify: `src/ui/components/QuestFormModal.tsx`

> AI 回填 name/gold/exp/icon/category；`kind` 由当前打开的表单决定（不切换），`GeneratedQuest.kind` 在此忽略。

- [ ] **Step 1: 接入**

`QuestFormModal.tsx` 顶部 import 区加：
```tsx
import { AIGenerateRow } from './AIGenerateRow';
import { getClient } from '../../services/llm/getClient';
import { buildQuestPrompt, parseQuestDraft } from '../../domain/llm/questDraft';
```
在标题 `<PixelText ...>{editing ? '编辑' : '发布'}{LABEL[kind]}</PixelText>` 那行后插入（仅新建时显示 AI 行）：
```tsx
      {!editing ? (
        <AIGenerateRow
          placeholder="例：我想每天早起跑步 30 分钟"
          onGenerate={async (t) => {
            const q = await getClient().generateStructured(buildQuestPrompt(t), parseQuestDraft);
            setName(q.name);
            setGold(String(q.gold));
            setExp(String(q.exp));
            setIcon(q.icon);
            setCategory(q.category ?? '');
          }}
        />
      ) : null}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增错误。

- [ ] **Step 3: 手动验证（`npm run web`，需先在设置页配好 AI）**

1. 委托页 → 发布每日委托 → 在「✨ AI 生成」输入「每天背 20 个单词」→ 点生成 → name/gold/exp/icon/分类被自动填好，仍可手动修改后保存。
2. 未配置时点生成 → 显示「未配置 AI…」提示，手填不受影响。
3. baseURL 错误 → 显示网络/服务错误提示，表单保留。

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/QuestFormModal.tsx
git commit -m "feat(llm): AI-generate quest draft in QuestFormModal"
```

---

### Task 3.4: Boss 设计助手（接入 `BossScreen`）

**Files:**
- Modify: `src/ui/screens/BossScreen.tsx`

> 仅新建 Boss 时显示；AI 回填数值字段，`linkedTaskIds` 仍由用户勾选。

- [ ] **Step 1: 接入**

`BossScreen.tsx` 顶部 import 区加：
```tsx
import { AIGenerateRow } from '../components/AIGenerateRow';
import { getClient } from '../../services/llm/getClient';
import { buildBossPrompt, parseBossDraft } from '../../domain/llm/bossDraft';
```
在新建/编辑 Boss 的 `PixelModal` 内、标题 `<PixelText ...>{editingId ? '编辑 Boss' : '新建 Boss'}</PixelText>` 那行后插入（仅新建时）：
```tsx
            {!editingId ? (
              <AIGenerateRow
                placeholder="例：30 天内读完 3 本书"
                onGenerate={async (t) => {
                  const b = await getClient().generateStructured(buildBossPrompt(t), parseBossDraft);
                  const r2 = (n: number) => String(Math.round(n * 100) / 100);
                  setDraft((d) => d ? {
                    ...d,
                    name: b.name,
                    maxHp: String(b.maxHp),
                    damagePerHit: String(b.damagePerHit),
                    totalRewardGold: String(b.totalRewardGold),
                    totalRewardExp: String(b.totalRewardExp),
                    w0: r2(b.weights[0]), w1: r2(b.weights[1]), w2: r2(b.weights[2]),
                  } : d);
                }}
              />
            ) : null}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增错误。

- [ ] **Step 3: 手动验证（`npm run web`，需先配好 AI）**

1. 讨伐页 → 新建 Boss → 「✨ AI 生成」输入「90 天练出马甲线」→ 生成 → 名称/HP/伤害/奖励/三阶段权重被填好；再手动勾选关联任务后保存。
2. 未配置 / 网络错 → 提示，手填不受影响。

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/BossScreen.tsx
git commit -m "feat(llm): AI-generate boss draft in BossScreen"
```

---

### Task 3.5: 设置页「🤖 AI / LLM」分区

**Files:**
- Modify: `src/ui/components/Pixel.tsx`（给 `PixelTextInput` 加可选 `secure` prop）
- Create: `src/ui/components/LLMSettingsSection.tsx`
- Modify: `src/ui/screens/SettingsScreen.tsx`（挂载分区）

- [ ] **Step 1: 给 `PixelTextInput` 加 `secure` prop（密码框）**

在 `Pixel.tsx` 的 `PixelTextInput` 参数解构加 `secure`，props 类型加 `secure?: boolean;`，并把 `secureTextEntry={secure}` 传给 `TextInput`：
```tsx
export function PixelTextInput({
  value, onChangeText, placeholder, numeric, multiline, secure, style,
}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
  numeric?: boolean; multiline?: boolean; secure?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textDim}
      keyboardType={numeric ? 'numeric' : 'default'}
      multiline={multiline}
      secureTextEntry={secure}
      style={[
        { backgroundColor: colors.bgDeep, color: colors.ink, paddingHorizontal: space(2), paddingVertical: space(2), fontFamily: font.body, minHeight: multiline ? space(20) : undefined, textAlignVertical: multiline ? 'top' : 'center' },
        pixelBorder,
        style,
      ]}
    />
  );
}
```

- [ ] **Step 2: 实现分区组件**

```tsx
// src/ui/components/LLMSettingsSection.tsx
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useGameStore } from '../../store/useGameStore';
import { colors, space } from '../theme';
import { PixelPanel, PixelButton, PixelText, PixelTextInput, PixelToggle, SectionTitle } from './Pixel';
import { loadApiKey, setApiKey } from '../../services/llm/secureConfig';
import { getClient } from '../../services/llm/getClient';

export function LLMSettingsSection() {
  const config = useGameStore((s) => s.config);
  const actions = useGameStore((s) => s.actions);
  const [baseURL, setBaseURL] = useState(config.llmBaseURL);
  const [model, setModel] = useState(config.llmModel);
  const [key, setKey] = useState('');
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { loadApiKey().then((k) => { setKey(k ?? ''); setKeyLoaded(true); }); }, []);

  const persist = async () => {
    actions.setConfig({ llmBaseURL: baseURL.trim(), llmModel: model.trim() });
    await setApiKey(key);
  };
  const saveAll = async () => { await persist(); setMsg('✅ 已保存'); };
  const testConn = async () => {
    setMsg('测试中…');
    await persist();
    const r = await getClient().ping();
    setMsg(r.ok ? '✅ 连接成功' : `❌ ${r.detail ?? '连接失败'}`);
  };

  return (
    <>
      <SectionTitle>🤖 AI / LLM</SectionTitle>
      <PixelPanel>
        <View style={{ gap: space(2) }}>
          <PixelToggle
            label="启用 AI（战报叙事 / 一句话生成委托与 Boss）"
            value={config.llmEnabled}
            onValueChange={(v) => actions.setConfig({ llmEnabled: v })}
          />
          <PixelText style={{ color: colors.ink, fontSize: 12 }}>Base URL（OpenAI 兼容）</PixelText>
          <PixelTextInput value={baseURL} onChangeText={setBaseURL} placeholder="https://api.deepseek.com/v1" />
          <PixelText style={{ color: colors.ink, fontSize: 12 }}>模型名</PixelText>
          <PixelTextInput value={model} onChangeText={setModel} placeholder="deepseek-chat / gpt-4o-mini" />
          <PixelText style={{ color: colors.ink, fontSize: 12 }}>API Key（仅存本机，不随存档导出）</PixelText>
          <PixelTextInput value={key} onChangeText={setKey} placeholder={keyLoaded ? 'sk-…' : '读取中…'} secure />
          {Platform.OS === 'web' ? (
            <PixelText style={{ color: colors.danger, fontSize: 11 }}>
              ⚠️ 网页端 key 不加密存储，仅建议开发用；正式使用请在手机 App 内配置。
            </PixelText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            <View style={{ flex: 1 }}><PixelButton label="保存" color={colors.success} onPress={saveAll} /></View>
            <View style={{ flex: 1 }}><PixelButton label="测试连接" color={colors.bgPanel} onPress={testConn} /></View>
          </View>
          {msg ? <PixelText style={{ color: colors.textDim, fontSize: 12 }}>{msg}</PixelText> : null}
        </View>
      </PixelPanel>
    </>
  );
}
```

- [ ] **Step 3: 挂载到 `SettingsScreen.tsx`**

顶部 import 区加：
```tsx
import { LLMSettingsSection } from '../components/LLMSettingsSection';
```
在「每日提醒」分区的 `</PixelPanel>`（约 line 122）与「导出 / 导入存档」的 `<SectionTitle>` 之间插入：
```tsx
      <LLMSettingsSection />
```

- [ ] **Step 4: 类型检查 + 全量测试**

Run: `npx tsc --noEmit -p tsconfig.json && npm test`
Expected: 无新增类型错误；全部测试绿（`secure` prop 是可选，不影响现有 `PixelTextInput` 调用）。

- [ ] **Step 5: 手动验证（`npm run web` + 真机各一次）**

1. 设置页出现「🤖 AI / LLM」分区；填 baseURL/model/key → 保存 → 「测试连接」返回 ✅/❌。
2. **安全红线**：设置页 →「导出 JSON」→ 在导出文本里搜索 key 串，**确认不存在**（key 不在 store）。
3. 真机：填 key → 杀进程重开 → 回设置页确认 key 已回显（SecureStore 持久化 + 启动 `loadApiKey` 生效）。

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/Pixel.tsx src/ui/components/LLMSettingsSection.tsx src/ui/screens/SettingsScreen.tsx
git commit -m "feat(settings): AI/LLM config section (baseURL/model/secure key + test)"
```

---

## Phase 4 — 收尾与验收

### Task 4.1: 全量验收 + 文档

**Files:**
- Modify: `docs/superpowers/STATUS.md`（追加 LLM 接入条目）

- [ ] **Step 1: 全量门禁**

Run: `npm test && npx tsc --noEmit -p tsconfig.json`
Expected: 全部测试绿（原 129 + 新增 ~25 个用例）；无类型错误。

- [ ] **Step 2: 冒烟（web）**

Run: `npm run web`
Expected: 进入 App 不报错；设置页 AI 分区可用；未配置时各 AI 入口优雅提示、核心玩法零变化。

- [ ] **Step 3: 更新 STATUS.md**

在 STATUS.md 合适位置追加一条：已落地 LLM 接入第一批（services/llm 地基 + domain/llm 纯函数 + 战报叙事 / 生成委托 / Boss 助手；提醒仅埋点；Config v12）。

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/STATUS.md
git commit -m "docs: record LLM integration phase 1 in STATUS"
```

---

## 实现顺序与依赖

```
Phase 0 (0.1→0.6) ── 地基组件（types/parseStructured/mock/openaiCompat/secureConfig），互不依赖 Config
        │
Phase 1 (1.1→1.2) ── Config v12 → getClient/isLLMReady + App 预热（getClient 依赖 v12 字段，故在 1.1 后）
        │
Phase 2 (2.1→2.5) ── domain/llm 纯函数（依赖 services/llm/types；reportContext/reminder 复用 stats）
        │
Phase 3 (3.1→3.5) ── UI 接入（依赖 Phase 0/1/2 全部）
        │
Phase 4 (4.1) ────── 验收
```

## 验收标准（对应 spec §10）

- `npm test` 全绿；`npx tsc --noEmit -p tsconfig.json` 无错误。
- 纯逻辑全单测：parseStructured / openaiCompatClient / mockClient / validate / questDraft / bossDraft / reportContext / reminder + migrate v12。
- 未配置 / 网络错 / 校验失败时：读路径回退静态、写路径提示并保留手填，**绝不白屏**。
- **apiKey 不出现在导出 JSON 中**（手动核对）。
- 真机 SecureStore 持久化 key 跨重启有效；Web 降级 localStorage 且有不安全提示。
```
