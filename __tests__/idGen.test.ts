import { genId } from '../src/store/idGen';

test('genId returns prefixed, unique ids', () => {
  const a = genId('daily');
  const b = genId('daily');
  expect(a.startsWith('daily-')).toBe(true);
  expect(b.startsWith('daily-')).toBe(true);
  expect(a).not.toBe(b);
});
