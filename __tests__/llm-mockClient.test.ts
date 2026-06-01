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
