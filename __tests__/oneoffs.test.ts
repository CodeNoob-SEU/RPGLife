import { makeState } from './factory';
import { checkInOneoff, undoCheckIn } from '../src/domain/actions';
import { processRollover } from '../src/domain/settlement';
import { OneOff } from '../src/domain/types';

const NOW = new Date(2026, 5, 1, 9, 0, 0); // 2026-06-01

function oneoff(over: Partial<OneOff> = {}): OneOff {
  return { id: 'o1', name: '一次性任务', gold: 50, exp: 25, icon: '📦', doneDate: null, archived: false, ...over };
}

test('checkInOneoff 发放金币/经验、标记完成、建 oneoff 回执', () => {
  const s = makeState({ oneoffs: [oneoff()] });
  checkInOneoff(s, 'o1', NOW);
  expect(s.player.gold).toBe(50);
  expect(s.player.expTotal).toBe(25);
  expect(s.oneoffs[0].doneDate).toBe('2026-06-01');
  expect(s.todayReceipts).toHaveLength(1);
  expect(s.todayReceipts[0].kind).toBe('oneoff');
  expect(s.todayReceipts[0].goldDelta).toBe(50);
  expect(s.todayReceipts[0].expDelta).toBe(25);
});

test('已完成的一次性委托再次打卡无效（永久完成，doneDate!==null 即完成）', () => {
  const s = makeState({ oneoffs: [oneoff({ doneDate: '2026-05-30' })] });
  checkInOneoff(s, 'o1', NOW);
  expect(s.player.gold).toBe(0);
  expect(s.todayReceipts).toHaveLength(0);
});

test('已归档的一次性委托打卡无效', () => {
  const s = makeState({ oneoffs: [oneoff({ archived: true })] });
  checkInOneoff(s, 'o1', NOW);
  expect(s.player.gold).toBe(0);
});

test('一次性委托不触发每日全清', () => {
  const s = makeState({ oneoffs: [oneoff()] });
  checkInOneoff(s, 'o1', NOW);
  expect(s.dailyPerfect).toBeNull();
  expect(s.pendingCelebrations).not.toContain('perfectDay');
});

test('一次性委托不联动 Boss（即便被误关联也不扣血）', () => {
  const s = makeState({
    oneoffs: [oneoff({ id: 'o1' })],
    bosses: [{ id: 'b', name: 'B', icon: '👹', maxHp: 100, hp: 100, damagePerHit: 20, totalRewardGold: 100, totalRewardExp: 50, weights: [0.2, 0.3, 0.5], linkedTaskIds: ['o1'], clearedStages: [], defeated: false, archived: false }],
  });
  checkInOneoff(s, 'o1', NOW);
  expect(s.bosses[0].hp).toBe(100);
});

test('同日撤销一次性委托：完整回退金币/经验并恢复未完成', () => {
  const s = makeState({ oneoffs: [oneoff()] });
  checkInOneoff(s, 'o1', NOW);
  const rid = s.todayReceipts[0].rid;
  undoCheckIn(s, rid, NOW);
  expect(s.player.gold).toBe(0);
  expect(s.player.expTotal).toBe(0);
  expect(s.oneoffs[0].doneDate).toBeNull();
  expect(s.todayReceipts).toHaveLength(0);
});

test('rollover 不重置一次性委托完成状态（无截止、不参与结算）', () => {
  const s = makeState({
    oneoffs: [oneoff({ doneDate: '2026-05-30' })],
    player: { name: '冒险者', level: 1, exp: 0, expTotal: 0, gold: 0, avatarTier: 0, lastActiveDate: '2026-05-31' },
  });
  processRollover(s, new Date(2026, 5, 2)); // 跨到 2026-06-02
  expect(s.oneoffs[0].doneDate).toBe('2026-05-30');
});
