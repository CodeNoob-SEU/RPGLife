# RPGLife × LLM 接入 — 设计规格（2026-06-01）

> 状态：已确认设计，待用户终审 → 进入 writing-plans
> 日期：2026-06-01
> 范围：第一批「插入点」——**LLM 服务层地基** + 四场景（②叙事战报/复盘、①AI 生成委托、⑤Boss 设计助手、④智能提醒[仅埋点]）。
> 约束：沿用「`domain` 纯逻辑 ↔ UI 解耦」原则；不破坏纯本地定位（未配置即原样运行）；**apiKey 绝不进存档**；Expo SDK 56——任何 expo-* API 实现时按 <https://docs.expo.dev/versions/v56.0.0/> 核对。
> 相关：[Phase1 设计](./2026-05-31-pixel-rpg-habit-tracker-phase1-design.md) · [商业化增强](./2026-06-01-commercialization-enhancement-design.md) · [STATUS](../STATUS.md) · `MEMORY.md`（zustand selector 稳定性 / 加持久化字段 checklist / persist 版本 bump 注意）

---

## 1. 背景与目标

RPGLife 当前 100% 离线、纯像素风、`src/domain` 纯逻辑与 UI 完全解耦、129 测试 TDD 覆盖。本规格在**不破坏上述任何一点**的前提下，为 LLM 能力引入一组干净的「插入点」：

- **目标**：把已有的「准内容生成」点（昨日战报、提醒文案、任务/Boss 创建）升级为可由 LLM 增强；并立起一套可复制的接入范式，后续场景（教练对话等）照搬即可。
- **非目标**：本批不追求功能数量，而是把「读路径（生成文本）」与「写路径（生成结构化数据）」两套插入点机制各打一个干净样板。

## 2. 范围

**做（第一批）：**
- 地基 `src/services/llm/`：`LLMClient` 接口 + OpenAI 兼容实现 + Mock + 工厂 + 密钥安全存取 + 结构化解析工具 + prompts。
- `src/domain/llm/`：各场景的**纯函数**（输入打包 + 输出校验），全部单测。
- 场景 ② 叙事战报/复盘（读路径样板，接 `MorningReport`/`DataScreen`）。
- 场景 ① AI 生成委托（写路径样板，接 `QuestFormModal` + 现有 `addDaily/…`）。
- 场景 ⑤ Boss 设计助手（写路径，接建 Boss 流 + `addBoss`）。
- 场景 ④ 智能提醒：**仅埋接口 + prompt 纯函数 + 单测**，不接 `notifications.ts` 实装（理由见 §6.4）。
- 设置页「🤖 AI / LLM」分区；`Config` 扩展 + migrate v11 → **v12**。

**不做（YAGNI，接口预留、以后再加）：**
- ❌ 流式输出（SSE）——第一批短文本一次性返回即可。
- ❌ AI 教练多轮对话 / 聊天 UI。
- ❌ Anthropic / 自建后端代理的**具体实现类**（`LLMClient` 接口已为其留好位）。
- ❌ Web 端不作为主目标——浏览器直连第三方 API 有 CORS + key 暴露问题；Web 下 AI 入口禁用或仅走 Mock。
- ❌ 不把任何 LLM 生成文本写入持久化存档（避免污染存档 + 体积膨胀）。

## 3. 架构总览（三层）

```
UI 层（改现有界面，加钩子）        ←— 副作用：触发调用、loading、降级回退
  QuestFormModal · MorningReport · DataScreen · SettingsScreen · 建 Boss 流
        │ 调用
src/domain/llm（新增，纯函数，TDD）  ←— 无副作用：打包输入 + 校验输出
  buildQuestPrompt · parseQuestDraft · buildReportContext · buildReportPrompt
  buildBossPrompt · parseBossDraft · buildReminderPrompt
        │ 依赖接口
src/services/llm（新增，地基）       ←— 唯一触碰网络 / 密钥的层
  LLMClient 接口 · openaiCompatClient · mockClient · getClient · secureConfig · parseStructured · prompts/
```

**铁律：**
1. 网络与密钥**只**存在于 `src/services/llm`。`src/domain/llm` 是纯函数，不 import 任何网络/存储模块，可像 `settlement.ts` 一样离线单测。
2. **LLM 只产「草稿」，落库一律走现有 action + 用户确认**（人在环路）。LLM 永不直接改 `AppState`。
3. 任何失败都有降级路径，绝不白屏（§7）。

## 4. 地基：`src/services/llm/`

| 文件 | 职责 |
|:--|:--|
| `types.ts` | `LLMClient` 接口、`LLMMessage`、`GenerateOptions`、`LLMError`（含错误分类枚举） |
| `openaiCompatClient.ts` | OpenAI 兼容实现：内置 `fetch` 打 `${baseURL}/chat/completions`，`AbortController` 超时，错误分类 |
| `mockClient.ts` | 离线/未配置/测试用，返回可控假数据，零网络 |
| `getClient.ts` | 工厂：读 `Config` + SecureStore，有 key 返回真实 client，否则返回 mock |
| `secureConfig.ts` | apiKey 安全存取适配器（原生 SecureStore / Web localStorage） |
| `parseStructured.ts` | 「调用 → 抽 JSON → 跑校验 → 失败带修正提示重试 1 次」编排工具 |
| `prompts/` | 各场景 system/user prompt 模板，集中管理便于调优 |

### 4.1 `LLMClient` 接口（TS 草案）

```ts
export type LLMRole = 'system' | 'user' | 'assistant';
export interface LLMMessage { role: LLMRole; content: string; }

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;     // 调用方可主动取消
}

export type LLMErrorKind =
  | 'unconfigured'   // 未填 key/baseURL
  | 'network'        // fetch 抛错 / 离线
  | 'timeout'        // AbortController 触发
  | 'http'           // 非 2xx
  | 'parse';         // JSON 抽取/校验失败（重试后仍失败）
export class LLMError extends Error { constructor(public kind: LLMErrorKind, message: string) { super(message); } }

export interface LLMClient {
  /** 自由文本生成（读路径用）。失败抛 LLMError。 */
  generateText(messages: LLMMessage[], opts?: GenerateOptions): Promise<string>;
  /** 结构化生成（写路径用）：内部抽 JSON、调 parse、失败重试 1 次。parse 抛错即视为校验失败。 */
  generateStructured<T>(
    messages: LLMMessage[],
    parse: (raw: unknown) => T,     // 来自 domain/llm，业务校验在此
    opts?: GenerateOptions
  ): Promise<T>;
  /** 设置页「测试连接」用：发最小请求，返回 ok / 错误信息。 */
  ping(opts?: GenerateOptions): Promise<{ ok: boolean; detail?: string }>;
}
```

### 4.2 `openaiCompatClient`
- 请求：`POST ${baseURL}/chat/completions`，header `Authorization: Bearer ${apiKey}`，body `{ model, messages, temperature, max_tokens }`。
- 超时：默认 20s，用 `AbortController`；外部传入的 `signal` 与超时 signal 合并。
- 错误映射：fetch reject → `network`；abort → `timeout`；`!res.ok` → `http`（带 status + 截断的 body）。
- `generateStructured` 内部委托 `parseStructured`（§4.6）。
- `ping`：发最小请求（单条 user 消息 + `maxTokens:1`），2xx 即 `{ok:true}`，否则带错误 detail。
- **不**做流式；`model/baseURL` 来自 `Config`，`apiKey` 来自 `secureConfig`。

### 4.3 `mockClient`
- 实现同一 `LLMClient` 接口，返回**确定性**假数据（战报给一段固定叙事；结构化给一个合法 draft）。供 store/UI 测试与「未配置 key」时使用，保证 App 离线可跑、测试不联网。

### 4.4 `getClient` 工厂
```ts
export function getClient(): LLMClient;  // 同步读已水合的 Config + 已缓存的 key；无 key → mockClient
```
- key 的读取是异步（SecureStore），故启动时预读一次缓存在模块内；`getClient` 同步返回。设置页保存 key 后刷新该缓存。

### 4.5 密钥安全 `secureConfig` 🔐
- **apiKey 绝不进 `AppState`/`Config`/zustand persist**——否则「设置→导出 JSON / CSV 存档」会把 key 明文带出去（现有 `DataScreen` 导出整个持久化 state）。这是硬性安全约束。
- 存取走 `expo-secure-store`（原生）；Web 无 SecureStore → 降级 `localStorage` 并在 UI 标注「Web 端 key 不加密、仅建议开发用」。
- 接口：`getApiKey(): Promise<string|null>` / `setApiKey(v: string): Promise<void>` / `clearApiKey(): Promise<void>`。
- 仅 `baseURL`/`model`/开关这类**不敏感**项进 `Config`。

### 4.6 `parseStructured`
```ts
export async function parseStructured<T>(
  callText: (messages: LLMMessage[], opts?: GenerateOptions) => Promise<string>, // 发起一次文本生成
  messages: LLMMessage[],
  parse: (raw: unknown) => T,
  opts?: GenerateOptions
): Promise<T>
```
> `openaiCompatClient.generateStructured` 把自身的文本生成能力作为 `callText` 传入，二者职责分离。
- 流程：调用 → 从返回文本中**抽取首个 JSON 块**（容忍 ```json 包裹与前后噪声）→ `JSON.parse` → `parse(obj)`（业务校验，来自 domain）。
- 任一步失败：追加一条「上次输出无法解析，请只返回符合要求的 JSON」的纠正消息，**重试 1 次**；仍失败抛 `LLMError('parse')`。
- 不引入 zod —— `parse` 是手写校验函数（见 §5）。

## 5. `src/domain/llm/`（纯函数，TDD）

每个场景一组纯函数，**不依赖** `services/llm` 或任何 IO：

| 文件 | 导出 | 说明 |
|:--|:--|:--|
| `questDraft.ts` | `buildQuestPrompt(userText, opts)` · `parseQuestDraft(raw): QuestDraft` | `QuestDraft = { kind:'daily'\|'weekly'\|'oneoff'\|'anti'; name; gold; exp; icon; category? }`；校验类型/非空/数值范围（gold/exp ≥ 0 且 ≤ 合理上限，anti 用 penalty），非法抛错 |
| `bossDraft.ts` | `buildBossPrompt(goalText)` · `parseBossDraft(raw): BossDraft` | 校验 `maxHp>0`、`damagePerHit>0`、奖励 ≥ 0、`weights` 三元且和≈1（复用经济钳制思路），非法抛错 |
| `reportContext.ts` | `buildReportContext(state, date): ReportFacts` · `buildReportPrompt(facts)` | `ReportFacts` 是**紧凑事实摘要**（昨日 status/完成数/净收益/当前连击/本周进度），避免把整个 `AppState` 倒给模型 |
| `reminder.ts` | `buildReminderPrompt(state): LLMMessage[]` | 仅埋点：根据连击/今日欠完成生成提醒 prompt；本批不接 `notifications` |

> 校验函数即 `generateStructured` 的 `parse` 入参，业务规则集中在 domain，便于穷举单测（合法/缺字段/越界/脏 JSON/类型错）。

## 6. 场景插入点

### 6.1 ② 叙事战报 / 复盘（读路径样板，先做）
- **插入点**：`src/ui/components/MorningReport.tsx`、`src/ui/screens/DataScreen.tsx`。
- **数据流**：渲染时 `buildReportContext(state, yesterday)` → `buildReportPrompt` → `client.generateText` → 叙事文本。
- **状态机**：`idle → loading（显示现有静态文案占位）→ success（替换为叙事文本）/ error（保留静态文案）`。现有静态战报（`STATUS_TEXT` 那套）**永远是兜底**。
- **缓存**：当天战报文本用**内存缓存**（默认模块级 `Map<DateStr,string>`；若需跨组件共享再升级为**非持久** zustand store），重启 App 重新生成可接受；**不进存档**。
  - 若改用 zustand store：遵循 `MEMORY.md` 的 selector 稳定性——不要在 selector 里返回新对象。
- **开关**：`config.llmEnabled` 关闭或未配置 key → 完全走现有静态文案，零行为变化。

### 6.2 ① AI 生成委托（写路径样板）
- **插入点**：`src/ui/components/QuestFormModal.tsx`（建任务表单）+ 现有 `gameActions.addDaily/addWeekly/addOneoff/addAnti`。
- **数据流**：用户输入一句话意图 → `buildQuestPrompt` → `client.generateStructured(msgs, parseQuestDraft)` → 校验过的 `QuestDraft` → **预填表单**（用户可改 name/gold/exp/icon/category）→ 用户点确认 → 调现有 `addXxx` action 落库。
- **人在环路**：LLM 只填草稿，绝不直接落库；确认前可编辑。
- **降级**：生成失败 → toast「生成失败，请手填」，表单保留、可正常手动建任务。

### 6.3 ⑤ Boss 设计助手（写路径）
- **插入点**：`src/ui/screens/BossScreen.tsx` 的建 Boss 流 + `gameActions.addBoss`。
- **数据流**：目标文本（如「30 天戒手机」）→ `buildBossPrompt` → `generateStructured(msgs, parseBossDraft)` → 预填建 Boss 表单 → 用户确认调 `addBoss`。
- `linkedTaskIds` 不由 LLM 决定（它不应臆造任务 id）——LLM 只产数值/名称/图标草稿，关联任务由用户在 UI 勾选。

### 6.4 ④ 智能提醒（仅埋接口）
- **本批只交付**：`domain/llm/reminder.ts` 的 `buildReminderPrompt` + 单测。
- **不接 `notifications.ts` 实装**，理由：本地通知须**提前 schedule**，要 LLM 文案就得「预生成 N 条缓存、schedule 时取」，坑多（缓存失效、跨天、权限）而收益小。留作后续，注释标明扩展点（在 `syncReminder`/rollover 处预生成并缓存，缓存空则回退现有 `MESSAGES`）。

## 7. 错误处理与降级（绝不白屏）

| 失败 | 表现 | 处理 |
|:--|:--|:--|
| 未配置 key | `getClient` 返回 mock；AI 入口点击提示「先去设置配置 AI」 | 引导至设置页 |
| 网络 / 超时 / 非 2xx | 抛 `LLMError(network/timeout/http)` | 读路径回退静态文案；写路径 toast + 保留表单手填 |
| JSON 抽取/校验失败 | `parseStructured` 重试 1 次仍失败 → `LLMError('parse')` | 同写路径降级 |
| `config.llmEnabled=false` | 不发起任何调用 | App 行为与接入前**完全一致** |

离线检测第一批**靠 fetch 失败兜底**，不引 `expo-network`。

## 8. 配置与持久化（migrate v11 → v12）

`Config` 新增（均不敏感、可入存档）：
```ts
llmEnabled: boolean;   // 总开关，默认 false
llmBaseURL: string;    // 默认 ''
llmModel: string;      // 默认 ''
```
- `apiKey` **不在此**，走 SecureStore（§4.5）。
- migrate `11 → 12`：补上述三字段默认值；旧存档无感升级。
- ⚠️ 按 `MEMORY.md` 的「加持久化字段 checklist」：要同步改 `types.ts` · `initialState.ts` · `migrate.ts` · `version.ts`(CURRENT_VERSION=12) · `__tests__/factory.ts`，并补 migrate 测试。`tsc -p tsconfig.json` 不覆盖 `__tests__`，**务必 `npm test`**。
- 按 `MEMORY.md` 的「persist 版本 bump gotcha」：expo-web 验证迁移时清 `localStorage['rpglife-state']`，避免 HMR 半迁移态。

## 9. 设置页 UI（`SettingsScreen` 新增「🤖 AI / LLM」分区）
- 控件：总开关 `llmEnabled`、`baseURL` 输入、`model` 输入、`apiKey`（密码框，写入 SecureStore）、「测试连接」按钮（调 `client.ping`）。
- Web 端在 key 输入旁标注「Web 不加密存储，仅建议开发用」。
- 沿用现有像素 UI 组件（`Pixel.tsx` 等）与「经济数值微调」分区的排版范式。

## 10. 测试策略（TDD）

- **纯函数全单测**（新增 `__tests__/llm*.test.ts`）：`parseQuestDraft` / `parseBossDraft`（合法 / 缺字段 / 越界 / 脏 JSON / 类型错）、`buildQuestPrompt` / `buildBossPrompt` / `buildReportContext` / `buildReportPrompt` / `buildReminderPrompt`、`parseStructured`（抽 JSON、重试、最终失败）。
- **mockClient** 驱动 store/UI 层测试，全程不联网。
- **openaiCompatClient** 用 `fetch` mock 测请求拼装（url/header/body）与错误分类分支。
- migrate v12 测试 + `factory.ts` 同步（见 §8）。
- 验收门：`npm test` 全绿 + `npx tsc --noEmit` 全绿；战报 UI 项在 expo-web 验证 loading→success→降级三态。

## 11. 依赖变更
- **新增**：`expo-secure-store`（按 v56 文档锁版本，`npx expo install`）。
- **不新增**：zod（手写校验）、axios（用内置 `fetch`）、expo-network（靠 fetch 兜底）。

## 12. 实现顺序（供 writing-plans 切分）
1. **地基** `services/llm`（接口 + mock + openaiCompat + secureConfig + parseStructured + prompts 骨架）+ Config v12 + 设置页 AI 分区。
2. **② 战报**（读路径，零落库风险，最快端到端验证整条链路）。
3. **① AI 生成委托**（写路径样板）。
4. **⑤ Boss 助手**（复用写路径范式）。
5. **④ 提醒**（仅 `buildReminderPrompt` + 单测，埋点注释）。

## 13. 关键决策记录（ADR）
- **D1 OpenAI 兼容协议 + 自带 key**：一套协议接 OpenAI/DeepSeek/智谱/Kimi/本地 Ollama，零后端、最通用。代价：Web 端 CORS/key 暴露（故 Web 非主目标）。
- **D2 apiKey 绝不入存档**：走 SecureStore，与可导出的 `Config` 分离，防止存档导出泄露 key。
- **D3 LLM 只产草稿、人在环路**：写路径一律预填表单 + 用户确认 + 现有 action 落库，LLM 不直接改 state。
- **D4 提醒仅埋点**：本地通知须提前 schedule，预生成缓存方案坑多收益小，留扩展。
- **D5 战报内存缓存、不持久化**：避免污染存档与 migrate 复杂度。
- **D6 不引 zod / 不做流式**：手写校验 + 一次性返回，保持依赖精简、契合短文本场景。
