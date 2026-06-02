import { buildReportContext, buildReportPrompt, buildWeekReviewContext, buildWeekReviewPrompt } from '../src/domain/llm/reportContext';
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

test('buildWeekReviewContext aggregates the last 7 days', () => {
  const s = makeState({
    player: { name: 'x', level: 5, exp: 0, expTotal: 0, gold: 300, avatarTier: 0, lastActiveDate: '2026-06-07' },
    history: {
      '2026-06-05': { status: 'perfect', dailiesDone: 3, dailiesTotal: 3, goldNet: 50 },
      '2026-06-06': { status: 'missed', dailiesDone: 0, dailiesTotal: 3, goldNet: -10 },
      '2026-06-07': { status: 'perfect', dailiesDone: 3, dailiesTotal: 3, goldNet: 40 },
    },
  });
  const f = buildWeekReviewContext(s, '2026-06-07');
  expect(f.to).toBe('2026-06-07');
  expect(f.perfectDays).toBe(2);
  expect(f.missedDays).toBe(1);
  expect(f.goldNet).toBe(80);
  expect(f.streak).toBe(1);   // 06-07 perfect，06-06 missed 打断
  expect(f.level).toBe(5);
});

test('buildWeekReviewPrompt embeds window + system role', () => {
  const msgs = buildWeekReviewPrompt(buildWeekReviewContext(makeState(), '2099-01-07'));
  expect(msgs).toHaveLength(2);
  expect(msgs[0].role).toBe('system');
  expect(msgs[1].content).toContain('2099-01-07');
});
