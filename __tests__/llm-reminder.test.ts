import { buildReminderPrompt } from '../src/domain/llm/reminder';
import { makeState } from './factory';

test('buildReminderPrompt counts unfinished dailies and streak', () => {
  const s = makeState({
    dailies: [
      { id: 'a', name: 'A', gold: 1, exp: 1, icon: '📝', doneDate: '2026-06-01', archived: false },
      { id: 'b', name: 'B', gold: 1, exp: 1, icon: '📝', doneDate: null, archived: false },
      { id: 'c', name: 'C', gold: 1, exp: 1, icon: '📝', doneDate: null, archived: true },
    ],
    history: { '2026-05-31': { status: 'perfect', dailiesDone: 1, dailiesTotal: 1, goldNet: 10 } },
  });
  const msgs = buildReminderPrompt(s, '2026-06-01');
  expect(msgs).toHaveLength(2);
  expect(msgs[1].content).toContain('1');
});
