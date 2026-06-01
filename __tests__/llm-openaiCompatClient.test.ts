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
