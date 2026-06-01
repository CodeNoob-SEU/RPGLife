// __tests__/llm-types.test.ts
import { LLMError } from '../src/services/llm/types';

test('LLMError carries a kind and message', () => {
  const e = new LLMError('timeout', 'too slow');
  expect(e).toBeInstanceOf(Error);
  expect(e.kind).toBe('timeout');
  expect(e.message).toBe('too slow');
  expect(e.name).toBe('LLMError');
});
