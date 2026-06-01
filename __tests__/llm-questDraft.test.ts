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
