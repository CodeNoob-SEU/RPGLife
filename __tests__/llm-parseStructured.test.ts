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
