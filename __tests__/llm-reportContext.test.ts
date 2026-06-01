import { buildReportContext, buildReportPrompt } from '../src/domain/llm/reportContext';
import { makeState } from './factory';

test('buildReportContext extracts compact facts from history + player', () => {
  const s = makeState({
    player: { name: '勇者', level: 3, exp: 0, expTotal: 0, gold: 250, avatarTier: 0, lastActiveDate: '2026-05-31' },
    history: {
      '2026-05-30': { status: 'perfect', dailiesDone: 4, dailiesTotal: 4, goldNet: 90 },
      '2026-05-31': { status: 'perfect', dailiesDone: 4, dailiesTotal: 4, goldNet: 80 },
    },
  });
  const f = buildReportContext(s, '2026-05-31');
  expect(f.status).toBe('perfect');
  expect(f.dailiesDone).toBe(4);
  expect(f.goldNet).toBe(80);
  expect(f.streak).toBe(2);
  expect(f.level).toBe(3);
  expect(f.gold).toBe(250);
});

test('buildReportContext tolerates a missing day', () => {
  const f = buildReportContext(makeState(), '2099-01-01');
  expect(f.status).toBe('missed');
  expect(f.dailiesTotal).toBe(0);
});

test('buildReportPrompt embeds the facts as a single instruction', () => {
  const msgs = buildReportPrompt(buildReportContext(makeState(), '2099-01-01'));
  expect(msgs).toHaveLength(2);
  expect(msgs[0].role).toBe('system');
  expect(msgs[1].content).toContain('2099-01-01');
});
