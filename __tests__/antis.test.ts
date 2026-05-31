import { makeState } from './factory';
import { slipAnti, undoCheckIn } from '../src/domain/actions';
import { Anti } from '../src/domain/types';

const NOW = new Date(2026, 5, 1);
const anti = (over: Partial<Anti> = {}): Anti => ({ id: 'a1', name: '刷手机', icon: '📱', penalty: 30, archived: false, ...over });
const withGold = (g: number) => ({ ...makeState().player, gold: g });

test('slipAnti 扣 penalty 金币 + 建 anti 回执（记录实际损失）+ ledger penalty', () => {
  const s = makeState({ antis: [anti()], player: withGold(100) });
  slipAnti(s, 'a1', NOW);
  expect(s.player.gold).toBe(70);
  expect(s.todayReceipts).toHaveLength(1);
  expect(s.todayReceipts[0].kind).toBe('anti');
  expect(s.todayReceipts[0].goldDelta).toBe(-30);
  expect(s.ledger.some((l) => l.type === 'penalty' && l.amount === -30 && l.note.includes('禁忌'))).toBe(true);
});

test('金币不足时只扣到 0（记录实际损失），撤销精确回补不过补', () => {
  const s = makeState({ antis: [anti({ penalty: 50 })], player: withGold(20) });
  slipAnti(s, 'a1', NOW);
  expect(s.player.gold).toBe(0);
  expect(s.todayReceipts[0].goldDelta).toBe(-20); // 实际只损失 20
  const rid = s.todayReceipts[0].rid;
  undoCheckIn(s, rid, NOW);
  expect(s.player.gold).toBe(20); // 精确回补
  expect(s.todayReceipts).toHaveLength(0);
});

test('已归档禁忌「记一次」无效', () => {
  const s = makeState({ antis: [anti({ archived: true })], player: withGold(100) });
  slipAnti(s, 'a1', NOW);
  expect(s.player.gold).toBe(100);
  expect(s.todayReceipts).toHaveLength(0);
});

test('禁忌不发经验、不影响等级', () => {
  const s = makeState({ antis: [anti()], player: withGold(100) });
  slipAnti(s, 'a1', NOW);
  expect(s.player.exp).toBe(0);
  expect(s.player.level).toBe(1);
});
