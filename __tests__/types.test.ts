import { makeState } from './factory';
import { CURRENT_VERSION } from '../src/domain/version';

test('factory builds a valid initial-ish state', () => {
  const s = makeState();
  expect(s.version).toBe(CURRENT_VERSION);
  expect(s.player.gold).toBe(0);
  expect(s.player.level).toBe(1);
  expect(Array.isArray(s.dailies)).toBe(true);
  expect(s.config.goldToYuanRate).toBe(100);
  expect(s.pendingCelebrations).toEqual([]);
});
