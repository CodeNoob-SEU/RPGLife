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
