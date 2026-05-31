import { makeState } from './factory';
import { Boss } from '../src/domain/types';
import { attackBoss, undoCheckIn } from '../src/domain/actions';

const boss = (over: Partial<Boss> = {}): Boss => ({
  id: 'b1', name: '读完一本书', icon: '👹',
  maxHp: 100, hp: 100, damagePerHit: 20,
  totalRewardGold: 600, totalRewardExp: 300,
  weights: [0.2, 0.3, 0.5], linkedTaskIds: [], clearedStages: [], defeated: false, archived: false,
  ...over,
});
const now = new Date(2026, 5, 1);

test('attackBoss 按指定伤害扣血并建 boss 回执', () => {
  const s = makeState({ bosses: [boss()] });
  attackBoss(s, 'b1', 30, now);
  expect(s.bosses[0].hp).toBe(70);
  expect(s.todayReceipts).toHaveLength(1);
  expect(s.todayReceipts[0].kind).toBe('boss');
  expect(s.todayReceipts[0].bossHits![0]).toMatchObject({ bossId: 'b1', damage: 30 });
});

test('attackBoss 跨阶段阈值发对应比重奖励', () => {
  const s = makeState({ bosses: [boss({ hp: 80 })] });
  attackBoss(s, 'b1', 20, now); // hp 60 <= 66.67 → 阶段1
  expect(s.bosses[0].clearedStages).toEqual([1]);
  expect(s.player.gold).toBe(120); // floor(600*0.2)
});

test('attackBoss 可一击击杀并发庆祝、发全部阶段奖励', () => {
  const s = makeState({ bosses: [boss({ hp: 30 })] });
  attackBoss(s, 'b1', 999, now);
  expect(s.bosses[0].hp).toBe(0);
  expect(s.bosses[0].defeated).toBe(true);
  expect(s.bosses[0].clearedStages).toEqual([1, 2, 3]);
  expect(s.player.gold).toBe(600);
  expect(s.pendingCelebrations).toContain('bossDefeated');
});

test('attackBoss 伤害下限为 1（至少扣 1 血）', () => {
  const s = makeState({ bosses: [boss()] });
  attackBoss(s, 'b1', 0, now);
  expect(s.bosses[0].hp).toBe(99);
});

test('已击杀 / 已归档 / 不存在的 Boss 攻击无效', () => {
  const s = makeState({ bosses: [boss({ hp: 50, defeated: true })] });
  attackBoss(s, 'b1', 20, now);
  expect(s.bosses[0].hp).toBe(50);
  const s2 = makeState({ bosses: [boss({ archived: true })] });
  attackBoss(s2, 'b1', 20, now);
  expect(s2.bosses[0].hp).toBe(100);
  const s3 = makeState({ bosses: [boss()] });
  attackBoss(s3, 'nope', 20, now);
  expect(s3.bosses[0].hp).toBe(100);
  expect(s3.todayReceipts).toHaveLength(0);
});

test('撤销 boss 攻击：回血 + 取消阶段 + 取消击杀 + 退还奖励', () => {
  const s = makeState({ bosses: [boss({ hp: 30 })] });
  attackBoss(s, 'b1', 999, now);
  const rid = s.todayReceipts[0].rid;
  expect(s.player.gold).toBe(600);
  undoCheckIn(s, rid, now);
  expect(s.bosses[0].hp).toBe(30);
  expect(s.bosses[0].defeated).toBe(false);
  expect(s.bosses[0].clearedStages).toEqual([]);
  expect(s.player.gold).toBe(0);
  expect(s.todayReceipts).toHaveLength(0);
});
