import { makeState } from './factory';
import { buyFreezeCard, cashOut } from '../src/domain/actions';
const now = new Date(2026, 5, 1);

test('buyFreezeCard succeeds with enough gold', () => {
  const s = makeState();
  s.player.gold = 150;
  expect(buyFreezeCard(s, now)).toBe(true);
  expect(s.player.gold).toBe(50);
  expect(s.inventory.freezeCards).toBe(1);
  expect(s.ledger[0]).toMatchObject({ type: 'purchase', amount: -100 });
});

test('buyFreezeCard fails when insufficient', () => {
  const s = makeState();
  s.player.gold = 50;
  expect(buyFreezeCard(s, now)).toBe(false);
  expect(s.inventory.freezeCards).toBe(0);
});

test('cashOut requires threshold and sufficient balance', () => {
  const s = makeState();
  s.player.gold = 1200;
  expect(cashOut(s, 500, now)).toBe(false); // below threshold 1000
  expect(cashOut(s, 2000, now)).toBe(false); // exceeds balance
  expect(cashOut(s, 1000, now)).toBe(true);
  expect(s.player.gold).toBe(200);
  expect(s.ledger.find((l) => l.type === 'cashout')).toMatchObject({ amount: -1000 });
});
